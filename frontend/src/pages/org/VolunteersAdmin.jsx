import { CheckCircle2, Clock, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Badge, ConfirmButton, Empty, Fade, Field, FormModal, Input, Loading, Modal, PageHeader, Select, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtDate, fmtTime } from '../../lib/format'
import { useEvent } from './EventWorkspace'

const blank = { title: '', area: '', starts_at: '', ends_at: '', slots: 2 }

export default function VolunteersAdmin() {
  const { id } = useEvent()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/shifts`), [id])
  const { data: team } = useLoad(() => api.get('/org/team'))
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(blank)
  const [assign, setAssign] = useState(null)
  const [pick, setPick] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const create = async () => {
    await api.post(`/org/events/${id}/shifts`, { ...f, slots: Number(f.slots) }); setF(blank); reload()
  }
  const doAssign = () => act(async () => { await api.post(`/org/events/${id}/shifts/${assign.id}/assign`, { user_id: Number(pick) }); setPick(''); setAssign(null); reload() }, 'Escalado')

  return (
    <Fade>
      <PageHeader title="Voluntários e equipe" subtitle="Monte turnos, escale a equipe e acompanhe as confirmações. Conflitos de horário são bloqueados."
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo turno</button>} />
      {loading ? <Loading /> : data.length === 0 ? <Empty icon={Clock} title="Nenhum turno" text="Crie turnos e atribua os membros da equipe (cadastre-os em Equipe)." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display font-semibold text-white">{s.title}</p>
                  <p className="text-xs text-slate-400">{fmtDate(s.starts_at)} · {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}{s.area && ` · ${s.area}`}</p>
                </div>
                <Badge tone={s.members.length >= s.slots ? 'green' : 'amber'}>{s.members.length}/{s.slots}</Badge>
              </div>
              <ul className="mt-3 space-y-1.5">
                {s.members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">{m.confirmed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="Confirmado" /> : <Clock className="h-4 w-4 text-amber-400" aria-label="Aguardando confirmação" />}{m.name}</span>
                    <button aria-label={`Remover ${m.name}`} className="text-slate-500 hover:text-rose-300" onClick={() => act(async () => { await api.del(`/org/events/${id}/shifts/${s.id}/assign/${m.user_id}`); reload() })}><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <button className="btn-ghost" disabled={s.members.length >= s.slots} onClick={() => setAssign(s)}><UserPlus className="h-4 w-4" /> Escalar</button>
                <ConfirmButton onConfirm={() => act(async () => { await api.del(`/org/events/${id}/shifts/${s.id}`); reload() })}><Trash2 className="h-4 w-4" /></ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      )}
      <FormModal open={open} onClose={() => setOpen(false)} title="Novo turno" onSubmit={create}>
        <Field label="Função / título"><Input required value={f.title} onChange={set('title')} /></Field>
        <Field label="Área"><Input value={f.area} onChange={set('area')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Início"><Input type="datetime-local" required value={f.starts_at} onChange={set('starts_at')} /></Field>
          <Field label="Término"><Input type="datetime-local" required value={f.ends_at} onChange={set('ends_at')} /></Field>
        </div>
        <Field label="Vagas"><Input type="number" min="1" value={f.slots} onChange={set('slots')} /></Field>
      </FormModal>
      <Modal open={!!assign} onClose={() => setAssign(null)} title={`Escalar para: ${assign?.title}`}>
        <div className="space-y-4">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Membro da equipe">
            <option value="">Selecione um membro…</option>
            {team?.filter((m) => !assign?.members.some((x) => x.user_id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role === 'admin' ? 'admin' : 'voluntário'})</option>)}
          </Select>
          <button className="btn-primary w-full" disabled={!pick} onClick={doAssign}>Escalar</button>
        </div>
      </Modal>
    </Fade>
  )
}
