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

const publicOutboundEnabled = env.get('PUBLIC_SYNC_OUTBOUND_ENABLED') !== false
const publicOutboundCron = env.get('PUBLIC_SYNC_OUTBOUND_CRON')?.trim() || '*/20 * * * * *'
const publicOutboundSchedule = scheduler.command('sync:public-events').withoutOverlapping(45_000)
publicOutboundSchedule.cron(publicOutboundCron)
publicOutboundSchedule.skip(!publicOutboundEnabled)

const publicReconcileEnabled = env.get('PUBLIC_SYNC_RECONCILE_ENABLED') !== false
const publicReconcileCron = env.get('PUBLIC_SYNC_RECONCILE_CRON')?.trim() || '*/45 * * * * *'
/** Reconciliación de eventos (orders + users + vehicles + shifts + expenses). */
const publicReconcileSchedule = scheduler
  .command('reconcile:public-tracking')
  .withoutOverlapping(60_000)
publicReconcileSchedule.cron(publicReconcileCron)
publicReconcileSchedule.skip(!publicReconcileEnabled)
