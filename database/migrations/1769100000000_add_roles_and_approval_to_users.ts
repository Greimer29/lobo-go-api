import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('role', 24).notNullable().defaultTo('driver')
      table.string('approval_status', 24).notNullable().defaultTo('approved')
      table.integer('approved_by').unsigned().nullable()
      table.timestamp('approved_at').nullable()
      table.index(['role'])
      table.index(['approval_status'])
      table.foreign('approved_by').references('id').inTable(this.tableName).onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['approved_by'])
      table.dropIndex(['role'])
      table.dropIndex(['approval_status'])
      table.dropColumn('approved_at')
      table.dropColumn('approved_by')
      table.dropColumn('approval_status')
      table.dropColumn('role')
    })
  }
}
