import Vehicle from '#models/vehicle'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export const VEHICLE_EXPENSE_TYPES = {
  PARTS: 'pieza',
  FUEL: 'gasolina',
  BREAKDOWN: 'averia',
} as const

export default class VehicleExpense extends BaseModel {
  static table = 'vehicle_expenses'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'vehicle_id' })
  declare vehicleId: number

  @column({ columnName: 'expense_type' })
  declare expenseType: (typeof VEHICLE_EXPENSE_TYPES)[keyof typeof VEHICLE_EXPENSE_TYPES]

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column({ columnName: 'trip_count' })
  declare tripCount: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ columnName: 'expense_date' })
  declare expenseDate: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Vehicle, {
    foreignKey: 'vehicleId',
  })
  declare vehicle: BelongsTo<typeof Vehicle>
}
