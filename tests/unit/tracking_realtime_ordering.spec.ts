import { test } from '@japa/runner'
import { shouldAcceptRealtimeEventOrder, toEventMillis } from '#services/tracking_realtime_ordering'

test.group('tracking realtime ordering', () => {
  test('rejects duplicated event ids', ({ assert }) => {
    const ok = shouldAcceptRealtimeEventOrder({
      previousEventMs: 1000,
      incomingEventMs: 1001,
      previousEventId: 'evt-1',
      incomingEventId: 'evt-1',
    })
    assert.isFalse(ok)
  })

  test('rejects delayed events older than last accepted', ({ assert }) => {
    const ok = shouldAcceptRealtimeEventOrder({
      previousEventMs: 5000,
      incomingEventMs: 1000,
      previousEventId: 'evt-1',
      incomingEventId: 'evt-2',
    })
    assert.isFalse(ok)
  })

  test('accepts new event and parses date safely', ({ assert }) => {
    const ms = toEventMillis('2026-01-01T00:00:00.000Z')
    assert.isAbove(ms, 0)
    const ok = shouldAcceptRealtimeEventOrder({
      previousEventMs: ms,
      incomingEventMs: ms + 1000,
      previousEventId: 'evt-1',
      incomingEventId: 'evt-2',
    })
    assert.isTrue(ok)
  })

  test('accepts event when timestamps are missing but id is new', ({ assert }) => {
    const ok = shouldAcceptRealtimeEventOrder({
      previousEventMs: 0,
      incomingEventMs: 0,
      previousEventId: 'evt-1',
      incomingEventId: 'evt-2',
    })
    assert.isTrue(ok)
  })

  test('returns zero millis for invalid date', ({ assert }) => {
    const ms = toEventMillis('invalid-date')
    assert.equal(ms, 0)
  })
})
