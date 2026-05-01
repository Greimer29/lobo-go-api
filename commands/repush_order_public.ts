import { BaseCommand, flags } from '@adonisjs/core/ace'
import TrackingOrder from '#models/tracking_order'
import { trackingOrderToSyncEventOrder } from '#services/tracking_order_sync_event_payload'
import { TRACKING_EVENT_TYPES, createOrderTrackingEvent } from '#services/tracking_public_event_contract'
import trackingPublicEventService from '#services/tracking_public_event_service'

/**
 * Encola un order_synced con snapshot completo desde MySQL local.
 * Útil si Railway quedó con filas “delgadas” antes del deploy del payload rico.
 */
export default class RepushOrderPublic extends BaseCommand {
  static commandName = 'repush:order-public'
  static description =
    'Encola order_synced (cabecera + líneas) hacia la API pública para un numero_documento'

  static options = {
    startApp: true,
  }

  @flags.string({
    description: 'Número de documento (NumeroD), tal como en tracking_orders',
  })
  declare doc: string

  async run() {
    const doc = String(this.doc ?? '').trim()
    if (!doc) {
      this.logger.error('Uso: node ace repush:order-public --doc=00000024')
      this.exitCode = 1
      return
    }

    const order = await TrackingOrder.query()
      .where('numeroDocumento', doc)
      .preload('items', (q) => q.orderBy('lineIndex', 'asc'))
      .first()

    if (!order) {
      this.logger.error(`No hay pedido en MySQL con numero_documento=${doc}`)
      this.exitCode = 1
      return
    }

    await trackingPublicEventService.enqueueOutbound(
      createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_SYNCED, {
        source: 'internal',
        order: trackingOrderToSyncEventOrder(order),
        location: null,
        metadata: { channel: 'cli:repush-order-public' },
      })
    )

    this.logger.info(`Encolado order_synced completo para ${doc} (${order.items?.length ?? 0} líneas)`)
  }
}
