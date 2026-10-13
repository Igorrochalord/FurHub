import { CheckCircle2, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Card, Empty, Fade, Loading, PageHeader, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtDate, fmtTime } from '../../lib/format'

export default function VolunteerHome() {
  const act = useAct()
  const shifts = useLoad(() => api.get('/me/shifts'))
  const events = useLoad(() => api.get('/org/events'))
  return (
    <Fade className="space-y-8">
      <PageHeader title="Meus turnos" subtitle="Confirme sua presença e acesse as ferramentas do evento." />
      {shifts.loading ? <Loading /> : shifts.data.length === 0 ? <Empty icon={ClipboardList} title="Você ainda não foi escalado" text="Quando um organizador atribuir um turno, ele aparece aqui." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {shifts.data.map((s) => (
            <Card key={s.id}>
              <p className="text-xs text-slate-500">{s.event_name}</p>
              <p className="font-display font-semibold text-white">{s.title}</p>
              <p className="text-sm text-slate-400">{fmtDate(s.starts_at)} · {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}{s.area && ` · ${s.area}`}</p>
              <p className="mt-2 text-xs text-slate-400">Com: {s.members.filter((m) => m.name).map((m) => m.name).join(', ')}</p>
              <div className="mt-4">
                {s.confirmed ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Presença confirmada</Badge>
                  : <button className="btn-primary" onClick={() => act(async () => { await api.post(`/me/shifts/${s.id}/confirm`); shifts.reload() }, 'Presença confirmada')}>Confirmar presença</button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-white">Ferramentas do evento</h2>
        {events.loading ? <Loading /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {events.data.map((ev) => (
              <Card key={ev.id} className="flex items-center justify-between gap-3">
                <span className="font-medium text-white">{ev.name}</span>
                <span className="flex gap-2"><Link className="btn-ghost" to={`/org/events/${ev.id}/checkin`}>Check-in</Link><Link className="btn-ghost" to={`/org/events/${ev.id}/care`}>Care</Link></span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </Fade>
  )
}
