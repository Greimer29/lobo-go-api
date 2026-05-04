import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Warehouse extends BaseModel {
  public static table = 'tracking_warehouses'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare address: string | null

  @column({
    consume: (value: string | number | null) => (value === null ? null : Number(value)),
  })
  declare latitude: number | null

  @column({
    consume: (value: string | number | null) => (value === null ? null : Number(value)),
  })
  declare longitude: number | null

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
