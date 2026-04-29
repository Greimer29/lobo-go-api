import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracking_orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('claimed_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['claimed_by_user_id'])
      table.dropColumn('claimed_by_user_id')
    })
  }
}
