import { Camera, CameraOff, CheckCircle2, Crown, QrCode, XCircle, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, ErrorNote, Fade, PageHeader, cx } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtTime } from '../../lib/format'
import { useEvent } from './EventWorkspace'

const RESULT = {
  ok: { icon: CheckCircle2, label: 'Check-in realizado', cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' },
  already: { icon: AlertTriangle, label: 'Ingresso já utilizado', cls: 'border-amber-400/40 bg-amber-400/10 text-amber-200' },
  invalid: { icon: XCircle, label: 'Código inválido', cls: 'border-rose-400/40 bg-rose-400/10 text-rose-200' },
  cancelled: { icon: XCircle, label: 'Ingresso cancelado', cls: 'border-rose-400/40 bg-rose-400/10 text-rose-200' },
}

export default function Checkin() {
  const { id } = useEvent()
  const [code, setCode] = useState('')
  const [last, setLast] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [cam, setCam] = useState(false)
  const [camError, setCamError] = useState('')
  const busy = useRef(false)

  const submit = useCallback(async (value) => {
    if (busy.current || !value) return
    busy.current = true
    try {
      const r = await api.post(`/org/events/${id}/checkin`, { code: value })
      setLast(r); setError('')
      setHistory((h) => [{ ...r, at: new Date().toISOString() }, ...h].slice(0, 12))
    } catch (e) { setError(e.message) } finally { setTimeout(() => { busy.current = false }, 1200) }
  }, [id])

  // leitura por câmera (html5-qrcode carregado sob demanda)
  useEffect(() => {
    if (!cam) return
    let scanner
    let cancelled = false
    ;(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        scanner = new Html5Qrcode('qr-reader')
        await scanner.start({ facingMode: 'environment' }, { fps: 8, qrbox: 240 }, (text) => submit(text), () => {})
      } catch {
        setCamError('Não foi possível acessar a câmera (é necessário HTTPS ou localhost e permissão). Use o campo de código.')
        setCam(false)
      }
    })()
    return () => { cancelled = true; scanner?.isScanning && scanner.stop().then(() => scanner.clear()).catch(() => {}) }
  }, [cam, submit])

  const R = last && RESULT[last.result]
  return (
    <Fade>
      <PageHeader title="Check-in" subtitle="Leia o QR Code do participante ou digite o código. A tela mostra só o nome do crachá." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); submit(code.trim()); setCode('') }} className="flex gap-2">
            <input className="input" autoFocus placeholder="Cole ou digite o código do ingresso" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Código do ingresso" />
            <button className="btn-primary"><QrCode className="h-4 w-4" /> Validar</button>
          </form>
          <button className="btn-ghost w-full" onClick={() => { setCamError(''); setCam(!cam) }}>
            {cam ? <><CameraOff className="h-4 w-4" /> Desligar câmera</> : <><Camera className="h-4 w-4" /> Ler com a câmera</>}
          </button>
          {cam && <div id="qr-reader" className="overflow-hidden rounded-xl" />}
          <ErrorNote error={camError || error} />
        </Card>

        <div className="space-y-4">
          {R ? (
            <div key={history.length} className={cx('rounded-2xl border p-6 text-center', R.cls)} role="status">
              <R.icon className="mx-auto h-12 w-12" />
              <p className="mt-2 font-display text-lg font-semibold">{R.label}</p>
              {last.badge_name && (
                <p className="mt-3 text-3xl font-bold text-white">{last.badge_name}</p>
              )}
              {last.ticket_type && <p className="mt-1 flex items-center justify-center gap-1 text-sm">{last.is_vip && <Crown className="h-4 w-4" />}{last.ticket_type}</p>}
              {last.result === 'already' && last.checked_in_at && <p className="mt-1 text-xs">Entrou às {fmtTime(last.checked_in_at)}</p>}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">Aguardando leitura…</div>
          )}
          {history.length > 0 && (
            <Card>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Últimas leituras</h3>
              <ul className="divide-y divide-white/5 text-sm">
                {history.map((h, i) => (
                  <li key={i} className="flex items-center justify-between py-1.5">
                    <span>{h.badge_name || '—'}</span>
                    <span className={cx('text-xs', h.result === 'ok' ? 'text-emerald-300' : h.result === 'already' ? 'text-amber-300' : 'text-rose-300')}>{RESULT[h.result].label}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </Fade>
  )
}
