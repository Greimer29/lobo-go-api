import Warehouse from '#models/warehouse'
import logger from '@adonisjs/core/services/logger'

export default class WarehouseLookupService {
  /**
   * Busca un depósito por su código corporativo (ej: '01', '02').
   * Retorna null si no existe o está inactivo.
   * Loguea warning si el código viene del corporativo pero no está
   * registrado en tracking_warehouses (caso edge: depósito nuevo en
   * corporativo no registrado todavía en Railway).
   */
  async findByCode(code: string | null | undefined): Promise<Warehouse | null> {
    if (!code) return null

    const trimmedCode = String(code).trim()
    if (!trimmedCode) return null

    const warehouse = await Warehouse.query().where('code', trimmedCode).where('is_active', true).first()

    if (!warehouse) {
      logger.warn(
        { code: trimmedCode },
        'warehouse_lookup_service: código de depósito no encontrado o inactivo en tracking_warehouses'
      )
    }

    return warehouse
  }
}
