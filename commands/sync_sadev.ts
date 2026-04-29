import { BaseCommand, flags } from '@adonisjs/core/ace'
import { randomUUID } from 'node:crypto'
import sadevAutoSyncLeaseService from '#services/sadev_auto_sync_lease_service'
import { parseCorporateStatusesCsv } from '#services/sadev_service'
import trackingOrderSyncService from '#services/tracking_order_sync_service'
import env from '#start/env'

export default class SyncSadev extends BaseCommand {
  static commandName = 'sync:sadev'
  static description =
    'Sincroniza pedidos SADEV (SQL Server) → MySQL tracking. Pensado para cron o adonisjs-scheduler.'

  static options = {
    startApp: true,
  }

  @flags.boolean({
    description:
      'Sin filtro Status IN (…); sigue excluyendo entregados y filas ya marcadas como importadas a tracking',
  })
  declare full: boolean

  @flags.boolean({ description: 'Omitir candado distribuido en MySQL (sync_job_leases)' })
  declare noLock: boolean

  async run() {
    const limitRaw = env.get('SADEV_AUTO_SYNC_LIMIT')
    const limitParam = typeof limitRaw === 'number' && !Number.isNaN(limitRaw) ? limitRaw : 100
    const limit = Math.max(1, Math.min(limitParam, 500))

    const statusesRaw = env.get('SADEV_AUTO_SYNC_PENDING_STATUSES')
    /** En SADEV, Status 0 = pendiente (LOBO). Sin env: solo esos registros en el job automático. */
    const corporateStatuses = this.full ? undefined : parseCorporateStatusesCsv(statusesRaw ?? '0')

    const useLock = !this.noLock && env.get('SADEV_AUTO_SYNC_DISTRIBUTED_LOCK') !== false

    const holder = randomUUID()
    const ttlRaw = env.get('SADEV_AUTO_SYNC_LEASE_TTL_SECONDS')
    const ttlSeconds = typeof ttlRaw === 'number' && !Number.isNaN(ttlRaw) ? ttlRaw : 120

    if (useLock) {
      const acquired = await sadevAutoSyncLeaseService.tryAcquire(holder, ttlSeconds)
      if (!acquired) {
        this.logger.info('sync:sadev omitido: candado activo (otra instancia o tick anterior).')
        return
      }
    }

    try {
      const result = await trackingOrderSyncService.syncFromCorporate({
        limit,
        corporateStatuses,
      })
      this.logger.info(
        `sync:sadev listo: sourceCount=${result.sourceCount} synced=${result.synced} unchanged=${result.unchanged}`
      )
    } finally {
      if (useLock) {
        await sadevAutoSyncLeaseService.release(holder)
      }
    }
  }
}
