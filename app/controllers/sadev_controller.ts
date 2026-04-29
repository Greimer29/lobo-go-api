import saDevService from '#services/sadev_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class SaDevController {
  async index({ request, response }: HttpContext) {
    const limitParam = Number(request.input('limit', 100))
    const limit = Number.isNaN(limitParam) ? 100 : Math.max(1, Math.min(limitParam, 500))

    const rows = await saDevService.list({
      numeroD: request.input('numeroD'),
      codEsta: request.input('codEsta'),
      tipofac: request.input('tipofac'),
      limit,
    })

    return response.ok({
      count: rows.length,
      data: rows,
    })
  }

  async pedidos({ request, response }: HttpContext) {
    const limitParam = Number(request.input('limit', 100))
    const limit = Number.isNaN(limitParam) ? 100 : Math.max(1, Math.min(limitParam, 500))

    const pedidos = await saDevService.listPedidosCompuestos({
      numeroD: request.input('numeroD'),
      codEsta: request.input('codEsta'),
      tipofac: request.input('tipofac'),
      limit,
    })

    return response.ok({
      count: pedidos.length,
      data: pedidos,
    })
  }
}
