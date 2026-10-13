import { Megaphone, Send } from 'lucide-react'
import { useState } from 'react'
import { Card, ErrorNote, Fade, Field, Input, Loading, PageHeader, Spinner, Textarea, useLoad, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtStamp } from '../../lib/format'
import { useEvent } from './EventWorkspace'

export default function Announcements() {
  const { id } = useEvent()
  const toast = useToast()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/announcements`), [id])
  const [f, setF] = useState({ title: '', body: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const r = await api.post(`/org/events/${id}/announcements`, f)
      toast(`Comunicado enviado a ${r.recipients} pessoa(s)`); setF({ title: '', body: '' }); reload()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <Fade>
      <PageHeader title="Comunicados" subtitle="Chegam como notificação a portadores de ingresso, artistas aprovados e voluntários escalados." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form onSubmit={send} className="space-y-4">
            <Field label="Título"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Mensagem"><Textarea rows={5} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
            <ErrorNote error={error} />
            <button className="btn-primary" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />} Enviar comunicado</button>
          </form>
        </Card>
        <div className="space-y-3">
          {loading ? <Loading /> : data.length === 0 ? <p className="text-sm text-slate-500"><Megaphone className="mr-2 inline h-4 w-4" />Nenhum comunicado enviado.</p> : data.map((a) => (
            <Card key={a.id}><p className="font-medium text-white">{a.title}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{a.body}</p>
              <p className="mt-2 text-xs text-slate-500">{fmtStamp(a.created_at)}</p></Card>
          ))}
        </div>
      </div>
    </Fade>
  )
}
