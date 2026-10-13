import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Area, AreaChart, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtDate, money, SERIES } from '../lib/format'

const axis = { stroke: '#64748b', fontSize: 12, tickLine: false, axisLine: false }
const tipStyle = { background: '#0b1224', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#e2e8f0', fontSize: 12 }

export function ChartBox({ title, subtitle, children, height = 260 }) {
  return (
    <div className="card p-5">
      <h3 className="font-display text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      <div className="mt-4" style={{ height }}>{children}</div>
    </div>
  )
}

export function SalesArea({ data }) {
  const d = data.map((x) => ({ ...x, label: fmtDate(x.date) }))
  return (
    <ResponsiveContainer>
      <AreaChart data={d} margin={{ left: -10, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SERIES[0]} stopOpacity={0.35} />
            <stop offset="1" stopColor={SERIES[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip contentStyle={tipStyle} formatter={(v, n) => (n === 'Receita' ? money(v) : v)} labelStyle={{ color: '#94a3b8' }} />
        <Area type="monotone" dataKey="tickets" name="Ingressos" stroke={SERIES[0]} strokeWidth={2} fill="url(#sales)" activeDot={{ r: 5, stroke: '#0b1224', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MoneyBars({ data, nameKey, valueKey }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ left: -4, right: 8, top: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
        <XAxis dataKey={nameKey} {...axis} />
        <YAxis tickFormatter={(v) => `${Math.round(v / 100000)}k`} {...axis} />
        <Tooltip contentStyle={tipStyle} formatter={(v) => money(v)} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
        <Bar dataKey={valueKey} name="Valor" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, nameKey, valueKey }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="55%" outerRadius="80%" stroke="#111a33" strokeWidth={2} paddingAngle={1}>
          {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
        </Pie>
        <Tooltip contentStyle={tipStyle} formatter={(v) => money(v)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function OccupancyBars({ data }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16 }}>
        <CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" {...axis} />
        <YAxis type="category" dataKey="title" width={150} {...axis} tickFormatter={(s) => (s.length > 22 ? `${s.slice(0, 21)}…` : s)} />
        <Tooltip contentStyle={tipStyle} formatter={(v, _n, p) => [`${v}% (${p.payload.signups}/${p.payload.capacity})`, 'Ocupação']} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
        <Bar dataKey="occupancy_pct" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}
