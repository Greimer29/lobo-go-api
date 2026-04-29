import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected ordersTable = 'tracking_orders'
  protected itemsTable = 'tracking_order_items'

  async up() {
    this.schema.createTable(this.ordersTable, (table) => {
      table.bigIncrements('id').notNullable()
      table.string('numero_documento', 64).notNullable().unique()
      table.text('descripcion_pedido').nullable()
      table.decimal('monto_total', 18, 4).notNullable().defaultTo(0)
      table.string('estado_codigo', 32).nullable()
      table.string('tipo_factura', 32).nullable()
      table.string('codigo_ubicacion', 64).nullable()
      table.string('codigo_vendedor', 64).nullable()
      table.timestamp('synced_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable(this.itemsTable, (table) => {
      table.bigIncrements('id').notNullable()
      table
        .bigInteger('tracking_order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(this.ordersTable)
        .onDelete('CASCADE')
      table.integer('line_index').unsigned().notNullable().defaultTo(0)
      table.string('codigo_item', 64).nullable()
      table.text('descripcion_item').nullable()
      table.decimal('cantidad', 18, 4).notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.itemsTable)
    this.schema.dropTable(this.ordersTable)
  }
}
