import { Activity, CalendarCheck, HeartPulse, Palette, Ticket, TrendingUp, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChartBox, Donut, MoneyBars, SalesArea } from '../../components/Charts'
import { Card, Empty, Fade, Loading, Stat, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/format'
import { useEvent } from './EventWorkspace'

export function Progress({ pct, label }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{pct}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { id } = useEvent()
  const { data: d, loading, error } = useLoad(() => api.get(`/org/events/${id}/dashboard`), [id])
  if (loading) return <Loading />
  if (error) return <p className="text-rose-300">{error}</p>
  const f = d.finance

  return (
    <Fade className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Ticket} label="Ingressos vendidos" value={`${d.tickets_sold} / ${d.event.capacity}`} hint={`${d.capacity_used_pct}% da capacidade`} />
        <Stat icon={Users} label="Check-in" value={d.checked_in} hint={`${d.checkin_rate_pct}% dos ingressos`} tone="violet" />
        <Stat icon={Wallet} label="Receita total" value={money(f.revenue_total_cents)} hint={`Líquido: ${money(f.net_cents)}`} />
        <Stat icon={TrendingUp} label="Orçamento usado" value={f.budget_used_pct == null ? '—' : `${f.budget_used_pct}%`} hint={`Custos: ${money(f.expenses_cents)}`} tone="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartBox title="Vendas por dia" subtitle="Ingressos vendidos (sem cancelados)">
            {f.sales_by_day.length ? <SalesArea data={f.sales_by_day} /> : <Empty icon={Activity} title="Sem vendas ainda" />}
          </ChartBox>
        </div>
        <Card className="space-y-5">
          <h3 className="font-display text-sm font-semibold text-white">Operação</h3>
          <Progress label="Capacidade" pct={d.capacity_used_pct} />
          <Progress label="Cobertura de voluntários" pct={d.shift_coverage_pct} />
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-400"><Palette className="h-4 w-4" />Inscrições pendentes</span>
              <Link to={`/org/events/${id}/artists`} className="font-semibold text-white hover:text-cyan-300">{d.applications.pending}</Link></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-400"><HeartPulse className="h-4 w-4" />Chamados Care abertos</span>
              <Link to={`/org/events/${id}/care`} className="font-semibold text-white hover:text-cyan-300">{d.open_care_requests}</Link></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-400"><CalendarCheck className="h-4 w-4" />Atividades na programação</span>
              <Link to={`/org/events/${id}/schedule`} className="font-semibold text-white hover:text-cyan-300">{d.sessions}</Link></li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title="Receita por lote" subtitle="Valor bruto de ingressos">
          {f.revenue_by_type.length ? <MoneyBars data={f.revenue_by_type} nameKey="name" valueKey="revenue_cents" /> : <Empty title="Sem dados" />}
        </ChartBox>
        <ChartBox title="Custos por categoria">
          {f.expenses_by_category.length ? <Donut data={f.expenses_by_category} nameKey="category" valueKey="amount_cents" /> : <Empty title="Nenhuma despesa registrada" />}
        </ChartBox>
      </div>
    </Fade>
  )
}
