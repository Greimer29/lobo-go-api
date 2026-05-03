import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'
import Vehicle from '#models/vehicle'
import DriverShift from '#models/driver_shift'
import VehicleExpense from '#models/vehicle_expense'
import TrackingOrder from '#models/tracking_order'
import { trackingOrderToSyncEventOrder } from '#services/tracking_order_sync_event_payload'
import trackingPublicEventService from '#services/tracking_public_event_service'
import {
  TRACKING_EVENT_TYPES,
  createOrderTrackingEvent,
  createTrackingDomainEvent,
} from '#services/tracking_public_event_contract'

/**
 * Re-emite snapshots completos de todos los dominios para convergencia local <-> público.
 */
export default class RepushFullPublic extends BaseCommand {
  static commandName = 'repush:full-public'
  static description =
    'Encola snapshots de users/vehicles/shifts/expenses/orders hacia API pública'

  static options = {
    startApp: true,
  }

  async run() {
    const users = await User.query().orderBy('id', 'asc')
    const vehicles = await Vehicle.query().orderBy('id', 'asc')
    const shifts = await DriverShift.query().orderBy('id', 'asc')
    const expenses = await VehicleExpense.query().orderBy('id', 'asc')
    const orders = await TrackingOrder.query()
      .preload('items', (q) => q.orderBy('lineIndex', 'asc'))
      .preload('observations', (q) => q.orderBy('createdAt', 'asc'))
      .orderBy('id', 'asc')

    for (const user of users) {
      await trackingPublicEventService.enqueueOutbound(
        createTrackingDomainEvent(TRACKING_EVENT_TYPES.USER_UPSERTED, {
          source: 'internal',
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            approvalStatus: user.approvalStatus,
            approvedBy: user.approvedBy,
            approvedAt: user.approvedAt?.toISO() ?? null,
            avatarUrl: user.avatarUrl,
            passwordHash: user.password,
            createdAt: user.createdAt.toISO(),
            updatedAt: user.updatedAt?.toISO() ?? user.createdAt.toISO(),
          },
          metadata: { channel: 'cli:repush-full-public' },
        })
      )
    }

    for (const vehicle of vehicles) {
      await trackingPublicEventService.enqueueOutbound(
        createTrackingDomainEvent(TRACKING_EVENT_TYPES.VEHICLE_UPSERTED, {
          source: 'internal',
          vehicle: {
            id: vehicle.id,
            code: vehicle.code,
            name: vehicle.name,
            imageUrl: vehicle.imageUrl,
            operationalStatus: vehicle.operationalStatus,
            odometerKm: Number(vehicle.odometerKm ?? 0),
            createdAt: vehicle.createdAt.toISO(),
            updatedAt: vehicle.updatedAt?.toISO() ?? vehicle.createdAt.toISO(),
          },
          metadata: { channel: 'cli:repush-full-public' },
        })
      )
    }

    for (const shift of shifts) {
      await trackingPublicEventService.enqueueOutbound(
        createTrackingDomainEvent(
          shift.endedAt ? TRACKING_EVENT_TYPES.DRIVER_SHIFT_ENDED : TRACKING_EVENT_TYPES.DRIVER_SHIFT_UPSERTED,
          {
            source: 'internal',
            shift: {
              id: shift.id,
              userId: shift.userId,
              vehicleId: shift.vehicleId,
              startedAt: shift.startedAt.toISO(),
              endedAt: shift.endedAt?.toISO() ?? null,
              createdAt: shift.createdAt.toISO(),
              updatedAt: shift.updatedAt?.toISO() ?? shift.createdAt.toISO(),
            },
            metadata: { channel: 'cli:repush-full-public' },
          }
        )
      )
    }

    for (const expense of expenses) {
      await trackingPublicEventService.enqueueOutbound(
        createTrackingDomainEvent(TRACKING_EVENT_TYPES.VEHICLE_EXPENSE_UPSERTED, {
          source: 'internal',
          expense: {
            id: expense.id,
            vehicleId: expense.vehicleId,
            expenseType: expense.expenseType,
            amount: Number(expense.amount ?? 0),
            currency: expense.currency,
            tripCount: expense.tripCount,
            notes: expense.notes,
            expenseDate: expense.expenseDate.toISO(),
            createdAt: expense.createdAt.toISO(),
            updatedAt: expense.updatedAt?.toISO() ?? expense.createdAt.toISO(),
          },
          metadata: { channel: 'cli:repush-full-public' },
        })
      )
    }

    for (const order of orders) {
      await trackingPublicEventService.enqueueOutbound(
        createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_SYNCED, {
          source: 'internal',
          order: trackingOrderToSyncEventOrder(order),
          location: null,
          metadata: { channel: 'cli:repush-full-public' },
        })
      )
    }

    this.logger.info(
      `repush:full-public encolado users=${users.length} vehicles=${vehicles.length} shifts=${shifts.length} expenses=${expenses.length} orders=${orders.length}`
    )
  }
}
