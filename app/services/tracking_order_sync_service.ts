import TrackingOrder from '#models/tracking_order'
import TrackingOrderItem from '#models/tracking_order_item'
import Vehicle from '#models/vehicle'
import { geocodeDepotOrigin, isGeocodingConfigured } from '#services/google_geocoding_service'
import trackingPublicEventService from '#services/tracking_public_event_service'
import saDevService from '#services/sadev_service'
import type { PedidoCompuesto, SaDevQueryFilters } from '#services/sadev_service'
import { trackingOrderToSyncEventOrder } from '#services/tracking_order_sync_event_payload'
import { TRACKING_EVENT_TYPES, createOrderTrackingEvent } from '#services/tracking_public_event_contract'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export type SyncFromCorporateResult = {
  /** Pedidos escritos o reescritos en MySQL */
  synced: number
  /** Pedidos que ya coincidían con corporativo; no se tocó MySQL */
  unchanged: number
  /** Pedidos leídos de SQL Server (tras filtros) */
  sourceCount: number
}

class TrackingOrderSyncService {
  private async enqueueOrderSyncedEvent(pedido: PedidoCompuesto) {
    const fresh = await TrackingOrder.query()
      .where('numeroDocumento', pedido.numeroDocumento)
      .preload('items', (q) => q.orderBy('lineIndex', 'asc'))
      .first()
    if (!fresh) return

    await trackingPublicEventService.enqueueOutbound(
      createOrderTrackingEvent(TRACKING_EVENT_TYPES.ORDER_SYNCED, {
        source: 'internal',
        order: trackingOrderToSyncEventOrder(fresh),
        metadata: {
          channel: 'sync:sadev',
        },
      })
    )
  }

  /**
   * SADEV.Status → tracking_orders.status
   * 0 = pendiente corporativo; 2 = entregado en ERP.
   * En LOBO, 1 = “ya importado a tracking” (handoff): no define el flujo de reparto; se mapea como 0 y
   * resolveNextStatus conserva el estado en MySQL si el reparto ya avanzó.
   */
  private mapStatus(corporateStatus: number) {
    if (corporateStatus === 2) return 2
    if (corporateStatus === 1) return 0
    return 0
  }

  /**
   * Lee SQL Server (SADEV + SAFACT + SAITEMFAC), compone pedidos y los persiste en MySQL tracking.
   * Omite escritura si el pedido ya coincide con MySQL (evita timeouts por trabajo innecesario).
   */
  async syncFromCorporate(filters: SaDevQueryFilters): Promise<SyncFromCorporateResult> {
    const pedidos = await saDevService.listPedidosCompuestos({
      ...filters,
      excludeDeliveredCorporateRows: true,
      excludeHandoffCorporateRows: true,
    })
    if (pedidos.length === 0) {
      return { synced: 0, unchanged: 0, sourceCount: 0 }
    }
    return this.upsertPedidos(pedidos)
  }

  private normStr(v: string | null | undefined) {
    if (v === null || v === undefined) return null
    const t = String(v).trim()
    return t.length === 0 ? null : t
  }

  private normNum(v: unknown): number | null {
    if (v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  /**
   * Si el ERP trae depósito sin par lat/lng pero MySQL ya tiene coords (p. ej. geocodificadas, sync anterior), no forzar re-sync
   * mientras nombre y dirección de depósito sigan alineados con SADEV.
   */
  private originCoordsAgree(
    pedido: PedidoCompuesto,
    existing: TrackingOrder
  ): boolean {
    const pLat = this.normNum(pedido.depositoLat)
    const pLng = this.normNum(pedido.depositoLng)
    const eLat = this.normNum(existing.originLat)
    const eLng = this.normNum(existing.originLng)
    const pHas = pLat != null && pLng != null
    const eHas = eLat != null && eLng != null
    if (pHas && eHas) {
      return pLat === eLat && pLng === eLng
    }
    if (pHas && !eHas) {
      return false
    }
    if (!pHas && eHas) {
      return (
        this.normStr(pedido.depositoNombre) === this.normStr(existing.originName) &&
        this.normStr(pedido.depositoDireccion) === this.normStr(existing.originAddress)
      )
    }
    return true
  }

  /**
   * Si el pedido ya está completado en MySQL pero corporativo aún no refleja entrega, no forzar divergencia en la comparación.
   */
  private effectiveStatusForCompare(pedido: PedidoCompuesto, existing: TrackingOrder): number {
    const mapped = this.mapStatus(Number(pedido.corporateStatus ?? 0))
    if (existing.status === 2 && mapped < 2) return 2
    if (existing.status >= 1 && mapped === 0) return existing.status
    return mapped
  }

  /**
   * Estado que debe persistirse: evita bajar de 2 si corporativo sigue pendiente tras un push fallido o desfase.
   */
  private resolveNextStatus(pedido: PedidoCompuesto, existing: TrackingOrder | null): number {
    const mapped = this.mapStatus(Number(pedido.corporateStatus ?? 0))
    if (existing && existing.status === 2 && mapped < 2) return 2
    if (existing && existing.status >= 1 && mapped === 0) return existing.status
    return mapped
  }

  private async pushHandoffToSadevIfEnabled(pedido: PedidoCompuesto) {
    if (!saDevService.pushSyncedStatusToSadevEnabled()) return
    const status = saDevService.handoffSyncedStatusValue()
    try {
      await saDevService.updateSaDevStatus(pedido.numeroDocumento, status)
    } catch (err) {
      logger.warn(
        { err, numeroDocumento: pedido.numeroDocumento },
        'SADEV: no se pudo marcar pedido como sincronizado (UPDATE Status)'
      )
    }
  }

  private async resolveVehicleIdFromCodigo(codigoVendedor: string | null | undefined) {
    const cv = this.normStr(codigoVendedor)
    if (!cv) return null
    const vehicle = await Vehicle.query().where('code', cv).first()
    return vehicle?.id ?? null
  }

  /**
   * Pedido completado: conserva la MC que realizó el traslado (claim) para métricas, no la pisa el CodVend de corporativo.
   */
  private async resolveVehicleIdForUpsert(
    pedido: PedidoCompuesto,
    existing: TrackingOrder | null,
    nextStatus: number
  ) {
    const resolved = await this.resolveVehicleIdFromCodigo(pedido.codigoVendedor)
    if (
      nextStatus === 2 &&
      existing !== null &&
      existing.vehicleId !== null &&
      existing.vehicleId !== undefined
    ) {
      return existing.vehicleId
    }
    return resolved
  }

  private async pedidoEquals(pedido: PedidoCompuesto, existing: TrackingOrder): Promise<boolean> {
    const nextStatus = this.resolveNextStatus(pedido, existing)
    const nextVehicleId = await this.resolveVehicleIdForUpsert(pedido, existing, nextStatus)
    if (Number(existing.vehicleId ?? null) !== Number(nextVehicleId ?? null)) return false
    if (this.normStr(pedido.descripcionPedido) !== this.normStr(existing.descripcionPedido))
      return false
    if (Number(pedido.montoTotal) !== Number(existing.montoTotal)) return false
    if (this.normStr(pedido.estadoCodigo) !== this.normStr(existing.estadoCodigo)) return false
    if (this.normStr(pedido.tipoFactura) !== this.normStr(existing.tipoFactura)) return false
    if (this.normStr(pedido.codigoUbicacion) !== this.normStr(existing.codigoUbicacion))
      return false
    if (this.normStr(pedido.codigoUbicacion) !== this.normStr(existing.originDepotCode)) {
      return false
    }
    if (this.normStr(pedido.depositoNombre) !== this.normStr(existing.originName)) return false
    if (this.normStr(pedido.depositoDireccion) !== this.normStr(existing.originAddress))
      return false
    if (!this.originCoordsAgree(pedido, existing)) return false
    if (this.normStr(pedido.codigoVendedor) !== this.normStr(existing.codigoVendedor)) return false
    if (this.effectiveStatusForCompare(pedido, existing) !== Number(existing.status ?? 0))
      return false

    const stored = [...existing.items].sort((a, b) => a.lineIndex - b.lineIndex)
    if (pedido.items.length !== stored.length) return false
    for (let i = 0; i < pedido.items.length; i++) {
      const p = pedido.items[i]
      const e = stored[i]
      if (this.normStr(p.codigoItem) !== this.normStr(e.codigoItem)) return false
      if (this.normStr(p.descripcionItem) !== this.normStr(e.descripcionItem)) return false
      if (Number(p.cantidad) !== Number(e.cantidad)) return false
      if (Number(p.precio) !== Number(e.precio)) return false
      if (this.normStr(p.codigoUnidadVenta) !== this.normStr(e.codigoUnidadVenta)) return false
    }
    return true
  }

  /**
   * Persiste o actualiza pedidos ya compuestos (upsert por numero_documento).
   */
  async upsertPedidos(pedidos: PedidoCompuesto[]): Promise<SyncFromCorporateResult> {
    let synced = 0
    let unchanged = 0

    for (const pedido of pedidos) {
      const existing = await TrackingOrder.query()
        .where('numeroDocumento', pedido.numeroDocumento)
        .preload('items', (q) => q.orderBy('lineIndex', 'asc'))
        .first()

      if (existing && (await this.pedidoEquals(pedido, existing))) {
        unchanged++
        try {
          await this.enqueueOrderSyncedEvent(pedido)
        } catch (err) {
          logger.warn(
            { err, numeroDocumento: pedido.numeroDocumento },
            'No se pudo encolar evento outbound ORDER_SYNCED'
          )
        }
        await this.pushHandoffToSadevIfEnabled(pedido)
        continue
      }

      await db.transaction(async (trx) => {
        const nextStatus = this.resolveNextStatus(pedido, existing)
        const vehicleId = await this.resolveVehicleIdForUpsert(pedido, existing, nextStatus)
        const prevStatus = existing?.status ?? -1
        let transportStartedAt = existing?.transportStartedAt ?? null
        if (nextStatus === 1) {
          if (prevStatus !== 1) {
            transportStartedAt = DateTime.now()
          }
        } else if (nextStatus === 0) {
          transportStartedAt = null
        } else if (nextStatus === 2) {
          if (prevStatus !== 1 && prevStatus !== 2 && !transportStartedAt) {
            transportStartedAt = DateTime.now()
          }
        }

        let oLat: number | null = this.normNum(pedido.depositoLat)
        let oLng: number | null = this.normNum(pedido.depositoLng)
        if (oLat == null || oLng == null) {
          const nameMatch =
            existing &&
            this.normStr(pedido.depositoNombre) === this.normStr(existing.originName) &&
            this.normStr(pedido.depositoDireccion) === this.normStr(existing.originAddress) &&
            this.normNum(existing.originLat) != null &&
            this.normNum(existing.originLng) != null
          if (nameMatch) {
            oLat = this.normNum(existing!.originLat)
            oLng = this.normNum(existing!.originLng)
          } else if (isGeocodingConfigured() && (this.normStr(pedido.depositoNombre) || this.normStr(pedido.depositoDireccion))) {
            const g = await geocodeDepotOrigin(pedido.depositoNombre, pedido.depositoDireccion)
            if (g) {
              oLat = g.lat
              oLng = g.lng
            }
          }
        }

        const order = await TrackingOrder.updateOrCreate(
          { numeroDocumento: pedido.numeroDocumento },
          {
            descripcionPedido: pedido.descripcionPedido,
            montoTotal: pedido.montoTotal,
            estadoCodigo: pedido.estadoCodigo,
            tipoFactura: pedido.tipoFactura,
            codigoUbicacion: pedido.codigoUbicacion,
            codigoVendedor: pedido.codigoVendedor,
            originDepotCode: pedido.codigoUbicacion,
            originName: pedido.depositoNombre,
            originAddress: pedido.depositoDireccion,
            originLat: oLat,
            originLng: oLng,
            vehicleId,
            claimedByUserId: existing?.claimedByUserId ?? null,
            syncedAt: DateTime.now(),
            status: nextStatus,
            isSync: true,
            transportStartedAt,
          },
          { client: trx }
        )

        await TrackingOrderItem.query({ client: trx }).where('trackingOrderId', order.id).delete()

        for (let i = 0; i < pedido.items.length; i++) {
          const item = pedido.items[i]
          await TrackingOrderItem.create(
            {
              trackingOrderId: order.id,
              lineIndex: i,
              codigoItem: item.codigoItem,
              descripcionItem: item.descripcionItem,
              cantidad: item.cantidad,
              precio: item.precio,
              codigoUnidadVenta: item.codigoUnidadVenta,
            },
            { client: trx }
          )
        }
      })

      try {
        await this.enqueueOrderSyncedEvent(pedido)
      } catch (err) {
        logger.warn(
          { err, numeroDocumento: pedido.numeroDocumento },
          'No se pudo encolar evento outbound ORDER_SYNCED'
        )
      }

      await this.pushHandoffToSadevIfEnabled(pedido)
      synced++
    }

    return { synced, unchanged, sourceCount: pedidos.length }
  }
}

export default new TrackingOrderSyncService()
