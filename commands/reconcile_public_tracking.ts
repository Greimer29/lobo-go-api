import trackingPublicReconcileService from '#services/tracking_public_reconcile_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'

export default class ReconcilePublicTracking extends BaseCommand {
  static commandName = 'reconcile:public-tracking'
  static description = 'Pull de eventos desde tracking público para convergencia bidireccional'

  static options = {
    startApp: true,
  }

  @flags.string({ description: 'Fecha ISO desde la que quieres reconciliar' })
  declare since: string | undefined

  async run() {
    const result = await trackingPublicReconcileService.pullEventsFromPublic(this.since)
    if (result.skipped) {
      this.logger.info(`reconcile:public-tracking omitido: ${result.reason}`)
      return
    }
    this.logger.info(`reconcile:public-tracking applied=${result.applied} since=${result.since}`)
  }
}
