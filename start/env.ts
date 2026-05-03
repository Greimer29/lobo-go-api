/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // CORS (opcional). CORS_ORIGIN: lista separada por comas. CORS_ALLOW_LAN: permitir orígenes en redes privadas (RFC1918)
  CORS_ORIGIN: Env.schema.string.optional(),
  CORS_ALLOW_LAN: Env.schema.boolean.optional(),

  // SQL Server corporativo: lectura masiva; UPDATE opcional en SADEV (handoff tras sync, cierre de entrega)
  SQLSERVER_HOST: Env.schema.string({ format: 'host' }),
  SQLSERVER_PORT: Env.schema.number(),
  SQLSERVER_DATABASE: Env.schema.string(),
  SQLSERVER_USER: Env.schema.string(),
  SQLSERVER_PASSWORD: Env.schema.string(),
  SQLSERVER_ENCRYPT: Env.schema.boolean(),
  /** Esquema SQL Server (ej. dbo). */
  SQLSERVER_SCHEMA: Env.schema.string.optional(),
  /** Nombres de tablas si difieren del estándar A2/Profit (sin corchetes). */
  SQLSERVER_TABLE_SADEV: Env.schema.string.optional(),
  SQLSERVER_TABLE_SAFACT: Env.schema.string.optional(),
  SQLSERVER_TABLE_SAITEMFACT: Env.schema.string.optional(),
  SQLSERVER_TABLE_SADEPO: Env.schema.string.optional(),
  /** Tabla de productos en SQL Server (join opcional para unidad CodProd). Por defecto SAPROD. */
  SQLSERVER_TABLE_SAPROD: Env.schema.string.optional(),
  /**
   * Si true, no se hace JOIN con SAPROD al leer líneas (útil si no existe la tabla en tu ERP).
   */
  SQLSERVER_SKIP_SAPROD_JOIN: Env.schema.boolean.optional(),
  /** true = no consultar líneas de factura; pedidos sin ítems (si no existe la tabla de líneas). */
  SQLSERVER_SKIP_ITEM_LINES: Env.schema.boolean.optional(),
  /**
   * Al marcar un pedido como entregado en tracking, ejecutar UPDATE en SADEV.Status (requiere permiso UPDATE en SQL Server).
   */
  SQLSERVER_SADEV_PUSH_COMPLETION_ENABLED: Env.schema.boolean.optional(),
  /**
   * Valor numérico de SADEV.Status que significa "entregado/completado" en tu ERP (por defecto 2, alineado con mapStatus del sync).
   */
  SQLSERVER_SADEV_DELIVERED_STATUS: Env.schema.number.optional(),
  /**
   * Si true (por defecto), la sincronización SQL→MySQL no trae filas SADEV cuyo Status ya sea el de entregado (evita re-colas pendientes).
   */
  SQLSERVER_SADEV_SYNC_SKIP_DELIVERED: Env.schema.boolean.optional(),
  /**
   * Tras importar un pedido a tracking, ejecutar UPDATE SADEV.Status al valor de “ya en tracking” (requiere permiso UPDATE).
   * Así el siguiente sync no vuelve a leer ese documento como pendiente.
   */
  SQLSERVER_SADEV_PUSH_SYNCED_STATUS_ENABLED: Env.schema.boolean.optional(),
  /**
   * Valor numérico en SADEV.Status que significa “ya sincronizado/importado a tracking” (por defecto 1 en LOBO).
   */
  SQLSERVER_SADEV_SYNCED_STATUS: Env.schema.number.optional(),
  /**
   * En sync interno, no traer filas cuyo Status sea el de “ya sincronizado” (SQLSERVER_SADEV_SYNCED_STATUS), además del filtro de entregado.
   */
  SQLSERVER_SADEV_SYNC_SKIP_HANDOFF: Env.schema.boolean.optional(),
  /**
   * Columnas de coordenadas en la tabla de depósitos (SQLSERVER_TABLE_SADEPO, p. ej. SADEPO).
   * Si tu base no usa Latitud/Longitud, indica el nombre real (p. ej. Lng, Long) o activa OMIT_* abajo.
   */
  SQLSERVER_SADEPO_COL_LATITUD: Env.schema.string.optional(),
  SQLSERVER_SADEPO_COL_LONGITUD: Env.schema.string.optional(),
  /**
   * Si true, en la consulta a SADEPO no se lee latitud (se deja NULL en tracking).
   */
  SQLSERVER_SADEPO_OMIT_LATITUD: Env.schema.boolean.optional(),
  /**
   * Si true, no se lee longitud (p. ej. el ERP no tiene la columna Longitud; evita "Invalid column name 'Longitud'").
   */
  SQLSERVER_SADEPO_OMIT_LONGITUD: Env.schema.boolean.optional(),
  /**
   * Si true, no se leen ni lat ni lng desde corporativo (ambas NULL). Tiene prioridad sobre OMIT_LATITUD/OMIT_LONGITUD.
   */
  SQLSERVER_SADEPO_OMIT_COORDS: Env.schema.boolean.optional(),
  /**
   * Nombres reales en SADEPO para código de ubicación, descripción y dirección (por defecto CodUbic, Descrip, Direccion).
   */
  SQLSERVER_SADEPO_COL_CODUBIC: Env.schema.string.optional(),
  SQLSERVER_SADEPO_COL_DESCRIP: Env.schema.string.optional(),
  SQLSERVER_SADEPO_COL_DIRECCION: Env.schema.string.optional(),
  /**
   * Si true, no se lee descripción de depósito (NULL en tracking). Útil si el nombre de columna no es Descrip.
   */
  SQLSERVER_SADEPO_OMIT_DESCRIP: Env.schema.boolean.optional(),
  /**
   * Si true, no se lee dirección de depósito (NULL en tracking). Útil si no existe la columna Direccion.
   */
  SQLSERVER_SADEPO_OMIT_DIRECCION: Env.schema.boolean.optional(),
  /**
   * Sync automático SADEV→MySQL: el worker `node ace scheduler:run` ejecuta `sync:sadev` según cron.
   * Opcional: si se omite, se considera activo; usa `false` solo para desactivar (p. ej. entornos sin SQL Server).
   */
  SADEV_AUTO_SYNC_ENABLED: Env.schema.boolean.optional(),
  /**
   * Expresión cron (node-cron, 5 o 6 campos). Ej. cada minuto: *\/1 * * * * (cinco campos) o seis campos con segundos.
   * Si se omite, el scheduler usa cada 15 segundos.
   */
  SADEV_AUTO_SYNC_CRON: Env.schema.string.optional(),
  /** Límite de filas SADEV por tick de sync automático (1–500). */
  SADEV_AUTO_SYNC_LIMIT: Env.schema.number.optional(),
  /**
   * Status SADEV a incluir en el filtro `Status IN (...)` del job automático (CSV). En LOBO suele ser solo `0` (pendiente).
   * No uses aquí el valor de handoff (`SQLSERVER_SADEV_SYNCED_STATUS`, por defecto 1): esas filas ya no deben entrar al sync.
   */
  SADEV_AUTO_SYNC_PENDING_STATUSES: Env.schema.string.optional(),
  /**
   * Si true (por defecto), solo una instancia ejecuta el sync por tick (tabla `sync_job_leases` en MySQL).
   */
  SADEV_AUTO_SYNC_DISTRIBUTED_LOCK: Env.schema.boolean.optional(),
  /** TTL del candado en segundos (debe cubrir la duración máxima esperada del sync). */
  SADEV_AUTO_SYNC_LEASE_TTL_SECONDS: Env.schema.number.optional(),

  // MySQL tracking (read/write)
  MYSQL_TRACKING_HOST: Env.schema.string({ format: 'host' }),
  MYSQL_TRACKING_PORT: Env.schema.number(),
  MYSQL_TRACKING_DATABASE: Env.schema.string(),
  MYSQL_TRACKING_USER: Env.schema.string(),
  MYSQL_TRACKING_PASSWORD: Env.schema.string(),
  MYSQL_TRACKING_SSL: Env.schema.boolean(),

  // Tracking publico / realtime (Railway o gateway expuesto)
  PUBLIC_TRACKING_BASE_URL: Env.schema.string.optional(),
  PUBLIC_TRACKING_API_KEY: Env.schema.string.optional(),
  PUBLIC_TRACKING_SIGNING_SECRET: Env.schema.string.optional(),
  PUBLIC_TRACKING_ACCEPT_UNSIGNED: Env.schema.boolean.optional(),
  PUBLIC_TRACKING_WS_PORT: Env.schema.number.optional(),
  PUBLIC_SYNC_OUTBOUND_ENABLED: Env.schema.boolean.optional(),
  /**
   * Si no es false: tras encolar un evento outbound, se intenta enviar a PUBLIC_TRACKING_BASE_URL en segundo plano
   * (no dependes solo de `scheduler:run`). Desactiva si solo quieres el cron del scheduler.
   */
  PUBLIC_SYNC_IMMEDIATE_FLUSH: Env.schema.boolean.optional(),
  /** Lote máximo por ese flush inmediato (por defecto PUBLIC_SYNC_OUTBOUND_LIMIT o 50). */
  PUBLIC_SYNC_IMMEDIATE_FLUSH_LIMIT: Env.schema.number.optional(),
  PUBLIC_SYNC_OUTBOUND_CRON: Env.schema.string.optional(),
  PUBLIC_SYNC_OUTBOUND_LIMIT: Env.schema.number.optional(),
  PUBLIC_SYNC_RECONCILE_ENABLED: Env.schema.boolean.optional(),
  PUBLIC_SYNC_RECONCILE_CRON: Env.schema.string.optional(),
  PUBLIC_SYNC_RECONCILE_LOOKBACK_SECONDS: Env.schema.number.optional(),
  PUBLIC_SYNC_RECONCILE_LIMIT: Env.schema.number.optional(),
  /**
   * Timeout HTTP (ms) para sync/reconcile público.
   */
  PUBLIC_SYNC_HTTP_TIMEOUT_MS: Env.schema.number.optional(),
  /**
   * Reintentos por request HTTP público ante errores transitorios (ECONNRESET, 5xx, timeout).
   */
  PUBLIC_SYNC_HTTP_RETRIES: Env.schema.number.optional(),
  /**
   * Backoff base (ms) para reintentos HTTP públicos.
   */
  PUBLIC_SYNC_HTTP_RETRY_BASE_MS: Env.schema.number.optional(),

  // Bridge corporativo local -> Railway
  BRIDGE_RAILWAY_BASE_URL: Env.schema.string.optional(),
  BRIDGE_RAILWAY_API_KEY: Env.schema.string.optional(),
  BRIDGE_INTERVAL_SECONDS: Env.schema.number.optional(),
  BRIDGE_PULL_LIMIT: Env.schema.number.optional(),
  BRIDGE_MAX_RETRIES: Env.schema.number.optional(),
  CORP_BRIDGE_API_KEY: Env.schema.string.optional(),

  // Geocoding opcional (si admin carga solo dirección para destino)
  GOOGLE_MAPS_GEOCODING_API_KEY: Env.schema.string.optional(),
})
