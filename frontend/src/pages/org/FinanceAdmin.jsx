import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ChartBox, Donut } from '../../components/Charts'
import { Card, ConfirmButton, Empty, Fade, Field, FormModal, Input, Loading, PageHeader, Stat, Table, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtStamp, money, toCents } from '../../lib/format'
import { Progress } from './Dashboard'
import { useEvent } from './EventWorkspace'

export default function FinanceAdmin() {
  const { id } = useEvent()
  const act = useAct()
  const dash = useLoad(() => api.get(`/org/events/${id}/dashboard`), [id])
  const exp = useLoad(() => api.get(`/org/events/${id}/expenses`), [id])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ category: '', description: '', amount: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const refresh = () => { dash.reload(); exp.reload() }
  const add = async () => { await api.post(`/org/events/${id}/expenses`, { category: f.category, description: f.description, amount_cents: toCents(f.amount) }); setF({ category: '', description: '', amount: '' }); refresh() }

  if (dash.loading || exp.loading) return <Loading />
  const fin = dash.data.finance
  const Row = ({ label, value, strong, neg }) => (
    <div className={`flex justify-between py-2 text-sm ${strong ? 'border-t border-white/10 font-semibold text-white' : 'text-slate-300'}`}>
      <span>{label}</span><span className={neg ? 'text-rose-300' : ''}>{neg ? '− ' : ''}{money(value)}</span>
    </div>
  )

  return (
    <Fade className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Todos os valores são calculados no servidor a partir das vendas e despesas registradas."
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Registrar despesa</button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Receita total" value={money(fin.revenue_total_cents)} />
        <Stat label="Resultado líquido" value={money(fin.net_cents)} hint={fin.margin_pct == null ? '' : `Margem ${fin.margin_pct}%`} tone="violet" />
        <Stat label="Taxas de pagamento" value={money(fin.payment_fees_cents)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-display text-sm font-semibold text-white">Demonstrativo</h3>
          <Row label="Ingressos (bruto)" value={fin.ticket_gross_cents} />
          <Row label="Taxas do provedor de pagamento" value={fin.payment_fees_cents} neg />
          <Row label="Mesas (Artist Alley / Dealers)" value={fin.table_fees_cents} />
          <Row label="Despesas" value={fin.expenses_cents} neg />
          <Row label="Resultado líquido" value={fin.net_cents} strong />
          {fin.budget_cents > 0 && <div className="mt-4"><Progress label={`Orçamento de ${money(fin.budget_cents)}`} pct={fin.budget_used_pct} /></div>}
        </Card>
        <ChartBox title="Despesas por categoria">
          {fin.expenses_by_category.length ? <Donut data={fin.expenses_by_category} nameKey="category" valueKey="amount_cents" /> : <Empty title="Sem despesas" />}
        </ChartBox>
      </div>
      <h3 className="font-display text-sm font-semibold text-white">Despesas</h3>
      {exp.data.length === 0 ? <Empty title="Nenhuma despesa registrada" /> : (
        <Table head={['Categoria', 'Descrição', 'Registrada', 'Valor', '']}>
          {exp.data.map((e) => (
            <tr key={e.id}>
              <td className="td font-medium text-white">{e.category}</td><td className="td text-slate-400">{e.description}</td>
              <td className="td text-slate-400">{fmtStamp(e.created_at)}</td><td className="td">{money(e.amount_cents)}</td>
              <td className="td text-right"><ConfirmButton aria-label="Excluir" onConfirm={() => act(async () => { await api.del(`/org/events/${id}/expenses/${e.id}`); refresh() })}><Trash2 className="h-4 w-4" /></ConfirmButton></td>
            </tr>
          ))}
        </Table>
      )}
      <FormModal open={open} onClose={() => setOpen(false)} title="Registrar despesa" onSubmit={add}>
        <Field label="Categoria"><Input required value={f.category} onChange={set('category')} placeholder="Local, Estrutura, Marketing…" /></Field>
        <Field label="Descrição"><Input value={f.description} onChange={set('description')} /></Field>
        <Field label="Valor (R$)"><Input required inputMode="decimal" value={f.amount} onChange={set('amount')} /></Field>
      </FormModal>
    </Fade>
  )
}
