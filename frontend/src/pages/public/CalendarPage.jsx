import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../../components/public/EventCard'
import { Empty, Loading, Tabs } from '../../components/ui'
import { CATEGORIES } from '../../lib/events'
import { usePublic } from '../../lib/useEvents'
import { usePageMeta } from '../../lib/useMeta'

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfWeek = (d) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -d.getDay())
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function CalendarPage() {
  usePageMeta({ title: 'Calendário de eventos furry', description: 'Calendário público de convenções e encontros furry, com exportação para seu aplicativo de agenda.' })
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(() => new Date())

  const range = useMemo(() => {
    if (view === 'week') { const s = startOfWeek(cursor); return [s, addDays(s, 6)] }
    if (view === 'month') { const f = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const s = startOfWeek(f); return [s, addDays(s, 41)] }
    const s = new Date(); return [s, addDays(s, 365)]
  }, [view, cursor])
  const { data, loading, error, reload } = usePublic('/calendar', { start: iso(range[0]), end: iso(range[1]) })
  const items = data?.items || []

  const days = useMemo(() => {
    const n = view === 'week' ? 7 : 42
    return Array.from({ length: n }, (_, i) => addDays(range[0], i))
  }, [range, view])
  const on = (d) => items.filter((e) => e.start_date <= iso(d) && iso(d) <= e.end_date)
  const step = (n) => setCursor(view === 'week' ? addDays(cursor, 7 * n) : new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))
  const title = view === 'week' ? `${range[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${range[1].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}` : cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const today = iso(new Date())

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Calendário</h1>
          <p className="mt-2 text-slate-400">Todos os eventos publicados, por período.</p></div>
        <a className="btn-ghost" href="/api/v1/public/calendar.ics"><Download className="h-4 w-4" />Exportar .ics (todos)</a>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onChange={setView} tabs={[{ id: 'month', label: 'Mês' }, { id: 'week', label: 'Semana' }, { id: 'list', label: 'Lista' }]} />
        {view !== 'list' && (
          <div className="flex items-center gap-2">
            <button className="btn-ghost !p-2" aria-label="Anterior" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-44 text-center font-display font-bold capitalize text-white">{title}</span>
            <button className="btn-ghost !p-2" aria-label="Próximo" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></button>
            <button className="btn-ghost" onClick={() => setCursor(new Date())}>Hoje</button>
          </div>
        )}
      </div>

      <div className="mt-5" aria-live="polite">
        {loading ? <Loading /> : error ? <Empty title="Falha ao carregar" text={error} action={<button className="btn-ghost" onClick={reload}>Tentar de novo</button>} /> : view === 'list' ? (
          items.length === 0 ? <Empty title="Nenhum evento futuro" text="Quando eventos forem publicados, eles aparecerão aqui em ordem cronológica." />
            : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((e) => <EventCard key={e.id} ev={e} />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[44rem]">
              <div className="grid grid-cols-7 gap-px text-center text-xs uppercase text-slate-500">{WD.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07]">
                {days.map((d) => {
                  const k = iso(d), evs = on(d), dim = view === 'month' && d.getMonth() !== cursor.getMonth()
                  return (
                    <div key={k} className={`${view === 'week' ? 'min-h-48' : 'min-h-28'} bg-navy-800 p-1.5 ${dim ? 'opacity-40' : ''}`}>
                      <p className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${k === today ? 'bg-violet-500 font-bold text-white' : 'text-slate-400'}`}>{d.getDate()}</p>
                      <ul className="space-y-1">
                        {evs.slice(0, view === 'week' ? 10 : 3).map((e) => {
                          const Icon = (CATEGORIES[e.category] || CATEGORIES.other).icon
                          return <li key={e.id}><Link to={`/eventos/${e.slug}`} title={e.name} className={`flex items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11px] font-medium ${e.status === 'cancelled' ? 'bg-rose-500/20 text-rose-200 line-through' : 'bg-violet-500/25 text-violet-100 hover:bg-violet-500/40'}`}><Icon className="h-3 w-3 shrink-0" /><span className="truncate">{e.name}</span></Link></li>
                        })}
                        {evs.length > 3 && view === 'month' && <li className="px-1 text-[11px] text-slate-500">+{evs.length - 3} mais</li>}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
