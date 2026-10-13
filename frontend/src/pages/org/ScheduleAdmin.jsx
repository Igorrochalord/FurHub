import { CalendarDays, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Badge, ConfirmButton, Empty, Fade, Field, FormModal, Input, Loading, PageHeader, Select, Textarea, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { dayKey, fmtDateLong, fmtTime, KIND_LABEL, toInput } from '../../lib/format'
import { useEvent } from './EventWorkspace'

const blank = { title: '', description: '', kind: 'panel', room: '', speaker: '', starts_at: '', ends_at: '', capacity: '' }

export function groupByDay(items) {
  const g = {}
  items.forEach((i) => { (g[dayKey(i.starts_at)] ||= []).push(i) })
  return Object.entries(g)
}

export default function ScheduleAdmin() {
  const { id } = useEvent()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/schedule`), [id])
  const [edit, setEdit] = useState(null)
  const [f, setF] = useState(blank)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const open = (i) => { setEdit(i || 'new'); setF(i ? { ...i, starts_at: toInput(i.starts_at), ends_at: toInput(i.ends_at), capacity: i.capacity ?? '' } : blank) }

  const save = async () => {
    const body = { title: f.title, description: f.description, kind: f.kind, room: f.room, speaker: f.speaker,
      starts_at: f.starts_at, ends_at: f.ends_at, capacity: f.capacity === '' ? null : Number(f.capacity) }
    if (edit === 'new') await api.post(`/org/events/${id}/schedule`, body)
    else await api.put(`/org/events/${id}/schedule/${edit.id}`, body)
    reload()
  }

  return (
    <Fade>
      <PageHeader title="Programação" subtitle="Alterar horário ou sala notifica automaticamente quem favoritou ou se inscreveu."
        actions={<button className="btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> Nova atividade</button>} />
      {loading ? <Loading /> : data.length === 0 ? <Empty icon={CalendarDays} title="Programação vazia" text="Adicione painéis, workshops, desfiles e festas." /> : (
        <div className="space-y-8">
          {groupByDay(data).map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-3 font-display text-sm font-semibold capitalize text-cyan-300">{fmtDateLong(day)}</h2>
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.id} className="card flex flex-wrap items-center gap-4 p-4">
                    <div className="w-24 shrink-0 text-sm font-medium text-white">{fmtTime(i.starts_at)}–{fmtTime(i.ends_at)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{i.title}</p>
                      <p className="text-xs text-slate-400">{[i.room, i.speaker].filter(Boolean).join(' · ')}</p>
                    </div>
                    <Badge tone="violet">{KIND_LABEL[i.kind]}</Badge>
                    {i.capacity && <Badge tone="cyan"><Users className="h-3 w-3" />{i.signups}/{i.capacity}</Badge>}
                    <div className="flex gap-2">
                      <button className="btn-ghost" aria-label="Editar" onClick={() => open(i)}><Pencil className="h-4 w-4" /></button>
                      <ConfirmButton aria-label="Excluir" onConfirm={() => act(async () => { await api.del(`/org/events/${id}/schedule/${i.id}`); reload() }, 'Atividade removida')}><Trash2 className="h-4 w-4" /></ConfirmButton>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <FormModal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Nova atividade' : 'Editar atividade'} onSubmit={save} wide>
        <Field label="Título"><Input required value={f.title} onChange={set('title')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo"><Select value={f.kind} onChange={set('kind')}>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Sala / local"><Input value={f.room} onChange={set('room')} /></Field>
          <Field label="Início"><Input type="datetime-local" required value={f.starts_at} onChange={set('starts_at')} /></Field>
          <Field label="Término"><Input type="datetime-local" required value={f.ends_at} onChange={set('ends_at')} /></Field>
          <Field label="Palestrante / responsável"><Input value={f.speaker} onChange={set('speaker')} /></Field>
          <Field label="Vagas" hint="Vazio = sem limite; com vagas, exige inscrição"><Input type="number" min="1" value={f.capacity} onChange={set('capacity')} /></Field>
        </div>
        <Field label="Descrição"><Textarea value={f.description} onChange={set('description')} /></Field>
      </FormModal>
    </Fade>
  )
}
