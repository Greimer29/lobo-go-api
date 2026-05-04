import trackingOrderSyncService from '#services/tracking_order_sync_service'
import type { PedidoCompuesto } from '#services/sadev_service'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'

function isInvoicePayloadValid(invoice: Partial<PedidoCompuesto> | null | undefined) {
  if (!invoice) return false
  if (!invoice.numeroDocumento || String(invoice.numeroDocumento).trim().length === 0) return false
  if (!Array.isArray(invoice.items)) return false
  return true
}

export default class InternalCorporateOrdersController {
  async fromCorporate({ request, response }: HttpContext) {
    if (env.get('EMERGENCY_DISABLE') === true) {
      return response.serviceUnavailable({
        message: 'Service temporarily disabled by administrator',
      })
    }

    const expectedApiKey = env.get('CORP_BRIDGE_API_KEY')

    if (!expectedApiKey) {
      return response.status(500).send({
        message: 'CORP_BRIDGE_API_KEY no configurada en el servicio Railway',
      })
    }

    const providedApiKey = request.header('x-bridge-api-key')
    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      return response.unauthorized({
        message: 'No autorizado',
      })
    }

    const invoice = (request.input('invoice') || request.body()) as Partial<PedidoCompuesto>
    if (!isInvoicePayloadValid(invoice)) {
      return response.badRequest({
        message: 'Payload invalido: se requiere invoice con numeroDocumento e items[]',
      })
    }

    const normalized: PedidoCompuesto = {
      numeroDocumento: String(invoice.numeroDocumento).trim(),
      corporateStatus: Number(invoice.corporateStatus ?? 0),
      estadoCodigo: invoice.estadoCodigo ?? null,
      tipoFactura: invoice.tipoFactura ?? null,
      codigoUbicacion: invoice.codigoUbicacion ?? null,
      depositoNombre: invoice.depositoNombre ?? null,
      depositoDireccion: invoice.depositoDireccion ?? null,
      depositoLat: invoice.depositoLat ?? null,
      depositoLng: invoice.depositoLng ?? null,
      codigoVendedor: invoice.codigoVendedor ?? null,
      descripcionPedido: invoice.descripcionPedido ?? null,
      montoTotal: Number(invoice.montoTotal ?? 0),
      items: (invoice.items ?? []).map((item) => ({
        codigoItem: item.codigoItem ?? null,
        descripcionItem: item.descripcionItem ?? null,
        cantidad: Number(item.cantidad ?? 0),
        precio: Number(item.precio ?? 0),
        codigoUnidadVenta: item.codigoUnidadVenta ?? null,
      })),
    }

    const result = await trackingOrderSyncService.upsertPedidos([normalized])

    return response.ok({
      message: 'Factura corporativa procesada',
      numeroDocumento: normalized.numeroDocumento,
      synced: result.synced,
      unchanged: result.unchanged,
      sourceCount: result.sourceCount,
    })
  }
}
