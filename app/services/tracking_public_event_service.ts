import TrackingOrder from '#models/tracking_order'
import TrackingOrderItem from '#models/tracking_order_item'
import TrackingOrderLocation from '#models/tracking_order_location'
import TrackingOrderObservation from '#models/tracking_order_observation'
import TrackingPublicEvent, { TRACKING_PUBLIC_EVENT_STATUS } from '#models/tracking_public_event'
import User from '#models/user'
import Vehicle from '#models/vehicle'
import DriverShift from '#models/driver_shift'
import VehicleExpense from '#models/vehicle_expense'
import {
  TRACKING_EVENT_TYPES,
  type OrderTrackingEvent,
  type OrderTrackingEventItem,
  type OrderTrackingEventObservation,
  createOrderTrackingEvent,
  resolveEventOrderDocument,
  toRealtimeOrderUpdatePayload,
  type TrackingEventType,
} from '#services/tracking_public_event_contract'
import trackingPublicRealtimeHubService from '#services/tracking_public_realtime_hub_service'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { DateTime } from 'luxon'

function toJson(event: OrderTrackingEvent) {
  return JSON.stringify(event)
}

function parseJson(value: string): OrderTrackingEvent {
  return JSON.parse(value) as OrderTrackingEvent
}

function parseMaybeDate(v: string | null | undefined) {
  if (!v) return DateTime.now()
  const dt = DateTime.fromISO(v)
  return dt.isValid ? dt : DateTime.now()
}

function normalizeDoc(numeroDocumento: string) {
  return String(numeroDocumento || '').trim()
}

function normalizeCode(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function toMillis(value: string | null | undefined) {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

function toFiniteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseOptionalDateTime(v: string | null | undefined): DateTime | null {
  if (!v) return null
  const dt = DateTime.fromISO(v)
  return dt.isValid ? dt : null
}

const ORDER_PATCH_KEYS = [
  'descripcionPedido',
  'montoTotal',
  'estadoCodigo',
  'tipoFactura',
  'codigoUbicacion',
  'codigoVendedor',
  'originDepotCode',
  'originName',
  'originAddress',
  'originLat',
  'originLng',
  'destinationAddress',
  'destinationLat',
  'destinationLng',
  'destinationSource',
  'destinationMapsLink',
  'claimedByUserId',
  'isSync',
  'adminReaction',
] as const

type OrderPatchKey = (typeof ORDER_PATCH_KEYS)[number]

function defaultOrderRow(doc: string) {
  return {
    numeroDocumento: doc,
    descripcionPedido: null as string | null,
    montoTotal: 0,
    estadoCodigo: null as string | null,
    tipoFactura: null as string | null,
    codigoUbicacion: null as string | null,
    codigoVendedor: null as string | null,
    originDepotCode: null as string | null,
    originName: null as string | null,
    originAddress: null as string | null,
    originLat: null as number | null,
    originLng: null as number | null,
    destinationAddress: null as string | null,
    destinationLat: null as number | null,
    destinationLng: null as number | null,
    destinationSource: null as string | null,
    destinationMapsLink: null as string | null,
    vehicleId: null as number | null,
    claimedByUserId: null as number | null,
    syncedAt: null as DateTime | null,
    transportStartedAt: null as DateTime | null,
    status: 0,
    isSync: true,
  }
}

function applyOrderScalarPatches(order: TrackingOrder, payload: NonNullable<OrderTrackingEvent['order']>) {
  if ('vehicleId' in payload) {
    const vid = toFiniteNumberOrNull(payload.vehicleId)
    order.vehicleId = vid !== null && vid > 0 ? vid : null
  }
  if ('syncedAt' in payload) {
    order.syncedAt = payload.syncedAt
      ? parseOptionalDateTime(payload.syncedAt)
      : null
  }
  if ('transportStartedAt' in payload) {
    if (payload.transportStartedAt == null || payload.transportStartedAt === '') {
      order.transportStartedAt = null
    } else {
      const t = parseOptionalDateTime(payload.transportStartedAt)
      if (t) order.transportStartedAt = t
    }
  }
  if ('adminFeedbackAt' in payload) {
    if (payload.adminFeedbackAt == null || payload.adminFeedbackAt === '') {
      order.adminFeedbackAt = null
    } else {
      const t = parseOptionalDateTime(payload.adminFeedbackAt)
      if (t) order.adminFeedbackAt = t
    }
  }

  for (const key of ORDER_PATCH_KEYS) {
    if (!(key in payload)) continue
    const v = payload[key as OrderPatchKey]
    if (key === 'montoTotal') {
      const n = toFiniteNumberOrNull(v)
      if (n !== null) order.montoTotal = n
      continue
    }
    if (
      key === 'originLat' ||
      key === 'originLng' ||
      key === 'destinationLat' ||
      key === 'destinationLng'
    ) {
      ;(order as unknown as Record<string, unknown>)[key] = toFiniteNumberOrNull(v)
      continue
    }
    if (key === 'claimedByUserId') {
      const uid = toFiniteNumberOrNull(v)
      order.claimedByUserId = uid !== null && uid > 0 ? uid : null
      continue
    }
    if (key === 'isSync') {
      if (typeof v === 'boolean') order.isSync = v
      continue
    }
    ;(order as unknown as Record<string, unknown>)[key] = v === undefined ? null : v
  }

  if ('status' in payload) {
    const incoming = Number(payload.status)
    if (Number.isFinite(incoming)) {
      order.status = Math.max(order.status, incoming)
    }
  }
}

async function replaceOrderItemsFromEvent(orderId: number, items: OrderTrackingEventItem[]) {
  await db.transaction(async (trx) => {
    await TrackingOrderItem.query({ client: trx }).where('trackingOrderId', orderId).delete()
    const sorted = [...items].sort((a, b) => a.lineIndex - b.lineIndex)
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i]
      await TrackingOrderItem.create(
        {
          trackingOrderId: orderId,
          lineIndex: Number.isFinite(Number(row.lineIndex)) ? Number(row.lineIndex) : i,
          codigoItem: row.codigoItem ?? null,
          descripcionItem: row.descripcionItem ?? null,
          cantidad: toFiniteNumberOrNull(row.cantidad) ?? 0,
          precio: toFiniteNumberOrNull(row.precio) ?? 0,
          codigoUnidadVenta: row.codigoUnidadVenta ?? null,
        },
        { client: trx }
      )
    }
  })
}

async function replaceOrderObservationsFromEvent(
  orderId: number,
  observations: OrderTrackingEventObservation[]
) {
  await db.transaction(async (trx) => {
    await TrackingOrderObservation.query({ client: trx })
      .where('trackingOrderId', orderId)
      .delete()
    const sorted = [...observations].sort((a, b) => {
      const aMs = Date.parse(a.createdAt ?? '') || 0
      const bMs = Date.parse(b.createdAt ?? '') || 0
      return aMs - bMs
    })
    for (const row of sorted) {
      const body = String(row.body ?? '').trim()
      if (!body) continue
      const createdAt = parseOptionalDateTime(row.createdAt ?? undefined)
      const updatedAt = parseOptionalDateTime(row.updatedAt ?? undefined)
      const newRow = await TrackingOrderObservation.create(
        {
          trackingOrderId: orderId,
          userId: toFiniteNumberOrNull(row.userId),
          body,
        },
        { client: trx }
      )
      if (createdAt) newRow.createdAt = createdAt
      if (updatedAt) newRow.updatedAt = updatedAt
      if (createdAt || updatedAt) {
        await newRow.save()
      }
    }
  })
}

function toIsoOrNull(dt?: DateTime | null) {
  return dt?.toISO() ?? null
}

function lwwShouldApply(incomingIso: string | null | undefined, localIso: string | null | undefined) {
  const incomingMs = toMillis(incomingIso)
  if (incomingMs <= 0) return true
  const localMs = toMillis(localIso)
  if (localMs <= 0) return true
  return incomingMs >= localMs
}

async function resolveLocalVehicleId(
  incomingVehicleId: unknown,
  incomingVehicleCode: string | null | undefined
) {
  const codeNorm = normalizeCode(incomingVehicleCode)
  if (codeNorm) {
    const byCode = await Vehicle.query().whereRaw('LOWER(code) = ?', [codeNorm]).first()
    if (byCode) return byCode.id
  }
  const numericVehicleId = toFiniteNumberOrNull(incomingVehicleId)
  if (numericVehicleId === null) return null
  const byId = await Vehicle.find(numericVehicleId)
  return byId?.id ?? null
}

async function resolveLocalUserId(incomingUserId: unknown, incomingUserEmail: string | null | undefined) {
  const emailNorm = String(incomingUserEmail ?? '').trim().toLowerCase()
  if (emailNorm) {
    const byEmail = await User.query().whereRaw('LOWER(email) = ?', [emailNorm]).first()
    if (byEmail) return byEmail.id
  }
  const numericUserId = toFiniteNumberOrNull(incomingUserId)
  if (numericUserId === null) return null
  const byId = await User.find(numericUserId)
  return byId?.id ?? null
}

async function projectUserEvent(event: OrderTrackingEvent) {
  const payload = event.user
  if (!payload) return
  const incomingId = toFiniteNumberOrNull(payload.id)
  const incomingEmail = payload.email ? String(payload.email).trim().toLowerCase() : null
  if (!incomingId && !incomingEmail) return

  let user = incomingEmail ? await User.findBy('email', incomingEmail) : null
  if (!user && incomingId) {
    user = await User.find(incomingId)
  }

  if (event.eventType === TRACKING_EVENT_TYPES.USER_DELETED) {
    if (user && lwwShouldApply(payload.updatedAt, toIsoOrNull(user.updatedAt) ?? toIsoOrNull(user.createdAt))) {
      await user.delete()
    }
    return
  }

  if (user) {
    if (!lwwShouldApply(payload.updatedAt, toIsoOrNull(user.updatedAt) ?? toIsoOrNull(user.createdAt))) {
      return
    }
    if (payload.fullName !== undefined) user.fullName = payload.fullName ?? null
    if (incomingEmail) user.email = incomingEmail
    if (payload.role !== undefined && payload.role !== null) user.role = String(payload.role)
    if (payload.approvalStatus !== undefined && payload.approvalStatus !== null) {
      user.approvalStatus = String(payload.approvalStatus)
    }
    if (payload.approvedBy !== undefined) {
      user.approvedBy = toFiniteNumberOrNull(payload.approvedBy)
    }
    if (payload.approvedAt !== undefined) {
      user.approvedAt = parseOptionalDateTime(payload.approvedAt ?? undefined)
    }
    if (payload.avatarUrl !== undefined) {
      user.avatarUrl = payload.avatarUrl ? String(payload.avatarUrl) : null
    }
    if (payload.passwordHash) user.password = String(payload.passwordHash)
    await user.save()
    return
  }

  if (!incomingEmail || !payload.role || !payload.approvalStatus) return
  const created = await User.create({
    fullName: payload.fullName ?? incomingEmail,
    email: incomingEmail,
    password: payload.passwordHash ?? `sync:${incomingEmail}`,
    role: String(payload.role),
    approvalStatus: String(payload.approvalStatus),
    approvedBy: toFiniteNumberOrNull(payload.approvedBy),
    approvedAt: parseOptionalDateTime(payload.approvedAt ?? undefined),
    avatarUrl: payload.avatarUrl ? String(payload.avatarUrl) : null,
  })
  if (payload.updatedAt || payload.createdAt) {
    created.createdAt = parseMaybeDate(payload.createdAt ?? payload.updatedAt ?? event.emittedAt)
    created.updatedAt = parseOptionalDateTime(payload.updatedAt ?? undefined)
    await created.save()
  }
}

async function projectVehicleEvent(event: OrderTrackingEvent) {
  const payload = event.vehicle
  if (!payload) return
  const incomingId = toFiniteNumberOrNull(payload.id)
  const incomingCode = payload.code ? String(payload.code).trim() : null
  const incomingCodeNorm = normalizeCode(incomingCode)
  if (!incomingId && !incomingCode) return

  const vehicleByCode = incomingCodeNorm
    ? await Vehicle.query().whereRaw('LOWER(code) = ?', [incomingCodeNorm]).first()
    : null
  const vehicleById = incomingId ? await Vehicle.find(incomingId) : null

  let vehicle: Vehicle | null = null
  if (vehicleByCode) {
    vehicle = vehicleByCode
  } else if (
    vehicleById &&
    (!incomingCodeNorm || normalizeCode(vehicleById.code) === incomingCodeNorm)
  ) {
    vehicle = vehicleById
  }

  if (event.eventType === TRACKING_EVENT_TYPES.VEHICLE_DELETED) {
    if (vehicle && lwwShouldApply(payload.updatedAt, toIsoOrNull(vehicle.updatedAt) ?? toIsoOrNull(vehicle.createdAt))) {
      await vehicle.delete()
    }
    return
  }

  if (vehicle) {
    if (!lwwShouldApply(payload.updatedAt, toIsoOrNull(vehicle.updatedAt) ?? toIsoOrNull(vehicle.createdAt))) {
      return
    }
    if (incomingCode) vehicle.code = incomingCode
    if (payload.name !== undefined && payload.name !== null) vehicle.name = String(payload.name)
    if (payload.imageUrl !== undefined) vehicle.imageUrl = payload.imageUrl ? String(payload.imageUrl) : null
    if (payload.operationalStatus !== undefined && payload.operationalStatus !== null) {
      vehicle.operationalStatus = String(payload.operationalStatus) as Vehicle['operationalStatus']
    }
    if (payload.odometerKm !== undefined) {
      vehicle.odometerKm = toFiniteNumberOrNull(payload.odometerKm) ?? 0
    }
    await vehicle.save()
    return
  }

  if (!incomingCode || !payload.name) return
  const created = await Vehicle.create({
    code: incomingCode,
    name: String(payload.name),
    imageUrl: payload.imageUrl ? String(payload.imageUrl) : null,
    operationalStatus: (payload.operationalStatus
      ? String(payload.operationalStatus)
      : 'active') as Vehicle['operationalStatus'],
    odometerKm: toFiniteNumberOrNull(payload.odometerKm) ?? 0,
  })
  if (payload.updatedAt || payload.createdAt) {
    created.createdAt = parseMaybeDate(payload.createdAt ?? payload.updatedAt ?? event.emittedAt)
    created.updatedAt = parseOptionalDateTime(payload.updatedAt ?? undefined)
    await created.save()
  }
}

async function projectShiftEvent(event: OrderTrackingEvent) {
  const payload = event.shift
  if (!payload) return
  const incomingId = toFiniteNumberOrNull(payload.id)
  if (!incomingId) return

  const localUserId = await resolveLocalUserId(payload.userId, payload.userEmail)
  const localVehicleId = await resolveLocalVehicleId(payload.vehicleId, payload.vehicleCode)
  if (localUserId === null || localVehicleId === null) return

  let shift = await DriverShift.find(incomingId)
  if (event.eventType === TRACKING_EVENT_TYPES.DRIVER_SHIFT_ENDED) {
    if (!shift) return
    if (!lwwShouldApply(payload.updatedAt ?? payload.endedAt, toIsoOrNull(shift.updatedAt) ?? toIsoOrNull(shift.createdAt))) {
      return
    }
    shift.endedAt = parseOptionalDateTime(payload.endedAt ?? payload.updatedAt ?? undefined)
    await shift.save()
    return
  }

  if (shift) {
    if (!lwwShouldApply(payload.updatedAt, toIsoOrNull(shift.updatedAt) ?? toIsoOrNull(shift.createdAt))) {
      return
    }
    shift.userId = localUserId
    shift.vehicleId = localVehicleId
    if (payload.startedAt !== undefined && payload.startedAt !== null) {
      shift.startedAt = parseMaybeDate(payload.startedAt)
    }
    if (payload.endedAt !== undefined) {
      shift.endedAt = parseOptionalDateTime(payload.endedAt ?? undefined)
    }
    await shift.save()
    return
  }

  const created = await DriverShift.create({
    id: incomingId,
    userId: localUserId,
    vehicleId: localVehicleId,
    startedAt: parseMaybeDate(payload.startedAt ?? event.emittedAt),
    endedAt: parseOptionalDateTime(payload.endedAt ?? undefined),
  })
  if (payload.updatedAt || payload.createdAt) {
    created.createdAt = parseMaybeDate(payload.createdAt ?? payload.updatedAt ?? event.emittedAt)
    created.updatedAt = parseOptionalDateTime(payload.updatedAt ?? undefined)
    await created.save()
  }
}

async function projectExpenseEvent(event: OrderTrackingEvent) {
  const payload = event.expense
  if (!payload) return
  const incomingId = toFiniteNumberOrNull(payload.id)
  if (!incomingId) return

  const localVehicleId = await resolveLocalVehicleId(payload.vehicleId, payload.vehicleCode)
  if (localVehicleId === null) return

  let expense = await VehicleExpense.find(incomingId)
  if (event.eventType === TRACKING_EVENT_TYPES.VEHICLE_EXPENSE_DELETED) {
    if (expense && lwwShouldApply(payload.updatedAt, toIsoOrNull(expense.updatedAt) ?? toIsoOrNull(expense.createdAt))) {
      await expense.delete()
    }
    return
  }

  if (expense) {
    if (!lwwShouldApply(payload.updatedAt, toIsoOrNull(expense.updatedAt) ?? toIsoOrNull(expense.createdAt))) {
      return
    }
    expense.vehicleId = localVehicleId
    if (payload.expenseType !== undefined && payload.expenseType !== null) {
      expense.expenseType = String(payload.expenseType) as VehicleExpense['expenseType']
    }
    if (payload.amount !== undefined) expense.amount = toFiniteNumberOrNull(payload.amount) ?? 0
    if (payload.currency !== undefined && payload.currency !== null) expense.currency = String(payload.currency)
    if (payload.tripCount !== undefined) expense.tripCount = toFiniteNumberOrNull(payload.tripCount)
    if (payload.notes !== undefined) expense.notes = payload.notes ? String(payload.notes) : null
    if (payload.expenseDate !== undefined && payload.expenseDate !== null) {
      expense.expenseDate = parseMaybeDate(payload.expenseDate)
    }
    await expense.save()
    return
  }

  if (!payload.expenseType) return
  const created = await VehicleExpense.create({
    id: incomingId,
    vehicleId: localVehicleId,
    expenseType: String(payload.expenseType) as VehicleExpense['expenseType'],
    amount: toFiniteNumberOrNull(payload.amount) ?? 0,
    currency: payload.currency ? String(payload.currency) : 'USD',
    tripCount: toFiniteNumberOrNull(payload.tripCount),
    notes: payload.notes ? String(payload.notes) : null,
    expenseDate: parseMaybeDate(payload.expenseDate ?? event.emittedAt),
  })
  if (payload.updatedAt || payload.createdAt) {
    created.createdAt = parseMaybeDate(payload.createdAt ?? payload.updatedAt ?? event.emittedAt)
    created.updatedAt = parseOptionalDateTime(payload.updatedAt ?? undefined)
    await created.save()
  }
}

class TrackingPublicEventService {
  async #resolveOutboundRowEventId(eventId: string) {
    let candidate = eventId
    let i = 0
    while (true) {
      const exists = await TrackingPublicEvent.query().where('eventId', candidate).first()
      if (!exists) return candidate
      i += 1
      candidate = `${eventId}:out-${i}`
    }
  }

  async enqueueOutbound(event: OrderTrackingEvent) {
    const doc = resolveEventOrderDocument(event)
    const rowEventId = await this.#resolveOutboundRowEventId(event.eventId)
    const row = await TrackingPublicEvent.create({
      eventId: rowEventId,
      direction: 'outbound',
      eventType: event.eventType,
      orderDocument: doc,
      payload: toJson(event),
      status: TRACKING_PUBLIC_EVENT_STATUS.PENDING,
    })

    const baseUrl = env.get('PUBLIC_TRACKING_BASE_URL')?.trim()
    const outboundOff = env.get('PUBLIC_SYNC_OUTBOUND_ENABLED') === false
    const immediateOff = env.get('PUBLIC_SYNC_IMMEDIATE_FLUSH') === false
    if (baseUrl && !outboundOff && !immediateOff) {
      const fromEnv =
        env.get('PUBLIC_SYNC_IMMEDIATE_FLUSH_LIMIT') ?? env.get('PUBLIC_SYNC_OUTBOUND_LIMIT') ?? 50
      const limit = Number.isFinite(Number(fromEnv))
        ? Math.min(500, Math.max(1, Number(fromEnv)))
        : 50
      void import('#services/tracking_public_sync_service')
        .then(({ default: sync }) => sync.flushOutbound(limit))
        .catch((err) => {
          logger.warn({ err }, 'Flush outbound tras enqueue falló (se reintentará con el scheduler)')
        })
    }

    return row
  }

  async createAndEnqueueOutbound(
    type: TrackingEventType,
    base: Omit<OrderTrackingEvent, 'eventId' | 'eventType' | 'emittedAt' | 'idempotencyKey'>
  ) {
    const event = createOrderTrackingEvent(type, base)
    await this.enqueueOutbound(event)
    return event
  }

  async markOutboundSent(eventId: string) {
    const row = await TrackingPublicEvent.query()
      .where('eventId', eventId)
      .where('direction', 'outbound')
      .first()
    if (!row) return
    row.status = TRACKING_PUBLIC_EVENT_STATUS.SENT
    row.sentAt = DateTime.now()
    row.lastError = null
    row.nextRetryAt = null
    row.attemptCount = row.attemptCount + 1
    await row.save()
  }

  async markOutboundFailed(eventId: string, error: string) {
    const row = await TrackingPublicEvent.query()
      .where('eventId', eventId)
      .where('direction', 'outbound')
      .first()
    if (!row) return
    row.status = TRACKING_PUBLIC_EVENT_STATUS.FAILED
    row.lastError = error
    row.attemptCount = row.attemptCount + 1
    const retrySeconds = Math.min(300, Math.max(15, row.attemptCount * 15))
    row.nextRetryAt = DateTime.now().plus({ seconds: retrySeconds })
    await row.save()
  }

  async getPendingOutbound(limit = 50) {
    const now = DateTime.now().toSQL({ includeOffset: false }) ?? undefined
    return TrackingPublicEvent.query()
      .where('direction', 'outbound')
      .where((q) => {
        q.where('status', TRACKING_PUBLIC_EVENT_STATUS.PENDING)
          .orWhere('status', TRACKING_PUBLIC_EVENT_STATUS.FAILED)
          .orWhere((q2) => {
            q2.where('status', TRACKING_PUBLIC_EVENT_STATUS.FAILED).where(
              'next_retry_at',
              '<=',
              now
            )
          })
      })
      .orderBy('createdAt', 'asc')
      .limit(limit)
  }

  async receiveInbound(event: OrderTrackingEvent) {
    const doc = resolveEventOrderDocument(event)
    const existing = await TrackingPublicEvent.query().where('eventId', event.eventId).first()
    if (existing) {
      return { duplicated: true, event: parseJson(existing.payload) }
    }

    const created = await TrackingPublicEvent.create({
      eventId: event.eventId,
      direction: 'inbound',
      eventType: event.eventType,
      orderDocument: doc,
      payload: toJson(event),
      status: TRACKING_PUBLIC_EVENT_STATUS.PROCESSED,
      sentAt: DateTime.now(),
      attemptCount: 1,
    })

    await this.#projectToState(event)
    if (event.order?.numeroDocumento) {
      trackingPublicRealtimeHubService.publishOrderUpdate(
        doc,
        toRealtimeOrderUpdatePayload(event, {
          receivedAt: DateTime.now().toISO() ?? undefined,
        })
      )
    }
    return { duplicated: false, event: parseJson(created.payload) }
  }

  async #projectToState(event: OrderTrackingEvent) {
    if (
      event.eventType === TRACKING_EVENT_TYPES.USER_UPSERTED ||
      event.eventType === TRACKING_EVENT_TYPES.USER_DELETED
    ) {
      await projectUserEvent(event)
      return
    }
    if (
      event.eventType === TRACKING_EVENT_TYPES.VEHICLE_UPSERTED ||
      event.eventType === TRACKING_EVENT_TYPES.VEHICLE_DELETED
    ) {
      await projectVehicleEvent(event)
      return
    }
    if (
      event.eventType === TRACKING_EVENT_TYPES.DRIVER_SHIFT_UPSERTED ||
      event.eventType === TRACKING_EVENT_TYPES.DRIVER_SHIFT_ENDED
    ) {
      await projectShiftEvent(event)
      return
    }
    if (
      event.eventType === TRACKING_EVENT_TYPES.VEHICLE_EXPENSE_UPSERTED ||
      event.eventType === TRACKING_EVENT_TYPES.VEHICLE_EXPENSE_DELETED
    ) {
      await projectExpenseEvent(event)
      return
    }

    const doc = normalizeDoc(event.order?.numeroDocumento ?? '')
    if (!doc) return

    const payload = event.order ?? { numeroDocumento: doc }
    let order = await TrackingOrder.query().where('numeroDocumento', doc).first()
    if (!order) {
      const base = defaultOrderRow(doc)
      if (!('syncedAt' in payload)) {
        base.syncedAt = parseMaybeDate(event.emittedAt)
      }
      if (!('transportStartedAt' in payload)) {
        base.transportStartedAt = null
      }
      order = await TrackingOrder.create(base)
    }

    applyOrderScalarPatches(order, payload)
    await order.save()

    if ('items' in payload && Array.isArray(payload.items)) {
      await replaceOrderItemsFromEvent(order.id, payload.items)
    }

    if ('observations' in payload && Array.isArray(payload.observations)) {
      await replaceOrderObservationsFromEvent(order.id, payload.observations)
    }

    if (
      event.eventType === TRACKING_EVENT_TYPES.ORDER_LOCATION &&
      event.location &&
      Number.isFinite(event.location.latitude) &&
      Number.isFinite(event.location.longitude)
    ) {
      const previous = await TrackingOrderLocation.query().where('orderDocument', doc).first()
      const recordedAt = parseMaybeDate(event.location.recordedAt ?? null)
      const incomingRecordedAtMs = toMillis(recordedAt.toISO())
      if (previous) {
        const previousRecordedAtMs = toMillis(previous.recordedAt.toISO())
        if (incomingRecordedAtMs > 0 && previousRecordedAtMs > 0 && incomingRecordedAtMs < previousRecordedAtMs) {
          return
        }
        previous.latitude = Number(event.location.latitude)
        previous.longitude = Number(event.location.longitude)
        previous.accuracyMeters = event.location.accuracyMeters ?? null
        previous.speedMps = event.location.speedMps ?? null
        previous.provider = event.location.provider ?? event.source
        previous.recordedAt = recordedAt
        if (order) {
          previous.trackingOrderId = order.id
          previous.vehicleId = event.order?.vehicleId ?? order.vehicleId
        } else {
          previous.vehicleId = event.order?.vehicleId ?? previous.vehicleId
        }
        await previous.save()
      } else {
        await TrackingOrderLocation.create({
          orderDocument: doc,
          trackingOrderId: order?.id ?? null,
          vehicleId: event.order?.vehicleId ?? order?.vehicleId ?? null,
          latitude: Number(event.location.latitude),
          longitude: Number(event.location.longitude),
          accuracyMeters: event.location.accuracyMeters ?? null,
          speedMps: event.location.speedMps ?? null,
          provider: event.location.provider ?? event.source,
          recordedAt,
        })
      }
    }
  }

  async getLatestLocation(numeroDocumento: string) {
    const doc = normalizeDoc(numeroDocumento)
    return TrackingOrderLocation.query().where('orderDocument', doc).first()
  }

  async getTimeline(numeroDocumento: string, limit = 40) {
    const doc = normalizeDoc(numeroDocumento)
    const rows = await TrackingPublicEvent.query()
      .where('orderDocument', doc)
      .where('direction', 'inbound')
      .orderBy('createdAt', 'desc')
      .limit(Math.max(1, Math.min(limit, 200)))

    return rows.map((row) => parseJson(row.payload))
  }

  async getChangedInboundEventsSince(sinceIso: string, limit = 200) {
    const sinceDt = parseMaybeDate(sinceIso)
    const rows = await TrackingPublicEvent.query()
      .where('direction', 'inbound')
      .where('createdAt', '>=', sinceDt.toSQL({ includeOffset: false }) ?? undefined)
      .orderBy('createdAt', 'asc')
      .limit(Math.max(1, Math.min(limit, 1000)))
    return rows.map((row) => parseJson(row.payload))
  }

  /**
   * Eventos que este lado generó (p. ej. mutaciones de móviles en Railway) y están en su cola outbound.
   * El otro lado los consume por pull para convergencia bidireccional aun sin conexión directa.
   */
  async getChangedOutboundEventsSince(sinceIso: string, limit = 200) {
    const sinceDt = parseMaybeDate(sinceIso)
    const rows = await TrackingPublicEvent.query()
      .where('direction', 'outbound')
      .where('createdAt', '>=', sinceDt.toSQL({ includeOffset: false }) ?? undefined)
      .orderBy('createdAt', 'asc')
      .limit(Math.max(1, Math.min(limit, 1000)))
    return rows.map((row) => parseJson(row.payload))
  }

  async getChangedLocationsSince(sinceIso: string, limit = 200) {
    const sinceDt = parseMaybeDate(sinceIso)
    return TrackingOrderLocation.query()
      .where('recordedAt', '>=', sinceDt.toSQL({ includeOffset: false }) ?? undefined)
      .orderBy('recordedAt', 'asc')
      .limit(Math.max(1, Math.min(limit, 1000)))
  }
}

export default new TrackingPublicEventService()
