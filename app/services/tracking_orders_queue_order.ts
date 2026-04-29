import type TrackingOrder from '#models/tracking_order'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

/**
 * Orden operativo del listado de pedidos:
 * - Pendientes (0): primero los que llevan más tiempo en cola (COALESCE(synced_at, created_at) ASC).
 * - En proceso (1): primero el traslado más largo hasta ahora (COALESCE(transport_started_at, synced_at) ASC).
 * - Completados (2): más recientes arriba (updated_at DESC).
 */
export function applyQueueOrderForList(
  query: ModelQueryBuilderContract<typeof TrackingOrder>
): ModelQueryBuilderContract<typeof TrackingOrder> {
  return query.orderByRaw(`
    CASE status WHEN 0 THEN 0 WHEN 1 THEN 1 ELSE 2 END ASC,
    CASE
      WHEN status = 0 THEN COALESCE(synced_at, created_at)
      WHEN status = 1 THEN COALESCE(transport_started_at, synced_at)
    END ASC,
    CASE WHEN status = 2 THEN updated_at END DESC,
    id ASC
  `)
}
