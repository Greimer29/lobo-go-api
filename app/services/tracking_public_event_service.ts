import TrackingOrder from '#models/tracking_order'
import TrackingOrderItem from '#models/tracking_order_item'
import TrackingOrderLocation from '#models/tracking_order_location'
import TrackingOrderObservation from '#models/tracking_order_observation'
import TrackingPublicEvent, { TRACKING_PUBLIC_EVENT_STATUS } from '#models/tracking_public_event'
import {
  TRACKING_EVENT_TYPES,
  type OrderTrackingEvent,
  type OrderTrackingEventItem,
  type OrderTrackingEventObservation,
  createOrderTrackingEvent,
  toRealtimeOrderUpdatePayload,
  type TrackingEventType,
} from '#services/tracking_public_event_contract'
import trackingPublicRealtimeHubService from '#services/tracking_public_realtime_hub_service'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
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

function toFiniteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseOptionalDateTime(v: string | null | undefined): DateTime | null {
  if (!v) return null
  const dt = DateTime.fromISO(v)
  return dt.isValid ? dt : null
}

const ORDER_PATCH_KEYS = [
  'descripcionPedido',
  'montoTotal',
  'estadoCodigo',
  'tipoFactura',
  'codigoUbicacion',
  'codigoVendedor',
  'originDepotCode',
  'originName',
  'originAddress',
  'originLat',
  'originLng',
  'destinationAddress',
  'destinationLat',
  'destinationLng',
  'destinationSource',
  'destinationMapsLink',
  'claimedByUserId',
  'isSync',
  'adminReaction',
] as const

type OrderPatchKey = (typeof ORDER_PATCH_KEYS)[number]

function defaultOrderRow(doc: string) {
  return {
    numeroDocumento: doc,
    descripcionPedido: null as string | null,
    montoTotal: 0,
    estadoCodigo: null as string | null,
    tipoFactura: null as string | null,
    codigoUbicacion: null as string | null,
    codigoVendedor: null as string | null,
    originDepotCode: null as string | null,
    originName: null as string | null,
    originAddress: null as string | null,
    originLat: null as number | null,
    originLng: null as number | null,
    destinationAddress: null as string | null,
    destinationLat: null as number | null,
    destinationLng: null as number | null,
    destinationSource: null as string | null,
    destinationMapsLink: null as string | null,
    vehicleId: null as number | null,
    claimedByUserId: null as number | null,
    syncedAt: null as DateTime | null,
    transportStartedAt: null as DateTime | null,
    status: 0,
    isSync: true,
  }
}

function applyOrderScalarPatches(order: TrackingOrder, payload: OrderTrackingEvent['order']) {
  if ('vehicleId' in payload) {
    const vid = toFiniteNumberOrNull(payload.vehicleId)
    order.vehicleId = vid !== null && vid > 0 ? vid : null
  }
  if ('syncedAt' in payload) {
    order.syncedAt = payload.syncedAt
      ? parseOptionalDateTime(payload.syncedAt)
      : null
  }
  if ('transportStartedAt' in payload) {
    if (payload.transportStartedAt == null || payload.transportStartedAt === '') {
      order.transportStartedAt = null
    } else {
      const t = parseOptionalDateTime(payload.transportStartedAt)
      if (t) order.transportStartedAt = t
    }
  }
  if ('adminFeedbackAt' in payload) {
    if (payload.adminFeedbackAt == null || payload.adminFeedbackAt === '') {
      order.adminFeedbackAt = null
    } else {
      const t = parseOptionalDateTime(payload.adminFeedbackAt)
      if (t) order.adminFeedbackAt = t
    }
  }

  for (const key of ORDER_PATCH_KEYS) {
    if (!(key in payload)) continue
    const v = payload[key as OrderPatchKey]
    if (key === 'montoTotal') {
      const n = toFiniteNumberOrNull(v)
      if (n !== null) order.montoTotal = n
      continue
    }
    if (
      key === 'originLat' ||
      key === 'originLng' ||
      key === 'destinationLat' ||
      key === 'destinationLng'
    ) {
      ;(order as unknown as Record<string, unknown>)[key] = toFiniteNumberOrNull(v)
      continue
    }
    if (key === 'claimedByUserId') {
      const uid = toFiniteNumberOrNull(v)
      order.claimedByUserId = uid !== null && uid > 0 ? uid : null
      continue
    }
    if (key === 'isSync') {
      if (typeof v === 'boolean') order.isSync = v
      continue
    }
    ;(order as unknown as Record<string, unknown>)[key] = v === undefined ? null : v
  }

  if ('status' in payload) {
    const incoming = Number(payload.status)
    if (Number.isFinite(incoming)) {
      order.status = Math.max(order.status, incoming)
    }
  }
}

async function replaceOrderItemsFromEvent(orderId: number, items: OrderTrackingEventItem[]) {
  await db.transaction(async (trx) => {
    await TrackingOrderItem.query({ client: trx }).where('trackingOrderId', orderId).delete()
    const sorted = [...items].sort((a, b) => a.lineIndex - b.lineIndex)
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i]
      await TrackingOrderItem.create(
        {
          trackingOrderId: orderId,
          lineIndex: Number.isFinite(Number(row.lineIndex)) ? Number(row.lineIndex) : i,
          codigoItem: row.codigoItem ?? null,
          descripcionItem: row.descripcionItem ?? null,
          cantidad: toFiniteNumberOrNull(row.cantidad) ?? 0,
          precio: toFiniteNumberOrNull(row.precio) ?? 0,
          codigoUnidadVenta: row.codigoUnidadVenta ?? null,
        },
        { client: trx }
      )
    }
  })
}

async function replaceOrderObservationsFromEvent(
  orderId: number,
  observations: OrderTrackingEventObservation[]
) {
  await db.transaction(async (trx) => {
    await TrackingOrderObservation.query({ client: trx })
      .where('trackingOrderId', orderId)
      .delete()
    const sorted = [...observations].sort((a, b) => {
      const aMs = Date.parse(a.createdAt ?? '') || 0
      const bMs = Date.parse(b.createdAt ?? '') || 0
      return aMs - bMs
    })
    for (const row of sorted) {
      const body = String(row.body ?? '').trim()
      if (!body) continue
      const createdAt = parseOptionalDateTime(row.createdAt ?? undefined)
      const updatedAt = parseOptionalDateTime(row.updatedAt ?? undefined)
      const newRow = await TrackingOrderObservation.create(
        {
          trackingOrderId: orderId,
          userId: toFiniteNumberOrNull(row.userId),
          body,
        },
        { client: trx }
      )
      if (createdAt) newRow.createdAt = createdAt
      if (updatedAt) newRow.updatedAt = updatedAt
      if (createdAt || updatedAt) {
        await newRow.save()
      }
    }
  })
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
    const row = await TrackingPublicEvent.create({
      eventId: rowEventId,
      direction: 'outbound',
      eventType: event.eventType,
      orderDocument: doc,
      payload: toJson(event),
      status: TRACKING_PUBLIC_EVENT_STATUS.PENDING,
    })

    const baseUrl = env.get('PUBLIC_TRACKING_BASE_URL')?.trim()
    const outboundOff = env.get('PUBLIC_SYNC_OUTBOUND_ENABLED') === false
    const immediateOff = env.get('PUBLIC_SYNC_IMMEDIATE_FLUSH') === false
    if (baseUrl && !outboundOff && !immediateOff) {
      const fromEnv =
        env.get('PUBLIC_SYNC_IMMEDIATE_FLUSH_LIMIT') ?? env.get('PUBLIC_SYNC_OUTBOUND_LIMIT') ?? 50
      const limit = Number.isFinite(Number(fromEnv))
        ? Math.min(500, Math.max(1, Number(fromEnv)))
        : 50
      void import('#services/tracking_public_sync_service')
        .then(({ default: sync }) => sync.flushOutbound(limit))
        .catch((err) => {
          logger.warn({ err }, 'Flush outbound tras enqueue falló (se reintentará con el scheduler)')
        })
    }

    return row
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

    const payload = event.order
    let order = await TrackingOrder.query().where('numeroDocumento', doc).first()
    if (!order) {
      const base = defaultOrderRow(doc)
      if (!('syncedAt' in payload)) {
        base.syncedAt = parseMaybeDate(event.emittedAt)
      }
      if (!('transportStartedAt' in payload)) {
        base.transportStartedAt = null
      }
      order = await TrackingOrder.create(base)
    }

    applyOrderScalarPatches(order, payload)
    await order.save()

    if ('items' in payload && Array.isArray(payload.items)) {
      await replaceOrderItemsFromEvent(order.id, payload.items)
    }

    if ('observations' in payload && Array.isArray(payload.observations)) {
      await replaceOrderObservationsFromEvent(order.id, payload.observations)
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

  /**
   * Eventos que este lado generó (p. ej. mutaciones de móviles en Railway) y están en su cola outbound.
   * El otro lado los consume por pull para convergencia bidireccional aun sin conexión directa.
   */
  async getChangedOutboundEventsSince(sinceIso: string, limit = 200) {
    const sinceDt = parseMaybeDate(sinceIso)
    const rows = await TrackingPublicEvent.query()
      .where('direction', 'outbound')
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
