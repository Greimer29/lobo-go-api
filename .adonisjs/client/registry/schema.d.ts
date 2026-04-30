/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_token.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_token_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_token_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_token.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/auth/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_token_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_token_controller').default['destroy']>>>
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'tracking.sa_dev.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tracking/sadev'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sadev_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sadev_controller').default['index']>>>
    }
  }
  'tracking.sa_dev.pedidos': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tracking/sadev/pedidos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sadev_controller').default['pedidos']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sadev_controller').default['pedidos']>>>
    }
  }
  'tracking.tracking_orders.sync': {
    methods: ["POST"]
    pattern: '/api/v1/tracking/pedidos/sync'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['sync']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['sync']>>>
    }
  }
  'tracking.tracking_orders.claim': {
    methods: ["POST"]
    pattern: '/api/v1/tracking/pedidos/claim'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tracking_orders').claimTrackingOrderValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/tracking_orders').claimTrackingOrderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['claim']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['claim']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tracking.tracking_orders.complete': {
    methods: ["POST"]
    pattern: '/api/v1/tracking/pedidos/complete'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['complete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['complete']>>>
    }
  }
  'tracking.tracking_orders.publish_location': {
    methods: ["POST"]
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/location'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { numeroDocumento: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['publishLocation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['publishLocation']>>>
    }
  }
  'tracking.tracking_orders.update_transport_reaction': {
    methods: ["PATCH"]
    pattern: '/api/v1/tracking/pedidos/transport-reaction'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tracking_orders').updateTransportReactionValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/tracking_orders').updateTransportReactionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['updateTransportReaction']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['updateTransportReaction']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tracking.tracking_orders.update_destination': {
    methods: ["PATCH"]
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/destination'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tracking_orders').updateDestinationValidator)>>
      paramsTuple: [ParamValue]
      params: { numeroDocumento: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/tracking_orders').updateDestinationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['updateDestination']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['updateDestination']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tracking.tracking_orders.destroy_transport_observation': {
    methods: ["DELETE"]
    pattern: '/api/v1/tracking/pedidos/transport-observations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['destroyTransportObservation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['destroyTransportObservation']>>>
    }
  }
  'tracking.tracking_orders.list_transport_observations': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/transport-observations'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { numeroDocumento: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['listTransportObservations']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['listTransportObservations']>>>
    }
  }
  'tracking.tracking_orders.store_transport_observation': {
    methods: ["POST"]
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/transport-observations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tracking_orders').storeTransportObservationValidator)>>
      paramsTuple: [ParamValue]
      params: { numeroDocumento: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/tracking_orders').storeTransportObservationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['storeTransportObservation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['storeTransportObservation']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tracking.tracking_orders.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tracking/pedidos/stored'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['index']>>>
    }
  }
  'tracking.tracking_orders.dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tracking/pedidos/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['dashboard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['dashboard']>>>
    }
  }
  'tracking.tracking_orders.preview_destination': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/destination-preview'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { numeroDocumento: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['previewDestination']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['previewDestination']>>>
    }
  }
  'tracking.tracking_orders.live_location': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/live-location'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { numeroDocumento: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['liveLocation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tracking_orders_controller').default['liveLocation']>>>
    }
  }
  'admin.admin_users.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_users_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_users_controller').default['index']>>>
    }
  }
  'admin.admin_users.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/users'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin_users').adminCreateUserValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/admin_users').adminCreateUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_users_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_users_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.admin_users.approve': {
    methods: ["POST"]
    pattern: '/api/v1/admin/users/:id/approve'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_users_controller').default['approve']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_users_controller').default['approve']>>>
    }
  }
  'admin.admin_users.reject': {
    methods: ["POST"]
    pattern: '/api/v1/admin/users/:id/reject'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_users_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_users_controller').default['reject']>>>
    }
  }
  'admin.admin_stats.users': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/stats/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_stats_controller').default['users']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_stats_controller').default['users']>>>
    }
  }
  'fleet.fleet.stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/fleet/stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['stats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['stats']>>>
    }
  }
  'fleet.fleet.current_shift': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/fleet/shifts/current'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['currentShift']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['currentShift']>>>
    }
  }
  'fleet.fleet.start_shift': {
    methods: ["POST"]
    pattern: '/api/v1/fleet/shifts/start'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/fleet').startDriverShiftValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/fleet').startDriverShiftValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['startShift']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['startShift']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'fleet.fleet.end_shift': {
    methods: ["POST"]
    pattern: '/api/v1/fleet/shifts/end'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['endShift']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['endShift']>>>
    }
  }
  'fleet.fleet.vehicle_panel': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/fleet/vehicles/:id/panel'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['vehiclePanel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['vehiclePanel']>>>
    }
  }
  'fleet.fleet.update_vehicle_status': {
    methods: ["PATCH"]
    pattern: '/api/v1/fleet/vehicles/:id/status'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/fleet').updateVehicleStatusValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/fleet').updateVehicleStatusValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['updateVehicleStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['updateVehicleStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'fleet.fleet.create_vehicle': {
    methods: ["POST"]
    pattern: '/api/v1/fleet/vehicles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/fleet').createVehicleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/fleet').createVehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['createVehicle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['createVehicle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'fleet.fleet.create_expense': {
    methods: ["POST"]
    pattern: '/api/v1/fleet/expenses'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/fleet').createVehicleExpenseValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/fleet').createVehicleExpenseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['createExpense']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/fleet_controller').default['createExpense']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.public_tracking.ingest_event': {
    methods: ["POST"]
    pattern: '/api/v1/public/events'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['ingestEvent']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['ingestEvent']>>>
    }
  }
  'public.public_tracking.latest_location': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/orders/:numeroDocumento/location'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { numeroDocumento: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['latestLocation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['latestLocation']>>>
    }
  }
  'public.public_tracking.timeline': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/orders/:numeroDocumento/timeline'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { numeroDocumento: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['timeline']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['timeline']>>>
    }
  }
  'public.public_tracking.changed_locations': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/orders/locations/changed'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['changedLocations']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['changedLocations']>>>
    }
  }
  'public.public_tracking.changed_events': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/events/changed'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['changedEvents']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['changedEvents']>>>
    }
  }
  'public.public_tracking.metrics': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/metrics'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['metrics']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_tracking_controller').default['metrics']>>>
    }
  }
}
