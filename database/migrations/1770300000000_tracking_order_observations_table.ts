import db from '@adonisjs/lucid/services/db'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected observationsTable = 'tracking_order_observations'
  protected ordersTable = 'tracking_orders'

  async up() {
    this.schema.createTable(this.observationsTable, (table) => {
      table.increments('id').notNullable()
      table
        .bigInteger('tracking_order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(this.ordersTable)
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('body').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    await db.raw(`
      INSERT INTO ${this.observationsTable} (tracking_order_id, body, created_at, updated_at)
      SELECT id, TRIM(admin_observation), NOW(), NOW()
      FROM ${this.ordersTable}
      WHERE admin_observation IS NOT NULL AND CHAR_LENGTH(TRIM(admin_observation)) > 0
    `)

    await db.raw(`
      UPDATE ${this.ordersTable}
      SET admin_reaction = CASE admin_reaction
        WHEN 'excellent' THEN 'love'
        WHEN 'good' THEN 'like'
        WHEN 'neutral' THEN 'care'
        WHEN 'poor' THEN 'sad'
        WHEN 'critical' THEN 'angry'
        WHEN 'heart' THEN 'love'
        ELSE admin_reaction
      END
      WHERE admin_reaction IN ('excellent', 'good', 'neutral', 'poor', 'critical', 'heart')
    `)

    this.schema.alterTable(this.ordersTable, (table) => {
      table.dropColumn('admin_observation')
    })
  }

  async down() {
    this.schema.alterTable(this.ordersTable, (table) => {
      table.text('admin_observation').nullable()
    })

    this.schema.dropTable(this.observationsTable)
  }
}
