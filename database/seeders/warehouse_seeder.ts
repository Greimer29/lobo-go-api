import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Warehouse from '#models/warehouse'

export default class extends BaseSeeder {
  async run() {
    await Warehouse.updateOrCreateMany('code', [
      {
        code: '01',
        name: 'Piso de Venta',
        address: null,
        latitude: null,
        longitude: null,
        isActive: true,
      },
      {
        code: '02',
        name: 'Almacén',
        address: null,
        latitude: null,
        longitude: null,
        isActive: true,
      },
    ])
  }
}
