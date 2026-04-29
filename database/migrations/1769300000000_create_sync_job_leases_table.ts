import { SADEV_CORPORATE_SYNC_JOB_NAME } from '#constants/sadev_sync'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sync_job_leases'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('job_name', 64).primary()
      table.dateTime('expires_at', { precision: 3, useTz: false }).notNullable()
      table.string('holder', 128).notNullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `INSERT INTO ${this.tableName} (job_name, expires_at, holder) VALUES (?, ?, ?)`,
        [SADEV_CORPORATE_SYNC_JOB_NAME, '1970-01-01 00:00:00.000', 'init']
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
