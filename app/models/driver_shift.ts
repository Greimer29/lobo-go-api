import User from '#models/user'
import Vehicle from '#models/vehicle'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class DriverShift extends BaseModel {
  static table = 'driver_shifts'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'user_id' })
  declare userId: number

  @column({ columnName: 'vehicle_id' })
  declare vehicleId: number

  @column.dateTime({ columnName: 'started_at' })
  declare startedAt: DateTime

  @column.dateTime({ columnName: 'ended_at' })
  declare endedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Vehicle, { foreignKey: 'vehicleId' })
  declare vehicle: BelongsTo<typeof Vehicle>
}
