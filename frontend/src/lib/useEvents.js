import { useEffect, useState } from 'react'
import { api } from './api'
import { qs } from './events'

/** Busca na API pública, descartando respostas obsoletas. */
export function usePublic(path, params, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: '' })
  const key = path + '?' + qs(params || {})
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let live = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    api.get(`/v1/public${key}`)
      .then((data) => live && setState({ data, loading: false, error: '' }))
      .catch((e) => live && setState({ data: null, loading: false, error: e.message || 'Falha ao carregar' }))
    return () => { live = false }
  }, [key, enabled, nonce])
  return { ...state, reload: () => setNonce((n) => n + 1) }
}
