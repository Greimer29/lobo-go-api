import TrackingOrder from '#models/tracking_order'
import Vehicle from '#models/vehicle'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class TrackingOrderLocation extends BaseModel {
  static table = 'tracking_order_locations'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'order_document' })
  declare orderDocument: string

  @column({ columnName: 'tracking_order_id' })
  declare trackingOrderId: number | null

  @column({ columnName: 'vehicle_id' })
  declare vehicleId: number | null

  @column()
  declare latitude: number

  @column()
  declare longitude: number

  @column({ columnName: 'accuracy_meters' })
  declare accuracyMeters: number | null

  @column({ columnName: 'speed_mps' })
  declare speedMps: number | null

  @column()
  declare provider: string | null

  @column.dateTime({ columnName: 'recorded_at' })
  declare recordedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => TrackingOrder, {
    foreignKey: 'trackingOrderId',
  })
  declare trackingOrder: BelongsTo<typeof TrackingOrder>

  @belongsTo(() => Vehicle, {
    foreignKey: 'vehicleId',
  })
  declare vehicle: BelongsTo<typeof Vehicle>
}
