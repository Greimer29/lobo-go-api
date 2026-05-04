/**
 * SQL Server (corporativo): lectura en [dbo].[SADEV], [dbo].[SAFACT], [dbo].[SAITEMFAC] (nombres/esquema configurables).
 * `updateSaDevStatus` escribe SADEV.Status cuando el API tiene permiso UPDATE (handoff post-sync, entrega desde tracking).
 */
import env from '#start/env'
import mssql from 'mssql'

export type SaDevQueryFilters = {
  numeroD?: string
  codEsta?: string
  tipofac?: string
  limit?: number
  /**
   * Si se define, solo filas SADEV con Status en esta lista (ej. [0] = pendientes en LOBO).
   */
  corporateStatuses?: number[]
  /**
   * Solo sync interno: excluye filas SADEV ya marcadas como entregadas en corporativo.
   * No usar en lecturas API generales (p. ej. GET sadev).
   */
  excludeDeliveredCorporateRows?: boolean
  /**
   * Solo sync interno: excluye filas ya marcadas como importadas a tracking (Status = SQLSERVER_SADEV_SYNCED_STATUS).
   */
  excludeHandoffCorporateRows?: boolean
}

/**
 * Parsea CSV de SADEV.Status para filtrar `Status IN (...)`. Vacío → undefined.
 * En LOBO el job suele usar solo pendiente (`0`). El estado de handoff importado a tracking es otro valor (p. ej. `1`), no conviene mezclarlo en este filtro.
 */
export function parseCorporateStatusesCsv(value: string | undefined | null): number[] | undefined {
  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined
  }
  const nums = String(value)
    .split(/[,;]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
  return nums.length > 0 ? nums : undefined
}

type SaDevRow = {
  Descrip: string | null
  MtoTotal: number | null
  NumeroD: string | null
  Status: number | null
}

type SaFactRow = {
  NumeroD: string | null
  CodEsta: string | null
  Tipofac: string | null
  CodUbic: string | null
  CodVend: string | null
}

type SaItemFactRow = {
  NumeroD: string | null
  CodItem: string | null
  Descrip1: string | null
  Cantidad: number | null
  CodUbic: string | null
  /** Precio de línea (SAITEMFAC.Precio), con respaldo SAPROD.Precio1 si la línea viene nula. */
  Precio: number | null
  /** Unidad de venta desde SAPROD.Unidad (join por CodProd = CodItem). */
  SaprodUnidad: string | null
}

type SaDepoRow = {
  CodUbic: string | null
  Descrip: string | null
  Direccion: string | null
  Latitud: number | null
  Longitud: number | null
}

export type PedidoItem = {
  codigoItem: string | null
  descripcionItem: string | null
  cantidad: number
  precio: number
  codigoUnidadVenta: string | null
}

export type PedidoCompuesto = {
  numeroDocumento: string
  corporateStatus: number
  estadoCodigo: string | null
  tipoFactura: string | null
  codigoUbicacion: string | null
  depositoNombre: string | null
  depositoDireccion: string | null
  depositoLat: number | null
  depositoLng: number | null
  codigoVendedor: string | null
  descripcionPedido: string | null
  montoTotal: number
  items: PedidoItem[]
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/

type SadevSadepoColEnvKey =
  | 'SQLSERVER_SADEPO_COL_CODUBIC'
  | 'SQLSERVER_SADEPO_COL_DESCRIP'
  | 'SQLSERVER_SADEPO_COL_DIRECCION'
  | 'SQLSERVER_SADEPO_COL_LATITUD'
  | 'SQLSERVER_SADEPO_COL_LONGITUD'

function sqlQualifiedTable(schemaRaw: string | undefined, tableRaw: string): string {
  const schema = (schemaRaw ?? 'dbo').trim() || 'dbo'
  const table = tableRaw.trim()
  if (!IDENT.test(schema) || !IDENT.test(table)) {
    throw new Error(`Identificador SQL inválido: [${schema}].[${table}]`)
  }
  return `[${schema}].[${table}]`
}

function envTable(
  name: 'SQLSERVER_TABLE_SADEV' | 'SQLSERVER_TABLE_SAFACT' | 'SQLSERVER_TABLE_SAITEMFACT',
  fallback: string
) {
  const raw = env.get(name)
  const v = typeof raw === 'string' ? raw.trim() : ''
  return v || fallback
}

function envTableSaprod(): string {
  const raw = env.get('SQLSERVER_TABLE_SAPROD')
  const v = typeof raw === 'string' ? raw.trim() : ''
  return v || 'SAPROD'
}

function envTableSadepo(): string {
  const raw = env.get('SQLSERVER_TABLE_SADEPO')
  const v = typeof raw === 'string' ? raw.trim() : ''
  return v || 'SADEPO'
}

class SaDevService {
  private poolPromise?: Promise<mssql.ConnectionPool>

  private tableSaDev() {
    const schema = env.get('SQLSERVER_SCHEMA')
    const s = typeof schema === 'string' ? schema.trim() : ''
    return sqlQualifiedTable(s || undefined, envTable('SQLSERVER_TABLE_SADEV', 'SADEV'))
  }

  private tableSaFact() {
    const schema = env.get('SQLSERVER_SCHEMA')
    const s = typeof schema === 'string' ? schema.trim() : ''
    return sqlQualifiedTable(s || undefined, envTable('SQLSERVER_TABLE_SAFACT', 'SAFACT'))
  }

  private tableSaItemFact() {
    const schema = env.get('SQLSERVER_SCHEMA')
    const s = typeof schema === 'string' ? schema.trim() : ''
    return sqlQualifiedTable(s || undefined, envTable('SQLSERVER_TABLE_SAITEMFACT', 'SAITEMFAC'))
  }

  private tableSaDepo() {
    const schema = env.get('SQLSERVER_SCHEMA')
    const s = typeof schema === 'string' ? schema.trim() : ''
    return sqlQualifiedTable(s || undefined, envTableSadepo())
  }

  private skipItemLines() {
    return env.get('SQLSERVER_SKIP_ITEM_LINES') === true
  }

  private skipSaprodJoin() {
    return env.get('SQLSERVER_SKIP_SAPROD_JOIN') === true
  }

  private tableSaprod() {
    const schema = env.get('SQLSERVER_SCHEMA')
    const s = typeof schema === 'string' ? schema.trim() : ''
    return sqlQualifiedTable(s || undefined, envTableSaprod())
  }

  /**
   * Valor numérico que se escribe en SADEV.Status al marcar entregado desde tracking.
   */
  deliveredStatusValue(): number {
    const v = env.get('SQLSERVER_SADEV_DELIVERED_STATUS')
    return typeof v === 'number' && !Number.isNaN(v) ? v : 2
  }

  /**
   * Valor en SADEV.Status que indica “pedido ya importado a tracking” (handoff); por defecto 1 en LOBO.
   */
  handoffSyncedStatusValue(): number {
    const v = env.get('SQLSERVER_SADEV_SYNCED_STATUS')
    /**
     * Hardening: por la operación de LOBO el handoff válido es 1.
     * Si viene otra configuración (ej. 9), se ignora y se fuerza 1.
     */
    if (typeof v === 'number' && !Number.isNaN(v) && v === 1) {
      return 1
    }
    return 1
  }

  /**
   * Si true (por defecto), tras importar a MySQL se hace UPDATE en SADEV al estado handoff.
   */
  pushSyncedStatusToSadevEnabled(): boolean {
    return env.get('SQLSERVER_SADEV_PUSH_SYNCED_STATUS_ENABLED') !== false
  }

  /**
   * Si true, el listado para sync excluye filas ya marcadas como entregadas en corporativo.
   */
  syncSkipsDeliveredRows(): boolean {
    const v = env.get('SQLSERVER_SADEV_SYNC_SKIP_DELIVERED')
    if (v === false) return false
    return true
  }

  /**
   * Si true (por defecto), el listado para sync excluye filas con Status = handoff (ya importadas a tracking).
   */
  syncSkipsHandoffRows(): boolean {
    const v = env.get('SQLSERVER_SADEV_SYNC_SKIP_HANDOFF')
    if (v === false) return false
    return true
  }

  /**
   * UPDATE SADEV SET Status = @status WHERE NumeroD = @numeroD (requiere permisos en SQL Server).
   * Devuelve filas afectadas (0 si no hubo coincidencia).
   */
  async updateSaDevStatus(numeroD: string, status: number): Promise<number> {
    const trimmed = numeroD.trim()
    if (!trimmed) return 0

    const pool = await this.getPool()
    const request = pool.request()
    request.input('numeroD', mssql.VarChar, trimmed)
    request.input('status', mssql.Int, status)

    const t = this.tableSaDev()
    const result = await request.query(`UPDATE ${t} SET Status = @status WHERE NumeroD = @numeroD`)

    const affected = result.rowsAffected?.[0]
    return typeof affected === 'number' ? affected : 0
  }

  private getPool() {
    if (!this.poolPromise) {
      const host = env.get('SQLSERVER_HOST')
      const port = env.get('SQLSERVER_PORT')
      const database = env.get('SQLSERVER_DATABASE')
      const user = env.get('SQLSERVER_USER')
      const password = env.get('SQLSERVER_PASSWORD')
      const encrypt = env.get('SQLSERVER_ENCRYPT')
      if (!host || !database || !user || !password || port === undefined || encrypt === undefined) {
        throw new Error(
          'Faltan variables SQLSERVER_* requeridas para conectar (HOST, PORT, DATABASE, USER, PASSWORD, ENCRYPT)'
        )
      }
      this.poolPromise = new mssql.ConnectionPool({
        server: host,
        port,
        database,
        user,
        password,
        options: {
          encrypt,
          trustServerCertificate: !encrypt,
          requestTimeout: 120_000,
        },
      }).connect()
    }

    return this.poolPromise
  }

  async list(filters: SaDevQueryFilters): Promise<SaDevRow[]> {
    const pool = await this.getPool()
    const request = pool.request()

    request.input('limit', mssql.Int, filters.limit ?? 100)

    const where: string[] = []

    if (filters.numeroD) {
      request.input('numeroD', mssql.VarChar, filters.numeroD)
      where.push('NumeroD = @numeroD')
    }

    if (filters.excludeDeliveredCorporateRows && this.syncSkipsDeliveredRows()) {
      const delivered = this.deliveredStatusValue()
      request.input('skipDeliveredStatus', mssql.Int, delivered)
      where.push('(Status IS NULL OR Status <> @skipDeliveredStatus)')
    }

    if (filters.excludeHandoffCorporateRows && this.syncSkipsHandoffRows()) {
      const handoff = this.handoffSyncedStatusValue()
      const delivered = this.deliveredStatusValue()
      if (handoff === delivered) {
        throw new Error(
          'SQLSERVER_SADEV_SYNCED_STATUS no puede ser igual a SQLSERVER_SADEV_DELIVERED_STATUS'
        )
      }
      request.input('skipHandoffStatus', mssql.Int, handoff)
      where.push('(Status IS NULL OR Status <> @skipHandoffStatus)')
    }

    const statuses = filters.corporateStatuses?.filter((n) => Number.isFinite(n)) ?? []
    if (statuses.length > 0) {
      const placeholders = statuses.map((_, i) => {
        const p = `corpStatus_${i}`
        request.input(p, mssql.Int, statuses[i]!)
        return `@${p}`
      })
      where.push(`Status IN (${placeholders.join(', ')})`)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    const t = this.tableSaDev()
    const query = `
      SELECT TOP (@limit)
        Descrip,
        MtoTotal,
        NumeroD,
        Status
      FROM ${t}
      ${whereClause}
      ORDER BY NumeroD DESC
    `

    const result = await request.query<SaDevRow>(query)
    return result.recordset
  }

  private async fetchSaFactByNumeroD(numeroDocs: string[]): Promise<SaFactRow[]> {
    if (numeroDocs.length === 0) return []

    const pool = await this.getPool()
    const request = pool.request()
    const params = numeroDocs.map((numeroD, index) => {
      const key = `numeroD_${index}`
      request.input(key, mssql.VarChar, numeroD)
      return `@${key}`
    })

    const t = this.tableSaFact()
    const query = `
      SELECT
        NumeroD,
        CodEsta,
        Tipofac,
        CodUbic,
        CodVend
      FROM ${t}
      WHERE NumeroD IN (${params.join(', ')})
    `

    const result = await request.query<SaFactRow>(query)
    return result.recordset
  }

  private async fetchSaItemFactByNumeroD(numeroDocs: string[]): Promise<SaItemFactRow[]> {
    if (numeroDocs.length === 0 || this.skipItemLines()) return []

    const pool = await this.getPool()
    const request = pool.request()
    const params = numeroDocs.map((numeroD, index) => {
      const key = `numeroD_item_${index}`
      request.input(key, mssql.VarChar, numeroD)
      return `@${key}`
    })

    const t = this.tableSaItemFact()
    const joinSaprod = !this.skipSaprodJoin()
    const saprod = joinSaprod ? this.tableSaprod() : ''
    const query = joinSaprod
      ? `
      SELECT
        i.NumeroD,
        i.CodItem,
        i.Descrip1,
        i.Cantidad,
        i.CodUbic,
        ISNULL(ISNULL(i.Precio, p.Precio1), 0) AS Precio,
        NULLIF(LTRIM(RTRIM(CAST(p.Unidad AS NVARCHAR(64)))), '') AS SaprodUnidad
      FROM ${t} i
      LEFT JOIN ${saprod} p ON p.CodProd = i.CodItem
      WHERE i.NumeroD IN (${params.join(', ')})
    `
      : `
      SELECT
        NumeroD,
        CodItem,
        Descrip1,
        Cantidad,
        CodUbic,
        ISNULL(Precio, 0) AS Precio,
        CAST(NULL AS NVARCHAR(64)) AS SaprodUnidad
      FROM ${t}
      WHERE NumeroD IN (${params.join(', ')})
    `

    const result = await request.query<SaItemFactRow>(query)
    return result.recordset
  }

  composePedidos(rows: SaDevRow[]): PedidoCompuesto[] {
    const byDocumento = new Map<string, PedidoCompuesto>()

    for (const row of rows) {
      const numeroDocumento = row.NumeroD?.trim()
      if (!numeroDocumento) continue

      if (!byDocumento.has(numeroDocumento)) {
        byDocumento.set(numeroDocumento, {
          numeroDocumento,
          corporateStatus: Number(row.Status ?? 0),
          estadoCodigo: null,
          tipoFactura: null,
          codigoUbicacion: null,
          depositoNombre: null,
          depositoDireccion: null,
          depositoLat: null,
          depositoLng: null,
          codigoVendedor: null,
          descripcionPedido: row.Descrip,
          montoTotal: Number(row.MtoTotal ?? 0),
          items: [],
        })
      }
    }

    return Array.from(byDocumento.values())
  }

  /**
   * Nombre físico de columna en SADEPO (o SQLSERVER_TABLE_SADEPO), mapeado a un alias fijo en el result set.
   */
  private bracketSadeoDepotCol(envKey: SadevSadepoColEnvKey, defaultName: string) {
    const raw = env.get(envKey)
    const name = (typeof raw === 'string' ? raw.trim() : '') || defaultName
    if (!IDENT.test(name)) {
      throw new Error(
        `SQL Server SADEPO: identificador de columna no válido para ${envKey} (revisar api/.env): ${name}`
      )
    }
    return `[${name}]`
  }

  private sadeoDepotCoordSelectSql(): { lat: string; lng: string } {
    if (env.get('SQLSERVER_SADEPO_OMIT_COORDS') === true) {
      return {
        lat: 'CAST(NULL AS FLOAT) AS Latitud',
        lng: 'CAST(NULL AS FLOAT) AS Longitud',
      }
    }
    const lat =
      env.get('SQLSERVER_SADEPO_OMIT_LATITUD') === true
        ? 'CAST(NULL AS FLOAT) AS Latitud'
        : `CAST(${this.bracketSadeoDepotCol('SQLSERVER_SADEPO_COL_LATITUD', 'Latitud')} AS FLOAT) AS Latitud`
    const lng =
      env.get('SQLSERVER_SADEPO_OMIT_LONGITUD') === true
        ? 'CAST(NULL AS FLOAT) AS Longitud'
        : `CAST(${this.bracketSadeoDepotCol('SQLSERVER_SADEPO_COL_LONGITUD', 'Longitud')} AS FLOAT) AS Longitud`
    return { lat, lng }
  }

  /**
   * Columnas de texto/clave del depósito: alias fijos CodUbic, Descrip, Direccion para el resto del servicio.
   */
  private sadeoDepotCoreSelectAndWhere(): { selectBody: string; whereCodColumn: string } {
    const whereCod = this.bracketSadeoDepotCol('SQLSERVER_SADEPO_COL_CODUBIC', 'CodUbic')
    const codSelect = `${whereCod} AS CodUbic`
    const descrip =
      env.get('SQLSERVER_SADEPO_OMIT_DESCRIP') === true
        ? 'CAST(NULL AS NVARCHAR(512)) AS Descrip'
        : `${this.bracketSadeoDepotCol('SQLSERVER_SADEPO_COL_DESCRIP', 'Descrip')} AS Descrip`
    const direccion =
      env.get('SQLSERVER_SADEPO_OMIT_DIRECCION') === true
        ? 'CAST(NULL AS NVARCHAR(4000)) AS Direccion'
        : `${this.bracketSadeoDepotCol('SQLSERVER_SADEPO_COL_DIRECCION', 'Direccion')} AS Direccion`
    const { lat, lng } = this.sadeoDepotCoordSelectSql()
    const selectBody = [codSelect, descrip, direccion, lat, lng].join(',\n        ')
    return { selectBody, whereCodColumn: whereCod }
  }

  private async fetchSaDepoByCodUbic(codigos: string[]): Promise<Map<string, SaDepoRow>> {
    const unique = Array.from(new Set(codigos.map((x) => String(x || '').trim()).filter(Boolean)))
    if (unique.length === 0) return new Map()

    const pool = await this.getPool()
    const request = pool.request()
    const params = unique.map((codigo, index) => {
      const key = `codUbic_${index}`
      request.input(key, mssql.VarChar, codigo)
      return `@${key}`
    })

    const t = this.tableSaDepo()
    const { selectBody, whereCodColumn } = this.sadeoDepotCoreSelectAndWhere()
    const query = `
      SELECT
        ${selectBody}
      FROM ${t}
      WHERE ${whereCodColumn} IN (${params.join(', ')})
    `
    const result = await request.query<SaDepoRow>(query)
    const map = new Map<string, SaDepoRow>()
    for (const row of result.recordset) {
      const code = String(row.CodUbic ?? '').trim()
      if (!code) continue
      map.set(code, row)
    }
    return map
  }

  async listPedidosCompuestos(filters: SaDevQueryFilters): Promise<PedidoCompuesto[]> {
    const saDevRows = await this.list(filters)
    const pedidos = this.composePedidos(saDevRows)

    const numeroDocs = pedidos.map((pedido) => pedido.numeroDocumento)
    const [factRows, itemRows] = await Promise.all([
      this.fetchSaFactByNumeroD(numeroDocs),
      this.fetchSaItemFactByNumeroD(numeroDocs),
    ])

    const factByNumeroD = new Map<string, SaFactRow>()
    for (const factRow of factRows) {
      const numeroD = factRow.NumeroD?.trim()
      if (!numeroD) continue
      factByNumeroD.set(numeroD, factRow)
    }

    const itemsByNumeroD = new Map<string, PedidoItem[]>()
    const itemCodUbicByNumeroD = new Map<string, string>()
    for (const itemRow of itemRows) {
      const numeroD = itemRow.NumeroD?.trim()
      if (!numeroD) continue

      const list = itemsByNumeroD.get(numeroD) ?? []
      list.push({
        codigoItem: itemRow.CodItem,
        descripcionItem: itemRow.Descrip1,
        cantidad: Number(itemRow.Cantidad ?? 0),
        precio: Number(itemRow.Precio ?? 0),
        codigoUnidadVenta: itemRow.SaprodUnidad?.trim() || null,
      })
      itemsByNumeroD.set(numeroD, list)

      const codUbic = String(itemRow.CodUbic ?? '').trim()
      if (codUbic && !itemCodUbicByNumeroD.has(numeroD)) {
        itemCodUbicByNumeroD.set(numeroD, codUbic)
      }
    }

    const codigosUbicacion = pedidos
      .map((pedido) => {
        const itemCodUbic = itemCodUbicByNumeroD.get(pedido.numeroDocumento) ?? null
        const factCodUbic = factByNumeroD.get(pedido.numeroDocumento)?.CodUbic ?? null
        return String(itemCodUbic ?? factCodUbic ?? '').trim()
      })
      .filter(Boolean)
    const depoByCode = await this.fetchSaDepoByCodUbic(codigosUbicacion)

    const enrichedPedidos = pedidos.map((pedido) => {
      const fact = factByNumeroD.get(pedido.numeroDocumento)
      const itemCodUbic = itemCodUbicByNumeroD.get(pedido.numeroDocumento) ?? null
      const codigoUbicacion = itemCodUbic ?? fact?.CodUbic ?? null
      const depo = codigoUbicacion ? depoByCode.get(String(codigoUbicacion).trim()) : undefined
      return {
        ...pedido,
        corporateStatus: Number(pedido.corporateStatus ?? 0),
        estadoCodigo: fact?.CodEsta ?? null,
        tipoFactura: fact?.Tipofac ?? null,
        codigoUbicacion,
        depositoNombre: depo?.Descrip ?? null,
        depositoDireccion: depo?.Direccion ?? null,
        depositoLat: Number.isFinite(Number(depo?.Latitud)) ? Number(depo?.Latitud) : null,
        depositoLng: Number.isFinite(Number(depo?.Longitud)) ? Number(depo?.Longitud) : null,
        codigoVendedor: fact?.CodVend ?? null,
        items: itemsByNumeroD.get(pedido.numeroDocumento) ?? [],
      }
    })

    const filtered = enrichedPedidos.filter((pedido) => {
      if (filters.codEsta && pedido.estadoCodigo !== filters.codEsta) return false
      if (filters.tipofac && pedido.tipoFactura !== filters.tipofac) return false
      return true
    })

    return filtered
  }
}

export default new SaDevService()
