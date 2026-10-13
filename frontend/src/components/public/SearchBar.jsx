import { Crosshair, MapPin, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CATEGORIES, RADII, REGIONS } from '../../lib/events'
import { useT } from '../../lib/i18n'
import { askLocation } from '../../lib/maps'

const WHEN = [['', 'search.all'], ['today', 'search.today'], ['week', 'search.week'], ['month', 'search.month'], ['next3', 'search.next3'], ['custom', 'search.custom']]

/** Barra de busca controlada pelos filtros da URL. `onApply` recebe o objeto de filtros completo. */
export default function SearchBar({ filters, onApply, className = '', onError, stacked = false }) {
  const { t } = useT()
  const [d, setD] = useState(filters)
  const [busy, setBusy] = useState(false)
  useEffect(() => setD(filters), [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value })
  const hasPoint = d.lat && d.lon
  const submit = (e) => { e.preventDefault(); onApply(d) }

  const locate = async () => {
    setBusy(true)
    try {
      const p = await askLocation()
      const next = { ...d, lat: p.lat, lon: p.lon, radius: d.radius || 100, where: '', sort: 'distance' }
      setD(next); onApply(next)
    } catch (err) { onError?.(err.message) } finally { setBusy(false) }
  }
  const pickRegion = (e) => {
    const r = REGIONS.find((x) => x.label === e.target.value)
    setD(r ? { ...d, lat: r.lat, lon: r.lon, radius: d.radius || 100, where: '', sort: 'distance' } : { ...d, lat: '', lon: '', radius: '', sort: d.sort === 'distance' ? '' : d.sort })
  }

  return (
    <form onSubmit={submit} className={`card p-3 shadow-glow sm:p-4 ${className}`} role="search" aria-label="Buscar eventos">
      <div className={stacked ? 'grid grid-cols-2 gap-3' : 'grid gap-3 md:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_1fr_1fr_auto]'}>
        <label className={stacked ? 'col-span-2 block' : 'block'}>
          <span className="mb-1 block text-xs font-medium text-slate-400">{t('search.what')}</span>
          <span className="relative block"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input className="input !pl-9" value={d.q || ''} onChange={set('q')} placeholder={t('search.what.ph')} maxLength={100} /></span>
        </label>
        <label className={stacked ? 'col-span-2 block' : 'block'}>
          <span className="mb-1 block text-xs font-medium text-slate-400">{t('search.where')}</span>
          <span className="relative block"><MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input className="input !pl-9 !pr-10" value={d.where || ''} onChange={(e) => setD({ ...d, where: e.target.value, lat: '', lon: '', radius: '' })} placeholder={t('search.where.ph')} maxLength={100} />
            <button type="button" onClick={locate} disabled={busy} title={t('search.mylocation')} aria-label={t('search.mylocation')}
              className="absolute right-1.5 top-1.5 rounded-lg p-1.5 text-cyan-300 hover:bg-white/10 disabled:opacity-50"><Crosshair className="h-4 w-4" /></button></span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">{t('search.when')}</span>
          <select className="input" value={d.when || ''} onChange={set('when')}>{WHEN.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}</select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">{t('search.category')}</span>
          <select className="input" value={d.category || ''} onChange={set('category')}>
            <option value="">{t('search.allcat')}</option>
            {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </label>
        <button className={`btn-primary self-end !py-2.5 md:col-span-2 lg:col-span-1 ${stacked ? 'col-span-2' : ''}`}><Search className="h-4 w-4" />{t('search.go')}</button>
      </div>

      {(d.when === 'custom' || hasPoint) && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-white/[0.07] pt-3">
          {d.when === 'custom' && (<>
            <label className="text-xs text-slate-400">{t('search.from')}<input type="date" className="input mt-1" value={d.from || ''} onChange={set('from')} /></label>
            <label className="text-xs text-slate-400">{t('search.to')}<input type="date" className="input mt-1" min={d.from || undefined} value={d.to || ''} onChange={set('to')} /></label>
          </>)}
          {hasPoint && (<>
            <label className="text-xs text-slate-400">Região de referência
              <select className="input mt-1" value={REGIONS.find((r) => r.lat === +d.lat && r.lon === +d.lon)?.label || ''} onChange={pickRegion}>
                <option value="">Minha localização (aprox.)</option>
                {REGIONS.map((r) => <option key={r.label}>{r.label}</option>)}
              </select></label>
            <label className="text-xs text-slate-400">{t('search.radius')}
              <select className="input mt-1" value={d.radius || 100} onChange={set('radius')}>
                {RADII.map((r) => <option key={r} value={r}>{r} km</option>)}
                {d.radius && !RADII.includes(+d.radius) && <option value={d.radius}>{d.radius} km</option>}
              </select></label>
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => { const n = { ...d, lat: '', lon: '', radius: '', sort: '' }; setD(n); onApply(n) }}>Limpar localização</button>
          </>)}
        </div>
      )}
    </form>
  )
}
