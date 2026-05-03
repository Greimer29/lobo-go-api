import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_token.store': { paramsTuple?: []; params?: {} }
    'auth.access_token.destroy': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'tracking.sa_dev.index': { paramsTuple?: []; params?: {} }
    'tracking.sa_dev.pedidos': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.sync': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.claim': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.complete': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.publish_location': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.update_transport_reaction': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.update_destination': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.destroy_transport_observation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tracking.tracking_orders.list_transport_observations': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.store_transport_observation': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.index': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.dashboard': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.preview_destination': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.live_location': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'admin.admin_users.index': { paramsTuple?: []; params?: {} }
    'admin.admin_users.store': { paramsTuple?: []; params?: {} }
    'admin.admin_users.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.admin_users.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.admin_stats.users': { paramsTuple?: []; params?: {} }
    'fleet.fleet.stats': { paramsTuple?: []; params?: {} }
    'fleet.fleet.active_shifts': { paramsTuple?: []; params?: {} }
    'fleet.fleet.current_shift': { paramsTuple?: []; params?: {} }
    'fleet.fleet.start_shift': { paramsTuple?: []; params?: {} }
    'fleet.fleet.end_shift': { paramsTuple?: []; params?: {} }
    'fleet.fleet.vehicle_panel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fleet.fleet.update_vehicle_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fleet.fleet.create_vehicle': { paramsTuple?: []; params?: {} }
    'fleet.fleet.create_expense': { paramsTuple?: []; params?: {} }
    'public.public_tracking.ingest_event': { paramsTuple?: []; params?: {} }
    'public.public_tracking.latest_location': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'public.public_tracking.timeline': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'public.public_tracking.changed_locations': { paramsTuple?: []; params?: {} }
    'public.public_tracking.changed_events': { paramsTuple?: []; params?: {} }
    'public.public_tracking.changed_outbound_events': { paramsTuple?: []; params?: {} }
    'public.public_tracking.metrics': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'tracking.sa_dev.index': { paramsTuple?: []; params?: {} }
    'tracking.sa_dev.pedidos': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.list_transport_observations': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.index': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.dashboard': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.preview_destination': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.live_location': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'admin.admin_users.index': { paramsTuple?: []; params?: {} }
    'admin.admin_stats.users': { paramsTuple?: []; params?: {} }
    'fleet.fleet.stats': { paramsTuple?: []; params?: {} }
    'fleet.fleet.active_shifts': { paramsTuple?: []; params?: {} }
    'fleet.fleet.current_shift': { paramsTuple?: []; params?: {} }
    'fleet.fleet.vehicle_panel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.public_tracking.latest_location': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'public.public_tracking.timeline': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'public.public_tracking.changed_locations': { paramsTuple?: []; params?: {} }
    'public.public_tracking.changed_events': { paramsTuple?: []; params?: {} }
    'public.public_tracking.changed_outbound_events': { paramsTuple?: []; params?: {} }
    'public.public_tracking.metrics': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'tracking.sa_dev.index': { paramsTuple?: []; params?: {} }
    'tracking.sa_dev.pedidos': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.list_transport_observations': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.index': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.dashboard': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.preview_destination': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.live_location': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'admin.admin_users.index': { paramsTuple?: []; params?: {} }
    'admin.admin_stats.users': { paramsTuple?: []; params?: {} }
    'fleet.fleet.stats': { paramsTuple?: []; params?: {} }
    'fleet.fleet.active_shifts': { paramsTuple?: []; params?: {} }
    'fleet.fleet.current_shift': { paramsTuple?: []; params?: {} }
    'fleet.fleet.vehicle_panel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.public_tracking.latest_location': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'public.public_tracking.timeline': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'public.public_tracking.changed_locations': { paramsTuple?: []; params?: {} }
    'public.public_tracking.changed_events': { paramsTuple?: []; params?: {} }
    'public.public_tracking.changed_outbound_events': { paramsTuple?: []; params?: {} }
    'public.public_tracking.metrics': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_token.store': { paramsTuple?: []; params?: {} }
    'auth.access_token.destroy': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.sync': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.claim': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.complete': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.publish_location': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'tracking.tracking_orders.store_transport_observation': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'admin.admin_users.store': { paramsTuple?: []; params?: {} }
    'admin.admin_users.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.admin_users.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fleet.fleet.start_shift': { paramsTuple?: []; params?: {} }
    'fleet.fleet.end_shift': { paramsTuple?: []; params?: {} }
    'fleet.fleet.create_vehicle': { paramsTuple?: []; params?: {} }
    'fleet.fleet.create_expense': { paramsTuple?: []; params?: {} }
    'public.public_tracking.ingest_event': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'tracking.tracking_orders.update_transport_reaction': { paramsTuple?: []; params?: {} }
    'tracking.tracking_orders.update_destination': { paramsTuple: [ParamValue]; params: {'numeroDocumento': ParamValue} }
    'fleet.fleet.update_vehicle_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'tracking.tracking_orders.destroy_transport_observation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}