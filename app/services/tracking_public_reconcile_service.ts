import trackingPublicEventService from '#services/tracking_public_event_service'
import type { OrderTrackingEvent } from '#services/tracking_public_event_contract'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
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
    const lookbackSeconds = Math.max(
      30,
      Number(env.get('PUBLIC_SYNC_RECONCILE_LOOKBACK_SECONDS') ?? 120)
    )
    return DateTime.now().minus({ seconds: lookbackSeconds }).toISO()
  }

  async #pullEndpoint(path: string, base: string, since: string, limit: number) {
    const url = `${base.replace(/\/$/, '')}${path}?since=${encodeURIComponent(
      String(since)
    )}&limit=${limit}`
    const res = await fetch(url)
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`HTTP ${res.status} ${txt || res.statusText} @ ${path}`)
    }
    const payload = (await res.json()) as { events?: OrderTrackingEvent[] }
    return Array.isArray(payload.events) ? payload.events : []
  }

  async #applyEvents(events: OrderTrackingEvent[]) {
    let applied = 0
    for (const event of events) {
      if (!event?.order?.numeroDocumento) continue
      const result = await trackingPublicEventService.receiveInbound(event)
      if (!result.duplicated) applied += 1
    }
    return applied
  }

  /**
   * Pull desde el otro extremo para converger en ambas direcciones:
   * - /public/events/changed         (eventos ya procesados como inbound allá)
   * - /public/events/changed-outbound (eventos generados allá, aún no propagados por HTTP)
   * Aplica cada uno como `receiveInbound` (idempotente por eventId).
   */
  async pullLocationsFromPublic(sinceIso?: string) {
    const base = env.get('PUBLIC_TRACKING_BASE_URL')?.trim()
    if (!base) {
      return { applied: 0, skipped: true, reason: 'PUBLIC_TRACKING_BASE_URL no configurada' }
    }

    const since = this.#resolveSince(sinceIso)
    const limit = Math.max(1, Math.min(Number(env.get('PUBLIC_SYNC_RECONCILE_LIMIT') ?? 500), 1000))

    let applied = 0
    try {
      const inboundEvents = await this.#pullEndpoint(
        '/api/v1/public/events/changed',
        base,
        since,
        limit
      )
      applied += await this.#applyEvents(inboundEvents)
    } catch (err) {
      logger.warn({ err }, 'Reconcile: fallo leyendo /public/events/changed')
    }

    try {
      const outboundEvents = await this.#pullEndpoint(
        '/api/v1/public/events/changed-outbound',
        base,
        since,
        limit
      )
      applied += await this.#applyEvents(outboundEvents)
    } catch (err) {
      logger.warn({ err }, 'Reconcile: fallo leyendo /public/events/changed-outbound (esperado si el otro lado aún no lo expone)')
    }

    this.#cursorIso = DateTime.now().toISO()
    return { applied, skipped: false as const, since }
  }
}

export default new TrackingPublicReconcileService()
