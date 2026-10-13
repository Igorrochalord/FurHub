import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import EventMap, { MapLegend } from '../../components/EventMap'
import { Card, ConfirmButton, Fade, Field, Input, Loading, PageHeader, Select, ErrorNote, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { PLACE_LABEL } from '../../lib/format'
import { useEvent } from './EventWorkspace'

const blank = { name: '', kind: 'room', description: '', hours: '', x: 50, y: 50 }

export default function MapAdmin() {
  const { id } = useEvent()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/places`), [id])
  const [f, setF] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const pick = (p) => { setEditing(p); setF({ ...p }) }
  const reset = () => { setEditing(null); setF(blank) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    const body = { name: f.name, kind: f.kind, description: f.description, hours: f.hours, x: Number(f.x), y: Number(f.y) }
    try {
      if (editing) await api.put(`/org/events/${id}/places/${editing.id}`, body)
      else await api.post(`/org/events/${id}/places`, body)
      reset(); reload()
    } catch (err) { setError(err.message) }
  }

  if (loading) return <Loading />
  const preview = editing ? data.map((p) => (p.id === editing.id ? { ...p, x: Number(f.x), y: Number(f.y) } : p)) : [...data, { ...f, id: 'new', x: Number(f.x), y: Number(f.y), name: f.name || 'Novo ponto' }]
  return (
    <Fade>
      <PageHeader title="Mapa e espaços" subtitle="Clique no mapa para posicionar um ponto. Lounges, hidratação, descanso e posto médico alimentam o módulo Fursuit Care." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EventMap places={preview} selectedId={editing?.id} onSelect={pick} onPick={(x, y) => setF({ ...f, x, y })} />
          <MapLegend />
        </div>
        <Card>
          <form onSubmit={save} className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">{editing ? 'Editar ponto' : 'Novo ponto'}</h3>
            <Field label="Nome"><Input required value={f.name} onChange={set('name')} /></Field>
            <Field label="Tipo"><Select value={f.kind} onChange={set('kind')}>{Object.entries(PLACE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Horário"><Input value={f.hours} onChange={set('hours')} placeholder="09:00–23:00" /></Field>
            <Field label="Descrição"><Input value={f.description} onChange={set('description')} /></Field>
            <p className="text-xs text-slate-500">Posição: {f.x}% × {f.y}% (clique no mapa)</p>
            <ErrorNote error={error} />
            <div className="flex gap-2">
              <button className="btn-primary flex-1">{editing ? 'Salvar' : 'Adicionar'}</button>
              {editing && <button type="button" className="btn-ghost" onClick={reset}>Cancelar</button>}
              {editing && <ConfirmButton onConfirm={() => act(async () => { await api.del(`/org/events/${id}/places/${editing.id}`); reset(); reload() })}><Trash2 className="h-4 w-4" /></ConfirmButton>}
            </div>
          </form>
        </Card>
      </div>
    </Fade>
  )
}
