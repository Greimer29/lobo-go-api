import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected ordersTable = 'tracking_orders'
  protected vehiclesTable = 'vehicles'
  protected expensesTable = 'vehicle_expenses'

  async up() {
    this.schema.alterTable(this.ordersTable, (table) => {
      table.integer('status').notNullable().defaultTo(0)
      table.boolean('is_sync').notNullable().defaultTo(false)
      table.index(['status'])
      table.index(['is_sync'])
    })

    this.schema.createTable(this.vehiclesTable, (table) => {
      table.increments('id').notNullable()
      table.string('code', 64).notNullable().unique()
      table.string('name', 128).notNullable()
      table.string('operational_status', 32).notNullable().defaultTo('active')
      table.decimal('odometer_km', 12, 2).notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable(this.expensesTable, (table) => {
      table.increments('id').notNullable()
      table
        .integer('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(this.vehiclesTable)
        .onDelete('CASCADE')
      table.string('expense_type', 32).notNullable()
      table.decimal('amount', 14, 2).notNullable().defaultTo(0)
      table.string('currency', 8).notNullable().defaultTo('USD')
      table.integer('trip_count').unsigned().nullable()
      table.text('notes').nullable()
      table.timestamp('expense_date').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['vehicle_id'])
      table.index(['expense_type'])
      table.index(['expense_date'])
    })
  }

  async down() {
    this.schema.dropTable(this.expensesTable)
    this.schema.dropTable(this.vehiclesTable)

    this.schema.alterTable(this.ordersTable, (table) => {
      table.dropIndex(['status'])
      table.dropIndex(['is_sync'])
      table.dropColumn('is_sync')
      table.dropColumn('status')
    })
  }
}
