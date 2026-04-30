import trackingPublicEventService from '#services/tracking_public_event_service'
import type { OrderTrackingEvent } from '#services/tracking_public_event_contract'
import env from '#start/env'
import { DateTime } from 'luxon'

class TrackingPublicReconcileService {
  #cursorIso: string | null = null

  #resolveSince(sinceIso?: string) {
    if (sinceIso && String(sinceIso).trim().length > 0) {
      return String(sinceIso)
    }
    if (this.#cursorIso) {
      return this.#cursorIso
    }
    const lookbackSeconds = Math.max(30, Number(env.get('PUBLIC_SYNC_RECONCILE_LOOKBACK_SECONDS') ?? 120))
    return DateTime.now().minus({ seconds: lookbackSeconds }).toISO()
  }

  async pullLocationsFromPublic(sinceIso?: string) {
    const base = env.get('PUBLIC_TRACKING_BASE_URL')?.trim()
    if (!base) {
      return { applied: 0, skipped: true, reason: 'PUBLIC_TRACKING_BASE_URL no configurada' }
    }

    const since = this.#resolveSince(sinceIso)
    const limit = Math.max(1, Math.min(Number(env.get('PUBLIC_SYNC_RECONCILE_LIMIT') ?? 500), 1000))
    const url = `${base.replace(/\/$/, '')}/api/v1/public/events/changed?since=${encodeURIComponent(
      String(since)
    )}&limit=${limit}`
    const res = await fetch(url)
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`No se pudo reconciliar eventos: HTTP ${res.status} ${txt}`)
    }
    const payload = (await res.json()) as { events?: OrderTrackingEvent[] }
    const events = Array.isArray(payload.events) ? payload.events : []
    let applied = 0
    for (const event of events) {
      if (!event?.order?.numeroDocumento) continue
      const result = await trackingPublicEventService.receiveInbound(event)
      if (!result.duplicated) applied += 1
    }
    this.#cursorIso = DateTime.now().toISO()
    return { applied, skipped: false as const, since }
  }
}

export default new TrackingPublicReconcileService()
