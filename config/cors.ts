import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

function parseExplicitOrigins(): string[] {
  const raw = env.get('CORS_ORIGIN')
  if (!raw || typeof raw !== 'string') {
    return []
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

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
   */
  origin: (origin) => {
    const explicit = parseExplicitOrigins()
    if (explicit.length > 0) {
      if (!origin) {
        return true
      }
      return explicit.includes(origin) ? origin : false
    }

    if (env.get('CORS_ALLOW_LAN') === true) {
      if (!origin) {
        return true
      }
      return isPrivateLanOrigin(origin) ? origin : false
    }

    if (app.inDev) {
      if (!origin) {
        return true
      }
      return origin
    }

    return false
  },

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  headers: true,

  exposeHeaders: [],

  credentials: true,

  maxAge: 90,
})

export default corsConfig
