/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
const SaDevController = () => import('#controllers/sadev_controller')
const TrackingOrdersController = () => import('#controllers/tracking_orders_controller')
const AdminUsersController = () => import('#controllers/admin_users_controller')
const AdminStatsController = () => import('#controllers/admin_stats_controller')
const FleetController = () => import('#controllers/fleet_controller')
const PublicTrackingController = () => import('#controllers/public_tracking_controller')

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessToken, 'store'])
        router.post('logout', [controllers.AccessToken, 'destroy']).use(middleware.auth())
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('/profile', [controllers.Profile, 'show'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('sadev', [SaDevController, 'index'])
        router.get('sadev/pedidos', [SaDevController, 'pedidos'])
        router.post('pedidos/sync', [TrackingOrdersController, 'sync'])
        router.post('pedidos/claim', [TrackingOrdersController, 'claim'])
        router.post('pedidos/complete', [TrackingOrdersController, 'complete'])
        router.post('pedidos/:numeroDocumento/location', [
          TrackingOrdersController,
          'publishLocation',
        ])
        router.patch('pedidos/transport-reaction', [
          TrackingOrdersController,
          'updateTransportReaction',
        ])
        router.patch('pedidos/:numeroDocumento/destination', [
          TrackingOrdersController,
          'updateDestination',
        ])
        router.delete('pedidos/transport-observations/:id', [
          TrackingOrdersController,
          'destroyTransportObservation',
        ])
        router.get('pedidos/:numeroDocumento/transport-observations', [
          TrackingOrdersController,
          'listTransportObservations',
        ])
        router.post('pedidos/:numeroDocumento/transport-observations', [
          TrackingOrdersController,
          'storeTransportObservation',
        ])
        router.get('pedidos/stored', [TrackingOrdersController, 'index'])
        router.get('pedidos/dashboard', [TrackingOrdersController, 'dashboard'])
        router.get('pedidos/:numeroDocumento/destination-preview', [
          TrackingOrdersController,
          'previewDestination',
        ])
        router.get('pedidos/:numeroDocumento/live-location', [
          TrackingOrdersController,
          'liveLocation',
        ])
      })
      .prefix('tracking')
      .as('tracking')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('users', [AdminUsersController, 'index'])
        router.post('users', [AdminUsersController, 'store'])
        router.post('users/:id/approve', [AdminUsersController, 'approve'])
        router.post('users/:id/reject', [AdminUsersController, 'reject'])
        router.get('stats/users', [AdminStatsController, 'users'])
      })
      .prefix('admin')
      .as('admin')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('stats', [FleetController, 'stats'])
        router.get('shifts/current', [FleetController, 'currentShift'])
        router.post('shifts/start', [FleetController, 'startShift'])
        router.post('shifts/end', [FleetController, 'endShift'])
        router.get('vehicles/:id/panel', [FleetController, 'vehiclePanel'])
        router.patch('vehicles/:id/status', [FleetController, 'updateVehicleStatus'])
        router.post('vehicles', [FleetController, 'createVehicle'])
        router.post('expenses', [FleetController, 'createExpense'])
      })
      .prefix('fleet')
      .as('fleet')
      .use(middleware.auth())

    router
      .group(() => {
        router.post('events', [PublicTrackingController, 'ingestEvent'])
        router.get('orders/:numeroDocumento/location', [PublicTrackingController, 'latestLocation'])
        router.get('orders/:numeroDocumento/timeline', [PublicTrackingController, 'timeline'])
        router.get('orders/locations/changed', [PublicTrackingController, 'changedLocations'])
        router.get('events/changed', [PublicTrackingController, 'changedEvents'])
        router.get('events/changed-outbound', [
          PublicTrackingController,
          'changedOutboundEvents',
        ])
        router.get('metrics', [PublicTrackingController, 'metrics'])
      })
      .prefix('public')
      .as('public')
  })
  .prefix('/api/v1')
