import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracking_orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('admin_observation').nullable()
      table.string('admin_reaction', 32).nullable()
      table.timestamp('admin_feedback_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('admin_observation')
      table.dropColumn('admin_reaction')
      table.dropColumn('admin_feedback_at')
    })
  }
}
