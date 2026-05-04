/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_token.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_token.store']['types'],
  },
  'auth.access_token.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/auth/logout',
    tokens: [{"old":"/api/v1/auth/logout","type":0,"val":"api","end":""},{"old":"/api/v1/auth/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/logout","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['auth.access_token.destroy']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'tracking.sa_dev.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tracking/sadev',
    tokens: [{"old":"/api/v1/tracking/sadev","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/sadev","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/sadev","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/sadev","type":0,"val":"sadev","end":""}],
    types: placeholder as Registry['tracking.sa_dev.index']['types'],
  },
  'tracking.sa_dev.pedidos': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tracking/sadev/pedidos',
    tokens: [{"old":"/api/v1/tracking/sadev/pedidos","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/sadev/pedidos","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/sadev/pedidos","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/sadev/pedidos","type":0,"val":"sadev","end":""},{"old":"/api/v1/tracking/sadev/pedidos","type":0,"val":"pedidos","end":""}],
    types: placeholder as Registry['tracking.sa_dev.pedidos']['types'],
  },
  'tracking.tracking_orders.sync': {
    methods: ["POST"],
    pattern: '/api/v1/tracking/pedidos/sync',
    tokens: [{"old":"/api/v1/tracking/pedidos/sync","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/sync","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/sync","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/sync","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/sync","type":0,"val":"sync","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.sync']['types'],
  },
  'tracking.tracking_orders.claim': {
    methods: ["POST"],
    pattern: '/api/v1/tracking/pedidos/claim',
    tokens: [{"old":"/api/v1/tracking/pedidos/claim","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/claim","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/claim","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/claim","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/claim","type":0,"val":"claim","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.claim']['types'],
  },
  'tracking.tracking_orders.complete': {
    methods: ["POST"],
    pattern: '/api/v1/tracking/pedidos/complete',
    tokens: [{"old":"/api/v1/tracking/pedidos/complete","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/complete","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/complete","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/complete","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/complete","type":0,"val":"complete","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.complete']['types'],
  },
  'tracking.tracking_orders.publish_location': {
    methods: ["POST"],
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/location',
    tokens: [{"old":"/api/v1/tracking/pedidos/:numeroDocumento/location","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/location","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/location","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/location","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/location","type":1,"val":"numeroDocumento","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/location","type":0,"val":"location","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.publish_location']['types'],
  },
  'tracking.tracking_orders.update_transport_reaction': {
    methods: ["PATCH"],
    pattern: '/api/v1/tracking/pedidos/transport-reaction',
    tokens: [{"old":"/api/v1/tracking/pedidos/transport-reaction","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/transport-reaction","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/transport-reaction","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/transport-reaction","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/transport-reaction","type":0,"val":"transport-reaction","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.update_transport_reaction']['types'],
  },
  'tracking.tracking_orders.update_destination': {
    methods: ["PATCH"],
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/destination',
    tokens: [{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination","type":1,"val":"numeroDocumento","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination","type":0,"val":"destination","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.update_destination']['types'],
  },
  'tracking.tracking_orders.destroy_transport_observation': {
    methods: ["DELETE"],
    pattern: '/api/v1/tracking/pedidos/transport-observations/:id',
    tokens: [{"old":"/api/v1/tracking/pedidos/transport-observations/:id","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/transport-observations/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/transport-observations/:id","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/transport-observations/:id","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/transport-observations/:id","type":0,"val":"transport-observations","end":""},{"old":"/api/v1/tracking/pedidos/transport-observations/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.destroy_transport_observation']['types'],
  },
  'tracking.tracking_orders.list_transport_observations': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/transport-observations',
    tokens: [{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":1,"val":"numeroDocumento","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"transport-observations","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.list_transport_observations']['types'],
  },
  'tracking.tracking_orders.store_transport_observation': {
    methods: ["POST"],
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/transport-observations',
    tokens: [{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":1,"val":"numeroDocumento","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/transport-observations","type":0,"val":"transport-observations","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.store_transport_observation']['types'],
  },
  'tracking.tracking_orders.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tracking/pedidos/stored',
    tokens: [{"old":"/api/v1/tracking/pedidos/stored","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/stored","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/stored","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/stored","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/stored","type":0,"val":"stored","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.index']['types'],
  },
  'tracking.tracking_orders.dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tracking/pedidos/dashboard',
    tokens: [{"old":"/api/v1/tracking/pedidos/dashboard","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/dashboard","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/dashboard","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/dashboard","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/dashboard","type":0,"val":"dashboard","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.dashboard']['types'],
  },
  'tracking.tracking_orders.preview_destination': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/destination-preview',
    tokens: [{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination-preview","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination-preview","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination-preview","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination-preview","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination-preview","type":1,"val":"numeroDocumento","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/destination-preview","type":0,"val":"destination-preview","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.preview_destination']['types'],
  },
  'tracking.tracking_orders.live_location': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tracking/pedidos/:numeroDocumento/live-location',
    tokens: [{"old":"/api/v1/tracking/pedidos/:numeroDocumento/live-location","type":0,"val":"api","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/live-location","type":0,"val":"v1","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/live-location","type":0,"val":"tracking","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/live-location","type":0,"val":"pedidos","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/live-location","type":1,"val":"numeroDocumento","end":""},{"old":"/api/v1/tracking/pedidos/:numeroDocumento/live-location","type":0,"val":"live-location","end":""}],
    types: placeholder as Registry['tracking.tracking_orders.live_location']['types'],
  },
  'admin.admin_users.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/users',
    tokens: [{"old":"/api/v1/admin/users","type":0,"val":"api","end":""},{"old":"/api/v1/admin/users","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/users","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['admin.admin_users.index']['types'],
  },
  'admin.admin_users.store': {
    methods: ["POST"],
    pattern: '/api/v1/admin/users',
    tokens: [{"old":"/api/v1/admin/users","type":0,"val":"api","end":""},{"old":"/api/v1/admin/users","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/users","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['admin.admin_users.store']['types'],
  },
  'admin.admin_users.approve': {
    methods: ["POST"],
    pattern: '/api/v1/admin/users/:id/approve',
    tokens: [{"old":"/api/v1/admin/users/:id/approve","type":0,"val":"api","end":""},{"old":"/api/v1/admin/users/:id/approve","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/users/:id/approve","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/users/:id/approve","type":0,"val":"users","end":""},{"old":"/api/v1/admin/users/:id/approve","type":1,"val":"id","end":""},{"old":"/api/v1/admin/users/:id/approve","type":0,"val":"approve","end":""}],
    types: placeholder as Registry['admin.admin_users.approve']['types'],
  },
  'admin.admin_users.reject': {
    methods: ["POST"],
    pattern: '/api/v1/admin/users/:id/reject',
    tokens: [{"old":"/api/v1/admin/users/:id/reject","type":0,"val":"api","end":""},{"old":"/api/v1/admin/users/:id/reject","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/users/:id/reject","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/users/:id/reject","type":0,"val":"users","end":""},{"old":"/api/v1/admin/users/:id/reject","type":1,"val":"id","end":""},{"old":"/api/v1/admin/users/:id/reject","type":0,"val":"reject","end":""}],
    types: placeholder as Registry['admin.admin_users.reject']['types'],
  },
  'admin.admin_stats.users': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/stats/users',
    tokens: [{"old":"/api/v1/admin/stats/users","type":0,"val":"api","end":""},{"old":"/api/v1/admin/stats/users","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/stats/users","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/stats/users","type":0,"val":"stats","end":""},{"old":"/api/v1/admin/stats/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['admin.admin_stats.users']['types'],
  },
  'admin.admin_warehouses.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/warehouses',
    tokens: [{"old":"/api/v1/admin/warehouses","type":0,"val":"api","end":""},{"old":"/api/v1/admin/warehouses","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/warehouses","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/warehouses","type":0,"val":"warehouses","end":""}],
    types: placeholder as Registry['admin.admin_warehouses.index']['types'],
  },
  'admin.admin_warehouses.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/warehouses/:id',
    tokens: [{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"api","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"warehouses","end":""},{"old":"/api/v1/admin/warehouses/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['admin.admin_warehouses.show']['types'],
  },
  'admin.admin_warehouses.store': {
    methods: ["POST"],
    pattern: '/api/v1/admin/warehouses',
    tokens: [{"old":"/api/v1/admin/warehouses","type":0,"val":"api","end":""},{"old":"/api/v1/admin/warehouses","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/warehouses","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/warehouses","type":0,"val":"warehouses","end":""}],
    types: placeholder as Registry['admin.admin_warehouses.store']['types'],
  },
  'admin.admin_warehouses.update': {
    methods: ["PUT"],
    pattern: '/api/v1/admin/warehouses/:id',
    tokens: [{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"api","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"warehouses","end":""},{"old":"/api/v1/admin/warehouses/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['admin.admin_warehouses.update']['types'],
  },
  'admin.admin_warehouses.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/admin/warehouses/:id',
    tokens: [{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"api","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/warehouses/:id","type":0,"val":"warehouses","end":""},{"old":"/api/v1/admin/warehouses/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['admin.admin_warehouses.destroy']['types'],
  },
  'fleet.fleet.stats': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/fleet/stats',
    tokens: [{"old":"/api/v1/fleet/stats","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/stats","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/stats","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/stats","type":0,"val":"stats","end":""}],
    types: placeholder as Registry['fleet.fleet.stats']['types'],
  },
  'fleet.fleet.active_shifts': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/fleet/shifts/active',
    tokens: [{"old":"/api/v1/fleet/shifts/active","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/shifts/active","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/shifts/active","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/shifts/active","type":0,"val":"shifts","end":""},{"old":"/api/v1/fleet/shifts/active","type":0,"val":"active","end":""}],
    types: placeholder as Registry['fleet.fleet.active_shifts']['types'],
  },
  'fleet.fleet.current_shift': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/fleet/shifts/current',
    tokens: [{"old":"/api/v1/fleet/shifts/current","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/shifts/current","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/shifts/current","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/shifts/current","type":0,"val":"shifts","end":""},{"old":"/api/v1/fleet/shifts/current","type":0,"val":"current","end":""}],
    types: placeholder as Registry['fleet.fleet.current_shift']['types'],
  },
  'fleet.fleet.start_shift': {
    methods: ["POST"],
    pattern: '/api/v1/fleet/shifts/start',
    tokens: [{"old":"/api/v1/fleet/shifts/start","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/shifts/start","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/shifts/start","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/shifts/start","type":0,"val":"shifts","end":""},{"old":"/api/v1/fleet/shifts/start","type":0,"val":"start","end":""}],
    types: placeholder as Registry['fleet.fleet.start_shift']['types'],
  },
  'fleet.fleet.end_shift': {
    methods: ["POST"],
    pattern: '/api/v1/fleet/shifts/end',
    tokens: [{"old":"/api/v1/fleet/shifts/end","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/shifts/end","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/shifts/end","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/shifts/end","type":0,"val":"shifts","end":""},{"old":"/api/v1/fleet/shifts/end","type":0,"val":"end","end":""}],
    types: placeholder as Registry['fleet.fleet.end_shift']['types'],
  },
  'fleet.fleet.vehicle_panel': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/fleet/vehicles/:id/panel',
    tokens: [{"old":"/api/v1/fleet/vehicles/:id/panel","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/vehicles/:id/panel","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/vehicles/:id/panel","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/vehicles/:id/panel","type":0,"val":"vehicles","end":""},{"old":"/api/v1/fleet/vehicles/:id/panel","type":1,"val":"id","end":""},{"old":"/api/v1/fleet/vehicles/:id/panel","type":0,"val":"panel","end":""}],
    types: placeholder as Registry['fleet.fleet.vehicle_panel']['types'],
  },
  'fleet.fleet.update_vehicle_status': {
    methods: ["PATCH"],
    pattern: '/api/v1/fleet/vehicles/:id/status',
    tokens: [{"old":"/api/v1/fleet/vehicles/:id/status","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/vehicles/:id/status","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/vehicles/:id/status","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/vehicles/:id/status","type":0,"val":"vehicles","end":""},{"old":"/api/v1/fleet/vehicles/:id/status","type":1,"val":"id","end":""},{"old":"/api/v1/fleet/vehicles/:id/status","type":0,"val":"status","end":""}],
    types: placeholder as Registry['fleet.fleet.update_vehicle_status']['types'],
  },
  'fleet.fleet.create_vehicle': {
    methods: ["POST"],
    pattern: '/api/v1/fleet/vehicles',
    tokens: [{"old":"/api/v1/fleet/vehicles","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/vehicles","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/vehicles","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/vehicles","type":0,"val":"vehicles","end":""}],
    types: placeholder as Registry['fleet.fleet.create_vehicle']['types'],
  },
  'fleet.fleet.create_expense': {
    methods: ["POST"],
    pattern: '/api/v1/fleet/expenses',
    tokens: [{"old":"/api/v1/fleet/expenses","type":0,"val":"api","end":""},{"old":"/api/v1/fleet/expenses","type":0,"val":"v1","end":""},{"old":"/api/v1/fleet/expenses","type":0,"val":"fleet","end":""},{"old":"/api/v1/fleet/expenses","type":0,"val":"expenses","end":""}],
    types: placeholder as Registry['fleet.fleet.create_expense']['types'],
  },
  'public.public_tracking.latest_location': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/public/orders/:numeroDocumento/location',
    tokens: [{"old":"/api/v1/public/orders/:numeroDocumento/location","type":0,"val":"api","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/location","type":0,"val":"v1","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/location","type":0,"val":"public","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/location","type":0,"val":"orders","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/location","type":1,"val":"numeroDocumento","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/location","type":0,"val":"location","end":""}],
    types: placeholder as Registry['public.public_tracking.latest_location']['types'],
  },
  'public.public_tracking.timeline': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/public/orders/:numeroDocumento/timeline',
    tokens: [{"old":"/api/v1/public/orders/:numeroDocumento/timeline","type":0,"val":"api","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/timeline","type":0,"val":"v1","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/timeline","type":0,"val":"public","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/timeline","type":0,"val":"orders","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/timeline","type":1,"val":"numeroDocumento","end":""},{"old":"/api/v1/public/orders/:numeroDocumento/timeline","type":0,"val":"timeline","end":""}],
    types: placeholder as Registry['public.public_tracking.timeline']['types'],
  },
  'public.public_tracking.metrics': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/public/metrics',
    tokens: [{"old":"/api/v1/public/metrics","type":0,"val":"api","end":""},{"old":"/api/v1/public/metrics","type":0,"val":"v1","end":""},{"old":"/api/v1/public/metrics","type":0,"val":"public","end":""},{"old":"/api/v1/public/metrics","type":0,"val":"metrics","end":""}],
    types: placeholder as Registry['public.public_tracking.metrics']['types'],
  },
  'internal.internal_corporate_orders.from_corporate': {
    methods: ["POST"],
    pattern: '/api/v1/internal/orders/from-corporate',
    tokens: [{"old":"/api/v1/internal/orders/from-corporate","type":0,"val":"api","end":""},{"old":"/api/v1/internal/orders/from-corporate","type":0,"val":"v1","end":""},{"old":"/api/v1/internal/orders/from-corporate","type":0,"val":"internal","end":""},{"old":"/api/v1/internal/orders/from-corporate","type":0,"val":"orders","end":""},{"old":"/api/v1/internal/orders/from-corporate","type":0,"val":"from-corporate","end":""}],
    types: placeholder as Registry['internal.internal_corporate_orders.from_corporate']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
