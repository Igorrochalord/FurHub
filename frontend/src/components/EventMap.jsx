import { Briefcase, Cross, DoorOpen, Droplets, MapPin, Palette, Presentation, Sofa, Store, Utensils, BedDouble } from 'lucide-react'
import { PLACE_LABEL } from '../lib/format'
import { cx } from './ui'

export const PLACE_ICON = {
  room: Presentation, entrance: DoorOpen, artist_alley: Palette, dealers: Store, lounge: Sofa, hydration: Droplets,
  rest: BedDouble, medical: Cross, food: Utensils, other: Briefcase,
}
const TONE = {
  lounge: 'bg-violet-500', rest: 'bg-violet-500', hydration: 'bg-cyan-500', medical: 'bg-rose-500',
  entrance: 'bg-emerald-500', artist_alley: 'bg-amber-500', dealers: 'bg-amber-500',
}

/** Mapa esquemático: pontos posicionados em % sobre uma planta estilizada. */
export default function EventMap({ places, selectedId, onSelect, onPick, className }) {
  return (
    <div
      className={cx('relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-navy-950/70', onPick && 'cursor-crosshair', className)}
      style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)', backgroundSize: '5% 8%' }}
      onClick={(e) => {
        if (!onPick) return
        const r = e.currentTarget.getBoundingClientRect()
        onPick(Math.round(((e.clientX - r.left) / r.width) * 100), Math.round(((e.clientY - r.top) / r.height) * 100))
      }}
      role="img" aria-label="Mapa esquemático do evento"
    >
      <span className="absolute left-3 top-2 text-[10px] uppercase tracking-widest text-slate-600">Planta esquemática</span>
      {places.map((p) => {
        const Icon = PLACE_ICON[p.kind] || MapPin
        const sel = p.id === selectedId
        return (
          <button
            key={p.id ?? 'new'} type="button" title={`${p.name} — ${PLACE_LABEL[p.kind]}`}
            onClick={(e) => { if (onSelect) { e.stopPropagation(); onSelect(p) } }}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className={cx('absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg ring-2 transition',
              TONE[p.kind] || 'bg-slate-500', sel ? 'scale-125 ring-white' : 'ring-navy-900 hover:scale-110')}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

export function MapLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
      {Object.entries(PLACE_LABEL).map(([k, v]) => {
        const Icon = PLACE_ICON[k]
        return <span key={k} className="inline-flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{v}</span>
      })}
    </div>
  )
}
