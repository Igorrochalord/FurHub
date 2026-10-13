import { HeartPulse } from 'lucide-react'
import { useEffect } from 'react'
import { Badge, Empty, Fade, Loading, PageHeader, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { CARE_LABEL, fmtStamp } from '../../lib/format'
import { useEvent } from './EventWorkspace'

const TONE = { open: 'red', in_progress: 'amber', resolved: 'green' }
const LABEL = { open: 'Aberto', in_progress: 'Em atendimento', resolved: 'Resolvido' }

export default function CareAdmin() {
  const { id } = useEvent()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/care-requests`), [id])
  useEffect(() => { const t = setInterval(reload, 15000); return () => clearInterval(t) }, [reload])
  const setStatus = (r, status) => act(async () => { await api.post(`/org/events/${id}/care-requests/${r.id}/status`, { status }); reload() })

  return (
    <Fade>
      <PageHeader title="Fursuit Care — fila de atendimento" subtitle="Solicitações de ajuda feitas pelos participantes. Atualiza automaticamente a cada 15 s." />
      {loading && !data ? <Loading /> : data.length === 0 ? <Empty icon={HeartPulse} title="Nenhuma solicitação" text="Quando um fursuiter pedir ajuda pelo app, ela aparece aqui." /> : (
        <div className="space-y-3">
          {data.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center gap-4 p-4">
              <Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{CARE_LABEL[r.kind]} {r.location && <span className="text-slate-400">· {r.location}</span>}</p>
                <p className="text-sm text-slate-400">{r.message || 'Sem mensagem'}</p>
                <p className="text-xs text-slate-500">{fmtStamp(r.created_at)}</p>
              </div>
              {r.status === 'open' && <button className="btn-ghost" onClick={() => setStatus(r, 'in_progress')}>Atender</button>}
              {r.status !== 'resolved' && <button className="btn-primary" onClick={() => setStatus(r, 'resolved')}>Resolver</button>}
            </div>
          ))}
        </div>
      )}
    </Fade>
  )
}
