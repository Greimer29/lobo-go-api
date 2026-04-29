import vine from '@vinejs/vine'
import { VEHICLE_EXPENSE_TYPES } from '#models/vehicle_expense'
import { VEHICLE_STATUSES } from '#models/vehicle'

export const createVehicleExpenseValidator = vine.create({
  vehicleId: vine.number().positive(),
  expenseType: vine.enum([
    VEHICLE_EXPENSE_TYPES.PARTS,
    VEHICLE_EXPENSE_TYPES.FUEL,
    VEHICLE_EXPENSE_TYPES.BREAKDOWN,
  ] as const),
  amount: vine.number().positive(),
  currency: vine.string().trim().maxLength(8).optional(),
  tripCount: vine.number().min(0).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
  expenseDate: vine.string().trim().optional(),
})

export const updateVehicleStatusValidator = vine.create({
  operationalStatus: vine.enum([
    VEHICLE_STATUSES.ACTIVE,
    VEHICLE_STATUSES.OUT_OF_SERVICE,
    VEHICLE_STATUSES.EN_ROUTE,
  ] as const),
})

const vehicleStatusEnum = [
  VEHICLE_STATUSES.ACTIVE,
  VEHICLE_STATUSES.OUT_OF_SERVICE,
  VEHICLE_STATUSES.EN_ROUTE,
] as const

export const createVehicleValidator = vine.create({
  code: vine.string().trim().minLength(1).maxLength(64),
  name: vine.string().trim().minLength(1).maxLength(128),
  operationalStatus: vine.enum(vehicleStatusEnum).optional(),
  odometerKm: vine.number().min(0).optional(),
  imageUrl: vine.string().maxLength(2_000_000).optional(),
})

export const startDriverShiftValidator = vine.create({
  vehicleId: vine.number().positive(),
})
