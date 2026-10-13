import { Download, Printer } from 'lucide-react'
import { ChartBox, Donut, MoneyBars, OccupancyBars } from '../../components/Charts'
import { Card, Empty, Fade, Loading, PageHeader, Stat, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/format'
import { useEvent } from './EventWorkspace'

export default function Reports() {
  const { id, ev } = useEvent()
  const { data: r, loading, error } = useLoad(() => api.get(`/org/events/${id}/report`), [id])
  if (loading) return <Loading />
  if (error) return <p className="text-rose-300">{error}</p>
  const f = r.finance
  const limited = r.session_occupancy.filter((s) => s.capacity)
  const download = () => {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `relatorio-evento-${id}.json`; a.click()
  }
  return (
    <Fade className="space-y-6">
      <PageHeader title="Relatórios" subtitle={`Resumo de desempenho — ${ev.name}`}
        actions={<><button className="btn-ghost" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / PDF</button>
          <button className="btn-ghost" onClick={download}><Download className="h-4 w-4" /> JSON</button></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ingressos" value={r.tickets_sold} hint={`${r.capacity_used_pct}% da capacidade`} />
        <Stat label="Comparecimento" value={`${r.checkin_rate_pct}%`} hint={`${r.checked_in} check-ins`} tone="violet" />
        <Stat label="Receita" value={money(f.revenue_total_cents)} />
        <Stat label="Líquido" value={money(f.net_cents)} hint={f.margin_pct == null ? '' : `Margem ${f.margin_pct}%`} tone="violet" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title="Receita por categoria">
          <Donut data={f.revenue_by_category.filter((c) => c.amount_cents > 0)} nameKey="category" valueKey="amount_cents" />
        </ChartBox>
        <ChartBox title="Receita por lote"><MoneyBars data={f.revenue_by_type} nameKey="name" valueKey="revenue_cents" /></ChartBox>
      </div>
      <ChartBox title="Ocupação das atividades com vagas limitadas" subtitle="Inscritos / vagas" height={Math.max(180, limited.length * 36)}>
        {limited.length ? <OccupancyBars data={limited} /> : <Empty title="Nenhuma atividade com vagas limitadas" />}
      </ChartBox>
      <Card>
        <h3 className="mb-2 font-display text-sm font-semibold text-white">Situação dos ingressos</h3>
        <dl className="flex flex-wrap gap-6 text-sm">
          {Object.entries(r.tickets_by_status).map(([k, v]) => <div key={k}><dt className="text-slate-400">{{ valid: 'Válidos', checked_in: 'Check-in feito', cancelled: 'Cancelados' }[k] || k}</dt><dd className="text-xl font-semibold text-white">{v}</dd></div>)}
        </dl>
      </Card>
    </Fade>
  )
}
