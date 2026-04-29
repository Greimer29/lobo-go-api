import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class TrackingOrderObservation extends BaseModel {
  static table = 'tracking_order_observations'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'tracking_order_id' })
  declare trackingOrderId: number

  @column({ columnName: 'user_id' })
  declare userId: number | null

  @column()
  declare body: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}
