import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected ordersTable = 'tracking_orders'
  protected itemsTable = 'tracking_order_items'

  async up() {
    this.defer(async (db) => {
      const hasTransport = await db.schema.hasColumn(this.ordersTable, 'transport_started_at')
      if (!hasTransport) {
        await db.schema.alterTable(this.ordersTable, (table) => {
          table.timestamp('transport_started_at').nullable()
        })
      }

      const hasPrecio = await db.schema.hasColumn(this.itemsTable, 'precio')
      if (!hasPrecio) {
        await db.schema.alterTable(this.itemsTable, (table) => {
          table.decimal('precio', 18, 4).notNullable().defaultTo(0)
          table.string('codigo_unidad_venta', 64).nullable()
        })
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      const hasPrecio = await db.schema.hasColumn(this.itemsTable, 'precio')
      if (hasPrecio) {
        await db.schema.alterTable(this.itemsTable, (table) => {
          table.dropColumn('codigo_unidad_venta')
          table.dropColumn('precio')
        })
      }
      const hasTransport = await db.schema.hasColumn(this.ordersTable, 'transport_started_at')
      if (hasTransport) {
        await db.schema.alterTable(this.ordersTable, (table) => {
          table.dropColumn('transport_started_at')
        })
      }
    })
  }
}
