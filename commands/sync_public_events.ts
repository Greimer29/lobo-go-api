import trackingPublicSyncService from '#services/tracking_public_sync_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import env from '#start/env'

export default class SyncPublicEvents extends BaseCommand {
  static commandName = 'sync:public-events'
  static description = 'Empuja eventos de outbox de tracking hacia el API público'

  static options = {
    startApp: true,
  }

  @flags.number({ description: 'Cantidad máxima de eventos por ejecución' })
  declare limit: number | undefined

  async run() {
    const envLimit = Number(env.get('PUBLIC_SYNC_OUTBOUND_LIMIT') ?? 50)
    const max = Number.isFinite(envLimit) ? Math.max(1, Math.min(envLimit, 1000)) : 50
    const result = await trackingPublicSyncService.flushOutbound(this.limit ?? max)
    if (result.skipped) {
      this.logger.info(`sync:public-events omitido: ${result.reason}`)
      return
    }
    this.logger.info(`sync:public-events sent=${result.sent} failed=${result.failed}`)
  }
}
