import TrackingOrderItem from '#models/tracking_order_item'
import TrackingOrderObservation from '#models/tracking_order_observation'
import User from '#models/user'
import Vehicle from '#models/vehicle'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class TrackingOrder extends BaseModel {
  static table = 'tracking_orders'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'numero_documento' })
  declare numeroDocumento: string

  @column({ columnName: 'descripcion_pedido' })
  declare descripcionPedido: string | null

  @column({ columnName: 'monto_total' })
  declare montoTotal: number

  @column({ columnName: 'estado_codigo' })
  declare estadoCodigo: string | null

  @column({ columnName: 'tipo_factura' })
  declare tipoFactura: string | null

  @column({ columnName: 'codigo_ubicacion' })
  declare codigoUbicacion: string | null

  @column({ columnName: 'codigo_vendedor' })
  declare codigoVendedor: string | null

  @column({ columnName: 'origin_depot_code' })
  declare originDepotCode: string | null

  @column({ columnName: 'origin_name' })
  declare originName: string | null

  @column({ columnName: 'origin_address' })
  declare originAddress: string | null

  @column({ columnName: 'origin_lat' })
  declare originLat: number | null

  @column({ columnName: 'origin_lng' })
  declare originLng: number | null

  @column({ columnName: 'destination_address' })
  declare destinationAddress: string | null

  @column({ columnName: 'destination_lat' })
  declare destinationLat: number | null

  @column({ columnName: 'destination_lng' })
  declare destinationLng: number | null

  @column({ columnName: 'destination_source' })
  declare destinationSource: string | null

  @column({ columnName: 'destination_maps_link' })
  declare destinationMapsLink: string | null

  @column({ columnName: 'vehicle_id' })
  declare vehicleId: number | null

  /**
   * Repartidor **encargado** de este pedido (fijado al hacer claim).
   * Varios repartidores pueden turnarse la misma motocarrucha; el pedido guarda
   * quién lo tomó, no solo la unidad.
   */
  @column({ columnName: 'claimed_by_user_id' })
  declare claimedByUserId: number | null

  @column.dateTime({ columnName: 'synced_at' })
  declare syncedAt: DateTime | null

  /** Inicio del traslado (status en proceso); métricas de tiempo en ruta. */
  @column.dateTime({ columnName: 'transport_started_at' })
  declare transportStartedAt: DateTime | null

  /** Reacción codificada (like … angry). */
  @column({ columnName: 'admin_reaction' })
  declare adminReaction: string | null

  @column.dateTime({ columnName: 'admin_feedback_at' })
  declare adminFeedbackAt: DateTime | null

  @column()
  declare status: number

  @column({ columnName: 'is_sync' })
  declare isSync: boolean

  @column.dateTime({ columnName: 'sadev_completed_pushed_at' })
  declare sadevCompletedPushedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Vehicle, {
    foreignKey: 'vehicleId',
  })
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => User, {
    foreignKey: 'claimedByUserId',
  })
  declare claimedByUser: BelongsTo<typeof User>

  @hasMany(() => TrackingOrderItem, {
    foreignKey: 'trackingOrderId',
  })
  declare items: HasMany<typeof TrackingOrderItem>

  @hasMany(() => TrackingOrderObservation, {
    foreignKey: 'trackingOrderId',
  })
  declare observations: HasMany<typeof TrackingOrderObservation>
}
