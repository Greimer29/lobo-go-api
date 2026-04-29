import scheduler from 'adonisjs-scheduler/services/main'
import env from '#start/env'

/** Por defecto activo: solo `SADEV_AUTO_SYNC_ENABLED=false` en api/.env lo desactiva. */
const autoSyncEnabled = env.get('SADEV_AUTO_SYNC_ENABLED') !== false
const cronExpr = env.get('SADEV_AUTO_SYNC_CRON')?.trim()

const schedule = scheduler.command('sync:sadev').withoutOverlapping(45_000)

if (cronExpr && cronExpr.length > 0) {
  schedule.cron(cronExpr)
} else {
  schedule.cron('*/15 * * * * *')
}

schedule.skip(!autoSyncEnabled)

scheduler.command('sync:public-events').everyMinute()
scheduler.command('reconcile:public-tracking').everyFiveMinutes()
