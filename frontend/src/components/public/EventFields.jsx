import L from 'leaflet'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { Field, Input, Select } from '../ui'
import { api } from '../../lib/api'
import { CATEGORIES, MODES } from '../../lib/events'
import { BRAZIL_CENTER, TILE_ATTR, TILE_URL } from '../../lib/maps'

export const EVENT_DEFAULTS = {
  category: 'convention', attendance_mode: 'presential', country: 'BR', state: '', district: '', address: '', postal_code: '',
  latitude: '', longitude: '', location_visibility: 'public', timezone: 'America/Sao_Paulo', age_rating: 'L', banner_url: '', online_url: '',
}
const FIELDS = Object.keys(EVENT_DEFAULTS)

/** Campos de descoberta/localização enviados à API (coordenadas vazias → null). */
export function eventPayload(f) {
  const o = {}
  FIELDS.forEach((k) => { o[k] = f[k] ?? EVENT_DEFAULTS[k] })
  o.latitude = o.latitude === '' || o.latitude == null ? null : Number(o.latitude)
  o.longitude = o.longitude === '' || o.longitude == null ? null : Number(o.longitude)
  return o
}

const pin = L.divIcon({ className: 'fc-pin-wrap', html: '<div class="fc-pin fc-pin-sel"></div>', iconSize: [34, 42], iconAnchor: [17, 40] })

function Picker({ onPick }) {
  useMapEvents({ click: (e) => onPick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)) })
  return null
}

function AddressSearch({ f, setF }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [state, setState] = useState({ busy: false, error: '' })
  const search = async () => {
    setState({ busy: true, error: '' }); setRes(null)
    try { setRes((await api.get(`/org/geocode?q=${encodeURIComponent(q)}`)).results) } catch (e) { setState({ busy: false, error: e.message }); return }
    setState({ busy: false, error: '' })
  }
  const pick = (r) => {
    setF({ ...f, latitude: r.latitude, longitude: r.longitude, city: r.city || f.city, state: r.state || f.state, district: r.district || f.district,
      postal_code: r.postal_code || f.postal_code, address: r.address || f.address, country: r.country || f.country })
    setRes(null)
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">Buscar endereço e posicionar o marcador</label>
      <div className="flex gap-2">
        <input className="input" value={q} maxLength={200} placeholder="Rua, número, cidade" onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (q.length >= 3) search() } }} />
        <button type="button" className="btn-ghost shrink-0" disabled={q.length < 3 || state.busy} onClick={search}><Search className="h-4 w-4" />{state.busy ? 'Buscando…' : 'Buscar'}</button>
      </div>
      {state.error && <p role="alert" className="mt-2 text-xs text-amber-300">{state.error}</p>}
      {res && (res.length === 0 ? <p className="mt-2 text-xs text-slate-400">Nenhum resultado. Refine a busca ou clique no mapa.</p> : (
        <ul className="mt-2 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
          {res.map((r) => <li key={r.label}><button type="button" onClick={() => pick(r)} className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/5">{r.label}</button></li>)}
        </ul>
      ))}
    </div>
  )
}

export default function EventFields({ f, set, setF }) {
  const lat = f.latitude === '' || f.latitude == null ? null : Number(f.latitude)
  const lon = f.longitude === '' || f.longitude == null ? null : Number(f.longitude)
  const has = lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon)
  const online = f.attendance_mode === 'online'
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Categoria"><Select value={f.category} onChange={set('category')}>{Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}</Select></Field>
        <Field label="Formato"><Select value={f.attendance_mode} onChange={set('attendance_mode')}>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Classificação indicativa"><Select value={f.age_rating} onChange={set('age_rating')}><option value="L">Livre</option><option value="14">14+</option><option value="16">16+</option><option value="18">18+</option></Select></Field>
      </div>
      <Field label="Imagem de capa (URL https)" hint="Upload de arquivos chega em uma próxima etapa."><Input type="url" maxLength={500} placeholder="https://…" value={f.banner_url} onChange={set('banner_url')} /></Field>
      {!online && (<>
        <Field label="Visibilidade do local" hint="Nunca publique endereços residenciais. Com 'só cidade' ou 'oculto' não há marcador no mapa.">
          <Select value={f.location_visibility} onChange={set('location_visibility')}>
            <option value="public">Público: endereço e marcador no mapa</option><option value="city_only">Somente cidade</option><option value="hidden">Oculto (a divulgar)</option></Select></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="País (ISO-2)"><Input maxLength={2} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value.toUpperCase() })} /></Field>
          <Field label="Estado / UF"><Input maxLength={60} value={f.state} onChange={set('state')} /></Field>
          <Field label="Bairro"><Input maxLength={100} value={f.district} onChange={set('district')} /></Field>
          <div className="sm:col-span-2"><Field label="Endereço público"><Input maxLength={255} value={f.address} onChange={set('address')} /></Field></div>
          <Field label="CEP"><Input maxLength={20} value={f.postal_code} onChange={set('postal_code')} /></Field>
        </div>
        {f.location_visibility === 'public' && (
          <div className="space-y-4">
            <AddressSearch f={f} setF={setF} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude"><Input inputMode="decimal" value={f.latitude ?? ''} onChange={set('latitude')} /></Field>
              <Field label="Longitude"><Input inputMode="decimal" value={f.longitude ?? ''} onChange={set('longitude')} /></Field>
            </div>
            <p className="mb-2 mt-1 text-xs text-slate-400">Clique no mapa para posicionar o marcador e confira se ele corresponde ao local do evento.</p>
            <div className="h-64 overflow-hidden rounded-xl border border-white/10">
              <MapContainer center={has ? [lat, lon] : BRAZIL_CENTER} zoom={has ? 14 : 4} className="h-full w-full" key={has ? 'p' : 'n'}>
                <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
                <Picker onPick={(a, b) => setF({ ...f, latitude: a, longitude: b })} />
                {has && <Marker position={[lat, lon]} icon={pin} />}
              </MapContainer>
            </div>
          </div>
        )}
      </>)}
      {online && <Field label="Link de acesso (somente para inscritos)"><Input type="url" maxLength={500} value={f.online_url} onChange={set('online_url')} /></Field>}
    </div>
  )
}
