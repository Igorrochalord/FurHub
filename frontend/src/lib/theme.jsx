import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'furconhub.theme'
const Ctx = createContext(null)
export const useTheme = () => useContext(Ctx)

const read = () => { try { return localStorage.getItem(KEY) || 'system' } catch { return 'system' } }
const resolve = (mode) => (mode === 'system' ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode)

export function applyTheme(mode = read()) {
  const t = resolve(mode)
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#F1F4FA' : '#0B1020')
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(read)
  useEffect(() => {
    applyTheme(mode)
    try { localStorage.setItem(KEY, mode) } catch { /* ignore */ }
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    const on = () => mode === 'system' && applyTheme('system')
    mq?.addEventListener?.('change', on)
    return () => mq?.removeEventListener?.('change', on)
  }, [mode])
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>
}
