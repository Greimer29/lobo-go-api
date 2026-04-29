import TrackingOrder from '#models/tracking_order'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class TrackingOrderItem extends BaseModel {
  static table = 'tracking_order_items'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'tracking_order_id' })
  declare trackingOrderId: number

  @column({ columnName: 'line_index' })
  declare lineIndex: number

  @column({ columnName: 'codigo_item' })
  declare codigoItem: string | null

  @column({ columnName: 'descripcion_item' })
  declare descripcionItem: string | null

  @column()
  declare cantidad: number

  @column()
  declare precio: number

  @column({ columnName: 'codigo_unidad_venta' })
  declare codigoUnidadVenta: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => TrackingOrder, {
    foreignKey: 'trackingOrderId',
  })
  declare order: BelongsTo<typeof TrackingOrder>
}
