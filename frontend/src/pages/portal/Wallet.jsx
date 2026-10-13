import { Crown, RefreshCw, Ticket } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { Badge, ConfirmButton, Empty, Fade, Loading, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmtStamp, money } from '../../lib/format'
import { Paw } from '../../components/Logo'

export default function Wallet() {
  const { user } = useAuth()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get('/me/tickets'))
  const { data: fursona } = useLoad(() => api.get('/me/fursona'))
  if (loading) return <Loading />
  return (
    <Fade>
      <h1 className="mb-6 font-display text-2xl font-semibold text-white">Carteira de ingressos</h1>
      {data.length === 0 ? <Empty icon={Ticket} title="Nenhum ingresso" action={<Link to="/events" className="btn-primary">Ver eventos</Link>} /> : (
        <div className="grid gap-6 md:grid-cols-2">
          {data.map((t) => (
            <div key={t.id} className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-navy-700 via-navy-800 to-violet-950 shadow-glow">
              <div className="flex items-center justify-between border-b border-dashed border-white/15 px-5 py-4">
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300"><Paw className="h-5 w-5" />FurCon Hub · Event Pass</span>
                {t.is_vip && <Badge tone="violet"><Crown className="h-3 w-3" />VIP</Badge>}
              </div>
              <div className="p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">Personagem</p>
                <p className="font-display text-3xl font-bold text-white" style={{ color: fursona?.color }}>{t.badge_name}</p>
                <p className="mt-1 text-sm text-slate-300">{t.event_name}</p>
                <p className="text-xs text-slate-500">{t.ticket_type_name} · {t.price_cents ? money(t.price_cents) : 'Grátis'} · {user.name.split(' ')[0]}</p>
                <div className="mt-5 flex justify-center rounded-2xl bg-white p-4">
                  {t.status === 'checked_in'
                    ? <p className="py-12 text-center text-sm font-medium text-slate-700">Check-in realizado<br /><span className="text-xs">{fmtStamp(t.checked_in_at)}</span></p>
                    : <QRCodeSVG value={`furconhub:ticket:${t.code}`} size={176} level="M" />}
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">O QR contém apenas um código aleatório — nenhum dado pessoal.</p>
                <div className="mt-4 flex flex-wrap justify-between gap-2">
                  <Link to={`/app/events/${t.event_id}`} className="btn-primary">Abrir evento</Link>
                  {t.status === 'valid' && (
                    <ConfirmButton className="btn-ghost" label="Gerar novo QR?" onConfirm={() => act(async () => { await api.post(`/me/tickets/${t.id}/rotate`); reload() }, 'QR renovado — o anterior não vale mais')}>
                      <RefreshCw className="h-4 w-4" /> Renovar QR
                    </ConfirmButton>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Fade>
  )
}
