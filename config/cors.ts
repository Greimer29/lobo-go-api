import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

/**
 * Normalise an origin string for comparison:
 * - lowercase
 * - strip a single trailing slash
 */
function normaliseOrigin(origin: string): string {
  return origin.toLowerCase().replace(/\/$/, '')
}

/**
 * Read CORS_ORIGIN from process.env directly (primary) and from the
 * AdonisJS Env service (fallback) so that Railway runtime variables are
 * always picked up, even if the Env service cached an earlier value.
 */
function readRawCorsOrigin(): string | undefined {
  // process.env is the ground truth for Railway-injected variables.
  const fromProcess = process.env['CORS_ORIGIN']
  if (fromProcess && typeof fromProcess === 'string' && fromProcess.trim().length > 0) {
    return fromProcess.trim()
  }
  // Fallback to the AdonisJS Env service (handles .env files in dev).
  const fromEnv = env.get('CORS_ORIGIN')
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim()
  }
  return undefined
}

/**
 * Parse and cache the explicit allow-list at module load time.
 * Each entry is normalised (lowercase, no trailing slash) for comparison.
 */
function buildAllowList(): string[] {
  const raw = readRawCorsOrigin()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => normaliseOrigin(s.trim()))
    .filter(Boolean)
}

const EXPLICIT_ORIGINS: string[] = buildAllowList()

// Log the resolved configuration once at startup so it is visible in
// Railway's deployment logs and makes debugging straightforward.
console.log('[cors] CORS_ORIGIN raw  :', process.env['CORS_ORIGIN'] ?? '(not set)')
console.log('[cors] CORS_ALLOW_LAN   :', process.env['CORS_ALLOW_LAN'] ?? '(not set)')
console.log('[cors] explicit origins :', EXPLICIT_ORIGINS.length > 0 ? EXPLICIT_ORIGINS : '(none)')

/**
 * Orígenes típicos de la LAN (HTTP/HTTPS, cualquier puerto).
 */
function isPrivateLanOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true
    }
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true
    }
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true
    }
    const m = /^172\.(\d{1,3})\./.exec(hostname)
    if (m) {
      const second = Number(m[1])
      if (second >= 16 && second <= 31) {
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

const corsConfig = defineConfig({
  enabled: true,

  /**
   * Con credenciales, el navegador exige un origen concreto (no `*`).
   * Devolvemos el mismo `Origin` cuando está permitido.
   *
   * Priority order:
   *   1. CORS_ORIGIN explicit allow-list (takes absolute priority when set)
   *   2. CORS_ALLOW_LAN=true  → allow any RFC-1918 / loopback origin
   *   3. Development mode     → allow all origins
   *   4. Default              → deny (return false)
   */
  origin: (requestOrigin) => {
    // --- 1. Explicit allow-list ---
    if (EXPLICIT_ORIGINS.length > 0) {
      if (!requestOrigin) {
        // Non-browser / server-to-server request with no Origin header.
        return true
      }
      const normalised = normaliseOrigin(requestOrigin)
      const allowed = EXPLICIT_ORIGINS.includes(normalised)
      console.log(
        `[cors] origin check: "${requestOrigin}" → normalised "${normalised}" → ${allowed ? 'ALLOWED' : 'DENIED'}`
      )
      // Return the original (un-normalised) value so the browser receives
      // the exact Origin it sent, which is required for credentialed requests.
      return allowed ? requestOrigin : false
    }

    // --- 2. LAN allow-all ---
    if (env.get('CORS_ALLOW_LAN') === true || process.env['CORS_ALLOW_LAN'] === 'true') {
      if (!requestOrigin) return true
      return isPrivateLanOrigin(requestOrigin) ? requestOrigin : false
    }

    // --- 3. Development ---
    if (app.inDev) {
      return requestOrigin ?? true
    }

    // --- 4. Deny by default ---
    return false
  },

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  headers: true,

  exposeHeaders: [],

  credentials: true,

  maxAge: 90,
})

export default corsConfig
