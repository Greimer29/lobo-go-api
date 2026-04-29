import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracking_orders'

  async up() {
    this.defer(async (db) => {
      const hasColumn = await db.schema.hasColumn(this.tableName, 'vehicle_id')
      if (!hasColumn) {
        await db.schema.alterTable(this.tableName, (table) => {
          table
            .integer('vehicle_id')
            .unsigned()
            .nullable()
            .references('id')
            .inTable('vehicles')
            .onDelete('SET NULL')
          table.index(['vehicle_id'], 'tracking_orders_vehicle_id_idx')
        })
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      const hasColumn = await db.schema.hasColumn(this.tableName, 'vehicle_id')
      if (!hasColumn) {
        return
      }

      // MySQL: hay que quitar la FK antes que la columna (Knex no siempre lo ordena bien en dropColumn).
      try {
        await db.rawQuery(
          `ALTER TABLE \`${this.tableName}\` DROP FOREIGN KEY \`tracking_orders_vehicle_id_foreign\``
        )
      } catch {
        /* FK con otro nombre o ya eliminada */
      }

      try {
        await db.schema.alterTable(this.tableName, (table) => {
          table.dropIndex(['vehicle_id'], 'tracking_orders_vehicle_id_idx')
        })
      } catch {
        /* índice ausente o nombre distinto */
      }

      await db.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('vehicle_id')
      })
    })
  }
}
