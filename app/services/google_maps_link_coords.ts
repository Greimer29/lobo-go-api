/**
 * Parsea coordenadas embebidas en URLs de Google Maps (incl. !3d!4d, @, q=, ll=).
 * No hace red: seguro de usar con URLs arbitrarias.
 */
export function extractLatLngFromGoogleMapsLink(
  linkRaw: string | null | undefined
): { lat: number; lng: number } | null {
  const link = String(linkRaw ?? '').trim()
  if (!link) return null
  const cleaned = link.replace(/\s+/g, '')

  const tryPair = (lat: string, lng: string) => {
    const a = Number(lat)
    const b = Number(lng)
    if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) {
      return { lat: a, lng: b }
    }
    return null
  }

  // Pares !3d / !4d = coordenadas en data=; el @ (más abajo) suele ser la cámara, no el pin.
  // Orden: (1) bloque !8m2!3d!4d frecuente en fichas de lugar; (2) luego N pares 3d/4d con heurística
  for (const re of [
    /!8m2!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /!8m1!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
  ]) {
    const m8 = cleaned.match(re)
    if (m8) {
      const p = tryPair(m8[1], m8[2])
      if (p) return p
    }
  }

  const d34All = [...cleaned.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/gi)]
  if (d34All.length > 0) {
    const isDirections = /\/dir\//i.test(cleaned) || /[?&]daddr=/i.test(cleaned)
    const isPlace = /\/place\//i.test(cleaned)
    let pick: RegExpMatchArray
    if (d34All.length === 1) {
      pick = d34All[0]
    } else if (isPlace && !isDirections) {
      pick = d34All[0]
    } else if (isDirections) {
      pick = d34All[d34All.length - 1]
    } else {
      pick = d34All[d34All.length - 1]
    }
    const p = tryPair(pick[1], pick[2])
    if (p) return p
  }

  // Varios segmentos con @ (cámara vs pin en data=): en /place/ suele importar el primero; en /dir/ el último
  const atAll = [...cleaned.matchAll(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/gi)]
  if (atAll.length > 0) {
    const isDirections = /\/dir\//i.test(cleaned) || /[?&]daddr=/i.test(cleaned)
    const isPlace = /\/place\//i.test(cleaned)
    const list =
      isDirections && !isPlace
        ? [...atAll].reverse()
        : isPlace && !isDirections
          ? atAll
          : atAll.length > 1
            ? isDirections
              ? [...atAll].reverse()
              : atAll
            : atAll
    for (const m of list) {
      const p = tryPair(m[1], m[2])
      if (p) return p
    }
  }

  for (const re of [
    /[?&](?:q|query|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
    /[?&]center=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
  ]) {
    const m = cleaned.match(re)
    if (m) {
      const p = tryPair(m[1], m[2])
      if (p) return p
    }
  }

  return null
}

/** Distancia aprox. en metros (corte ~200 m para alinear ficha con geocodificación). */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371e3
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/**
 * Toma el título de la ficha de lugar en `/place/Nombre+.../`.
 * Ayuda a geocodificar con la misma etiqueta que Google (p. ej. CC La Gran Manzana).
 */
export function extractPlaceNameFromGoogleMapsUrl(linkRaw: string | null | undefined): string | null {
  const link = String(linkRaw ?? '').trim()
  if (!link) return null
  let pathname = ''
  try {
    pathname = new URL(link).pathname
  } catch {
    return null
  }
  if (!/place/i.test(pathname)) return null
  const parts = pathname.split('/').filter((p) => p.length)
  const idx = parts.findIndex((p) => p.toLowerCase() === 'place')
  if (idx < 0 || idx >= parts.length - 1) return null
  const seg = parts[idx + 1]
  if (!seg || seg.startsWith('@') || seg.toLowerCase().startsWith('data')) return null
  let title: string
  try {
    title = decodeURIComponent(seg.replace(/\+/g, ' '))
  } catch {
    title = seg.replace(/\+/g, ' ')
  }
  const cleaned = title.replace(/\s+/g, ' ').trim()
  if (cleaned.length < 2) return null
  return cleaned
}

function isAllowedGoogleMapsFetchHost(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'goo.gl' || h === 'maps.app.goo.gl') return true
  if (h === 'google.com' || h === 'www.google.com') return true
  if (h === 'maps.google.com') return true
  if (h.endsWith('.goo.gl')) return true
  if (h.endsWith('.google.com') || h.endsWith('.google.co.ve') || h.endsWith('.gmail.com')) return true
  return false
}

/**
 * Resuelve acortados y devuelve la URL final (útil para /place/... en el redirect).
 * Solo hosts permitidos (SSRF).
 */
export async function fetchGoogleMapsFinalUrl(linkRaw: string | null | undefined): Promise<string | null> {
  const link = String(linkRaw ?? '').trim()
  if (!link) return null
  if (/\/place\//i.test(link)) return link
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!isAllowedGoogleMapsFetchHost(url.hostname)) return null
  if (!url.host.includes('goo.gl') && !url.host.includes('gmail') && !url.host.includes('google.')) {
    return link
  }
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 10_000)
  try {
    const res = await fetch(link, {
      method: 'GET',
      redirect: 'follow',
      signal: ac.signal,
      headers: { 'User-Agent': 'tracking-delivery-api/1' },
    })
    return res.url
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/**
 * Sigue redirecciones (p. ej. maps.app.goo.gl) y vuelve a parsear la URL final.
 * Solo permite hosts de mapas de Google para limitar abuso (SSRF).
 */
export async function resolveLatLngFromGoogleMapsLink(
  linkRaw: string | null | undefined
): Promise<{ lat: number; lng: number } | null> {
  const link = String(linkRaw ?? '').trim()
  if (!link) return null

  const fromString = extractLatLngFromGoogleMapsLink(link)
  if (fromString) return fromString

  const finalUrl = await fetchGoogleMapsFinalUrl(link)
  if (finalUrl) {
    return extractLatLngFromGoogleMapsLink(finalUrl)
  }
  return null
}
