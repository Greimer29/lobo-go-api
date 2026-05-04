import env from '#start/env'
import trackingRealtimeMetricsService from '#services/tracking_realtime_metrics_service'
import { shouldAcceptRealtimeEventOrder, toEventMillis } from '#services/tracking_realtime_ordering'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Socket } from 'node:net'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'

type SocketCtx = {
  ws: WebSocket
  subscribedDoc: string | null
  isAlive: boolean
}

function parseDoc(value: unknown) {
  return String(value ?? '').trim()
}

class TrackingPublicRealtimeHubService {
  #server: WebSocketServer | null = null
  #clients = new Set<SocketCtx>()
  #started = false
  #lastEmittedAtByDoc = new Map<string, number>()
  #lastEventIdByDoc = new Map<string, string>()
  #upgradeHandlerAttached = false

  start(nodeServer?: {
    on: (event: 'upgrade', listener: (req: IncomingMessage, socket: Socket, head: Buffer) => void) => void
  }) {
    if (this.#started) return
    this.#started = true

    if (nodeServer) {
      this.#server = new WebSocketServer({
        noServer: true,
      })
      if (!this.#upgradeHandlerAttached) {
        nodeServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
          try {
            const host = request.headers.host ?? 'localhost'
            const url = new URL(request.url ?? '/', `http://${host}`)
            if (url.pathname !== '/ws/public-tracking') {
              return
            }
            this.#server?.handleUpgrade(request, socket, head, (ws) => {
              this.#server?.emit('connection', ws, request)
            })
          } catch {
            try {
              socket.destroy()
            } catch {}
          }
        })
        this.#upgradeHandlerAttached = true
      }
      console.log('[public-ws] attached to HTTP server path /ws/public-tracking')
    } else {
      const port = env.get('PORT') + 1
      this.#server = new WebSocketServer({
        port,
        host: '0.0.0.0',
        path: '/ws/public-tracking',
      })
      console.log(`[public-ws] listening on ${port}`)
    }

    this.#server.on('connection', (ws: WebSocket) => this.#onConnection(ws))
    this.#server.on('error', (error: Error) => {
      // Mantener el API vivo aunque el puerto WS falle (p. ej. ya ocupado).
      console.error('[public-ws] error', error?.message ?? error)
    })
    setInterval(() => this.#heartbeat(), 25_000)
  }

  #onConnection(ws: WebSocket) {
    const ctx: SocketCtx = { ws, subscribedDoc: null, isAlive: true }
    trackingRealtimeMetricsService.markWsConnection()
    this.#clients.add(ctx)
    ws.on('pong', () => {
      ctx.isAlive = true
    })
    ws.on('message', (raw: RawData) => {
      try {
        const payload = JSON.parse(String(raw))
        if (payload?.type === 'subscribe') {
          ctx.subscribedDoc = parseDoc(payload.numeroDocumento)
          ws.send(
            JSON.stringify({
              type: 'subscribed',
              numeroDocumento: ctx.subscribedDoc,
              ts: new Date().toISOString(),
            })
          )
          return
        }
        if (payload?.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: new Date().toISOString() }))
        }
      } catch {
        trackingRealtimeMetricsService.markWsPayloadError()
        ws.send(JSON.stringify({ type: 'error', message: 'Payload WS inválido' }))
      }
    })

    ws.on('close', () => {
      this.#clients.delete(ctx)
    })
  }

  #heartbeat() {
    for (const client of this.#clients) {
      if (client.ws.readyState !== client.ws.OPEN) {
        this.#clients.delete(client)
        continue
      }
      if (!client.isAlive) {
        try {
          client.ws.terminate()
        } finally {
          this.#clients.delete(client)
        }
        continue
      }
      client.isAlive = false
      client.ws.ping()
    }
  }

  #shouldSkipOutOfOrder(doc: string, payload: Record<string, unknown>) {
    const incomingEventMs = toEventMillis(payload?.emittedAt ?? payload?.receivedAt)
    const incomingEventId = String(payload?.eventId ?? '')
    const previousEventMs = this.#lastEmittedAtByDoc.get(doc) ?? 0
    const previousEventId = this.#lastEventIdByDoc.get(doc) ?? ''
    const accepted = shouldAcceptRealtimeEventOrder({
      previousEventMs,
      incomingEventMs,
      previousEventId,
      incomingEventId,
    })
    if (!accepted) {
      trackingRealtimeMetricsService.markEventDroppedOutOfOrder()
      return true
    }
    if (incomingEventMs > 0) this.#lastEmittedAtByDoc.set(doc, incomingEventMs)
    if (incomingEventId) this.#lastEventIdByDoc.set(doc, incomingEventId)
    return false
  }

  publishOrderUpdate(numeroDocumento: string, payload: Record<string, unknown>) {
    const doc = parseDoc(numeroDocumento)
    if (!doc) return
    if (this.#shouldSkipOutOfOrder(doc, payload)) return
    trackingRealtimeMetricsService.markEventPublished()
    const emittedMs = toEventMillis(payload?.emittedAt)
    if (emittedMs > 0) {
      trackingRealtimeMetricsService.setLastEventLatencyMs(Math.max(0, Date.now() - emittedMs))
    }
    const msg = JSON.stringify({
      type: 'order_update',
      numeroDocumento: doc,
      payload,
    })
    for (const client of this.#clients) {
      if (client.subscribedDoc && client.subscribedDoc !== doc) continue
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(msg)
      }
    }
  }
}

export default new TrackingPublicRealtimeHubService()
