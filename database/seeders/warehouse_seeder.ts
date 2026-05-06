import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Warehouse from '#models/warehouse'

/**
 * Seeder de warehouses iniciales.
 *
 * Solo CREA warehouses que no existen. NO sobrescribe campos de
 * warehouses existentes. Esto preserva coordenadas, direcciones y
 * cualquier configuración cargada manualmente desde el panel admin.
 *
 * Si necesitas actualizar el nombre de un warehouse existente, hacerlo
 * desde el panel admin (UI) o vía PUT al endpoint /api/v1/admin/warehouses/:id.
 */
export default class extends BaseSeeder {
  async run() {
    const seedWarehouses = [
      { code: '01', name: 'Piso de Venta', isActive: true },
      { code: '02', name: 'Almacén', isActive: true },
    ]
    for (const w of seedWarehouses) {
      const existing = await Warehouse.findBy('code', w.code)
      if (!existing) {
        await Warehouse.create(w)
      }
      // Si existe, NO se modifica nada para preservar datos
      // cargados manualmente (coords, dirección, etc.)
    }
  }
}
