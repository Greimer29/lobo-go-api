import bridgeService from '#services/bridge_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default class BridgeRun extends BaseCommand {
  static commandName = 'bridge:run'
  static description = 'Bridge ETL local: SQL Server corporativo -> API Railway'
  static options = {
    startApp: true,
  }

  @flags.boolean({
    description: 'Ejecuta un solo ciclo (SQL Server -> Railway -> SADEV=1) y termina',
  })
  declare once: boolean

  async run() {
    const intervalSeconds = bridgeService.intervalSeconds()
    this.logger.info(
      `bridge:run iniciado; intervalo=${intervalSeconds}s once=${this.once ? 'true' : 'false'}`
    )

    while (true) {
      try {
        const result = await bridgeService.runCycle()
        this.logger.info(`bridge:run ciclo ok fetched=${result.fetched} sent=${result.sent}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`bridge:run ciclo con error: ${message}`)
      }
      if (this.once) {
        return
      }
      await sleep(intervalSeconds * 1000)
    }
  }
}
