import env from '#start/env'

export type GeocodeResult = {
  lat: number
  lng: number
  source: 'geocoded' | 'admin_address_geocoded'
}

export function isGeocodingConfigured(): boolean {
  const k = env.get('GOOGLE_MAPS_GEOCODING_API_KEY')
  return typeof k === 'string' && k.trim().length > 0
}

/**
 * Geocodificación Google (mismo contrato que antes en el controlador).
 */
export async function geocodeAddress(
  addressRaw: string | null | undefined,
  source: GeocodeResult['source'] = 'geocoded'
): Promise<GeocodeResult | null> {
  const address = String(addressRaw ?? '').trim()
  if (!address) return null

  const googleApiKey = env.get('GOOGLE_MAPS_GEOCODING_API_KEY')
  if (!googleApiKey) {
    return null
  }
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', googleApiKey)
  const res = await fetch(url.toString(), { method: 'GET' })
  if (res.ok) {
    const data = (await res.json()) as {
      status?: string
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>
    }
    const first = data.results?.[0]?.geometry?.location
    if (
      data.status === 'OK' &&
      first &&
      Number.isFinite(first.lat) &&
      Number.isFinite(first.lng)
    ) {
      return {
        lat: Number(first.lat),
        lng: Number(first.lng),
        source: source === 'admin_address_geocoded' ? 'admin_address_geocoded' : 'geocoded',
      }
    }
  }
  return null
}

/**
 * Rellena origen de depósito cuando SADEPO trae nombre/dirección pero no lat/lng.
 */
export async function geocodeDepotOrigin(
  name: string | null | undefined,
  address: string | null | undefined
): Promise<{ lat: number; lng: number } | null> {
  const n = String(name ?? '').trim()
  const a = String(address ?? '').trim()
  const line = [a, n].filter((x) => x.length > 0).join(', ')
  if (line.length < 3) return null
  for (const q of [
    `${line}, Ciudad Guayana, Bolívar, Venezuela`,
    `${line}, Bolívar, Venezuela`,
    `${line}, Venezuela`,
  ]) {
    const g = await geocodeAddress(q, 'geocoded')
    if (g) return { lat: g.lat, lng: g.lng }
  }
  return null
}
