import { defineConfig } from '@adonisjs/cors'

// ---------------------------------------------------------------------------
// Read CORS_ORIGIN DIRECTLY from process.env — ground truth, no caching layer
// ---------------------------------------------------------------------------
const RAW_CORS_ORIGIN = process.env.CORS_ORIGIN ?? ''

console.log(
  `[cors] CORS_ORIGIN read from process.env: ${RAW_CORS_ORIGIN || '(not set)'}`
)

/**
 * Normalize an origin string for comparison:
 *   - lowercase
 *   - strip trailing slash
 */
function normalize(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/+$/, '')
}

/**
 * Build the allow-list once at module load time.
 * Each entry is stored as { raw, normalized } so we can echo back the
 * original casing in the response header (required for credentialed requests).
 */
const ALLOW_LIST: Array<{ raw: string; normalized: string }> = RAW_CORS_ORIGIN
  ? RAW_CORS_ORIGIN.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((raw) => ({ raw, normalized: normalize(raw) }))
  : []

console.log(
  `[cors] Allow-list (${ALLOW_LIST.length} entries): ${
    ALLOW_LIST.length
      ? ALLOW_LIST.map((e) => e.raw).join(', ')
      : '(empty — all origins denied)'
  }`
)

const corsConfig = defineConfig({
  enabled: true,

  /**
   * Origin resolver — called on every request that carries an Origin header.
   *
   * Rules (in priority order):
   *  1. CORS_ORIGIN is set → ONLY those origins are allowed; everything else
   *     is denied with `false`. Never fall through to any default.
   *  2. CORS_ORIGIN is not set → deny everything (fail-safe).
   *
   * Returning the original `origin` string (not `true`) is required for
   * credentialed requests so the browser sees an exact-match header value.
   */
  origin: (requestOrigin) => {
    // No Origin header (e.g. same-origin or server-to-server) — allow.
    if (!requestOrigin) {
      console.log('[cors] No Origin header — allowing request')
      return true
    }

    if (ALLOW_LIST.length === 0) {
      // CORS_ORIGIN was not configured — deny everything.
      console.log(
        `[cors] DENY ${requestOrigin} — CORS_ORIGIN not configured, denying all cross-origin requests`
      )
      return false
    }

    const normalizedRequest = normalize(requestOrigin)
    const match = ALLOW_LIST.find((entry) => entry.normalized === normalizedRequest)

    if (match) {
      // Echo back the RAW value from the allow-list (preserves original casing).
      console.log(`[cors] ALLOW ${requestOrigin} → echoing "${match.raw}"`)
      return match.raw
    }

    console.log(
      `[cors] DENY ${requestOrigin} — not in allow-list [${ALLOW_LIST.map((e) => e.raw).join(', ')}]`
    )
    return false
  },

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  headers: true,

  exposeHeaders: [],

  credentials: true,

  maxAge: 90,
})

export default corsConfig
