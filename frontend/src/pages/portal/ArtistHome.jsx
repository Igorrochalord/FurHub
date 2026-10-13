import { Palette } from 'lucide-react'
import { useState } from 'react'
import { Badge, Card, Empty, Fade, Field, FormModal, Input, Loading, Select, Textarea, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/format'

const TONE = { pending: 'amber', approved: 'green', rejected: 'red' }
const LABEL = { pending: 'Em análise', approved: 'Aprovado', rejected: 'Não aprovado' }

export default function ArtistHome() {
  const apps = useLoad(() => api.get('/me/applications'))
  const events = useLoad(() => api.get('/events'))
  const [ev, setEv] = useState(null)
  const [f, setF] = useState({ kind: 'artist', display_name: '', description: '', portfolio_url: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const applied = new Set(apps.data?.map((a) => a.event_id))
  const submit = async () => { await api.post(`/events/${ev.id}/applications`, f); apps.reload() }

  return (
    <Fade className="space-y-10">
      <div><h1 className="font-display text-2xl font-semibold text-white">Portal do artista</h1>
        <p className="text-sm text-slate-400">Inscreva-se na Artist Alley ou no Dealers Den e acompanhe a avaliação.</p></div>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-white">Minhas inscrições</h2>
        {apps.loading ? <Loading /> : apps.data.length === 0 ? <Empty icon={Palette} title="Nenhuma inscrição ainda" /> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {apps.data.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">{a.event_name}</p><p className="font-display font-semibold text-white">{a.display_name}</p></div><Badge tone={TONE[a.status]}>{LABEL[a.status]}</Badge></div>
                {a.status === 'approved' && <p className="mt-3 text-sm text-slate-300">Mesa <strong className="text-white">{a.table_label || 'a definir'}</strong>{a.fee_cents > 0 && ` · taxa ${money(a.fee_cents)}`}</p>}
                {a.review_note && <p className="mt-2 text-sm text-slate-400">“{a.review_note}”</p>}
              </Card>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-white">Eventos com inscrições</h2>
        {events.loading ? <Loading /> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.data.map((e) => (
              <Card key={e.id} className="flex items-center justify-between gap-3">
                <span className="font-medium text-white">{e.name}</span>
                {applied.has(e.id) ? <Badge tone="cyan">Inscrito</Badge> : <button className="btn-primary" onClick={() => setEv(e)}>Inscrever-se</button>}
              </Card>
            ))}
          </div>
        )}
      </section>
      <FormModal open={!!ev} onClose={() => setEv(null)} title={`Inscrição — ${ev?.name}`} onSubmit={submit} submitLabel="Enviar inscrição" wide>
        <Field label="Tipo"><Select value={f.kind} onChange={set('kind')}><option value="artist">Artist Alley (artista)</option><option value="dealer">Dealers Den (vendedor)</option></Select></Field>
        <Field label="Nome artístico / da loja"><Input required value={f.display_name} onChange={set('display_name')} /></Field>
        <Field label="Link do portfólio" hint="Começando com https://"><Input type="url" value={f.portfolio_url} onChange={set('portfolio_url')} /></Field>
        <Field label="Sobre o seu trabalho"><Textarea rows={4} value={f.description} onChange={set('description')} maxLength={2000} /></Field>
      </FormModal>
    </Fade>
  )
}
