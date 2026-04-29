export function toEventMillis(value: unknown) {
  const ms = Date.parse(String(value ?? ''))
  return Number.isFinite(ms) ? ms : 0
}

export function shouldAcceptRealtimeEventOrder(options: {
  previousEventMs: number
  incomingEventMs: number
  previousEventId?: string
  incomingEventId?: string
}) {
  const { previousEventMs, incomingEventMs, previousEventId, incomingEventId } = options
  if (incomingEventId && previousEventId && incomingEventId === previousEventId) return false
  if (previousEventMs > 0 && incomingEventMs > 0 && incomingEventMs < previousEventMs) return false
  return true
}
