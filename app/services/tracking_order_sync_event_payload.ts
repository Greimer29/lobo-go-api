import TrackingOrder from '#models/tracking_order'
import TrackingOrderItem from '#models/tracking_order_item'
import TrackingOrderObservation from '#models/tracking_order_observation'
import type { OrderTrackingEvent } from '#services/tracking_public_event_contract'

export type OrderSyncEventOrder = OrderTrackingEvent['order']

/**
 * Recarga el pedido desde MySQL con items y observaciones precargados.
 * Úsalo antes de emitir un `order_synced` rico desde cualquier mutador.
 */
export async function loadTrackingOrderForSnapshot(numeroDocumento: string) {
  return TrackingOrder.query()
    .where('numeroDocumento', numeroDocumento)
    .preload('items', (q) => q.orderBy('lineIndex', 'asc'))
    .preload('observations', (q) => {
      q.preload('user').orderBy('createdAt', 'asc')
    })
    .first()
}

/**
 * Serializa un pedido persistido (con `items` y `observations` precargados) para eventos
 * `order_synced` hacia la API pública; debe reflejar la misma fila que ve el panel local.
 */
export function trackingOrderToSyncEventOrder(order: TrackingOrder): OrderSyncEventOrder {
  const itemRows: TrackingOrderItem[] = order.items ?? []
  const items = [...itemRows]
    .sort((a, b) => a.lineIndex - b.lineIndex)
    .map((it) => ({
      lineIndex: it.lineIndex,
      codigoItem: it.codigoItem,
      descripcionItem: it.descripcionItem,
      cantidad: it.cantidad,
      precio: it.precio,
      codigoUnidadVenta: it.codigoUnidadVenta,
    }))

  const observationRows: TrackingOrderObservation[] = order.observations ?? []
  const observations = [...observationRows]
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() ?? 0
      const bMs = b.createdAt?.toMillis?.() ?? 0
      return aMs - bMs
    })
    .map((o) => ({
      externalId: o.id,
      userId: o.userId,
      userFullName: o.user?.fullName ?? null,
      body: o.body,
      createdAt: o.createdAt?.toISO() ?? null,
      updatedAt: o.updatedAt?.toISO() ?? null,
    }))

  return {
    numeroDocumento: order.numeroDocumento,
    status: order.status,
    vehicleId: order.vehicleId,
    syncedAt: order.syncedAt?.toISO() ?? null,
    transportStartedAt: order.transportStartedAt?.toISO() ?? null,
    descripcionPedido: order.descripcionPedido,
    montoTotal: order.montoTotal,
    estadoCodigo: order.estadoCodigo,
    tipoFactura: order.tipoFactura,
    codigoUbicacion: order.codigoUbicacion,
    codigoVendedor: order.codigoVendedor,
    originDepotCode: order.originDepotCode,
    originName: order.originName,
    originAddress: order.originAddress,
    originLat: order.originLat,
    originLng: order.originLng,
    destinationAddress: order.destinationAddress,
    destinationLat: order.destinationLat,
    destinationLng: order.destinationLng,
    destinationSource: order.destinationSource,
    destinationMapsLink: order.destinationMapsLink,
    claimedByUserId: order.claimedByUserId,
    isSync: order.isSync,
    adminReaction: order.adminReaction,
    adminFeedbackAt: order.adminFeedbackAt?.toISO() ?? null,
    items,
    observations,
  }
}
