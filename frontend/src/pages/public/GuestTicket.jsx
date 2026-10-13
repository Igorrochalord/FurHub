import { CalendarDays, MapPin } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useParams } from 'react-router-dom'
import { Badge, Empty, Loading } from '../../components/ui'
import { fmtRange } from '../../lib/format'
import { usePublic } from '../../lib/useEvents'
import { usePageMeta } from '../../lib/useMeta'

/** Ingresso de convidado, acessado pelo link secreto (rota noindex). */
export default function GuestTicket() {
  const { token } = useParams()
  usePageMeta({ title: 'Meu ingresso', noindex: true })
  const { data: t, loading, error } = usePublic(`/tickets/${encodeURIComponent(token)}`)
  if (loading) return <Loading />
  if (error) return <div className="mx-auto max-w-md px-4 py-16"><Empty title="Ingresso não encontrado" text="Confira se o link está completo." /></div>
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6 text-center">
        <Badge tone={t.status === 'checked_in' ? 'slate' : 'green'}>{t.status === 'checked_in' ? 'Já utilizado' : 'Válido'}</Badge>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-white">{t.event_name}</h1>
        <p className="mt-1 text-slate-400">{t.ticket_type} · {t.badge_name}</p>
        <div className="mx-auto mt-5 inline-block rounded-2xl bg-white p-4"><QRCodeSVG value={`furconhub:ticket:${t.code}`} size={200} level="M" /></div>
        <p className="mt-3 text-xs text-slate-500">O QR contém apenas um código aleatório — nenhum dado pessoal.</p>
        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-300"><CalendarDays className="h-4 w-4" />{fmtRange(t.start_date, t.end_date)}</p>
        {t.city && <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-300"><MapPin className="h-4 w-4" />{[t.venue, t.city].filter(Boolean).join(', ')}</p>}
        <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">Guarde este link: ele é o seu acesso ao ingresso. Quem tiver o link pode usar o ingresso.</p>
      </div>
    </div>
  )
}
