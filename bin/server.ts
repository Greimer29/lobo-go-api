/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

await import('reflect-metadata')
import { createServer } from 'node:http'
const { Ignitor, prettyPrintError } = await import('@adonisjs/core')

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

type WsHub = {
  start: (nodeServer?: {
    on: (
      event: 'upgrade',
      listener: (req: unknown, socket: unknown, head: Buffer) => void
    ) => void
  }) => void
}
let wsHub: WsHub | null = null

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
      wsHub = (await import('#services/tracking_public_realtime_hub_service')).default as WsHub
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  .start((handler) => {
    const httpServer = createServer(handler)
    wsHub?.start(httpServer as any)
    return httpServer
  })
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
