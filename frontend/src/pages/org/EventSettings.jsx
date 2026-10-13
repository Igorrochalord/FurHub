import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, ConfirmButton, ErrorNote, Fade, Field, Input, PageHeader, Textarea, useAct, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import EventFields, { eventPayload } from '../../components/public/EventFields'
import { fromCents, toCents } from '../../lib/format'
import { useEvent } from './EventWorkspace'

export default function EventSettings() {
  const { ev, reload, id } = useEvent()
  const toast = useToast()
  const act = useAct()
  const nav = useNavigate()
  const [f, setF] = useState({ ...ev, budget: fromCents(ev.budget_cents) })
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.put(`/org/events/${id}`, { name: f.name, description: f.description, venue: f.venue, city: f.city, start_date: f.start_date, end_date: f.end_date,
        capacity: Number(f.capacity), budget_cents: toCents(f.budget), care_guidelines: f.care_guidelines, retention_days: Number(f.retention_days), ...eventPayload(f) })
      await reload(); toast('Configurações salvas')
    } catch (err) { setError(err.message) }
  }

  return (
    <Fade>
      <PageHeader title="Configurações do evento" />
      <form onSubmit={save} className="space-y-6">
        <Card className="space-y-4">
          <Field label="Nome"><Input required value={f.name} onChange={set('name')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Início"><Input type="date" required value={f.start_date} onChange={set('start_date')} /></Field>
            <Field label="Término"><Input type="date" required value={f.end_date} onChange={set('end_date')} /></Field>
            <Field label="Local"><Input value={f.venue} onChange={set('venue')} /></Field>
            <Field label="Cidade"><Input value={f.city} onChange={set('city')} /></Field>
            <Field label="Capacidade"><Input type="number" min="1" required value={f.capacity} onChange={set('capacity')} /></Field>
            <Field label="Orçamento (R$)"><Input inputMode="decimal" value={f.budget} onChange={set('budget')} /></Field>
          </div>
          <Field label="Descrição"><Textarea rows={4} value={f.description} onChange={set('description')} /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display font-semibold text-white">Descoberta e localização</h2>
          <EventFields f={f} set={set} setF={setF} />
        </Card>
        <Card className="space-y-4">
          <Field label="Orientações Fursuit Care (exibidas aos participantes e handlers)"><Textarea rows={5} value={f.care_guidelines} onChange={set('care_guidelines')} /></Field>
          <Field label="Retenção de dados (dias após o evento)" hint="Passado esse prazo, `python -m app.retention` anonimiza ingressos, chamados e notificações.">
            <Input type="number" min="30" max="3650" value={f.retention_days} onChange={set('retention_days')} /></Field>
        </Card>
        <ErrorNote error={error} />
        <div className="flex justify-between">
          <button className="btn-primary">Salvar alterações</button>
          <ConfirmButton label="Excluir definitivamente?" onConfirm={() => act(async () => { await api.del(`/org/events/${id}`); nav('/org') }, 'Evento excluído')}><Trash2 className="h-4 w-4" /> Excluir evento</ConfirmButton>
        </div>
      </form>
    </Fade>
  )
}
