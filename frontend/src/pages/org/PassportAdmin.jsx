import { Plus, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Badge, ConfirmButton, Empty, Fade, Field, FormModal, Input, Loading, PageHeader, Select, Table, Textarea, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { useEvent } from './EventWorkspace'

export const CAT = { activity: 'Atividade', artist: 'Artistas', workshop: 'Workshop', charity: 'Beneficente', general: 'Geral' }
const blank = { name: '', description: '', category: 'activity', points: 10, claim_code: '' }

export default function PassportAdmin() {
  const { id } = useEvent()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/achievements`), [id])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(blank)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => { await api.post(`/org/events/${id}/achievements`, { ...f, points: Number(f.points) }); setF(blank); reload() }

  return (
    <Fade>
      <PageHeader title="Passaporte e conquistas" subtitle="Divulgue o código no local da atividade (placa, mesa de artista, palco). O participante resgata digitando — sem rastrear localização."
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova conquista</button>} />
      {loading ? <Loading /> : data.length === 0 ? <Empty icon={Trophy} title="Nenhuma conquista" /> : (
        <Table head={['Conquista', 'Categoria', 'Pontos', 'Código', 'Resgates', '']}>
          {data.map((a) => (
            <tr key={a.id}>
              <td className="td"><span className="font-medium text-white">{a.name}</span><div className="text-xs text-slate-500">{a.description}</div></td>
              <td className="td"><Badge tone="violet">{CAT[a.category]}</Badge></td>
              <td className="td">{a.points}</td><td className="td font-mono text-cyan-300">{a.claim_code}</td><td className="td">{a.earned_count}</td>
              <td className="td text-right"><ConfirmButton aria-label="Excluir" onConfirm={() => act(async () => { await api.del(`/org/events/${id}/achievements/${a.id}`); reload() })}><Trash2 className="h-4 w-4" /></ConfirmButton></td>
            </tr>
          ))}
        </Table>
      )}
      <FormModal open={open} onClose={() => setOpen(false)} title="Nova conquista" onSubmit={save}>
        <Field label="Nome"><Input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Descrição"><Textarea rows={2} value={f.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Categoria"><Select value={f.category} onChange={set('category')}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Pontos"><Input type="number" min="1" value={f.points} onChange={set('points')} /></Field>
          <Field label="Código"><Input required minLength={3} value={f.claim_code} onChange={set('claim_code')} /></Field>
        </div>
      </FormModal>
    </Fade>
  )
}
