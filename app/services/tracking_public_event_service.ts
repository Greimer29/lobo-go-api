import TrackingOrder from '#models/tracking_order'
import TrackingOrderLocation from '#models/tracking_order_location'
import TrackingPublicEvent, { TRACKING_PUBLIC_EVENT_STATUS } from '#models/tracking_public_event'
import {
  TRACKING_EVENT_TYPES,
  type OrderTrackingEvent,
  createOrderTrackingEvent,
  toRealtimeOrderUpdatePayload,
  type TrackingEventType,
} from '#services/tracking_public_event_contract'
import trackingPublicRealtimeHubService from '#services/tracking_public_realtime_hub_service'
import { DateTime } from 'luxon'

function toJson(event: OrderTrackingEvent) {
  return JSON.stringify(event)
}

function parseJson(value: string): OrderTrackingEvent {
  return JSON.parse(value) as OrderTrackingEvent
}

function parseMaybeDate(v: string | null | undefined) {
  if (!v) return DateTime.now()
  const dt = DateTime.fromISO(v)
  return dt.isValid ? dt : DateTime.now()
}

function normalizeDoc(numeroDocumento: string) {
  return String(numeroDocumento || '').trim()
}

function toMillis(value: string | null | undefined) {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

class TrackingPublicEventService {
  async #resolveOutboundRowEventId(eventId: string) {
    let candidate = eventId
    let i = 0
    while (true) {
      const exists = await TrackingPublicEvent.query().where('eventId', candidate).first()
      if (!exists) return candidate
      i += 1
      candidate = `${eventId}:out-${i}`
    }
  }

  async enqueueOutbound(event: OrderTrackingEvent) {
    const doc = normalizeDoc(event.order.numeroDocumento)
    const rowEventId = await this.#resolveOutboundRowEventId(event.eventId)
    return TrackingPublicEvent.create({
      eventId: rowEventId,
      direction: 'outbound',
      eventType: event.eventType,
      orderDocument: doc,
      payload: toJson(event),
      status: TRACKING_PUBLIC_EVENT_STATUS.PENDING,
    })
  }

  async createAndEnqueueOutbound(
    type: TrackingEventType,
    base: Omit<OrderTrackingEvent, 'eventId' | 'eventType' | 'emittedAt' | 'idempotencyKey'>
  ) {
    const event = createOrderTrackingEvent(type, base)
    await this.enqueueOutbound(event)
    return event
  }

  async markOutboundSent(eventId: string) {
    const row = await TrackingPublicEvent.query()
      .where('eventId', eventId)
      .where('direction', 'outbound')
      .first()
    if (!row) return
    row.status = TRACKING_PUBLIC_EVENT_STATUS.SENT
    row.sentAt = DateTime.now()
    row.lastError = null
    row.nextRetryAt = null
    row.attemptCount = row.attemptCount + 1
    await row.save()
  }

  async markOutboundFailed(eventId: string, error: string) {
    const row = await TrackingPublicEvent.query()
      .where('eventId', eventId)
      .where('direction', 'outbound')
      .first()
    if (!row) return
    row.status = TRACKING_PUBLIC_EVENT_STATUS.FAILED
    row.lastError = error
    row.attemptCount = row.attemptCount + 1
    const retrySeconds = Math.min(300, Math.max(15, row.attemptCount * 15))
    row.nextRetryAt = DateTime.now().plus({ seconds: retrySeconds })
    await row.save()
  }

  async getPendingOutbound(limit = 50) {
    const now = DateTime.now().toSQL({ includeOffset: false }) ?? undefined
    return TrackingPublicEvent.query()
      .where('direction', 'outbound')
      .where((q) => {
        q.where('status', TRACKING_PUBLIC_EVENT_STATUS.PENDING)
          .orWhere('status', TRACKING_PUBLIC_EVENT_STATUS.FAILED)
          .orWhere((q2) => {
            q2.where('status', TRACKING_PUBLIC_EVENT_STATUS.FAILED).where(
              'next_retry_at',
              '<=',
              now
            )
          })
      })
      .orderBy('createdAt', 'asc')
      .limit(limit)
  }

  async receiveInbound(event: OrderTrackingEvent) {
    const doc = normalizeDoc(event.order.numeroDocumento)
    const existing = await TrackingPublicEvent.query().where('eventId', event.eventId).first()
    if (existing) {
      return { duplicated: true, event: parseJson(existing.payload) }
    }

    const created = await TrackingPublicEvent.create({
      eventId: event.eventId,
      direction: 'inbound',
      eventType: event.eventType,
      orderDocument: doc,
      payload: toJson(event),
      status: TRACKING_PUBLIC_EVENT_STATUS.PROCESSED,
      sentAt: DateTime.now(),
      attemptCount: 1,
    })

    await this.#projectToOrderState(event)
    trackingPublicRealtimeHubService.publishOrderUpdate(
      doc,
      toRealtimeOrderUpdatePayload(event, {
        receivedAt: DateTime.now().toISO() ?? undefined,
      })
    )
    return { duplicated: false, event: parseJson(created.payload) }
  }

  async #projectToOrderState(event: OrderTrackingEvent) {
    const doc = normalizeDoc(event.order.numeroDocumento)
    if (!doc) return

    const order = await TrackingOrder.query().where('numeroDocumento', doc).first()
    if (order && typeof event.order.status === 'number') {
      const incoming = Number(event.order.status)
      if (Number.isFinite(incoming) && incoming >= order.status) {
        order.status = incoming
        if (incoming === 1 && event.order.transportStartedAt) {
          order.transportStartedAt = parseMaybeDate(event.order.transportStartedAt)
        }
        await order.save()
      }
    }

    if (
      event.eventType === TRACKING_EVENT_TYPES.ORDER_LOCATION &&
      event.location &&
      Number.isFinite(event.location.latitude) &&
      Number.isFinite(event.location.longitude)
    ) {
      const previous = await TrackingOrderLocation.query().where('orderDocument', doc).first()
      const recordedAt = parseMaybeDate(event.location.recordedAt ?? null)
      const incomingRecordedAtMs = toMillis(recordedAt.toISO())
      if (previous) {
        const previousRecordedAtMs = toMillis(previous.recordedAt.toISO())
        if (incomingRecordedAtMs > 0 && previousRecordedAtMs > 0 && incomingRecordedAtMs < previousRecordedAtMs) {
          return
        }
        previous.latitude = Number(event.location.latitude)
        previous.longitude = Number(event.location.longitude)
        previous.accuracyMeters = event.location.accuracyMeters ?? null
        previous.speedMps = event.location.speedMps ?? null
        previous.provider = event.location.provider ?? event.source
        previous.recordedAt = recordedAt
        if (order) {
          previous.trackingOrderId = order.id
          previous.vehicleId = event.order.vehicleId ?? order.vehicleId
        } else {
          previous.vehicleId = event.order.vehicleId ?? previous.vehicleId
        }
        await previous.save()
      } else {
        await TrackingOrderLocation.create({
          orderDocument: doc,
          trackingOrderId: order?.id ?? null,
          vehicleId: event.order.vehicleId ?? order?.vehicleId ?? null,
          latitude: Number(event.location.latitude),
          longitude: Number(event.location.longitude),
          accuracyMeters: event.location.accuracyMeters ?? null,
          speedMps: event.location.speedMps ?? null,
          provider: event.location.provider ?? event.source,
          recordedAt,
        })
      }
    }
  }

  async getLatestLocation(numeroDocumento: string) {
    const doc = normalizeDoc(numeroDocumento)
    return TrackingOrderLocation.query().where('orderDocument', doc).first()
  }

  async getTimeline(numeroDocumento: string, limit = 40) {
    const doc = normalizeDoc(numeroDocumento)
    const rows = await TrackingPublicEvent.query()
      .where('orderDocument', doc)
      .where('direction', 'inbound')
      .orderBy('createdAt', 'desc')
      .limit(Math.max(1, Math.min(limit, 200)))

    return rows.map((row) => parseJson(row.payload))
  }

  async getChangedInboundEventsSince(sinceIso: string, limit = 200) {
    const sinceDt = parseMaybeDate(sinceIso)
    const rows = await TrackingPublicEvent.query()
      .where('direction', 'inbound')
      .where('createdAt', '>=', sinceDt.toSQL({ includeOffset: false }) ?? undefined)
      .orderBy('createdAt', 'asc')
      .limit(Math.max(1, Math.min(limit, 1000)))
    return rows.map((row) => parseJson(row.payload))
  }

  async getChangedLocationsSince(sinceIso: string, limit = 200) {
    const sinceDt = parseMaybeDate(sinceIso)
    return TrackingOrderLocation.query()
      .where('recordedAt', '>=', sinceDt.toSQL({ includeOffset: false }) ?? undefined)
      .orderBy('recordedAt', 'asc')
      .limit(Math.max(1, Math.min(limit, 1000)))
  }
}

export default new TrackingPublicEventService()
