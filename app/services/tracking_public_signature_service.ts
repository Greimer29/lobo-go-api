import env from '#start/env'
import { createHmac, timingSafeEqual } from 'node:crypto'

const HEADER_TIMESTAMP = 'x-tracking-ts'
const HEADER_SIGNATURE = 'x-tracking-signature'
const HEADER_API_KEY = 'x-tracking-api-key'

function buildRawSignature(secret: string, timestamp: string, payloadRaw: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${payloadRaw}`).digest('hex')
}

function safeEqualHex(a: string, b: string) {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

class TrackingPublicSignatureService {
  signPayload(payloadRaw: string) {
    const timestamp = String(Date.now())
    const secret = env.get('PUBLIC_TRACKING_SIGNING_SECRET')
    const apiKey = env.get('PUBLIC_TRACKING_API_KEY')
    if (!secret) {
      return {
        [HEADER_TIMESTAMP]: timestamp,
        [HEADER_API_KEY]: apiKey ?? '',
      }
    }

    const signature = buildRawSignature(secret, timestamp, payloadRaw)
    return {
      [HEADER_TIMESTAMP]: timestamp,
      [HEADER_SIGNATURE]: signature,
      [HEADER_API_KEY]: apiKey ?? '',
    }
  }

  verifyIncoming(headers: Record<string, unknown>, payloadRaw: string) {
    const acceptUnsigned = env.get('PUBLIC_TRACKING_ACCEPT_UNSIGNED') === true
    const expectedApiKey = env.get('PUBLIC_TRACKING_API_KEY')
    const secret = env.get('PUBLIC_TRACKING_SIGNING_SECRET')

    const apiKey = String(headers[HEADER_API_KEY] ?? '')
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return { ok: false, reason: 'API key inválida' }
    }

    if (!secret) {
      return { ok: true as const }
    }

    const ts = String(headers[HEADER_TIMESTAMP] ?? '')
    const sig = String(headers[HEADER_SIGNATURE] ?? '')
    if (!ts || !sig) {
      if (acceptUnsigned) return { ok: true as const }
      return { ok: false, reason: 'Faltan cabeceras de firma' }
    }

    const now = Date.now()
    const tsN = Number(ts)
    if (!Number.isFinite(tsN) || Math.abs(now - tsN) > 5 * 60 * 1000) {
      return { ok: false, reason: 'Timestamp fuera de ventana' }
    }

    const expected = buildRawSignature(secret, ts, payloadRaw)
    if (!safeEqualHex(expected, sig)) {
      return { ok: false, reason: 'Firma inválida' }
    }
    return { ok: true as const }
  }
}

export default new TrackingPublicSignatureService()
