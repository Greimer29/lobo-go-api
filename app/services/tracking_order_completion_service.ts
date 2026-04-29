import TrackingOrder from '#models/tracking_order'
import Vehicle, { VEHICLE_STATUSES } from '#models/vehicle'
import saDevService from '#services/sadev_service'
import env from '#start/env'
import { DateTime } from 'luxon'

export type CompleteOrderResult =
  | {
      success: true
      alreadyCompleted: boolean
      corporateRowsAffected: number
    }
  | {
      success: false
      code: 'invalid' | 'not_found' | 'corporate_no_row' | 'corporate_error'
      message: string
    }

class TrackingOrderCompletionService {
  private pushCompletionEnabled() {
    return env.get('SQLSERVER_SADEV_PUSH_COMPLETION_ENABLED') === true
  }

  /**
   * Si no quedan otros pedidos en proceso en esa MC, vuelve la unidad a activa (dejó de estar en viaje).
   */
  private async reconcileVehicleAfterCompleted(order: TrackingOrder) {
    const vid = order.vehicleId
    if (vid === null || vid === undefined) return

    const otherInProgress = await TrackingOrder.query()
      .where('vehicleId', vid)
      .where('status', 1)
      .whereNot('id', order.id)
      .first()
    if (otherInProgress) return

    const vehicle = await Vehicle.find(vid)
    if (!vehicle) return
    if (vehicle.operationalStatus !== VEHICLE_STATUSES.EN_ROUTE) return

    vehicle.operationalStatus = VEHICLE_STATUSES.ACTIVE
    await vehicle.save()
  }

  private async runCompletionSideEffects(order: TrackingOrder) {
    await this.reconcileVehicleAfterCompleted(order)
  }

  async completeByNumeroDocumento(
    numeroDocumento: string | undefined | null
  ): Promise<CompleteOrderResult> {
    const trimmed = (numeroDocumento ?? '').trim()
    if (!trimmed) {
      return { success: false, code: 'invalid', message: 'numeroDocumento es requerido.' }
    }

    const order = await TrackingOrder.query().where('numeroDocumento', trimmed).first()
    if (!order) {
      return { success: false, code: 'not_found', message: 'Pedido no encontrado en tracking.' }
    }

    const push = this.pushCompletionEnabled()
    const delivered = saDevService.deliveredStatusValue()

    if (order.status === 2) {
      if (!push) {
        await this.runCompletionSideEffects(order)
        return { success: true, alreadyCompleted: true, corporateRowsAffected: 0 }
      }
      try {
        const corporateRowsAffected = await saDevService.updateSaDevStatus(trimmed, delivered)
        order.sadevCompletedPushedAt = DateTime.now()
        await order.save()
        await this.runCompletionSideEffects(order)
        return { success: true, alreadyCompleted: true, corporateRowsAffected }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return {
          success: false,
          code: 'corporate_error',
          message: `Error al actualizar SADEV: ${msg}`,
        }
      }
    }

    let corporateRowsAffected = 0
    if (push) {
      try {
        corporateRowsAffected = await saDevService.updateSaDevStatus(trimmed, delivered)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return {
          success: false,
          code: 'corporate_error',
          message: `Error al actualizar SADEV: ${msg}`,
        }
      }
      if (corporateRowsAffected < 1) {
        return {
          success: false,
          code: 'corporate_no_row',
          message:
            'No se actualizó ninguna fila en SADEV (NumeroD inexistente o sin permiso UPDATE). El pedido no se marcó como completado en tracking.',
        }
      }
    }

    order.status = 2
    if (push) {
      order.sadevCompletedPushedAt = DateTime.now()
    }
    await order.save()
    await this.runCompletionSideEffects(order)

    return {
      success: true,
      alreadyCompleted: false,
      corporateRowsAffected: push ? corporateRowsAffected : 0,
    }
  }
}

export default new TrackingOrderCompletionService()
