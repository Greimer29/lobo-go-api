import DriverShift from '#models/driver_shift'
import { enrichOrderListRows } from '#services/tracking_order_transport_meta_service'
import TrackingOrder from '#models/tracking_order'
import { applyQueueOrderForList } from '#services/tracking_orders_queue_order'
import User from '#models/user'
import Vehicle, { VEHICLE_STATUSES } from '#models/vehicle'
import VehicleExpense, { VEHICLE_EXPENSE_TYPES } from '#models/vehicle_expense'
import trackingPublicEventService from '#services/tracking_public_event_service'
import {
  TRACKING_EVENT_TYPES,
  createTrackingDomainEvent,
} from '#services/tracking_public_event_contract'
import {
  createVehicleExpenseValidator,
  createVehicleValidator,
  startDriverShiftValidator,
  updateVehicleStatusValidator,
} from '#validators/fleet'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class FleetController {
  /**
   * Lista de turnos activos para panel administrativo (repartidor + unidad asignada).
   */
  async activeShifts({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isAdmin) {
      return response.forbidden({ message: 'Solo administradores pueden ver turnos activos' })
    }

    const shifts = await DriverShift.query()
      .whereNull('endedAt')
      .preload('user')
      .preload('vehicle')
      .orderBy('startedAt', 'desc')

    return response.ok({
      serverTime: DateTime.utc().toISO(),
      shifts: shifts.map((shift) => ({
        id: shift.id,
        user: shift.user
          ? {
              id: shift.user.id,
              fullName: shift.user.fullName,
              email: shift.user.email,
            }
          : null,
        vehicle: shift.vehicle
          ? {
              id: shift.vehicle.id,
              code: shift.vehicle.code,
              name: shift.vehicle.name,
              operationalStatus: shift.vehicle.operationalStatus,
            }
          : null,
        startedAt: shift.startedAt.toISO(),
        endedAt: shift.endedAt?.toISO() ?? null,
      })),
    })
  }

  private async emitVehicleSynced(vehicle: Vehicle, metadata?: Record<string, unknown>) {
    const event = createTrackingDomainEvent(TRACKING_EVENT_TYPES.VEHICLE_UPSERTED, {
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
      metadata: metadata ?? {},
    })
    await trackingPublicEventService.receiveInbound(event)
    await trackingPublicEventService.enqueueOutbound(event)
  }

  private async emitShiftSynced(shift: DriverShift, metadata?: Record<string, unknown>) {
    const [user, vehicle] = await Promise.all([User.find(shift.userId), Vehicle.find(shift.vehicleId)])
    const event = createTrackingDomainEvent(TRACKING_EVENT_TYPES.DRIVER_SHIFT_UPSERTED, {
      source: 'internal',
      shift: {
        id: shift.id,
        userId: shift.userId,
        userEmail: user?.email ?? null,
        vehicleId: shift.vehicleId,
        vehicleCode: vehicle?.code ?? null,
        startedAt: shift.startedAt.toISO(),
        endedAt: shift.endedAt?.toISO() ?? null,
        createdAt: shift.createdAt.toISO(),
        updatedAt: shift.updatedAt?.toISO() ?? shift.createdAt.toISO(),
      },
      metadata: metadata ?? {},
    })
    await trackingPublicEventService.receiveInbound(event)
    await trackingPublicEventService.enqueueOutbound(event)
  }

  private async emitShiftEnded(shift: DriverShift, metadata?: Record<string, unknown>) {
    const [user, vehicle] = await Promise.all([User.find(shift.userId), Vehicle.find(shift.vehicleId)])
    const event = createTrackingDomainEvent(TRACKING_EVENT_TYPES.DRIVER_SHIFT_ENDED, {
      source: 'internal',
      shift: {
        id: shift.id,
        userId: shift.userId,
        userEmail: user?.email ?? null,
        vehicleId: shift.vehicleId,
        vehicleCode: vehicle?.code ?? null,
        startedAt: shift.startedAt.toISO(),
        endedAt: shift.endedAt?.toISO() ?? DateTime.now().toISO(),
        createdAt: shift.createdAt.toISO(),
        updatedAt: shift.updatedAt?.toISO() ?? DateTime.now().toISO(),
      },
      metadata: metadata ?? {},
    })
    await trackingPublicEventService.receiveInbound(event)
    await trackingPublicEventService.enqueueOutbound(event)
  }

  private async emitExpenseSynced(expense: VehicleExpense, metadata?: Record<string, unknown>) {
    const vehicle = await Vehicle.find(expense.vehicleId)
    const event = createTrackingDomainEvent(TRACKING_EVENT_TYPES.VEHICLE_EXPENSE_UPSERTED, {
      source: 'internal',
      expense: {
        id: expense.id,
        vehicleId: expense.vehicleId,
        vehicleCode: vehicle?.code ?? null,
        expenseType: expense.expenseType,
        amount: Number(expense.amount ?? 0),
        currency: expense.currency,
        tripCount: expense.tripCount,
        notes: expense.notes,
        expenseDate: expense.expenseDate.toISO(),
        createdAt: expense.createdAt.toISO(),
        updatedAt: expense.updatedAt?.toISO() ?? expense.createdAt.toISO(),
      },
      metadata: metadata ?? {},
    })
    await trackingPublicEventService.receiveInbound(event)
    await trackingPublicEventService.enqueueOutbound(event)
  }

  async stats({ response }: HttpContext) {
    const vehicles = await Vehicle.query().preload('expenses')
    const totals = {
      overall: 0,
      fuel: 0,
      parts: 0,
      breakdown: 0,
    }

    const byVehicle = vehicles.map((v) => {
      const summary = {
        overall: 0,
        fuel: 0,
        parts: 0,
        breakdown: 0,
      }
      for (const exp of v.expenses) {
        const amount = Number(exp.amount ?? 0)
        summary.overall += amount
        totals.overall += amount
        if (exp.expenseType === VEHICLE_EXPENSE_TYPES.FUEL) {
          summary.fuel += amount
          totals.fuel += amount
        } else if (exp.expenseType === VEHICLE_EXPENSE_TYPES.PARTS) {
          summary.parts += amount
          totals.parts += amount
        } else if (exp.expenseType === VEHICLE_EXPENSE_TYPES.BREAKDOWN) {
          summary.breakdown += amount
          totals.breakdown += amount
        }
      }

      return {
        id: v.id,
        code: v.code,
        name: v.name,
        imageUrl: v.imageUrl,
        operationalStatus: v.operationalStatus,
        odometerKm: Number(v.odometerKm ?? 0),
        expenses: summary,
      }
    })

    return response.ok({
      totalVehicles: vehicles.length,
      outOfService: byVehicle.filter((v) => v.operationalStatus === 'out_of_service').length,
      totals,
      vehicles: byVehicle,
    })
  }

  /**
   * Turno activo del repartidor (solo rol driver devuelve datos).
   */
  async currentShift({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isDriver) {
      return response.ok({ shift: null })
    }

    const shift = await DriverShift.query()
      .where('userId', user.id)
      .whereNull('endedAt')
      .preload('vehicle')
      .orderBy('startedAt', 'desc')
      .first()

    if (!shift) {
      return response.ok({ shift: null })
    }

    const v = shift.vehicle
    return response.ok({
      shift: {
        id: shift.id,
        vehicleId: shift.vehicleId,
        startedAt: shift.startedAt.toISO(),
        vehicle: v
          ? {
              id: v.id,
              code: v.code,
              name: v.name,
              imageUrl: v.imageUrl,
              operationalStatus: v.operationalStatus,
            }
          : null,
      },
    })
  }

  /**
   * Abre turno del día: cierra turnos abiertos previos del usuario y enlaza la motocarrucha.
   */
  async startShift({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isDriver) {
      return response.forbidden({ message: 'Solo los repartidores pueden abrir un turno' })
    }

    const payload = await request.validateUsing(startDriverShiftValidator)
    const vehicle = await Vehicle.find(payload.vehicleId)
    if (!vehicle) {
      return response.notFound({ message: 'Motocarrucha no encontrada' })
    }
    if (vehicle.operationalStatus === VEHICLE_STATUSES.OUT_OF_SERVICE) {
      return response.badRequest({ message: 'Esta unidad está fuera de servicio' })
    }

    await db.transaction(async (trx) => {
      await DriverShift.query({ client: trx })
        .where('userId', user.id)
        .whereNull('endedAt')
        .update({ endedAt: DateTime.now() })

      await DriverShift.create(
        {
          userId: user.id,
          vehicleId: vehicle.id,
          startedAt: DateTime.now(),
        },
        { client: trx }
      )

      await Vehicle.query({ client: trx })
        .where('id', vehicle.id)
        .update({ operationalStatus: VEHICLE_STATUSES.ACTIVE })
    })

    const shift = await DriverShift.query()
      .where('userId', user.id)
      .whereNull('endedAt')
      .preload('vehicle')
      .orderBy('startedAt', 'desc')
      .first()

    const v = shift?.vehicle
    if (shift) {
      await this.emitShiftSynced(shift, {
        channel: 'driver:shift-start',
        triggeredByUserId: user.id,
      })
    }
    if (v) {
      await this.emitVehicleSynced(v, {
        channel: 'driver:shift-start-vehicle',
        triggeredByUserId: user.id,
      })
    }
    return response.ok({
      message: 'Turno iniciado',
      shift: shift
        ? {
            id: shift.id,
            vehicleId: shift.vehicleId,
            startedAt: shift.startedAt.toISO(),
            vehicle: v
              ? {
                  id: v.id,
                  code: v.code,
                  name: v.name,
                  imageUrl: v.imageUrl,
                  operationalStatus: v.operationalStatus,
                }
              : null,
          }
        : null,
    })
  }

  /**
   * Cierra el turno activo y deja la unidad en activa si estaba en ruta.
   */
  async endShift({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isDriver) {
      return response.forbidden({ message: 'Solo los repartidores pueden cerrar un turno' })
    }

    const shift = await DriverShift.query()
      .where('userId', user.id)
      .whereNull('endedAt')
      .preload('vehicle')
      .first()

    if (!shift) {
      return response.badRequest({ message: 'No tienes un turno activo' })
    }

    await db.transaction(async (trx) => {
      await DriverShift.query({ client: trx })
        .where('id', shift.id)
        .update({ endedAt: DateTime.now() })

      const v = shift.vehicle
      if (v && v.operationalStatus === VEHICLE_STATUSES.EN_ROUTE) {
        await Vehicle.query({ client: trx })
          .where('id', v.id)
          .update({ operationalStatus: VEHICLE_STATUSES.ACTIVE })
      }
    })

    const refreshedShift = await DriverShift.find(shift.id)
    if (refreshedShift) {
      await this.emitShiftEnded(refreshedShift, {
        channel: 'driver:shift-end',
        triggeredByUserId: user.id,
      })
    }
    if (shift.vehicle) {
      const refreshedVehicle = await Vehicle.find(shift.vehicle.id)
      if (refreshedVehicle) {
        await this.emitVehicleSynced(refreshedVehicle, {
          channel: 'driver:shift-end-vehicle',
          triggeredByUserId: user.id,
        })
      }
    }

    return response.ok({ message: 'Turno cerrado' })
  }

  /**
   * Cambiar estado operativo de una motocarrucha (admin: cualquiera; repartidor: solo la de su turno).
   */
  async updateVehicleStatus({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    const id = Number(params.id)
    if (!Number.isFinite(id) || id < 1) {
      return response.badRequest({ message: 'ID inválido' })
    }

    const payload = await request.validateUsing(updateVehicleStatusValidator)
    const vehicle = await Vehicle.find(id)
    if (!vehicle) {
      return response.notFound({ message: 'Motocarrucha no encontrada' })
    }

    if (!user.isAdmin) {
      if (!user.isDriver) {
        return response.forbidden({ message: 'Sin permiso' })
      }
      const shift = await DriverShift.query().where('userId', user.id).whereNull('endedAt').first()
      if (!shift || Number(shift.vehicleId) !== id) {
        return response.forbidden({
          message: 'Solo puedes cambiar el estado de la motocarrucha de tu turno activo',
        })
      }
    }

    vehicle.operationalStatus = payload.operationalStatus
    await vehicle.save()
    await this.emitVehicleSynced(vehicle, {
      channel: 'fleet:update-vehicle-status',
      triggeredByUserId: user.id,
    })

    return response.ok({
      message: 'Estado actualizado',
      data: {
        id: vehicle.id,
        operationalStatus: vehicle.operationalStatus,
      },
    })
  }

  async createVehicle({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isAdmin) {
      return response.forbidden({ message: 'Solo administradores pueden crear motocarruchas' })
    }

    const payload = await request.validateUsing(createVehicleValidator)
    const code = payload.code.trim()
    const existing = await Vehicle.findBy('code', code)
    if (existing) {
      return response.conflict({ message: 'Ya existe una motocarrucha con ese código' })
    }

    const vehicle = await Vehicle.create({
      code,
      name: payload.name.trim(),
      operationalStatus: payload.operationalStatus ?? 'active',
      odometerKm: payload.odometerKm ?? 0,
      imageUrl: payload.imageUrl?.trim() || null,
    })
    await this.emitVehicleSynced(vehicle, {
      channel: 'fleet:create-vehicle',
      triggeredByUserId: user.id,
    })

    return response.created({
      message: 'Vehículo creado',
      data: {
        id: vehicle.id,
        code: vehicle.code,
        name: vehicle.name,
        imageUrl: vehicle.imageUrl,
        operationalStatus: vehicle.operationalStatus,
        odometerKm: Number(vehicle.odometerKm ?? 0),
      },
    })
  }

  async createExpense({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    const payload = await request.validateUsing(createVehicleExpenseValidator)

    if (user.isDriver) {
      const shift = await DriverShift.query().where('userId', user.id).whereNull('endedAt').first()
      if (!shift || Number(shift.vehicleId) !== Number(payload.vehicleId)) {
        return response.forbidden({
          message: 'Solo puedes registrar gastos de la motocarrucha de tu turno activo',
        })
      }
    }

    const vehicle = await Vehicle.find(payload.vehicleId)
    if (!vehicle) {
      return response.notFound({ message: 'Motocarrucha no encontrada' })
    }

    const expense = await VehicleExpense.create({
      vehicleId: payload.vehicleId,
      expenseType: payload.expenseType,
      amount: payload.amount,
      currency: payload.currency ?? 'USD',
      tripCount: payload.tripCount ?? null,
      notes: payload.notes ?? null,
      expenseDate: payload.expenseDate ? DateTime.fromISO(payload.expenseDate) : DateTime.now(),
    })
    await this.emitExpenseSynced(expense, {
      channel: 'fleet:create-expense',
      triggeredByUserId: user.id,
    })

    return response.created({
      message: 'Gasto registrado',
      data: expense,
    })
  }

  /**
   * Panel por vehículo: gastos agrupados por mes, histograma de pedidos/facturas y detalle de pedidos con ítems.
   */
  async vehiclePanel({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    const id = Number(params.id)
    if (!Number.isFinite(id) || id < 1) {
      return response.badRequest({ message: 'ID inválido' })
    }

    if (user.isDriver) {
      const shift = await DriverShift.query().where('userId', user.id).whereNull('endedAt').first()
      if (!shift || Number(shift.vehicleId) !== id) {
        return response.forbidden({
          message: 'Solo puedes ver el panel de la motocarrucha de tu turno activo',
        })
      }
    }

    const vehicle = await Vehicle.find(id)
    if (!vehicle) {
      return response.notFound({ message: 'Motocarrucha no encontrada' })
    }

    const expenses = await VehicleExpense.query()
      .where('vehicleId', id)
      .orderBy('expenseDate', 'desc')
      .limit(500)

    const monthMap = new Map<
      string,
      {
        monthKey: string
        monthLabel: string
        items: Array<{
          id: number
          expenseType: string
          amount: number
          currency: string
          expenseDate: string
          notes: string | null
          tripCount: number | null
        }>
      }
    >()

    for (const exp of expenses) {
      const key = exp.expenseDate.toFormat('yyyy-MM')
      if (!monthMap.has(key)) {
        const d = DateTime.fromFormat(key, 'yyyy-MM').setLocale('es')
        monthMap.set(key, {
          monthKey: key,
          monthLabel: d.toFormat('LLLL yyyy'),
          items: [],
        })
      }
      monthMap.get(key)!.items.push({
        id: exp.id,
        expenseType: exp.expenseType,
        amount: Number(exp.amount ?? 0),
        currency: exp.currency,
        expenseDate: exp.expenseDate.toISO()!,
        notes: exp.notes,
        tripCount: exp.tripCount,
      })
    }

    const expensesByMonth = [...monthMap.values()].sort((a, b) =>
      a.monthKey < b.monthKey ? 1 : -1
    )

    const histogramRows = await db
      .from('tracking_orders')
      .where((q) => {
        q.where('vehicle_id', id).orWhere((s) => {
          s.whereNull('vehicle_id').where('codigo_vendedor', vehicle.code)
        })
      })
      .select(
        db.raw(`DATE_FORMAT(COALESCE(synced_at, created_at), '%Y-%m') as month_key`),
        db.raw('COUNT(*) as cnt')
      )
      .groupByRaw(`DATE_FORMAT(COALESCE(synced_at, created_at), '%Y-%m')`)
      .orderBy('month_key', 'asc')

    const histogram = (histogramRows as { month_key: string; cnt: number }[]).map((row) => {
      const d = DateTime.fromFormat(row.month_key, 'yyyy-MM').setLocale('es')
      return {
        monthKey: row.month_key,
        monthLabel: d.toFormat('LLLL yyyy'),
        count: Number(row.cnt ?? 0),
      }
    })

    const orders = await applyQueueOrderForList(
      TrackingOrder.query()
        .preload('items', (q) => q.orderBy('line_index', 'asc'))
        .preload('vehicle')
        .preload('claimedByUser')
        .where((q) => {
          q.where('vehicleId', id).orWhere((s) => {
            s.whereNull('vehicleId').where('codigoVendedor', vehicle.code)
          })
        })
    ).limit(150)

    const orderIds = orders.map((o) => o.id)
    const observationCountMap = new Map<number, number>()
    if (orderIds.length) {
      const countRows = await db
        .from('tracking_order_observations')
        .select('tracking_order_id')
        .count('* as cnt')
        .whereIn('tracking_order_id', orderIds)
        .groupBy('tracking_order_id')

      for (const row of countRows as {
        tracking_order_id: number | bigint
        cnt: string | number
      }[]) {
        observationCountMap.set(Number(row.tracking_order_id), Number(row.cnt))
      }
    }

    const ordersPayload = await enrichOrderListRows(
      orders.map((o) => ({
        id: o.id,
        numeroDocumento: o.numeroDocumento,
        descripcionPedido: o.descripcionPedido,
        montoTotal: Number(o.montoTotal ?? 0),
        estadoCodigo: o.estadoCodigo,
        tipoFactura: o.tipoFactura,
        codigoUbicacion: o.codigoUbicacion,
        codigoVendedor: o.codigoVendedor,
        status: o.status,
        isSync: o.isSync,
        syncedAt: o.syncedAt?.toISO() ?? null,
        updatedAt: o.updatedAt?.toISO() ?? null,
        transportStartedAt: o.transportStartedAt?.toISO() ?? null,
        vehicleId: o.vehicleId,
        adminReaction: o.adminReaction,
        adminFeedbackAt: o.adminFeedbackAt?.toISO() ?? null,
        transportObservationsCount: observationCountMap.get(Number(o.id)) ?? 0,
        claimedByUser: o.claimedByUser
          ? {
              id: o.claimedByUser.id,
              fullName: o.claimedByUser.fullName,
              email: o.claimedByUser.email,
            }
          : null,
        vehicle: o.vehicle
          ? {
              id: o.vehicle.id,
              code: o.vehicle.code,
              name: o.vehicle.name,
              imageUrl: o.vehicle.imageUrl,
            }
          : null,
        itemsCount: o.items.length,
        items: o.items.map((it) => ({
          id: it.id,
          lineIndex: it.lineIndex,
          codigoItem: it.codigoItem,
          descripcionItem: it.descripcionItem,
          cantidad: Number(it.cantidad ?? 0),
          precio: Number(it.precio ?? 0),
          codigoUnidadVenta: it.codigoUnidadVenta,
        })),
      }))
    )

    return response.ok({
      serverTime: DateTime.utc().toISO()!,
      vehicle: {
        id: vehicle.id,
        code: vehicle.code,
        name: vehicle.name,
        imageUrl: vehicle.imageUrl,
        operationalStatus: vehicle.operationalStatus,
      },
      expensesByMonth,
      histogram,
      orders: ordersPayload,
    })
  }
}
