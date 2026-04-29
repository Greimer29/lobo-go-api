import DriverShift from '#models/driver_shift'
import { DateTime } from 'luxon'

/** Zona para “día del traslado” (turnos que solapan ese día civil). */
const APP_TZ = 'America/Caracas'

export type VehicleDriverOnDayPayload = {
  userId: number
  fullName: string | null
  email: string
  shiftStartedAt: string
  shiftEndedAt: string | null
}

async function loadDriversForVehicleOnCalendarDay(
  vehicleId: number,
  calendarDay: string
): Promise<VehicleDriverOnDayPayload[]> {
  const dayStart = DateTime.fromISO(`${calendarDay}T00:00:00`, { zone: APP_TZ })
  const dayEnd = DateTime.fromISO(`${calendarDay}T23:59:59.999`, { zone: APP_TZ })
  if (!dayStart.isValid || !dayEnd.isValid) return []

  const shifts = await DriverShift.query()
    .where('vehicleId', vehicleId)
    .where('startedAt', '<=', dayEnd.toISO()!)
    .where((q) => {
      q.whereNull('endedAt').orWhere('endedAt', '>=', dayStart.toISO()!)
    })
    .preload('user')
    .orderBy('startedAt', 'asc')

  const out: VehicleDriverOnDayPayload[] = []
  const seen = new Set<number>()
  for (const s of shifts) {
    if (!s.user || seen.has(s.userId)) continue
    seen.add(s.userId)
    out.push({
      userId: s.userId,
      fullName: s.user.fullName,
      email: s.user.email,
      shiftStartedAt: s.startedAt.toISO()!,
      shiftEndedAt: s.endedAt?.toISO() ?? null,
    })
  }
  return out
}

function transportDayCompoundKey(row: Record<string, unknown>): string | null {
  const vid = Number(row.vehicleId)
  const iso = row.transportStartedAt
  const st = Number(row.status)
  if (!Number.isFinite(vid) || st < 1 || typeof iso !== 'string' || iso.length === 0) return null
  const anchor = DateTime.fromISO(iso)
  if (!anchor.isValid) return null
  const day = anchor.setZone(APP_TZ).toISODate()
  if (!day) return null
  return `${vid}|${day}`
}

async function batchLoadVehicleDriversOnTransportDays(
  rows: Array<Record<string, unknown>>
): Promise<Map<string, VehicleDriverOnDayPayload[]>> {
  const compoundKeys = new Set<string>()
  for (const row of rows) {
    const k = transportDayCompoundKey(row)
    if (k) compoundKeys.add(k)
  }

  const result = new Map<string, VehicleDriverOnDayPayload[]>()
  await Promise.all(
    [...compoundKeys].map(async (compound) => {
      const pipe = compound.indexOf('|')
      const vid = Number(compound.slice(0, pipe))
      const day = compound.slice(pipe + 1)
      const list = await loadDriversForVehicleOnCalendarDay(vid, day)
      result.set(compound, list)
    })
  )
  return result
}

/**
 * Añade `claimedBy` y `vehicleDriversOnTransportDay` a filas ya serializadas (p. ej. índice paginado).
 * Quita `claimedByUser` crudo del ORM si viene en el objeto.
 */
export async function enrichOrderListRows(
  rows: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  if (!rows.length) return rows
  const driverMap = await batchLoadVehicleDriversOnTransportDays(rows)
  return rows.map((row) => {
    const key = transportDayCompoundKey(row)
    const vehicleDriversOnTransportDay = key ? (driverMap.get(key) ?? []) : []
    const rawCb = row.claimedByUser as
      | { id?: number; fullName?: string | null; email?: string }
      | null
      | undefined
    const idNum = Number(rawCb?.id)
    const claimedBy =
      rawCb !== undefined && rawCb !== null && Number.isFinite(idNum)
        ? { id: idNum, fullName: rawCb.fullName ?? null, email: rawCb.email ?? '' }
        : null
    const rest = { ...row }
    delete (rest as { claimedByUser?: unknown }).claimedByUser
    return {
      ...rest,
      claimedBy,
      vehicleDriversOnTransportDay,
    }
  })
}
