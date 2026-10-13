import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { MapPin, Navigation } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../lib/events'
import { fmtRange } from '../../lib/format'
import { BRAZIL_CENTER, TILE_ATTR, TILE_URL, navLinks } from '../../lib/maps'
import { PriceTag } from './EventCard'

const iconCache = {}
function pinIcon(category, selected) {
  const key = `${category}:${selected}`
  if (!iconCache[key]) {
    const Icon = (CATEGORIES[category] || CATEGORIES.other).icon
    iconCache[key] = L.divIcon({
      className: 'fc-pin-wrap',
      html: `<div class="fc-pin ${selected ? 'fc-pin-sel' : ''}">${renderToStaticMarkup(<Icon size={16} strokeWidth={2.4} />)}</div>`,
      iconSize: [34, 42], iconAnchor: [17, 40], popupAnchor: [0, -36],
    })
  }
  return iconCache[key]
}

function View({ items, selectedId, origin, fitKey }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(t)
  }, [map])
  useEffect(() => {
    if (selectedId) return
    const pts = items.map((e) => [e.latitude, e.longitude])
    if (origin) pts.push([origin.lat, origin.lon])
    if (pts.length === 1) map.setView(pts[0], 11)
    else if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 12 })
    else map.setView(BRAZIL_CENTER, 4)
  }, [fitKey]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function Focus({ ev, refs }) {
  const map = useMap()
  useEffect(() => {
    if (!ev) return
    map.flyTo([ev.latitude, ev.longitude], Math.max(map.getZoom(), 13), { duration: 0.6 })
    const t = setTimeout(() => refs.current[ev.id]?.openPopup(), 700)
    return () => clearTimeout(t)
  }, [ev?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function EventPopup({ ev }) {
  const cat = CATEGORIES[ev.category] || CATEGORIES.other
  return (
    <div className="w-60 text-slate-900">
      {ev.banner_url
        ? <img src={ev.banner_url} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
        : <div className="mb-2 flex h-20 w-full items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-white"><cat.icon className="h-8 w-8" /></div>}
      <p className="font-display text-sm font-bold leading-snug">{ev.name}</p>
      <p className="mt-1 text-xs text-slate-600">{fmtRange(ev.start_date, ev.end_date)} · {ev.city}{ev.state && `, ${ev.state}`}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600"><cat.icon className="h-3 w-3" />{cat.label} · <PriceTag ev={ev} dark /></p>
      <div className="mt-3 flex gap-2">
        <Link to={`/eventos/${ev.slug}`} className="flex-1 rounded-lg bg-violet-600 px-2 py-1.5 text-center text-xs font-semibold !text-white">Ver detalhes</Link>
        <a href={navLinks(ev).google} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold !text-slate-800">
          <Navigation className="h-3 w-3" />Abrir rota</a>
      </div>
    </div>
  )
}

/** Mapa Leaflet + OpenStreetMap com marcadores agrupados. Só recebe eventos que já têm localização pública. */
export default function EventsMap({ items, selectedId, onSelect, origin, radiusKm, fitKey, className = '', compact = false, onLocate }) {
  const refs = useRef({})
  const [tileErrors, setTileErrors] = useState(0)
  const selected = useMemo(() => items.find((e) => e.id === selectedId), [items, selectedId])
  const touch = typeof window !== 'undefined' && L.Browser.mobile
  const key = fitKey ?? items.map((e) => e.id).join(',')

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <MapContainer center={BRAZIL_CENTER} zoom={4} className="h-full w-full" scrollWheelZoom={!compact} dragging={!(compact && touch)} worldCopyJump>
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={19} eventHandlers={{ tileerror: () => setTileErrors((n) => n + 1), tileload: () => setTileErrors(0) }} />
        <View items={items} selectedId={selectedId} origin={origin} fitKey={key} />
        <Focus ev={selected} refs={refs} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={45} showCoverageOnHover={false}>
          {items.map((e) => (
            <Marker
              key={e.id} position={[e.latitude, e.longitude]} icon={pinIcon(e.category, e.id === selectedId)} title={e.name} alt={e.name}
              ref={(m) => { if (m) refs.current[e.id] = m }}
              eventHandlers={{ click: () => onSelect?.(e.id) }}
            >
              <Popup minWidth={240}><EventPopup ev={e} /></Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
        {origin && <CircleMarker center={[origin.lat, origin.lon]} radius={7} pathOptions={{ color: '#fff', fillColor: '#38BDF8', fillOpacity: 1, weight: 3 }} />}
        {origin && radiusKm > 0 && <Circle center={[origin.lat, origin.lon]} radius={radiusKm * 1000} pathOptions={{ color: '#38BDF8', weight: 1, fillOpacity: 0.06 }} />}
      </MapContainer>
      {onLocate && (
        <button type="button" onClick={onLocate} title="Usar minha localização" aria-label="Usar minha localização"
          className="absolute right-3 top-[88px] z-[500] rounded-md border border-slate-300 bg-white p-2 text-slate-700 shadow hover:bg-slate-100">
          <MapPin className="h-4 w-4" /></button>
      )}
      {tileErrors > 3 && (
        <div role="alert" className="absolute inset-x-3 top-3 z-[600] rounded-xl border border-amber-400/40 bg-navy-900/95 p-3 text-xs text-amber-200">
          Não foi possível carregar o mapa base (serviço de mapas indisponível). Os eventos continuam acessíveis pela lista.
        </div>
      )}
    </div>
  )
}
