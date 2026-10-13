import { Download, Users } from 'lucide-react'
import { Badge, ConfirmButton, Empty, Fade, Loading, PageHeader, Table, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtStamp, money } from '../../lib/format'
import { useEvent } from './EventWorkspace'

const TONE = { valid: 'cyan', checked_in: 'green', cancelled: 'red' }
const LABEL = { valid: 'Válido', checked_in: 'Check-in feito', cancelled: 'Cancelado' }

export default function Attendees() {
  const { id } = useEvent()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/attendees`), [id])

  const csv = () => {
    const rows = [['Crachá', 'Lote', 'Status', 'Valor', 'Pagamento', 'Compra']].concat(
      data.map((a) => [a.badge_name, a.ticket_type_name, LABEL[a.status], (a.price_cents / 100).toFixed(2), a.payment_method, a.created_at]))
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `participantes-${id}.csv`; a.click()
  }

  return (
    <Fade>
      <PageHeader title="Participantes" subtitle="Mostramos apenas o nome do crachá; dados pessoais do titular ficam restritos à administração."
        actions={data?.length > 0 && <button className="btn-ghost" onClick={csv}><Download className="h-4 w-4" /> Exportar CSV</button>} />
      {loading ? <Loading /> : data.length === 0 ? <Empty icon={Users} title="Nenhum ingresso vendido" /> : (
        <Table head={['Crachá', 'Titular', 'Lote', 'Status', 'Valor', 'Compra', '']}>
          {data.map((a) => (
            <tr key={a.id}>
              <td className="td font-medium text-white">{a.badge_name}</td>
              <td className="td text-slate-400">{a.holder_name || '—'}</td>
              <td className="td">{a.ticket_type_name}</td>
              <td className="td"><Badge tone={TONE[a.status]}>{LABEL[a.status]}</Badge></td>
              <td className="td">{money(a.price_cents)}</td>
              <td className="td text-slate-400">{fmtStamp(a.created_at)}</td>
              <td className="td text-right">
                {a.status === 'valid' && (
                  <ConfirmButton label="Cancelar e estornar?" onConfirm={() => act(async () => { await api.post(`/org/events/${id}/tickets/${a.id}/cancel`); reload() }, 'Ingresso cancelado')}>Cancelar</ConfirmButton>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Fade>
  )
}
