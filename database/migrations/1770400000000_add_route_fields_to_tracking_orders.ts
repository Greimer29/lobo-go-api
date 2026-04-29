import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracking_orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('origin_depot_code', 64).nullable().index()
      table.string('origin_name', 180).nullable()
      table.text('origin_address').nullable()
      table.decimal('origin_lat', 12, 8).nullable()
      table.decimal('origin_lng', 12, 8).nullable()

      table.text('destination_address').nullable()
      table.decimal('destination_lat', 12, 8).nullable()
      table.decimal('destination_lng', 12, 8).nullable()
      table.string('destination_source', 32).nullable()
      table.text('destination_maps_link').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('origin_depot_code')
      table.dropColumn('origin_name')
      table.dropColumn('origin_address')
      table.dropColumn('origin_lat')
      table.dropColumn('origin_lng')
      table.dropColumn('destination_address')
      table.dropColumn('destination_lat')
      table.dropColumn('destination_lng')
      table.dropColumn('destination_source')
      table.dropColumn('destination_maps_link')
    })
  }
}
