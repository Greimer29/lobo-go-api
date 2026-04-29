import { SADEV_CORPORATE_SYNC_JOB_NAME } from '#constants/sadev_sync'
import db from '@adonisjs/lucid/services/db'

/**
 * Candado ligero en MySQL para que varias instancias no ejecuten el mismo sync a la vez.
 */
class SadevAutoSyncLeaseService {
  private table = 'sync_job_leases'

  /**
   * Intenta tomar el lease. Devuelve true si esta instancia debe ejecutar el sync.
   */
  async tryAcquire(holder: string, ttlSeconds: number): Promise<boolean> {
    const ttl = Math.max(5, Math.min(ttlSeconds, 3600))
    const conn = db.connection('mysql_tracking')
    const affected = await conn
      .from(this.table)
      .where('job_name', SADEV_CORPORATE_SYNC_JOB_NAME)
      .whereRaw('expires_at < UTC_TIMESTAMP(3)')
      .update({
        holder,
        expires_at: conn.raw('DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND)', [ttl]),
      })
    const n = Array.isArray(affected) ? Number(affected[0]) : Number(affected)
    return Number.isFinite(n) && n > 0
  }

  /**
   * Libera el lease si sigue siendo de este holder (permite el siguiente tick sin esperar al TTL).
   */
  async release(holder: string): Promise<void> {
    const conn = db.connection('mysql_tracking')
    await conn
      .from(this.table)
      .where('job_name', SADEV_CORPORATE_SYNC_JOB_NAME)
      .where('holder', holder)
      .update({
        expires_at: conn.raw(`DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND)`),
      })
  }
}

export default new SadevAutoSyncLeaseService()
