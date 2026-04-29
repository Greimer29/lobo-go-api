import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected eventsTable = 'tracking_public_events'
  protected locationsTable = 'tracking_order_locations'

  async up() {
    const hasEvents = await this.schema.hasTable(this.eventsTable)
    if (!hasEvents) {
      this.schema.createTable(this.eventsTable, (table) => {
        table.bigIncrements('id').notNullable()
        table.string('event_id', 128).notNullable().unique()
        table.string('direction', 16).notNullable() // inbound | outbound
        table.string('event_type', 48).notNullable()
        table.string('order_document', 64).notNullable()
        table.integer('status').notNullable().defaultTo(0) // 0 pending, 1 processed, 2 sent, 3 failed
        table.integer('attempt_count').notNullable().defaultTo(0)
        table.timestamp('sent_at').nullable()
        table.timestamp('next_retry_at').nullable()
        table.text('last_error').nullable()
        table.text('payload').notNullable()
        table.timestamp('created_at').notNullable()
        table.timestamp('updated_at').nullable()

        table.index(['direction', 'status'], 'tracking_public_events_dir_status_idx')
        table.index(['order_document', 'created_at'], 'tracking_public_events_doc_created_idx')
      })
    }

    const hasLocations = await this.schema.hasTable(this.locationsTable)
    if (!hasLocations) {
      this.schema.createTable(this.locationsTable, (table) => {
        table.bigIncrements('id').notNullable()
        table.string('order_document', 64).notNullable().unique()
        table
          .bigInteger('tracking_order_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('tracking_orders')
          .onDelete('SET NULL')
        table
          .integer('vehicle_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('vehicles')
          .onDelete('SET NULL')
        table.decimal('latitude', 10, 7).notNullable()
        table.decimal('longitude', 10, 7).notNullable()
        table.decimal('accuracy_meters', 10, 2).nullable()
        table.decimal('speed_mps', 10, 2).nullable()
        table.string('provider', 32).nullable()
        table.timestamp('recorded_at').notNullable()
        table.timestamp('created_at').notNullable()
        table.timestamp('updated_at').nullable()

        table.index(['recorded_at'], 'tracking_order_locations_recorded_idx')
        table.index(['vehicle_id'], 'tracking_order_locations_vehicle_idx')
      })
    }
  }

  async down() {
    this.schema.dropTable(this.locationsTable)
    this.schema.dropTable(this.eventsTable)
  }
}
