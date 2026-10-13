import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export const cx = (...a) => a.filter(Boolean).join(' ')

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={cx('animate-spin text-cyan-400', className)} />
}

export function Loading() {
  return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>
}

export function Card({ className, children, ...p }) {
  return <div className={cx('card p-5', className)} {...p}>{children}</div>
}

export function Fade({ children, className }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}

const TONES = {
  slate: 'bg-white/5 text-slate-300 border-white/10',
  cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
  violet: 'bg-violet-400/10 text-violet-300 border-violet-400/25',
  green: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  amber: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  red: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
}
export function Badge({ tone = 'slate', children }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', TONES[tone])}>{children}</span>
}

export function DemoBadge() {
  return <Badge tone="amber">DEMO · dados fictícios</Badge>
}

export function Stat({ icon: Icon, label, value, hint, tone = 'cyan' }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {Icon && (
          <span className={cx('rounded-xl p-2', tone === 'violet' ? 'bg-violet-500/15 text-violet-300' : 'bg-cyan-400/10 text-cyan-300')}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </Card>
  )
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-8 w-8 text-slate-500" />}
      <p className="font-medium text-slate-200">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}
export const Input = (p) => <input className="input" {...p} />
export const Textarea = (p) => <textarea rows={3} className="input" {...p} />
export const Select = ({ children, ...p }) => <select className="input" {...p}>{children}</select>

export function ErrorNote({ error }) {
  if (!error) return null
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div role="dialog" aria-modal="true" aria-label={title}
            className={cx('card max-h-[92vh] w-full overflow-y-auto bg-navy-800 p-6 shadow-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
              <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Formulário em modal com estado de envio e erro. */
export function FormModal({ open, onClose, title, onSubmit, submitLabel = 'Salvar', children, wide }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (open) setError('') }, [open])
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await onSubmit(); onClose() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={title} wide={wide}>
      <form onSubmit={submit} className="space-y-4">
        {children}
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />}{submitLabel}</button>
        </div>
      </form>
    </Modal>
  )
}

/** Botão que pede confirmação inline antes de executar ação destrutiva. */
export function ConfirmButton({ onConfirm, children, label = 'Confirmar?', className = 'btn-danger', ...p }) {
  const [ask, setAsk] = useState(false)
  useEffect(() => { if (!ask) return; const t = setTimeout(() => setAsk(false), 4000); return () => clearTimeout(t) }, [ask])
  return (
    <button type="button" className={className} onClick={() => (ask ? (setAsk(false), onConfirm()) : setAsk(true))} {...p}>
      {ask ? label : children}
    </button>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-navy-950/40 p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cx('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === t.id ? 'bg-violet-500/20 text-white' : 'text-slate-400 hover:text-white')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Table({ head, children, empty }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
      <table className="w-full min-w-[560px]">
        <thead className="bg-white/[0.03]"><tr>{head.map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
      {empty}
    </div>
  )
}

// ---------- toasts ----------
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((text, tone = 'ok') => {
    const id = Math.random()
    setItems((i) => [...i, { id, text, tone }])
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className={cx('rounded-xl border px-4 py-2.5 text-sm shadow-xl backdrop-blur',
                t.tone === 'err' ? 'border-rose-500/30 bg-rose-950/90 text-rose-100' : 'border-cyan-400/30 bg-navy-800/95 text-white')}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

/** Carrega dados de uma API com estado; `reload` refaz a requisição. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const run = useCallback(() => {
    setLoading(true)
    return fn().then((d) => { setData(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { run() }, [run])
  return { data, error, loading, reload: run, setData }
}

/** Executa ação com toast de erro. */
export function useAct() {
  const toast = useToast()
  return useCallback(async (fn, okMsg) => {
    try { const r = await fn(); if (okMsg) toast(okMsg); return r } catch (e) { toast(e.message, 'err'); return undefined }
  }, [toast])
}
