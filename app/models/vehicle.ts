import VehicleExpense from '#models/vehicle_expense'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export const VEHICLE_STATUSES = {
  ACTIVE: 'active',
  OUT_OF_SERVICE: 'out_of_service',
  EN_ROUTE: 'en_viaje',
} as const

export default class Vehicle extends BaseModel {
  static table = 'vehicles'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare code: string

  @column()
  declare name: string

  @column({ columnName: 'image_url' })
  declare imageUrl: string | null

  @column({ columnName: 'operational_status' })
  declare operationalStatus: (typeof VEHICLE_STATUSES)[keyof typeof VEHICLE_STATUSES]

  @column({ columnName: 'odometer_km' })
  declare odometerKm: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => VehicleExpense, {
    foreignKey: 'vehicleId',
  })
  declare expenses: HasMany<typeof VehicleExpense>
}
