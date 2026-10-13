import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FILTER_KEYS, toApi } from './events'

/** Filtros de busca sincronizados com a URL (links compartilháveis). */
export function useFilters() {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, sp.get(k) || ''])), [sp])
  const apply = (next) => {
    const merged = new URLSearchParams(sp)
    FILTER_KEYS.forEach((k) => (next[k] ? merged.set(k, next[k]) : merged.delete(k)))
    merged.delete('foco')
    merged.delete('pagina')
    setSp(merged, { replace: true })
  }
  const api = useMemo(() => toApi(filters), [filters])
  return { filters, apply, api, sp, setSp }
}
