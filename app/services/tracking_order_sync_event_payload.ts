import TrackingOrder from '#models/tracking_order'
import type { OrderTrackingEvent } from '#services/tracking_public_event_contract'

export type OrderSyncEventOrder = OrderTrackingEvent['order']

/**
 * Serializa un pedido persistido (con `items` precargados) para eventos `order_synced`
 * hacia la API pública; debe reflejar la misma fila que ve el panel local.
 */
export function trackingOrderToSyncEventOrder(order: TrackingOrder): OrderSyncEventOrder {
  const rows = order.items ?? []
  const items = [...rows].sort((a, b) => a.lineIndex - b.lineIndex).map((it) => ({
    lineIndex: it.lineIndex,
    codigoItem: it.codigoItem,
    descripcionItem: it.descripcionItem,
    cantidad: it.cantidad,
    precio: it.precio,
    codigoUnidadVenta: it.codigoUnidadVenta,
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
    items,
  }
}
