import TrackingOrderLocation from '#models/tracking_order_location'
import TrackingPublicEvent, { TRACKING_PUBLIC_EVENT_STATUS } from '#models/tracking_public_event'
import trackingRealtimeMetricsService from '#services/tracking_realtime_metrics_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class PublicTrackingController {
  async latestLocation({ params, response }: HttpContext) {
    const location = await TrackingOrderLocation.query()
      .where('orderDocument', String(params.numeroDocumento ?? ''))
      .first()
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
    const data = await TrackingPublicEvent.query()
      .where('orderDocument', String(params.numeroDocumento ?? ''))
      .where('direction', 'inbound')
      .orderBy('createdAt', 'desc')
      .limit(Math.max(1, Math.min(Number.isFinite(limit) ? limit : 40, 200)))
    return response.ok({
      numeroDocumento: String(params.numeroDocumento ?? ''),
      events: data.map((row) => {
        try {
          return JSON.parse(row.payload)
        } catch {
          return row.payload
        }
      }),
    })
  }

  async metrics({ response }: HttpContext) {
    return response.ok({
      events: {
        inboundProcessed: Number(
          (
            await TrackingPublicEvent.query()
              .where('direction', 'inbound')
              .where('status', TRACKING_PUBLIC_EVENT_STATUS.PROCESSED)
              .count('* as total')
              .first()
          )?.$extras.total ?? 0
        ),
      },
      ws: {
        port: process.env.PUBLIC_TRACKING_WS_PORT ?? null,
      },
      realtime: trackingRealtimeMetricsService.snapshot(),
    })
  }
}
