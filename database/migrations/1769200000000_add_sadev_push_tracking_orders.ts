import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracking_orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('sadev_completed_pushed_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sadev_completed_pushed_at')
    })
  }
}
