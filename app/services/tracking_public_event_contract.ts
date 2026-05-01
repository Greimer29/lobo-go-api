import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

export const TRACKING_EVENT_SCHEMA_VERSION = 3

export const TRACKING_EVENT_TYPES = {
  ORDER_SYNCED: 'order_synced',
  ORDER_CLAIMED: 'order_claimed',
  ORDER_LOCATION: 'order_location',
  ORDER_COMPLETED: 'order_completed',
} as const

export type TrackingEventType = (typeof TRACKING_EVENT_TYPES)[keyof typeof TRACKING_EVENT_TYPES]

/** Línea de factura incluida en `order_synced` (snapshot hacia API pública). */
export type OrderTrackingEventItem = {
  lineIndex: number
  codigoItem?: string | null
  descripcionItem?: string | null
  cantidad: number
  precio: number
  codigoUnidadVenta?: string | null
}

/**
 * Observación del traslado incluida en `order_synced`. Si se envía el array,
 * se reemplaza la lista completa en destino (fuente de verdad = emisor).
 */
export type OrderTrackingEventObservation = {
  externalId?: number | null
  userId?: number | null
  userFullName?: string | null
  body: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type OrderTrackingEvent = {
  schemaVersion?: number
  eventId: string
  eventType: TrackingEventType
  emittedAt: string
  source: 'internal' | 'mobile' | 'public'
  idempotencyKey: string
  order: {
    numeroDocumento: string
    status?: number | null
    vehicleId?: number | null
    syncedAt?: string | null
    transportStartedAt?: string | null
    completedAt?: string | null
    descripcionPedido?: string | null
    montoTotal?: number
    estadoCodigo?: string | null
    tipoFactura?: string | null
    codigoUbicacion?: string | null
    codigoVendedor?: string | null
    originDepotCode?: string | null
    originName?: string | null
    originAddress?: string | null
    originLat?: number | null
    originLng?: number | null
    destinationAddress?: string | null
    destinationLat?: number | null
    destinationLng?: number | null
    destinationSource?: string | null
    destinationMapsLink?: string | null
    claimedByUserId?: number | null
    isSync?: boolean
    adminReaction?: string | null
    adminFeedbackAt?: string | null
    /** Si viene en el evento, reemplaza las líneas del pedido en destino (puede ser `[]`). */
    items?: OrderTrackingEventItem[]
    /** Si viene en el evento, reemplaza las observaciones del traslado en destino. */
    observations?: OrderTrackingEventObservation[]
  }
  location?: {
    latitude: number
    longitude: number
    accuracyMeters?: number | null
    speedMps?: number | null
    provider?: string | null
    recordedAt?: string | null
  } | null
  metadata?: Record<string, unknown>
}

export type OrderRealtimeUpdatePayload = {
  schemaVersion: number
  eventId: string
  eventType: TrackingEventType
  source: 'internal' | 'mobile' | 'public'
  emittedAt: string
  receivedAt: string
  order: {
    numeroDocumento: string
    status: number | null
    vehicleId: number | null
  }
  location: {
    latitude: number
    longitude: number
    accuracyMeters: number | null
    speedMps: number | null
    provider: string | null
    recordedAt: string
  } | null
}

function normalizeDoc(numeroDocumento: string) {
  return String(numeroDocumento || '').trim()
}

export function createOrderTrackingEvent(
  type: TrackingEventType,
  base: Omit<OrderTrackingEvent, 'eventId' | 'eventType' | 'emittedAt' | 'idempotencyKey'>
): OrderTrackingEvent {
  const doc = normalizeDoc(base.order.numeroDocumento)
  const eventId = randomUUID()
  return {
    ...base,
    schemaVersion: TRACKING_EVENT_SCHEMA_VERSION,
    eventId,
    eventType: type,
    emittedAt: DateTime.now().toISO() ?? new Date().toISOString(),
    idempotencyKey: `${type}:${doc}:${eventId}`,
    order: {
      ...base.order,
      numeroDocumento: doc,
    },
  }
}

function toFiniteNumberOrNull(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeLocation(event: OrderTrackingEvent) {
  const latitude = toFiniteNumberOrNull(event.location?.latitude)
  const longitude = toFiniteNumberOrNull(event.location?.longitude)
  if (latitude === null || longitude === null) return null

  return {
    latitude,
    longitude,
    accuracyMeters: toFiniteNumberOrNull(event.location?.accuracyMeters),
    speedMps: toFiniteNumberOrNull(event.location?.speedMps),
    provider: event.location?.provider ? String(event.location.provider) : null,
    recordedAt: event.location?.recordedAt ?? event.emittedAt,
  }
}

export function toRealtimeOrderUpdatePayload(
  event: OrderTrackingEvent,
  options?: {
    receivedAt?: string
  }
): OrderRealtimeUpdatePayload {
  const doc = normalizeDoc(event.order.numeroDocumento)
  return {
    schemaVersion: TRACKING_EVENT_SCHEMA_VERSION,
    eventId: String(event.eventId),
    eventType: event.eventType,
    source: event.source,
    emittedAt: event.emittedAt,
    receivedAt: options?.receivedAt ?? DateTime.now().toISO() ?? new Date().toISOString(),
    order: {
      numeroDocumento: doc,
      status: toFiniteNumberOrNull(event.order.status),
      vehicleId: toFiniteNumberOrNull(event.order.vehicleId),
    },
    location: normalizeLocation(event),
  }
}
