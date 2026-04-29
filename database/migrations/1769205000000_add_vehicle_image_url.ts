import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.defer(async (db) => {
      const hasColumn = await db.schema.hasColumn(this.tableName, 'image_url')
      if (!hasColumn) {
        await db.schema.alterTable(this.tableName, (table) => {
          table.text('image_url').nullable()
        })
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      const hasColumn = await db.schema.hasColumn(this.tableName, 'image_url')
      if (hasColumn) {
        await db.schema.alterTable(this.tableName, (table) => {
          table.dropColumn('image_url')
        })
      }
    })
  }
}
