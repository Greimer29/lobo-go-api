/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessToken: {
      store: typeof routes['auth.access_token.store']
      destroy: typeof routes['auth.access_token.destroy']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
  }
  tracking: {
    saDev: {
      index: typeof routes['tracking.sa_dev.index']
      pedidos: typeof routes['tracking.sa_dev.pedidos']
    }
    trackingOrders: {
      sync: typeof routes['tracking.tracking_orders.sync']
      claim: typeof routes['tracking.tracking_orders.claim']
      complete: typeof routes['tracking.tracking_orders.complete']
      publishLocation: typeof routes['tracking.tracking_orders.publish_location']
      updateTransportReaction: typeof routes['tracking.tracking_orders.update_transport_reaction']
      updateDestination: typeof routes['tracking.tracking_orders.update_destination']
      destroyTransportObservation: typeof routes['tracking.tracking_orders.destroy_transport_observation']
      listTransportObservations: typeof routes['tracking.tracking_orders.list_transport_observations']
      storeTransportObservation: typeof routes['tracking.tracking_orders.store_transport_observation']
      index: typeof routes['tracking.tracking_orders.index']
      dashboard: typeof routes['tracking.tracking_orders.dashboard']
      previewDestination: typeof routes['tracking.tracking_orders.preview_destination']
      liveLocation: typeof routes['tracking.tracking_orders.live_location']
    }
  }
  admin: {
    adminUsers: {
      index: typeof routes['admin.admin_users.index']
      store: typeof routes['admin.admin_users.store']
      approve: typeof routes['admin.admin_users.approve']
      reject: typeof routes['admin.admin_users.reject']
    }
    adminStats: {
      users: typeof routes['admin.admin_stats.users']
    }
  }
  fleet: {
    fleet: {
      stats: typeof routes['fleet.fleet.stats']
      activeShifts: typeof routes['fleet.fleet.active_shifts']
      currentShift: typeof routes['fleet.fleet.current_shift']
      startShift: typeof routes['fleet.fleet.start_shift']
      endShift: typeof routes['fleet.fleet.end_shift']
      vehiclePanel: typeof routes['fleet.fleet.vehicle_panel']
      updateVehicleStatus: typeof routes['fleet.fleet.update_vehicle_status']
      createVehicle: typeof routes['fleet.fleet.create_vehicle']
      createExpense: typeof routes['fleet.fleet.create_expense']
    }
  }
  public: {
    publicTracking: {
      ingestEvent: typeof routes['public.public_tracking.ingest_event']
      latestLocation: typeof routes['public.public_tracking.latest_location']
      timeline: typeof routes['public.public_tracking.timeline']
      changedLocations: typeof routes['public.public_tracking.changed_locations']
      changedEvents: typeof routes['public.public_tracking.changed_events']
      changedOutboundEvents: typeof routes['public.public_tracking.changed_outbound_events']
      metrics: typeof routes['public.public_tracking.metrics']
    }
  }
}
