import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export const TRACKING_PUBLIC_EVENT_STATUS = {
  PENDING: 0,
  PROCESSED: 1,
  SENT: 2,
  FAILED: 3,
} as const

export default class TrackingPublicEvent extends BaseModel {
  static table = 'tracking_public_events'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'event_id' })
  declare eventId: string

  @column()
  declare direction: 'inbound' | 'outbound'

  @column({ columnName: 'event_type' })
  declare eventType: string

  @column({ columnName: 'order_document' })
  declare orderDocument: string

  @column()
  declare status: number

  @column({ columnName: 'attempt_count' })
  declare attemptCount: number

  @column({ columnName: 'last_error' })
  declare lastError: string | null

  @column()
  declare payload: string

  @column.dateTime({ columnName: 'sent_at' })
  declare sentAt: DateTime | null

  @column.dateTime({ columnName: 'next_retry_at' })
  declare nextRetryAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
