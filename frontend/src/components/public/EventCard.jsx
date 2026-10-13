import { CalendarDays, Globe, MapPin, ShieldAlert, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, DemoBadge } from '../ui'
import { AGE, CATEGORIES, MODES, STATUS } from '../../lib/events'
import { fmtKm, fmtRange, money } from '../../lib/format'

export function PriceTag({ ev, dark }) {
  const cls = dark ? 'font-semibold text-slate-900' : 'font-semibold text-white'
  if (ev.min_price_cents == null) return <span className={dark ? 'text-slate-500' : 'text-slate-500'}>Preço a divulgar</span>
  if (ev.min_price_cents === 0) return <span className={cls}>Grátis</span>
  return <span className={cls}>a partir de {money(ev.min_price_cents)}</span>
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.soon
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export function Banner({ ev, className = 'h-40' }) {
  const cat = CATEGORIES[ev.category] || CATEGORIES.other
  return ev.banner_url ? (
    <img src={ev.banner_url} alt="" loading="lazy" className={`${className} w-full object-cover`} />
  ) : (
    <div className={`${className} banner-ph relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600/60 via-navy-700 to-cyan-500/40`} aria-hidden="true">
      <cat.icon className="h-14 w-14 text-white/70" strokeWidth={1.4} />
    </div>
  )
}

export function placeLabel(ev) {
  if (ev.attendance_mode === 'online') return 'Online'
  if (!ev.city) return 'Local a divulgar'
  return [ev.city, ev.state].filter(Boolean).join(', ') + (ev.country && ev.country !== 'BR' ? ` · ${ev.country}` : '')
}

export default function EventCard({ ev, compact = false, selected = false, onHover, onSelect }) {
  const cat = CATEGORIES[ev.category] || CATEGORIES.other
  const link = `/eventos/${ev.slug}`
  if (compact) {
    return (
      <article
        className={`card flex cursor-pointer gap-3 p-3 transition hover:border-violet-400/50 ${selected ? 'border-cyan-400/70 shadow-glow' : ''}`}
        onClick={() => onSelect?.(ev.id)} onMouseEnter={() => onHover?.(ev.id)} onMouseLeave={() => onHover?.(null)}
      >
        <div className="w-20 shrink-0 overflow-hidden rounded-xl"><Banner ev={ev} className="h-20" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-sm font-bold text-white">{ev.name}</h3>
          <p className="truncate text-xs text-slate-400">{fmtRange(ev.start_date, ev.end_date)} · {placeLabel(ev)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-300"><cat.icon className="h-3 w-3" />{cat.label}</span>
            <StatusBadge status={ev.status} />
            {ev.distance_km != null && <span className="text-cyan-300">{fmtKm(ev.distance_km)}</span>}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <PriceTag ev={ev} />
            <Link to={link} onClick={(e) => e.stopPropagation()} className="font-semibold text-cyan-300 hover:underline">Ver evento</Link>
          </div>
        </div>
      </article>
    )
  }
  const onMap = ev.latitude != null
  return (
    <article className="card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-violet-400/50 hover:shadow-glow">
      <Link to={link} className="relative block" tabIndex={-1} aria-hidden="true">
        <Banner ev={ev} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5"><StatusBadge status={ev.status} />{ev.is_demo && <DemoBadge />}</div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-violet-300"><cat.icon className="h-3.5 w-3.5" />{cat.label}</p>
        <h3 className="mt-1 font-display text-lg font-bold leading-snug text-white"><Link to={link} className="hover:text-cyan-300">{ev.name}</Link></h3>
        <p className="text-sm text-slate-400">por {ev.organization}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
          <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />{fmtRange(ev.start_date, ev.end_date)}</li>
          <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>{placeLabel(ev)}{ev.venue && <span className="block text-xs text-slate-500">{ev.venue}</span>}{ev.distance_km != null && <span className="text-xs text-cyan-300"> · ≈ {fmtKm(ev.distance_km)} em linha reta</span>}</span></li>
          <li className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{MODES[ev.attendance_mode]}</span>
            <span className="inline-flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" />Classificação {AGE[ev.age_rating]}</span>
          </li>
        </ul>
        <div className="mt-auto pt-4">
          <p className="mb-3 text-sm"><PriceTag ev={ev} /></p>
          <div className="flex flex-wrap gap-2">
            <Link to={link} className="btn-primary flex-1 !py-2">Ver Evento</Link>
            {onMap && <Link to={`/mapa?foco=${ev.slug}`} className="btn-ghost !px-3 !py-2" title="Ver no Mapa"><MapPin className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Mapa</span></Link>}
            {ev.status === 'open' && <Link to={`${link}#ingressos`} className="btn-ghost !px-3 !py-2" title="Ingressos"><Ticket className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Ingressos</span></Link>}
          </div>
        </div>
      </div>
    </article>
  )
}

export function CardSkeleton() {
  return <div className="card h-[26rem] animate-pulse overflow-hidden"><div className="h-40 bg-white/5" /><div className="space-y-3 p-4"><div className="h-3 w-1/3 rounded bg-white/10" /><div className="h-5 w-3/4 rounded bg-white/10" /><div className="h-3 w-1/2 rounded bg-white/10" /></div></div>
}
