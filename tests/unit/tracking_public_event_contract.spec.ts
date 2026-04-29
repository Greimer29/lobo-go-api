import { test } from '@japa/runner'
import {
  TRACKING_EVENT_SCHEMA_VERSION,
  TRACKING_EVENT_TYPES,
  createOrderTrackingEvent,
  toRealtimeOrderUpdatePayload,
} from '#services/tracking_public_event_contract'

test.group('tracking public event contract', () => {
  test('creates event with schemaVersion and normalized document', ({ assert }) => {
    const event = createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_LOCATION, {
      source: 'mobile',
      order: {
        numeroDocumento: '  0001  ',
        status: 1,
        vehicleId: 12,
      },
      location: {
        latitude: 8.33,
        longitude: -62.68,
      },
      metadata: {},
    })

    assert.equal(event.schemaVersion, TRACKING_EVENT_SCHEMA_VERSION)
    assert.equal(event.order.numeroDocumento, '0001')
    assert.equal(event.eventType, TRACKING_EVENT_TYPES.ORDER_LOCATION)
    assert.isString(event.eventId)
    assert.isString(event.idempotencyKey)
  })

  test('builds normalized realtime payload and drops invalid location', ({ assert }) => {
    const event = createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_LOCATION, {
      source: 'mobile',
      order: {
        numeroDocumento: 'A-10',
        status: 1,
        vehicleId: 5,
      },
      location: {
        latitude: Number.NaN,
        longitude: -66.9,
      },
      metadata: {},
    })

    const payload = toRealtimeOrderUpdatePayload(event, {
      receivedAt: '2026-01-01T00:00:00.000Z',
    })

    assert.equal(payload.schemaVersion, TRACKING_EVENT_SCHEMA_VERSION)
    assert.equal(payload.order.numeroDocumento, 'A-10')
    assert.equal(payload.order.vehicleId, 5)
    assert.equal(payload.receivedAt, '2026-01-01T00:00:00.000Z')
    assert.isNull(payload.location)
  })
})
