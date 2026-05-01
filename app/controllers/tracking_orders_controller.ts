import DriverShift from '#models/driver_shift'
import TrackingOrder from '#models/tracking_order'
import TrackingOrderObservation from '#models/tracking_order_observation'
import type User from '#models/user'
import Vehicle, { VEHICLE_STATUSES } from '#models/vehicle'
import trackingOrderCompletionService from '#services/tracking_order_completion_service'
import {
  loadTrackingOrderForSnapshot,
  trackingOrderToSyncEventOrder,
} from '#services/tracking_order_sync_event_payload'
import {
  TRACKING_EVENT_TYPES,
  createOrderTrackingEvent,
} from '#services/tracking_public_event_contract'
import trackingPublicEventService from '#services/tracking_public_event_service'
import trackingRealtimeMetricsService from '#services/tracking_realtime_metrics_service'
import trackingOrderSyncService from '#services/tracking_order_sync_service'
import { enrichOrderListRows } from '#services/tracking_order_transport_meta_service'
import { applyQueueOrderForList } from '#services/tracking_orders_queue_order'
import {
  geocodeAddress,
  isGeocodingConfigured,
} from '#services/google_geocoding_service'
import {
  extractLatLngFromGoogleMapsLink,
  extractPlaceNameFromGoogleMapsUrl,
  fetchGoogleMapsFinalUrl,
  haversineMeters,
  resolveLatLngFromGoogleMapsLink,
} from '#services/google_maps_link_coords'
import { parseCorporateStatusesCsv } from '#services/sadev_service'
import {
  claimTrackingOrderValidator,
  storeTransportObservationValidator,
  updateDestinationValidator,
  updateTransportReactionValidator,
} from '#validators/tracking_orders'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/** Diferencia aprox. en grados; ~0,0008° ≳ 80 m en el ecuador — evita re-guardar por ruido flotante. */
function coordsDifferMeaningfully(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): boolean {
  return (
    Math.abs(a.lat - b.lat) > 0.0008 || Math.abs(a.lng - b.lng) > 0.0008
  )
}

/**
 * Título de /place/ en la URL (p. ej. trazado) → Geocoding; suele alinear con el pin rojo de la ficha.
 * Varias cadenas para el sureste (El Dorado / Guayana).
 */
async function geocodePlaceNameFromMapUrl(mapsLink: string): Promise<{ lat: number; lng: number } | null> {
  let nameUrl = String(mapsLink).trim()
  if (!nameUrl) return null
  if (!extractPlaceNameFromGoogleMapsUrl(nameUrl)) {
    const final = await fetchGoogleMapsFinalUrl(nameUrl)
    if (final) nameUrl = final
  }
  const placeName = extractPlaceNameFromGoogleMapsUrl(nameUrl)
  if (!placeName) return null
  for (const q of [
    `${placeName}, El Dorado, Bolívar, Venezuela`,
    `${placeName}, Ciudad Guayana, Bolívar, Venezuela`,
    `${placeName}, Venezuela`,
  ]) {
    const g = await geocodeAddress(q, 'geocoded')
    if (g) return { lat: g.lat, lng: g.lng }
  }
  return null
}

/** Metros: si el par !3d/@ dista de la ficha, preferimos geocodificación del nombre. */
const PLACE_URL_GEO_DISAGREE_METERS = 220

/**
 * Publica el estado actual de un pedido como `order_synced` rico en ambos sentidos:
 * - `receiveInbound`: queda aplicado e indexable por este lado (visible en timeline y en /events/changed).
 * - `enqueueOutbound`: se encola para empujar al otro lado por HTTP.
 *
 * Así cualquier mutación (admin local o móvil contra la pública) se vuelve
 * observable y replicable por el otro extremo sin intervención manual.
 */
async function emitOrderSyncedFullSnapshot(
  numeroDocumento: string,
  metadata?: Record<string, unknown>
) {
  const fresh = await loadTrackingOrderForSnapshot(numeroDocumento)
  if (!fresh) return

  const event = createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_SYNCED, {
    source: 'internal',
    order: trackingOrderToSyncEventOrder(fresh),
    location: null,
    metadata: metadata ?? {},
  })

  await trackingPublicEventService.receiveInbound(event)
  await trackingPublicEventService.enqueueOutbound(event)
}

type LinkDest = {
  point: { lat: number; lng: number } | null
  source: string | null
  linkParsedCoords: { lat: number; lng: number } | null
}

/**
 * Resuelve enlace: coords en URL/redirect, y si el título /place/ geocodifica lejos, preferimos título
 * (coherente con el pin de negocio en Google vs. a veces cámara o tramo de data=).
 */
async function bestDestinationForMapsLink(mapsLink: string): Promise<LinkDest> {
  const link = String(mapsLink).trim()
  if (!link) {
    return { point: null, source: null, linkParsedCoords: null }
  }
  let fromLink = extractLatLngFromGoogleMapsLink(link)
  if (!fromLink) {
    fromLink = await resolveLatLngFromGoogleMapsLink(link)
  }
  const linkParsedCoords = fromLink
  const placePoint = await geocodePlaceNameFromMapUrl(link)

  if (fromLink && placePoint) {
    if (haversineMeters(fromLink, placePoint) > PLACE_URL_GEO_DISAGREE_METERS) {
      return {
        point: placePoint,
        source: 'admin_link_place_geocoded',
        linkParsedCoords,
      }
    }
    return { point: fromLink, source: 'admin_link', linkParsedCoords }
  }
  if (fromLink) {
    return { point: fromLink, source: 'admin_link', linkParsedCoords }
  }
  if (placePoint) {
    return { point: placePoint, source: 'admin_link_place_geocoded', linkParsedCoords: null }
  }
  return { point: null, source: null, linkParsedCoords: null }
}

export default class TrackingOrdersController {
  /**
   * POST: sincroniza desde SQL Server hacia MySQL tracking.
   */
  async sync({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isAdmin) {
      return response.forbidden({
        message: 'Solo administradores pueden sincronizar desde corporativo',
      })
    }

    const limitParam = Number(request.input('limit', 100))
    const limit = Number.isNaN(limitParam) ? 100 : Math.max(1, Math.min(limitParam, 500))

    const rawStatuses = request.input('corporateStatuses')
    let corporateStatuses = parseCorporateStatusesCsv(
      typeof rawStatuses === 'string' ? rawStatuses : undefined
    )
    /** Sin parámetro: solo pendientes corporativos (LOBO Status 0), para no re-leer pedidos ya handoff. */
    if (corporateStatuses === undefined) {
      corporateStatuses = [0]
    }

    const result = await trackingOrderSyncService.syncFromCorporate({
      numeroD: request.input('numeroD'),
      codEsta: request.input('codEsta'),
      tipofac: request.input('tipofac'),
      limit,
      corporateStatuses,
    })

    const { synced, unchanged, sourceCount } = result
    const allUpToDate = sourceCount > 0 && synced === 0 && unchanged === sourceCount

    let message: string
    if (sourceCount === 0) {
      message =
        'No hay pedidos en corporativo (SaDev) con el límite y filtros actuales; nada que sincronizar.'
    } else if (allUpToDate) {
      message = 'Todo está al día: MySQL ya coincide con SQL Server para estos pedidos.'
    } else if (synced > 0 && unchanged > 0) {
      message = `Sincronizado: ${synced} pedido(s) actualizado(s), ${unchanged} sin cambios.`
    } else if (synced > 0) {
      message = `Sincronizado: ${synced} pedido(s) guardados o actualizados en MySQL.`
    } else {
      message = 'Sincronización completada.'
    }

    const numeroDocumento = String(request.input('numeroD') ?? '').trim()
    if (numeroDocumento) {
      const order = await TrackingOrder.query()
        .where('numeroDocumento', numeroDocumento)
        .preload('items', (q) => q.orderBy('lineIndex', 'asc'))
        .first()
      if (order) {
        await trackingPublicEventService.enqueueOutbound(
          createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_SYNCED, {
            source: 'internal',
            order: trackingOrderToSyncEventOrder(order),
            location: null,
            metadata: { triggeredByUserId: user.id },
          })
        )
      }
    }

    return response.ok({
      message,
      synced,
      unchanged,
      sourceCount,
      allUpToDate,
    })
  }

  /**
   * GET: lista pedidos desde MySQL tracking (ya persistidos).
   */
  async index({ auth, request, response }: HttpContext) {
    auth.getUserOrFail()
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPageRaw = Number(request.input('perPage', 20))
    const perPage = Number.isNaN(perPageRaw) ? 20 : Math.min(Math.max(perPageRaw, 1), 500)

    const query = applyQueueOrderForList(
      TrackingOrder.query()
        .preload('items', (q) => q.orderBy('lineIndex', 'asc'))
        .preload('vehicle')
        .preload('claimedByUser')
    )

    const numeroDocumento = request.input('numeroD')
    if (numeroDocumento) {
      query.where('numeroDocumento', numeroDocumento)
    }

    const estado = request.input('codEsta')
    if (estado) {
      query.where('estadoCodigo', estado)
    }

    const tipo = request.input('tipofac')
    if (tipo) {
      query.where('tipoFactura', tipo)
    }

    const paginated = await query.paginate(page, perPage)
    const body = paginated.serialize() as {
      meta: unknown
      data: Record<string, unknown>[]
    }

    if (Array.isArray(body.data) && body.data.length > 0) {
      const ids = body.data.map((r) => Number(r.id)).filter((x) => Number.isFinite(x))
      const countMap = new Map<number, number>()
      if (ids.length) {
        const rows = await db
          .from('tracking_order_observations')
          .select('tracking_order_id')
          .count('* as cnt')
          .whereIn('tracking_order_id', ids)
          .groupBy('tracking_order_id')

        for (const row of rows as { tracking_order_id: number | bigint; cnt: string | number }[]) {
          countMap.set(Number(row.tracking_order_id), Number(row.cnt))
        }
      }
      const withCounts = body.data.map((row) => ({
        ...row,
        transportObservationsCount: countMap.get(Number(row.id)) ?? 0,
      }))
      body.data = await enrichOrderListRows(withCounts)
    }

    return response.ok({
      ...body,
      serverTime: DateTime.utc().toISO()!,
    })
  }

  /**
   * PATCH: solo administrador — reacción al traslado (o null para quitarla).
   */
  async updateTransportReaction({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.canAssignTransportReaction) {
      return response.forbidden({
        message: 'Solo un administrador puede asignar o quitar reacciones al traslado',
      })
    }

    const payload = await request.validateUsing(updateTransportReactionValidator)
    const numero = payload.numeroDocumento.trim()

    const order = await TrackingOrder.query().where('numeroDocumento', numero).first()
    if (!order) {
      return response.notFound({ message: 'Pedido no encontrado' })
    }

    order.adminReaction = payload.reaction
    order.adminFeedbackAt = DateTime.now()
    await order.save()

    await emitOrderSyncedFullSnapshot(order.numeroDocumento, {
      channel: 'admin:update-transport-reaction',
      triggeredByUserId: user.id,
    })

    return response.ok({
      message: 'Reacción actualizada',
      numeroDocumento: order.numeroDocumento,
      adminReaction: order.adminReaction,
      adminFeedbackAt: order.adminFeedbackAt?.toISO() ?? null,
    })
  }

  /**
   * PATCH: administrador define destino del pedido (enlace de Google Maps obligatorio; dirección opcional).
   * Coordenadas se derivan del enlace (parsing / redirecciones) o, si no, de la geocodificación de la dirección.
   */
  async updateDestination({ auth, request, params, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isAdmin) {
      return response.forbidden({
        message: 'Solo administradores pueden definir destino del pedido',
      })
    }

    const payload = await request.validateUsing(updateDestinationValidator)
    const numeroFromParams = decodeURIComponent(String(params.numeroDocumento ?? '').trim())
    const numeroDocumento = numeroFromParams || payload.numeroDocumento.trim()

    const order = await TrackingOrder.query().where('numeroDocumento', numeroDocumento).first()
    if (!order) return response.notFound({ message: 'Pedido no encontrado' })

    const mapsLink = String(payload.googleMapsLink ?? '').trim()
    const fromMaps = await bestDestinationForMapsLink(mapsLink)
    const addressFromBody = String(payload.destinationAddress ?? '').trim() || null
    const hasAddress = Boolean(addressFromBody)

    let destinationLat: number | null = null
    let destinationLng: number | null = null
    let destinationSource: string | null = null

    if (fromMaps.point) {
      destinationLat = fromMaps.point.lat
      destinationLng = fromMaps.point.lng
      destinationSource = fromMaps.source
    } else if (hasAddress) {
      const geocoded = await geocodeAddress(addressFromBody, 'admin_address_geocoded')
      destinationLat = geocoded?.lat ?? null
      destinationLng = geocoded?.lng ?? null
      destinationSource = geocoded?.source ?? 'admin_address'
    } else {
      /* Enlace sin lat/lng resoluble y sin título de lugar, y sin dirección */
      destinationLat = null
      destinationLng = null
      destinationSource = 'admin_link_unresolved'
    }

    order.destinationAddress = addressFromBody
    order.destinationLat = destinationLat
    order.destinationLng = destinationLng
    order.destinationSource = destinationSource
    order.destinationMapsLink = mapsLink
    await order.save()

    await emitOrderSyncedFullSnapshot(order.numeroDocumento, {
      channel: 'admin:update-destination',
      triggeredByUserId: user.id,
    })

    return response.ok({
      message: 'Destino del pedido actualizado',
      numeroDocumento: order.numeroDocumento,
      destination: {
        address: order.destinationAddress,
        latitude: order.destinationLat,
        longitude: order.destinationLng,
        source: order.destinationSource,
        mapsLink: order.destinationMapsLink,
      },
    })
  }

  /**
   * GET: observaciones del traslado (admin / supervisor).
   */
  async listTransportObservations({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.canManageTransportFeedback) {
      return response.forbidden({
        message: 'Solo administradores o supervisores pueden ver las observaciones del traslado',
      })
    }

    const numero = decodeURIComponent(String(params.numeroDocumento ?? '').trim())
    const order = await TrackingOrder.query().where('numeroDocumento', numero).first()
    if (!order) {
      return response.notFound({ message: 'Pedido no encontrado' })
    }

    const rows = await TrackingOrderObservation.query()
      .where('trackingOrderId', order.id)
      .preload('user')
      .orderBy('createdAt', 'desc')

    return response.ok({
      numeroDocumento: order.numeroDocumento,
      observations: rows.map((o) => ({
        id: o.id,
        body: o.body,
        createdAt: o.createdAt.toISO(),
        author: o.user
          ? {
              fullName: o.user.fullName,
              email: o.user.email,
              initials: o.user.initials,
            }
          : null,
      })),
    })
  }

  /**
   * POST: nueva observación de traslado (admin / supervisor).
   */
  async storeTransportObservation({ auth, request, params, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.canManageTransportFeedback) {
      return response.forbidden({
        message: 'Solo administradores o supervisores pueden añadir observaciones del traslado',
      })
    }

    const numero = decodeURIComponent(String(params.numeroDocumento ?? '').trim())
    const order = await TrackingOrder.query().where('numeroDocumento', numero).first()
    if (!order) {
      return response.notFound({ message: 'Pedido no encontrado' })
    }

    const payload = await request.validateUsing(storeTransportObservationValidator)
    const created = await TrackingOrderObservation.create({
      trackingOrderId: order.id,
      userId: user.id,
      body: payload.body,
    })
    await created.load('user')

    await emitOrderSyncedFullSnapshot(order.numeroDocumento, {
      channel: 'admin:store-transport-observation',
      triggeredByUserId: user.id,
      observationId: created.id,
    })

    return response.created({
      observation: {
        id: created.id,
        body: created.body,
        createdAt: created.createdAt.toISO(),
        author: created.user
          ? {
              fullName: created.user.fullName,
              email: created.user.email,
              initials: created.user.initials,
            }
          : null,
      },
    })
  }

  /**
   * DELETE: observación por id (admin / supervisor).
   */
  async destroyTransportObservation({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.canManageTransportFeedback) {
      return response.forbidden({
        message: 'Solo administradores o supervisores pueden eliminar observaciones del traslado',
      })
    }

    const id = Number(params.id)
    if (!Number.isFinite(id) || id <= 0) {
      return response.badRequest({ message: 'Identificador de observación inválido' })
    }

    const obs = await TrackingOrderObservation.find(id)
    if (!obs) {
      return response.notFound({ message: 'Observación no encontrada' })
    }

    const parentOrder = await TrackingOrder.find(obs.trackingOrderId)
    await obs.delete()

    if (parentOrder) {
      await emitOrderSyncedFullSnapshot(parentOrder.numeroDocumento, {
        channel: 'admin:destroy-transport-observation',
        triggeredByUserId: user.id,
        observationId: id,
      })
    }
    return response.ok({ message: 'Observación eliminada', id })
  }

  /**
   * POST: repartidor con turno activo toma un pedido pendiente sin unidad asignada.
   */
  async claim({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isDriver) {
      return response.forbidden({ message: 'Solo los repartidores pueden tomar pedidos' })
    }

    const payload = await request.validateUsing(claimTrackingOrderValidator)
    const numero = payload.numeroDocumento.trim()

    const shift = await DriverShift.query().where('userId', user.id).whereNull('endedAt').first()
    if (!shift) {
      return response.forbidden({
        message: 'Debes abrir un turno con una motocarrucha antes de tomar pedidos',
      })
    }

    const order = await TrackingOrder.query().where('numeroDocumento', numero).first()
    if (!order) {
      return response.notFound({ message: 'Pedido no encontrado' })
    }
    if (order.status !== 0) {
      return response.badRequest({ message: 'Solo se pueden tomar pedidos pendientes' })
    }
    if (order.vehicleId !== null && order.vehicleId !== undefined) {
      return response.conflict({ message: 'Este pedido ya está asignado a una unidad' })
    }

    const vehicle = await Vehicle.find(shift.vehicleId)
    if (!vehicle) {
      return response.badRequest({ message: 'La unidad del turno no existe' })
    }
    if (vehicle.operationalStatus === VEHICLE_STATUSES.OUT_OF_SERVICE) {
      return response.badRequest({ message: 'Tu unidad está fuera de servicio' })
    }

    const tripInProgress = await TrackingOrder.query()
      .where('vehicleId', shift.vehicleId)
      .where('status', 1)
      .first()
    if (tripInProgress) {
      return response.conflict({
        message:
          'Tu motocarrucha ya tiene un pedido en traslado. Completa la entrega antes de tomar otro.',
      })
    }

    order.vehicleId = shift.vehicleId
    order.status = 1
    order.transportStartedAt = DateTime.now()
    order.claimedByUserId = user.id
    await order.save()

    vehicle.operationalStatus = VEHICLE_STATUSES.EN_ROUTE
    await vehicle.save()

    const claimEvent = createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_CLAIMED, {
      source: 'internal',
      order: {
        numeroDocumento: order.numeroDocumento,
        status: order.status,
        vehicleId: order.vehicleId,
        transportStartedAt: order.transportStartedAt?.toISO() ?? null,
      },
      location: null,
      metadata: { claimedByUserId: user.id },
    })
    await trackingPublicEventService.receiveInbound(claimEvent)
    await trackingPublicEventService.enqueueOutbound(claimEvent)
    await emitOrderSyncedFullSnapshot(order.numeroDocumento, {
      channel: 'driver:claim',
      claimedByUserId: user.id,
    })

    return response.ok({
      message: 'Pedido asignado a tu unidad y marcado en proceso',
      numeroDocumento: order.numeroDocumento,
      vehicleId: order.vehicleId,
      status: order.status,
      /** Repartidor que queda como encargado (varios pueden usar la misma MC; solo uno por pedido). */
      claimedByUserId: user.id,
      claimedBy: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    })
  }

  /**
   * POST body: { numeroDocumento } — marca el pedido como completado en MySQL y, si está habilitado, actualiza SADEV.Status en SQL Server.
   */
  async complete({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    const numeroRaw = request.input('numeroDocumento')
    const trimmed = String(numeroRaw ?? '').trim()

    if (user.isDriver) {
      const shift = await DriverShift.query().where('userId', user.id).whereNull('endedAt').first()
      if (!shift) {
        return response.forbidden({ message: 'Debes tener un turno activo' })
      }
      const order = await TrackingOrder.query().where('numeroDocumento', trimmed).first()
      if (!order) {
        return response.notFound({ message: 'Pedido no encontrado' })
      }
      if (Number(order.vehicleId) !== Number(shift.vehicleId)) {
        return response.forbidden({ message: 'Este pedido no está asignado a tu unidad' })
      }
      if (order.status !== 1) {
        return response.badRequest({ message: 'Solo se puede completar un pedido en proceso' })
      }
    }

    const result = await trackingOrderCompletionService.completeByNumeroDocumento(numeroRaw)

    if (!result.success) {
      if (result.code === 'not_found') {
        return response.notFound({ message: result.message })
      }
      if (result.code === 'invalid') {
        return response.badRequest({ message: result.message })
      }
      if (result.code === 'corporate_no_row') {
        return response.unprocessableEntity({ message: result.message })
      }
      return response.badGateway({ message: result.message })
    }

    const message = result.alreadyCompleted
      ? 'El pedido ya estaba completado en tracking; SADEV se reintentó si aplica.'
      : 'Pedido completado en tracking y estado actualizado en SADEV cuando corresponde.'

    const order = await TrackingOrder.query().where('numeroDocumento', trimmed).first()
    if (order) {
      const completeEvent = createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_COMPLETED, {
        source: 'internal',
        order: {
          numeroDocumento: order.numeroDocumento,
          status: order.status,
          vehicleId: order.vehicleId,
          completedAt: order.updatedAt?.toISO() ?? null,
        },
        location: null,
        metadata: {
          completedByUserId: user.id,
          corporateRowsAffected: result.corporateRowsAffected,
        },
      })
      await trackingPublicEventService.receiveInbound(completeEvent)
      await trackingPublicEventService.enqueueOutbound(completeEvent)
      await emitOrderSyncedFullSnapshot(order.numeroDocumento, {
        channel: 'driver:complete',
        completedByUserId: user.id,
      })
    }

    return response.ok({
      message,
      alreadyCompleted: result.alreadyCompleted,
      corporateRowsAffected: result.corporateRowsAffected,
    })
  }

  async dashboard({ response }: HttpContext) {
    const [pending, inProgress, completed, total, synced] = await Promise.all([
      TrackingOrder.query().where('status', 0).count('* as total').first(),
      TrackingOrder.query().where('status', 1).count('* as total').first(),
      TrackingOrder.query().where('status', 2).count('* as total').first(),
      TrackingOrder.query().count('* as total').first(),
      TrackingOrder.query().where('isSync', true).count('* as total').first(),
    ])

    return response.ok({
      cards: {
        pending: Number(pending?.$extras.total ?? 0),
        inProgress: Number(inProgress?.$extras.total ?? 0),
        completed: Number(completed?.$extras.total ?? 0),
        total: Number(total?.$extras.total ?? 0),
        synced: Number(synced?.$extras.total ?? 0),
      },
      geocodingAvailable: isGeocodingConfigured(),
      serverTime: DateTime.utc().toISO()!,
    })
  }

  /**
   * GET: resuelve coordenadas a partir del enlace guardado (misma lógica que al guardar / live-location).
   * Útil para depuración o clientes que necesiten el punto sin abrir el acortado en el navegador.
   */
  async previewDestination({ auth, params, response }: HttpContext) {
    auth.getUserOrFail()
    const numero = decodeURIComponent(String(params.numeroDocumento ?? '').trim())
    if (!numero) {
      return response.badRequest({ message: 'numeroDocumento requerido' })
    }
    const order = await TrackingOrder.query().where('numeroDocumento', numero).first()
    if (!order) {
      return response.notFound({ message: 'Pedido no encontrado' })
    }
    const link = String(order.destinationMapsLink ?? '').trim()
    if (!link) {
      return response.badRequest({ message: 'El pedido no tiene enlace de destino' })
    }
    const r = await bestDestinationForMapsLink(link)
    return response.ok({
      numeroDocumento: order.numeroDocumento,
      mapsLink: link,
      geocodingAvailable: isGeocodingConfigured(),
      resolved: r.point
        ? { latitude: r.point.lat, longitude: r.point.lng, source: r.source }
        : null,
      linkParsed: r.linkParsedCoords
        ? { latitude: r.linkParsedCoords.lat, longitude: r.linkParsedCoords.lng }
        : null,
      stored: {
        latitude: order.destinationLat,
        longitude: order.destinationLng,
        source: order.destinationSource,
      },
    })
  }

  async publishLocation({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.isDriver && !user.isAdmin) {
      return response.forbidden({ message: 'Solo repartidor o admin puede publicar ubicación' })
    }

    const numeroDocumento = String(params.numeroDocumento ?? '').trim()
    if (!numeroDocumento) {
      trackingRealtimeMetricsService.markLocationRejected()
      return response.badRequest({ message: 'numeroDocumento requerido' })
    }

    const latitude = Number(request.input('latitude'))
    const longitude = Number(request.input('longitude'))
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      trackingRealtimeMetricsService.markLocationRejected()
      return response.badRequest({ message: 'latitude/longitude inválidos' })
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      trackingRealtimeMetricsService.markLocationRejected()
      return response.badRequest({ message: 'latitude/longitude fuera de rango' })
    }

    const order = await TrackingOrder.query().where('numeroDocumento', numeroDocumento).first()
    if (!order) {
      trackingRealtimeMetricsService.markLocationRejected()
      return response.notFound({ message: 'Pedido no encontrado' })
    }
    if (user.isDriver && (order.vehicleId ?? null) === null) {
      trackingRealtimeMetricsService.markLocationRejected()
      return response.forbidden({ message: 'Pedido sin unidad asignada' })
    }

    const nowMs = Date.now()
    const recordedAtRaw = String(request.input('recordedAt') ?? '').trim()
    const recordedAtMs = recordedAtRaw ? Date.parse(recordedAtRaw) : Number.NaN
    if (recordedAtRaw && !Number.isFinite(recordedAtMs)) {
      trackingRealtimeMetricsService.markLocationRejected()
      return response.badRequest({ message: 'recordedAt inválido' })
    }
    if (Number.isFinite(recordedAtMs)) {
      const maxPastMs = 12 * 60 * 60 * 1000
      const maxFutureMs = 5 * 60 * 1000
      if (recordedAtMs < nowMs - maxPastMs || recordedAtMs > nowMs + maxFutureMs) {
        trackingRealtimeMetricsService.markLocationRejected()
        return response.badRequest({ message: 'recordedAt fuera de ventana permitida' })
      }
    }

    const accuracyMetersRaw = request.input('accuracyMeters')
    const speedMpsRaw = request.input('speedMps')
    const accuracyMeters =
      accuracyMetersRaw === undefined || accuracyMetersRaw === null ? null : Number(accuracyMetersRaw)
    const speedMps = speedMpsRaw === undefined || speedMpsRaw === null ? null : Number(speedMpsRaw)
    if (accuracyMeters !== null && (!Number.isFinite(accuracyMeters) || accuracyMeters < 0)) {
      trackingRealtimeMetricsService.markLocationRejected()
      return response.badRequest({ message: 'accuracyMeters inválido' })
    }
    if (speedMps !== null && (!Number.isFinite(speedMps) || speedMps < 0 || speedMps > 90)) {
      trackingRealtimeMetricsService.markLocationRejected()
      return response.badRequest({ message: 'speedMps inválido' })
    }

    const providerRaw = String(request.input('provider') ?? 'mobile').trim()
    const provider = providerRaw.slice(0, 64) || 'mobile'

    const event = createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_LOCATION, {
      source: 'mobile',
      order: {
        numeroDocumento: order.numeroDocumento,
        status: order.status,
        vehicleId: order.vehicleId,
      },
      location: {
        latitude,
        longitude,
        accuracyMeters,
        speedMps,
        provider,
        recordedAt:
          recordedAtRaw ||
          DateTime.fromMillis(nowMs).toISO() ||
          DateTime.now().toISO(),
      },
      metadata: {
        userId: user.id,
      },
    })

    await trackingPublicEventService.receiveInbound(event)
    await trackingPublicEventService.enqueueOutbound(event)
    trackingRealtimeMetricsService.markLocationPublished()

    return response.ok({
      message: 'Ubicación publicada',
      numeroDocumento: order.numeroDocumento,
      eventId: event.eventId,
    })
  }

  async liveLocation({ auth, params, response }: HttpContext) {
    auth.getUserOrFail()
    const numeroDocumento = String(params.numeroDocumento ?? '').trim()
    const order = await TrackingOrder.query()
      .where('numeroDocumento', numeroDocumento)
      .preload('vehicle')
      .preload('claimedByUser')
      .first()
    if (!order) {
      return response.notFound({ message: 'Pedido no encontrado' })
    }

    let linkResolvedCoords: { lat: number; lng: number } | null = null
    const link = String(order.destinationMapsLink ?? '').trim()
    if (link) {
      const alreadyGeocodedPlace =
        order.destinationSource === 'admin_link_place_geocoded' &&
        order.destinationLat != null &&
        order.destinationLng != null
      if (alreadyGeocodedPlace) {
        linkResolvedCoords = {
          lat: Number(order.destinationLat),
          lng: Number(order.destinationLng),
        }
      } else {
        const fromMaps = await bestDestinationForMapsLink(link)
        linkResolvedCoords = fromMaps.linkParsedCoords
        if (fromMaps.point) {
          const storedLat = order.destinationLat
          const storedLng = order.destinationLng
          const hasStored =
            storedLat != null &&
            storedLng != null &&
            Number.isFinite(Number(storedLat)) &&
            Number.isFinite(Number(storedLng))
          const stored = hasStored
            ? { lat: Number(storedLat), lng: Number(storedLng) }
            : null
          const shouldSave =
            !stored || coordsDifferMeaningfully(stored, fromMaps.point)
          if (shouldSave) {
            order.destinationLat = fromMaps.point.lat
            order.destinationLng = fromMaps.point.lng
            order.destinationSource = fromMaps.source ?? 'admin_link'
            await order.save()
          }
        }
      }
    }
    if ((order.destinationLat == null || order.destinationLng == null) && order.destinationAddress) {
      const geocoded = await geocodeAddress(order.destinationAddress, 'admin_address_geocoded')
      if (geocoded) {
        order.destinationLat = geocoded.lat
        order.destinationLng = geocoded.lng
        order.destinationSource = geocoded.source ?? 'admin_address'
        await order.save()
      }
    }

    const location = await trackingPublicEventService.getLatestLocation(numeroDocumento)

    const rowForEnrich: Record<string, unknown> = {
      vehicleId: order.vehicleId,
      transportStartedAt: order.transportStartedAt?.toISO() ?? null,
      status: order.status,
      claimedByUser: order.claimedByUser
        ? {
            id: order.claimedByUser.id,
            fullName: order.claimedByUser.fullName,
            email: order.claimedByUser.email,
          }
        : null,
    }
    const [enriched] = await enrichOrderListRows([rowForEnrich])

    const vehicleIdLive = location ? location.vehicleId : order.vehicleId
    const locationPayload = location
      ? {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          accuracyMeters: location.accuracyMeters,
          speedMps: location.speedMps,
          provider: location.provider,
          recordedAt: location.recordedAt.toISO(),
        }
      : null

    return response.ok({
      serverTime: DateTime.utc().toISO()!,
      numeroDocumento,
      vehicleId: vehicleIdLive,
      vehicle: order.vehicle
        ? {
            id: order.vehicle.id,
            code: order.vehicle.code,
            name: order.vehicle.name,
            imageUrl: order.vehicle.imageUrl,
          }
        : null,
      claimedBy: enriched.claimedBy ?? null,
      vehicleDriversOnTransportDay: enriched.vehicleDriversOnTransportDay ?? [],
      origin: {
        depotCode: order.originDepotCode,
        name: order.originName,
        address: order.originAddress,
        latitude: order.originLat,
        longitude: order.originLng,
      },
      destination: {
        address: order.destinationAddress,
        latitude:
          order.destinationLat != null && Number.isFinite(Number(order.destinationLat))
            ? Number(order.destinationLat)
            : (linkResolvedCoords?.lat ?? null),
        longitude:
          order.destinationLng != null && Number.isFinite(Number(order.destinationLng))
            ? Number(order.destinationLng)
            : (linkResolvedCoords?.lng ?? null),
        source: order.destinationSource,
        mapsLink: order.destinationMapsLink,
      },
      location: locationPayload,
    })
  }
}
