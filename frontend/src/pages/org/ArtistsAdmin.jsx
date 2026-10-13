import { ExternalLink, Palette } from 'lucide-react'
import { useState } from 'react'
import { Badge, Empty, Fade, Field, FormModal, Input, Loading, PageHeader, Select, Table, Textarea, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { fromCents, money, toCents } from '../../lib/format'
import { useEvent } from './EventWorkspace'

const TONE = { pending: 'amber', approved: 'green', rejected: 'red' }
const LABEL = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Recusado' }

export default function ArtistsAdmin() {
  const { id } = useEvent()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/applications`), [id])
  const [sel, setSel] = useState(null)
  const [f, setF] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const open = (a) => { setSel(a); setF({ status: a.status === 'pending' ? 'approved' : a.status, table_label: a.table_label, fee: fromCents(a.fee_cents), review_note: a.review_note }) }
  const save = async () => {
    await api.put(`/org/events/${id}/applications/${sel.id}`, { status: f.status, table_label: f.table_label, fee_cents: toCents(f.fee), review_note: f.review_note })
    reload()
  }
  return (
    <Fade>
      <PageHeader title="Artistas e vendedores" subtitle="Avalie portfólios, aprove inscrições e atribua mesas. A taxa de mesa entra no financeiro." />
      {loading ? <Loading /> : data.length === 0 ? (
        <Empty icon={Palette} title="Nenhuma inscrição" text="Artistas e vendedores se inscrevem pela página pública do evento (conta de artista)." />
      ) : (
        <Table head={['Nome', 'Tipo', 'Status', 'Mesa', 'Taxa', '']}>
          {data.map((a) => (
            <tr key={a.id}>
              <td className="td"><span className="font-medium text-white">{a.display_name}</span>
                <div className="text-xs text-slate-500">{a.applicant_name}</div></td>
              <td className="td">{a.kind === 'artist' ? 'Artist Alley' : 'Dealers Den'}</td>
              <td className="td"><Badge tone={TONE[a.status]}>{LABEL[a.status]}</Badge></td>
              <td className="td">{a.table_label || '—'}</td>
              <td className="td">{a.fee_cents ? money(a.fee_cents) : '—'}</td>
              <td className="td text-right"><button className="btn-ghost" onClick={() => open(a)}>Avaliar</button></td>
            </tr>
          ))}
        </Table>
      )}
      <FormModal open={!!sel} onClose={() => setSel(null)} title={`Avaliar: ${sel?.display_name}`} onSubmit={save} wide>
        {sel && (
          <>
            <p className="whitespace-pre-wrap text-sm text-slate-300">{sel.description || 'Sem descrição.'}</p>
            {sel.portfolio_url && <a href={sel.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"><ExternalLink className="h-4 w-4" /> Ver portfólio</a>}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Decisão"><Select value={f.status} onChange={set('status')}>{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <Field label="Mesa"><Input value={f.table_label} onChange={set('table_label')} placeholder="A-01" /></Field>
              <Field label="Taxa (R$)"><Input inputMode="decimal" value={f.fee} onChange={set('fee')} /></Field>
            </div>
            <Field label="Observação (enviada ao candidato)"><Textarea value={f.review_note} onChange={set('review_note')} /></Field>
          </>
        )}
      </FormModal>
    </Fade>
  )
}
