import { MODES } from '../../lib/events'

export const SORTS = [['', 'Data'], ['name', 'Nome'], ['newest', 'Mais recentes'], ['price', 'Menor preço'], ['distance', 'Proximidade']]

/** Filtros rápidos (modo, preço, vendas, ordenação) compartilhados por /eventos e /mapa. */
export default function FilterBar({ filters, onApply, hasPoint, className = '' }) {
  const toggle = (k) => onApply({ ...filters, [k]: filters[k] ? '' : '1' })
  const chip = (on) => `rounded-full border px-3 py-1 text-xs font-medium transition ${on ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:text-white'}`
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <select aria-label="Tipo de participação" className="input !w-auto !py-1.5 text-xs" value={filters.mode} onChange={(e) => onApply({ ...filters, mode: e.target.value })}>
        <option value="">Presencial, online ou híbrido</option>
        {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <button type="button" aria-pressed={!!filters.free} className={chip(filters.free)} onClick={() => toggle('free')}>Gratuitos</button>
      <button type="button" aria-pressed={!!filters.open} className={chip(filters.open)} onClick={() => toggle('open')}>Inscrições abertas</button>
      <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">Ordenar
        <select className="input !w-auto !py-1.5 text-xs" value={filters.sort} onChange={(e) => onApply({ ...filters, sort: e.target.value })}>
          {SORTS.filter(([v]) => v !== 'distance' || hasPoint).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select></label>
    </div>
  )
}
