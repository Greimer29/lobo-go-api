import trackingPublicEventService from '#services/tracking_public_event_service'
import trackingPublicSignatureService from '#services/tracking_public_signature_service'
import env from '#start/env'

class TrackingPublicSyncService {
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
        const signedHeaders = trackingPublicSignatureService.signPayload(payloadRaw)
        const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/public/events`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...signedHeaders,
          },
          body: payloadRaw,
        })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`)
        }
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
