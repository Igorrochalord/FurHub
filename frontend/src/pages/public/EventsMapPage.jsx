import { List, Map as MapIcon, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../../components/public/EventCard'
import EventsMap from '../../components/public/EventsMap'
import FilterBar from '../../components/public/FilterBar'
import SearchBar from '../../components/public/SearchBar'
import { Empty, Loading } from '../../components/ui'
import { askLocation, navLinks } from '../../lib/maps'
import { usePublic } from '../../lib/useEvents'
import { useFilters } from '../../lib/useFilters'
import { usePageMeta } from '../../lib/useMeta'

export default function EventsMapPage() {
  usePageMeta({ title: 'Mapa de eventos furry', description: 'Encontre convenções e encontros furry no mapa interativo. Pesquise por cidade, categoria e distância.' })
  const { filters, apply, api, sp } = useFilters()
  const [view, setView] = useState('list') // mobile
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState('')
  const params = { ...api, sort: filters.sort || undefined }
  const list = usePublic('/events', { ...params, limit: 100 })
  const pins = usePublic('/events/map', params)
  const items = list.data?.items || []
  const markers = pins.data?.items || []
  const noMarker = items.filter((e) => e.latitude == null)
  const origin = filters.lat && filters.lon ? { lat: +filters.lat, lon: +filters.lon } : null
  const sel = useMemo(() => items.find((e) => e.id === selected), [items, selected])

  // /mapa?foco=slug (vindo de "Ver no Mapa")
  const foco = sp.get('foco')
  useEffect(() => {
    if (!foco || !items.length) return
    const ev = items.find((e) => e.slug === foco)
    if (ev) { setSelected(ev.id); setView('map') }
  }, [foco, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const locate = async () => {
    setMsg('')
    try { const p = await askLocation(); apply({ ...filters, lat: p.lat, lon: p.lon, radius: filters.radius || 100, sort: 'distance' }) }
    catch (e) { setMsg(e.message) }
  }
  const select = (id) => { setSelected(id); setView('map') }
  const fitKey = `${pins.data ? markers.map((m) => m.id).join(',') : 'x'}|${origin ? 1 : 0}`

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col lg:flex-row">
      <aside className={`${view === 'map' ? 'hidden' : 'flex'} min-h-0 flex-1 flex-col border-white/[0.07] lg:flex lg:w-[35%] lg:max-w-[34rem] lg:flex-none lg:border-r`}>
        <div className="space-y-3 border-b border-white/[0.07] p-3">
          <SearchBar stacked filters={filters} onApply={apply} onError={setMsg} className="!shadow-none" />
          <FilterBar filters={filters} onApply={apply} hasPoint={!!origin} />
          <p className="text-xs text-slate-400" aria-live="polite">{list.loading ? 'Buscando…' : `${list.data?.total ?? 0} resultado(s)`}{origin && ' · ordenados por proximidade (linha reta)'}</p>
          {msg && <p role="alert" className="text-xs text-amber-300">{msg}</p>}
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {list.loading ? <Loading /> : list.error ? <Empty icon={MapIcon} title="Falha ao carregar" text={list.error} action={<button className="btn-ghost" onClick={list.reload}>Tentar de novo</button>} />
            : items.length === 0 ? <Empty icon={MapIcon} title="Nenhum evento encontrado" text="Ajuste os filtros ou aumente o raio." />
            : items.map((e) => <EventCard key={e.id} ev={e} compact selected={e.id === selected} onSelect={select} />)}
          {noMarker.length > 0 && <p className="px-1 text-xs text-slate-500">{noMarker.length} evento(s) da lista não têm marcador (online ou local não divulgado).</p>}
        </div>
      </aside>

      <section className={`${view === 'list' ? 'hidden' : 'block'} relative min-h-0 flex-1 lg:block`} aria-label="Mapa de eventos">
        {pins.loading && !pins.data ? <Loading /> : (
          <EventsMap className="h-full" items={markers} selectedId={selected} onSelect={setSelected} origin={origin} radiusKm={+filters.radius || 0} fitKey={fitKey} onLocate={locate} />
        )}
        {pins.error && <div role="alert" className="absolute left-3 top-3 z-[500] rounded-xl bg-navy-900/95 p-3 text-sm text-rose-300">{pins.error}</div>}
        {/* painel inferior (mobile) com o evento selecionado */}
        {sel && (
          <div className="absolute inset-x-0 bottom-0 z-[500] p-3 lg:hidden">
            <div className="relative rounded-2xl border border-white/10 bg-navy-800/95 p-3 backdrop-blur">
              <button aria-label="Fechar" className="absolute right-2 top-2 rounded-lg p-1 text-slate-400" onClick={() => setSelected(null)}><X className="h-4 w-4" /></button>
              <EventCard ev={sel} compact />
              <div className="mt-2 flex gap-2 text-xs">
                <a className="btn-ghost flex-1 !py-2" href={navLinks(sel).google} target="_blank" rel="noreferrer">Rota</a>
                <Link className="btn-primary flex-1 !py-2" to={`/eventos/${sel.slug}`}>Detalhes</Link>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className={`fixed inset-x-0 z-[900] flex justify-center lg:hidden ${view === 'map' && sel ? 'bottom-52' : 'bottom-4'}`}>
        <button className="btn-primary shadow-xl" onClick={() => setView(view === 'map' ? 'list' : 'map')}>
          {view === 'map' ? <><List className="h-4 w-4" />Ver lista</> : <><MapIcon className="h-4 w-4" />Ver mapa</>}
        </button>
      </div>
    </div>
  )
}
