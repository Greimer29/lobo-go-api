import TrackingOrder from '#models/tracking_order'
import WarehouseLookupService from '#services/warehouse_lookup_service'
import { BaseCommand } from '@adonisjs/core/ace'

export default class ReenrichOrders extends BaseCommand {
  static commandName = 'orders:reenrich'
  static description = 'Re-enriquece pedidos cuyo origin_name es null pero tienen origin_depot_code'

  async run() {
    const lookupService = new WarehouseLookupService()

    const orders = await TrackingOrder.query().whereNull('originName').whereNotNull('originDepotCode')

    if (orders.length === 0) {
      this.logger.info('No hay pedidos para re-enriquecer')
      return
    }

    this.logger.info(`Encontrados ${orders.length} pedidos para re-enriquecer`)

    let enriched = 0
    let skipped = 0

    for (const order of orders) {
      const warehouse = await lookupService.findByCode(order.originDepotCode)
      if (!warehouse) {
        this.logger.warning(
          `Pedido ${order.numeroDocumento}: warehouse code=${order.originDepotCode} no encontrado, skip`
        )
        skipped++
        continue
      }

      order.originName = warehouse.name
      order.originAddress = warehouse.address
      order.originLat = warehouse.latitude
      order.originLng = warehouse.longitude
      await order.save()

      this.logger.info(
        `Pedido ${order.numeroDocumento}: enriquecido con warehouse ${warehouse.code}=${warehouse.name}`
      )
      enriched++
    }

    this.logger.info(`Resumen: ${enriched} enriquecidos, ${skipped} omitidos`)
  }
}
