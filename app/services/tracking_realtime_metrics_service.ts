class TrackingRealtimeMetricsService {
  #wsConnections = 0
  #wsReconnects = 0
  #wsPayloadErrors = 0
  #eventsPublished = 0
  #eventsDroppedOutOfOrder = 0
  #locationPublished = 0
  #locationRejected = 0
  #lastEventLatencyMs = 0

  markWsConnection() {
    this.#wsConnections += 1
  }

  markWsReconnect() {
    this.#wsReconnects += 1
  }

  markWsPayloadError() {
    this.#wsPayloadErrors += 1
  }

  markEventPublished() {
    this.#eventsPublished += 1
  }

  markEventDroppedOutOfOrder() {
    this.#eventsDroppedOutOfOrder += 1
  }

  markLocationPublished() {
    this.#locationPublished += 1
  }

  markLocationRejected() {
    this.#locationRejected += 1
  }

  setLastEventLatencyMs(value: number) {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0) {
      this.#lastEventLatencyMs = Math.round(n)
    }
  }

  snapshot() {
    return {
      wsConnections: this.#wsConnections,
      wsReconnects: this.#wsReconnects,
      wsPayloadErrors: this.#wsPayloadErrors,
      eventsPublished: this.#eventsPublished,
      eventsDroppedOutOfOrder: this.#eventsDroppedOutOfOrder,
      locationPublished: this.#locationPublished,
      locationRejected: this.#locationRejected,
      lastEventLatencyMs: this.#lastEventLatencyMs,
    }
  }
}

export default new TrackingRealtimeMetricsService()
