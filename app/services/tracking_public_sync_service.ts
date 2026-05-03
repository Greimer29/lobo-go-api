import trackingPublicEventService from '#services/tracking_public_event_service'
import trackingPublicSignatureService from '#services/tracking_public_signature_service'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableHttpStatus(status: number) {
  return status === 408 || status === 429 || status >= 500
}

function isDuplicateEventError(status: number, bodyText: string) {
  const txt = String(bodyText ?? '').toLowerCase()
  if (status === 409) return true
  return (
    txt.includes('duplicate entry') &&
    (txt.includes('tracking_public_events_event_id_unique') || txt.includes('event_id_unique'))
  )
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

class TrackingPublicSyncService {
  async #postEventWithRetry(base: string, payloadRaw: string) {
    const timeoutMs = Math.max(2000, Math.min(Number(env.get('PUBLIC_SYNC_HTTP_TIMEOUT_MS') ?? 9000), 60000))
    const retries = Math.max(0, Math.min(Number(env.get('PUBLIC_SYNC_HTTP_RETRIES') ?? 2), 8))
    const backoffBaseMs = Math.max(
      150,
      Math.min(Number(env.get('PUBLIC_SYNC_HTTP_RETRY_BASE_MS') ?? 500), 10000)
    )
    const url = `${base.replace(/\/$/, '')}/api/v1/public/events`
    const signedHeaders = trackingPublicSignatureService.signPayload(payloadRaw)

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...signedHeaders,
          },
          body: payloadRaw,
          signal: controller.signal,
        })
        if (!res.ok) {
          const txt = await res.text()
          if (isDuplicateEventError(res.status, txt)) {
            // El remoto ya recibió este eventId antes; tratamos como éxito idempotente.
            return
          }
          const err = new Error(`HTTP ${res.status}: ${txt || res.statusText}`)
          ;(err as Error & { retryable?: boolean }).retryable = isRetryableHttpStatus(res.status)
          throw err
        }
        return
      } catch (err) {
        const retryable =
          (err as Error & { retryable?: boolean })?.retryable === true ||
          isRetryableNetworkError(err)
        if (attempt >= retries || !retryable) {
          throw err
        }
        const backoffMs = backoffBaseMs * 2 ** attempt
        logger.warn(
          { err, attempt: attempt + 1, retries, backoffMs },
          'Public sync outbound: request transitorio, reintentando'
        )
        await sleep(backoffMs)
      } finally {
        clearTimeout(timeoutId)
      }
    }
  }

  async flushOutbound(limit = 50) {
    const base = env.get('PUBLIC_TRACKING_BASE_URL')?.trim()
    if (!base) {
      return {
        sent: 0,
        failed: 0,
        skipped: true,
        reason: 'PUBLIC_TRACKING_BASE_URL no configurada',
      }
    }

    const rows = await trackingPublicEventService.getPendingOutbound(limit)
    let sent = 0
    let failed = 0
    for (const row of rows) {
      try {
        const payloadRaw = row.payload
        await this.#postEventWithRetry(base, payloadRaw)
        await trackingPublicEventService.markOutboundSent(row.eventId)
        sent += 1
      } catch (error) {
        await trackingPublicEventService.markOutboundFailed(
          row.eventId,
          error instanceof Error ? error.message : String(error)
        )
        failed += 1
      }
    }
    return { sent, failed, skipped: false }
  }
}

export default new TrackingPublicSyncService()
