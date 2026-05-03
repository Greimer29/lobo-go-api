import trackingPublicEventService from '#services/tracking_public_event_service'
import type { OrderTrackingEvent } from '#services/tracking_public_event_contract'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableHttpStatus(status: number) {
  return status === 408 || status === 429 || status >= 500
}

function isRetryableNetworkError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  const upper = msg.toUpperCase()
  return (
    upper.includes('ECONNRESET') ||
    upper.includes('ETIMEDOUT') ||
    upper.includes('UND_ERR') ||
    upper.includes('NETWORKERROR') ||
    upper.includes('FETCH FAILED') ||
    upper.includes('ABORT')
  )
}

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
    const timeoutMs = Math.max(2000, Math.min(Number(env.get('PUBLIC_SYNC_HTTP_TIMEOUT_MS') ?? 9000), 60000))
    const retries = Math.max(0, Math.min(Number(env.get('PUBLIC_SYNC_HTTP_RETRIES') ?? 2), 8))
    const backoffBaseMs = Math.max(
      150,
      Math.min(Number(env.get('PUBLIC_SYNC_HTTP_RETRY_BASE_MS') ?? 500), 10000)
    )

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          const txt = await res.text()
          const err = new Error(`HTTP ${res.status} ${txt || res.statusText} @ ${path}`)
          ;(err as Error & { retryable?: boolean }).retryable = isRetryableHttpStatus(res.status)
          throw err
        }
        const payload = (await res.json()) as { events?: OrderTrackingEvent[] }
        return Array.isArray(payload.events) ? payload.events : []
      } catch (err) {
        const retryable =
          (err as Error & { retryable?: boolean })?.retryable === true ||
          isRetryableNetworkError(err)
        if (attempt >= retries || !retryable) {
          throw err
        }
        const backoffMs = backoffBaseMs * 2 ** attempt
        logger.warn(
          { err, path, attempt: attempt + 1, retries, backoffMs },
          'Reconcile: request transitorio, reintentando pull'
        )
        await sleep(backoffMs)
      } finally {
        clearTimeout(timeoutId)
      }
    }
    return []
  }

  async #applyEvents(events: OrderTrackingEvent[]) {
    let applied = 0
    for (const event of events) {
      if (!event?.eventId || !event?.eventType) continue
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
  async pullEventsFromPublic(sinceIso?: string) {
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

  /** @deprecated mantener compatibilidad con comandos existentes */
  async pullLocationsFromPublic(sinceIso?: string) {
    return this.pullEventsFromPublic(sinceIso)
  }
}

export default new TrackingPublicReconcileService()
