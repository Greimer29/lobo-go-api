import trackingPublicSyncService from '#services/tracking_public_sync_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'

export default class SyncPublicEvents extends BaseCommand {
  static commandName = 'sync:public-events'
  static description = 'Empuja eventos de outbox de tracking hacia el API público'

  static options = {
    startApp: true,
  }

  @flags.number({ description: 'Cantidad máxima de eventos por ejecución' })
  declare limit: number | undefined

  async run() {
    const result = await trackingPublicSyncService.flushOutbound(this.limit ?? 50)
    if (result.skipped) {
      this.logger.info(`sync:public-events omitido: ${result.reason}`)
      return
    }
    this.logger.info(`sync:public-events sent=${result.sent} failed=${result.failed}`)
  }
}
