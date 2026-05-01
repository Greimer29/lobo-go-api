import trackingPublicEventService from '#services/tracking_public_event_service'
import TrackingPublicEvent, { TRACKING_PUBLIC_EVENT_STATUS } from '#models/tracking_public_event'
import type { OrderTrackingEvent } from '#services/tracking_public_event_contract'
import trackingRealtimeMetricsService from '#services/tracking_realtime_metrics_service'
import trackingPublicSignatureService from '#services/tracking_public_signature_service'
import type { HttpContext } from '@adonisjs/core/http'

function parseIncomingHeaders(request: HttpContext['request']) {
  return {
    'x-tracking-api-key': request.header('x-tracking-api-key'),
    'x-tracking-ts': request.header('x-tracking-ts'),
    'x-tracking-signature': request.header('x-tracking-signature'),
  }
}

export default class PublicTrackingController {
  async ingestEvent({ request, response }: HttpContext) {
    const payloadRaw = request.raw() || '{}'
    const verify = trackingPublicSignatureService.verifyIncoming(
      parseIncomingHeaders(request),
      payloadRaw
    )
    if (!verify.ok) {
      return response.unauthorized({ message: verify.reason })
    }

    let event: OrderTrackingEvent
    try {
      event = JSON.parse(payloadRaw) as OrderTrackingEvent
    } catch {
      return response.badRequest({ message: 'JSON inválido en el cuerpo de la petición' })
    }

    if (!event?.eventId || !event?.eventType || !event?.order?.numeroDocumento) {
      return response.badRequest({
        message: 'Payload inválido: se requiere eventId, eventType y order.numeroDocumento',
      })
    }

    const result = await trackingPublicEventService.receiveInbound(event)
    if (result.duplicated) {
      return response.ok({ duplicated: true, message: 'Evento ya procesado', event: result.event })
    }
    return response.created({ duplicated: false, message: 'Evento procesado', event: result.event })
  }

  async latestLocation({ params, response }: HttpContext) {
    const location = await trackingPublicEventService.getLatestLocation(
      String(params.numeroDocumento ?? '')
    )
    if (!location) {
      return response.notFound({ message: 'No hay ubicación para este pedido' })
    }
    return response.ok({
      numeroDocumento: location.orderDocument,
      location: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        accuracyMeters: location.accuracyMeters,
        speedMps: location.speedMps,
        provider: location.provider,
        recordedAt: location.recordedAt.toISO(),
      },
      vehicleId: location.vehicleId,
      trackingOrderId: location.trackingOrderId,
    })
  }

  async timeline({ params, request, response }: HttpContext) {
    const limit = Number(request.input('limit', 40))
    const data = await trackingPublicEventService.getTimeline(
      String(params.numeroDocumento ?? ''),
      Number.isFinite(limit) ? limit : 40
    )
    return response.ok({
      numeroDocumento: String(params.numeroDocumento ?? ''),
      events: data,
    })
  }

  async changedLocations({ request, response }: HttpContext) {
    const since = String(request.input('since', new Date(Date.now() - 5 * 60 * 1000).toISOString()))
    const limit = Number(request.input('limit', 200))
    const rows = await trackingPublicEventService.getChangedLocationsSince(
      since,
      Number.isFinite(limit) ? limit : 200
    )
    return response.ok({
      since,
      count: rows.length,
      rows: rows.map((row) => ({
        numeroDocumento: row.orderDocument,
        trackingOrderId: row.trackingOrderId,
        vehicleId: row.vehicleId,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        accuracyMeters: row.accuracyMeters,
        speedMps: row.speedMps,
        provider: row.provider,
        recordedAt: row.recordedAt.toISO(),
      })),
    })
  }

  async changedEvents({ request, response }: HttpContext) {
    const since = String(request.input('since', new Date(Date.now() - 5 * 60 * 1000).toISOString()))
    const limit = Number(request.input('limit', 200))
    const events = await trackingPublicEventService.getChangedInboundEventsSince(
      since,
      Number.isFinite(limit) ? limit : 200
    )
    return response.ok({
      since,
      count: events.length,
      events,
    })
  }

  /**
   * Expone los eventos generados por este lado (direction='outbound') para que el otro extremo
   * los pulle y aplique. Habilita reconciliación Railway→Local cuando Railway no puede alcanzar local.
   */
  async changedOutboundEvents({ request, response }: HttpContext) {
    const since = String(request.input('since', new Date(Date.now() - 5 * 60 * 1000).toISOString()))
    const limit = Number(request.input('limit', 200))
    const events = await trackingPublicEventService.getChangedOutboundEventsSince(
      since,
      Number.isFinite(limit) ? limit : 200
    )
    return response.ok({
      since,
      count: events.length,
      events,
    })
  }

  async metrics({ response }: HttpContext) {
    const [pending, failed, sent] = await Promise.all([
      TrackingPublicEvent.query()
        .where('direction', 'outbound')
        .where('status', TRACKING_PUBLIC_EVENT_STATUS.PENDING)
        .count('* as total')
        .first(),
      TrackingPublicEvent.query()
        .where('direction', 'outbound')
        .where('status', TRACKING_PUBLIC_EVENT_STATUS.FAILED)
        .count('* as total')
        .first(),
      TrackingPublicEvent.query()
        .where('direction', 'outbound')
        .where('status', TRACKING_PUBLIC_EVENT_STATUS.SENT)
        .count('* as total')
        .first(),
    ])
    return response.ok({
      outbox: {
        pending: Number(pending?.$extras.total ?? 0),
        failed: Number(failed?.$extras.total ?? 0),
        sent: Number(sent?.$extras.total ?? 0),
      },
      ws: {
        port: process.env.PUBLIC_TRACKING_WS_PORT ?? null,
      },
      realtime: trackingRealtimeMetricsService.snapshot(),
    })
  }
}
