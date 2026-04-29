import {
  TRACKING_EVENT_TYPES,
  createOrderTrackingEvent,
} from '#services/tracking_public_event_contract'
import trackingPublicEventService from '#services/tracking_public_event_service'
import env from '#start/env'
import { DateTime } from 'luxon'

type ChangedLocationRow = {
  numeroDocumento: string
  vehicleId: number | null
  latitude: number
  longitude: number
  accuracyMeters: number | null
  speedMps: number | null
  provider: string | null
  recordedAt: string | null
}

class TrackingPublicReconcileService {
  async pullLocationsFromPublic(sinceIso?: string) {
    const base = env.get('PUBLIC_TRACKING_BASE_URL')?.trim()
    if (!base) {
      return { applied: 0, skipped: true, reason: 'PUBLIC_TRACKING_BASE_URL no configurada' }
    }

    const since = sinceIso ?? DateTime.now().minus({ minutes: 10 }).toISO()
    const url = `${base.replace(/\/$/, '')}/api/v1/public/orders/locations/changed?since=${encodeURIComponent(
      String(since)
    )}&limit=500`
    const res = await fetch(url)
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`No se pudo reconciliar ubicaciones: HTTP ${res.status} ${txt}`)
    }
    const payload = (await res.json()) as { rows?: ChangedLocationRow[] }
    const rows = Array.isArray(payload.rows) ? payload.rows : []
    let applied = 0
    for (const row of rows) {
      if (!row.numeroDocumento) continue
      const evt = createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_LOCATION, {
        source: 'public',
        order: {
          numeroDocumento: row.numeroDocumento,
          vehicleId: row.vehicleId,
        },
        location: {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracyMeters: row.accuracyMeters,
          speedMps: row.speedMps,
          provider: row.provider ?? 'public',
          recordedAt: row.recordedAt,
        },
        metadata: { reconciled: true },
      })
      const result = await trackingPublicEventService.receiveInbound(evt)
      if (!result.duplicated) applied += 1
    }
    return { applied, skipped: false as const, since }
  }
}

export default new TrackingPublicReconcileService()
