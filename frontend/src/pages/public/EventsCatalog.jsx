import { CalendarSearch } from 'lucide-react'
import { useState } from 'react'
import EventCard, { CardSkeleton } from '../../components/public/EventCard'
import FilterBar from '../../components/public/FilterBar'
import SearchBar from '../../components/public/SearchBar'
import { Empty } from '../../components/ui'
import { useFilters } from '../../lib/useFilters'
import { usePublic } from '../../lib/useEvents'
import { usePageMeta } from '../../lib/useMeta'

export default function EventsCatalog() {
  usePageMeta({ title: 'Explorar eventos furry', description: 'Convenções, meetups, festivais e feiras de artistas da comunidade furry. Filtre por cidade, data e categoria.' })
  const { filters, apply, api, sp, setSp } = useFilters()
  const [msg, setMsg] = useState('')
  const page = Math.max(1, +sp.get('pagina') || 1)
  const { data, loading, error, reload } = usePublic('/events', { ...api, sort: filters.sort || undefined, page, limit: 12 })
  const goPage = (n) => { const m = new URLSearchParams(sp); m.set('pagina', n); setSp(m); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Explorar eventos</h1>
      <p className="mt-2 text-slate-400">{data ? `${data.total} ${data.total === 1 ? 'evento encontrado' : 'eventos encontrados'}` : 'Buscando…'}</p>
      <div className="mt-6"><SearchBar filters={filters} onApply={apply} onError={setMsg} />
        {msg && <p role="alert" className="mt-2 text-sm text-amber-300">{msg}</p>}</div>
      <FilterBar className="mt-4" filters={filters} onApply={apply} hasPoint={!!(filters.lat && filters.lon)} />

      <div className="mt-6" aria-live="polite">
        {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}</div>
          : error ? <Empty icon={CalendarSearch} title="Não foi possível carregar" text={error} action={<button className="btn-ghost" onClick={reload}>Tentar de novo</button>} />
          : data.items.length === 0 ? <Empty icon={CalendarSearch} title="Nenhum evento encontrado" text="Tente ampliar o período, remover filtros ou buscar em outra região." action={<button className="btn-ghost" onClick={() => setSp(new URLSearchParams())}>Limpar filtros</button>} />
          : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((e) => <EventCard key={e.id} ev={e} />)}</div>}
      </div>

      {data && data.pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Paginação">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => goPage(page - 1)}>Anterior</button>
          <span className="text-sm text-slate-400">Página {page} de {data.pages}</span>
          <button className="btn-ghost" disabled={page >= data.pages} onClick={() => goPage(page + 1)}>Próxima</button>
        </nav>
      )}
    </div>
  )
}
