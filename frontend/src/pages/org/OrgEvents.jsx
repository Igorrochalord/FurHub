import { CalendarPlus, CalendarX, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, DemoBadge, Empty, Fade, Field, FormModal, Input, Loading, PageHeader, Textarea, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import EventFields, { EVENT_DEFAULTS, eventPayload } from '../../components/public/EventFields'
import { fmtDate, toCents } from '../../lib/format'

const blank = { name: '', description: '', venue: '', city: '', start_date: '', end_date: '', capacity: 300, budget: '', care_guidelines: '', ...EVENT_DEFAULTS }

export default function OrgEvents() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useLoad(() => api.get('/org/events'))
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(blank)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const canCreate = user.role === 'admin'

  const create = async () => {
    await api.post('/org/events', { ...f, capacity: Number(f.capacity), budget_cents: toCents(f.budget), ...eventPayload(f) })
    setF(blank); reload()
  }

  return (
    <Fade>
      <PageHeader title="Eventos" subtitle="Crie e administre as convenções da sua organização."
        actions={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><CalendarPlus className="h-4 w-4" /> Novo evento</button>} />
      {loading ? <Loading /> : error ? <p className="text-rose-300">{error}</p> : data.length === 0 ? (
        <Empty icon={CalendarX} title="Nenhum evento ainda" text="Comece criando seu primeiro evento. Depois configure ingressos, programação e publique."
          action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}>Criar evento</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((ev) => (
            <Link key={ev.id} to={`/org/events/${ev.id}`}>
              <Card className="h-full transition hover:border-violet-400/40 hover:shadow-glow">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge tone={ev.status === 'published' ? 'green' : ev.status === 'cancelled' ? 'red' : 'slate'}>{ev.status === 'published' ? 'Publicado' : ev.status === 'cancelled' ? 'Cancelado' : 'Rascunho'}</Badge>
                  {ev.is_demo && <DemoBadge />}
                </div>
                <h3 className="font-display text-lg font-semibold text-white">{ev.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{fmtDate(ev.start_date)} – {fmtDate(ev.end_date)} · {ev.capacity} pessoas</p>
                {ev.city && <p className="mt-2 flex items-center gap-1 text-sm text-slate-400"><MapPin className="h-4 w-4" />{ev.venue ? `${ev.venue}, ` : ''}{ev.city}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
      <FormModal open={open} onClose={() => setOpen(false)} title="Novo evento" onSubmit={create} submitLabel="Criar evento" wide>
        <Field label="Nome"><Input required value={f.name} onChange={set('name')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Início"><Input type="date" required value={f.start_date} onChange={set('start_date')} /></Field>
          <Field label="Término"><Input type="date" required value={f.end_date} onChange={set('end_date')} /></Field>
          <Field label="Local"><Input value={f.venue} onChange={set('venue')} /></Field>
          <Field label="Cidade"><Input value={f.city} onChange={set('city')} /></Field>
          <Field label="Capacidade"><Input type="number" min="1" required value={f.capacity} onChange={set('capacity')} /></Field>
          <Field label="Orçamento (R$)"><Input inputMode="decimal" placeholder="0,00" value={f.budget} onChange={set('budget')} /></Field>
        </div>
        <Field label="Descrição"><Textarea value={f.description} onChange={set('description')} /></Field>
        <EventFields f={f} set={set} setF={setF} />
      </FormModal>
    </Fade>
  )
}
