/** Links de navegação: usam as coordenadas cadastradas (ou o endereço), sem calcular rota própria. */
export function navLinks(ev) {
  const has = ev.latitude != null && ev.longitude != null
  const text = [ev.venue, ev.address, ev.city, ev.state, ev.country].filter(Boolean).join(', ')
  const ll = has ? `${ev.latitude},${ev.longitude}` : null
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ll || text)}`,
    osm: has
      ? `https://www.openstreetmap.org/?mlat=${ev.latitude}&mlon=${ev.longitude}#map=16/${ev.latitude}/${ev.longitude}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(text)}`,
    waze: has ? `https://waze.com/ul?ll=${ev.latitude},${ev.longitude}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(text)}&navigate=yes`,
    text,
  }
}

/** Geolocalização do dispositivo — só chamada após ação explícita; resultado não é gravado. */
export function askLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Seu navegador não oferece geolocalização.'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2) }), // ~1 km: precisão reduzida de propósito
      (err) => reject(new Error(err.code === 1 ? 'Permissão negada. Você pode escolher uma cidade manualmente.' : 'Não foi possível obter sua localização.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  })
}

export const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTR = import.meta.env.VITE_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
export const BRAZIL_CENTER = [-14.5, -52]
