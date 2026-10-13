import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, ErrorNote, Fade, Field, Input, Loading, Textarea, useLoad, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { Paw } from '../../components/Logo'

export default function FursonaPage() {
  const toast = useToast()
  const { data, loading } = useLoad(() => api.get('/me/fursona'))
  const [f, setF] = useState({ name: '', species: '', bio: '', color: '#22d3ee', is_public: false })
  const [error, setError] = useState('')
  useEffect(() => { if (data) setF(data) }, [data])
  if (loading) return <Loading />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async (e) => {
    e.preventDefault(); setError('')
    try { await api.put('/me/fursona', { name: f.name, species: f.species, bio: f.bio, color: f.color, is_public: f.is_public }); toast('Fursona salva') }
    catch (err) { setError(err.message) }
  }
  return (
    <Fade className="grid gap-6 md:grid-cols-2">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold text-white">Minha fursona</h1>
        <p className="mb-6 text-sm text-slate-400">Opcional. Seu nome de personagem pode aparecer no crachá digital.</p>
        <Card>
          <form onSubmit={save} className="space-y-4">
            <Field label="Nome do personagem"><Input required value={f.name} onChange={set('name')} /></Field>
            <Field label="Espécie"><Input value={f.species} onChange={set('species')} placeholder="Lobo-guará, raposa, dragão…" /></Field>
            <Field label="Cor de destaque"><input type="color" value={f.color} onChange={set('color')} className="h-10 w-20 cursor-pointer rounded-lg border border-white/10 bg-transparent" /></Field>
            <Field label="Sobre"><Textarea value={f.bio} onChange={set('bio')} maxLength={1000} /></Field>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input type="checkbox" className="mt-1" checked={f.is_public} onChange={set('is_public')} />
              <span>Perfil público. Desligado (padrão), apenas você vê sua fursona.</span>
            </label>
            <ErrorNote error={error} />
            <button className="btn-primary">Salvar</button>
          </form>
        </Card>
      </div>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-gradient-to-br from-navy-700 to-violet-950 p-6 text-center shadow-glow">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2" style={{ borderColor: f.color, background: `${f.color}22` }}><Paw className="h-14 w-14" /></div>
          <p className="mt-4 font-display text-2xl font-bold" style={{ color: f.color }}>{f.name || 'Seu personagem'}</p>
          <p className="text-sm text-slate-400">{f.species || 'Espécie'}</p>
          <p className="mt-3 text-sm text-slate-300">{f.bio}</p>
          <p className="mt-4 inline-flex items-center gap-1 text-xs text-slate-500">{f.is_public ? <><Eye className="h-3 w-3" />Público</> : <><EyeOff className="h-3 w-3" />Privado</>}</p>
        </div>
      </div>
    </Fade>
  )
}
