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

  // SQL Server corporativo (opcional por entorno)
  SQLSERVER_HOST: Env.schema.string.optional(),
  SQLSERVER_PORT: Env.schema.number.optional(),
  SQLSERVER_DATABASE: Env.schema.string.optional(),
  SQLSERVER_USER: Env.schema.string.optional(),
  SQLSERVER_PASSWORD: Env.schema.string.optional(),
  SQLSERVER_ENCRYPT: Env.schema.boolean.optional(),
  SQLSERVER_SCHEMA: Env.schema.string.optional(),
  SQLSERVER_TABLE_SADEV: Env.schema.string.optional(),
  SQLSERVER_TABLE_SAFACT: Env.schema.string.optional(),
  SQLSERVER_TABLE_SAITEMFACT: Env.schema.string.optional(),
  SQLSERVER_TABLE_SAPROD: Env.schema.string.optional(),
  SQLSERVER_SKIP_SAPROD_JOIN: Env.schema.boolean.optional(),
  SQLSERVER_SKIP_ITEM_LINES: Env.schema.boolean.optional(),
  SQLSERVER_SADEV_PUSH_COMPLETION_ENABLED: Env.schema.boolean.optional(),
  SQLSERVER_SADEV_DELIVERED_STATUS: Env.schema.number.optional(),
  SQLSERVER_SADEV_SYNC_SKIP_DELIVERED: Env.schema.boolean.optional(),
  SQLSERVER_SADEV_PUSH_SYNCED_STATUS_ENABLED: Env.schema.boolean.optional(),
  SQLSERVER_SADEV_SYNCED_STATUS: Env.schema.number.optional(),
  SQLSERVER_SADEV_SYNC_SKIP_HANDOFF: Env.schema.boolean.optional(),

  // MySQL tracking (opcional por entorno)
  MYSQL_TRACKING_HOST: Env.schema.string.optional(),
  MYSQL_TRACKING_PORT: Env.schema.number.optional(),
  MYSQL_TRACKING_DATABASE: Env.schema.string.optional(),
  MYSQL_TRACKING_USER: Env.schema.string.optional(),
  MYSQL_TRACKING_PASSWORD: Env.schema.string.optional(),
  MYSQL_TRACKING_SSL: Env.schema.boolean.optional(),

  // Signature (legacy compat)
  PUBLIC_TRACKING_API_KEY: Env.schema.string.optional(),
  PUBLIC_TRACKING_SIGNING_SECRET: Env.schema.string.optional(),

  // Bridge corporativo local -> Railway (opcionales por entorno)
  BRIDGE_RAILWAY_BASE_URL: Env.schema.string.optional(),
  BRIDGE_RAILWAY_API_KEY: Env.schema.string.optional(),
  BRIDGE_INTERVAL_SECONDS: Env.schema.number.optional(),
  BRIDGE_PULL_LIMIT: Env.schema.number.optional(),
  BRIDGE_MAX_RETRIES: Env.schema.number.optional(),
  CORP_BRIDGE_API_KEY: Env.schema.string.optional(),
  EMERGENCY_DISABLE: Env.schema.boolean.optional(),

  // Geocoding opcional (si admin carga solo dirección para destino)
  GOOGLE_MAPS_GEOCODING_API_KEY: Env.schema.string.optional(),
})
