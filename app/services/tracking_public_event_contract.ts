import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

export const TRACKING_EVENT_SCHEMA_VERSION = 4

export const TRACKING_EVENT_TYPES = {
  ORDER_SYNCED: 'order_synced',
  ORDER_CLAIMED: 'order_claimed',
  ORDER_LOCATION: 'order_location',
  ORDER_COMPLETED: 'order_completed',
  USER_UPSERTED: 'user_upserted',
  USER_DELETED: 'user_deleted',
  VEHICLE_UPSERTED: 'vehicle_upserted',
  VEHICLE_DELETED: 'vehicle_deleted',
  DRIVER_SHIFT_UPSERTED: 'driver_shift_upserted',
  DRIVER_SHIFT_ENDED: 'driver_shift_ended',
  VEHICLE_EXPENSE_UPSERTED: 'vehicle_expense_upserted',
  VEHICLE_EXPENSE_DELETED: 'vehicle_expense_deleted',
} as const

export type TrackingEventType = (typeof TRACKING_EVENT_TYPES)[keyof typeof TRACKING_EVENT_TYPES]
export type TrackingEventSource = 'internal' | 'mobile' | 'public'

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
  source: TrackingEventSource
  idempotencyKey: string
  order?: {
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
  user?: {
    id?: number | null
    email?: string | null
    fullName?: string | null
    role?: string | null
    approvalStatus?: string | null
    approvedBy?: number | null
    approvedAt?: string | null
    avatarUrl?: string | null
    passwordHash?: string | null
    createdAt?: string | null
    updatedAt?: string | null
  } | null
  vehicle?: {
    id?: number | null
    code?: string | null
    name?: string | null
    imageUrl?: string | null
    operationalStatus?: string | null
    odometerKm?: number | null
    createdAt?: string | null
    updatedAt?: string | null
  } | null
  shift?: {
    id?: number | null
    userId?: number | null
    vehicleId?: number | null
    startedAt?: string | null
    endedAt?: string | null
    createdAt?: string | null
    updatedAt?: string | null
  } | null
  expense?: {
    id?: number | null
    vehicleId?: number | null
    expenseType?: string | null
    amount?: number | null
    currency?: string | null
    tripCount?: number | null
    notes?: string | null
    expenseDate?: string | null
    createdAt?: string | null
    updatedAt?: string | null
  } | null
  metadata?: Record<string, unknown>
}

export type OrderRealtimeUpdatePayload = {
  schemaVersion: number
  eventId: string
  eventType: TrackingEventType
  source: TrackingEventSource
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

function normalizeKeyPart(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 40)
}

function resolveEntityKey(base: Omit<OrderTrackingEvent, 'eventId' | 'eventType' | 'emittedAt' | 'idempotencyKey'>) {
  const doc = normalizeDoc(base.order?.numeroDocumento ?? '')
  if (doc) return `order:${normalizeKeyPart(doc)}`
  if (base.user?.id != null) return `user:${normalizeKeyPart(base.user.id)}`
  if (base.user?.email) return `user_email:${normalizeKeyPart(base.user.email)}`
  if (base.vehicle?.id != null) return `vehicle:${normalizeKeyPart(base.vehicle.id)}`
  if (base.vehicle?.code) return `vehicle_code:${normalizeKeyPart(base.vehicle.code)}`
  if (base.shift?.id != null) return `shift:${normalizeKeyPart(base.shift.id)}`
  if (base.expense?.id != null) return `expense:${normalizeKeyPart(base.expense.id)}`
  return 'unknown'
}

export function resolveEventOrderDocument(event: OrderTrackingEvent) {
  const doc = normalizeDoc(event.order?.numeroDocumento ?? '')
  if (doc) return doc
  if (event.user?.id != null) return `user:${String(event.user.id).slice(0, 56)}`
  if (event.vehicle?.id != null) return `vehicle:${String(event.vehicle.id).slice(0, 53)}`
  if (event.shift?.id != null) return `shift:${String(event.shift.id).slice(0, 55)}`
  if (event.expense?.id != null) return `expense:${String(event.expense.id).slice(0, 53)}`
  return `event:${String(event.eventType).slice(0, 58)}`
}

export function createOrderTrackingEvent(
  type: TrackingEventType,
  base: Omit<OrderTrackingEvent, 'eventId' | 'eventType' | 'emittedAt' | 'idempotencyKey'>
): OrderTrackingEvent {
  const doc = normalizeDoc(base.order?.numeroDocumento ?? '')
  const eventId = randomUUID()
  return {
    ...base,
    schemaVersion: TRACKING_EVENT_SCHEMA_VERSION,
    eventId,
    eventType: type,
    emittedAt: DateTime.now().toISO() ?? new Date().toISOString(),
    idempotencyKey: `${type}:${resolveEntityKey(base)}:${eventId}`,
    order: base.order
      ? {
          ...base.order,
          numeroDocumento: doc,
        }
      : undefined,
  }
}

export function createTrackingDomainEvent(
  type: TrackingEventType,
  base: Omit<OrderTrackingEvent, 'eventId' | 'eventType' | 'emittedAt' | 'idempotencyKey'>
) {
  return createOrderTrackingEvent(type, base)
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
  const doc = normalizeDoc(event.order?.numeroDocumento ?? '')
  return {
    schemaVersion: TRACKING_EVENT_SCHEMA_VERSION,
    eventId: String(event.eventId),
    eventType: event.eventType,
    source: event.source,
    emittedAt: event.emittedAt,
    receivedAt: options?.receivedAt ?? DateTime.now().toISO() ?? new Date().toISOString(),
    order: {
      numeroDocumento: doc,
      status: toFiniteNumberOrNull(event.order?.status),
      vehicleId: toFiniteNumberOrNull(event.order?.vehicleId),
    },
    location: normalizeLocation(event),
  }
}
