import { CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, DemoBadge, Empty, Fade, Loading, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmtDate } from '../../lib/format'

function EventCard({ ev, to }) {
  return (
    <Link to={to}>
      <Card className="h-full transition hover:border-violet-400/40 hover:shadow-glow">
        {ev.is_demo && <div className="mb-2"><DemoBadge /></div>}
        <h3 className="font-display text-lg font-semibold text-white">{ev.name}</h3>
        <p className="mt-1 text-sm text-slate-400">{fmtDate(ev.start_date)} – {fmtDate(ev.end_date)}</p>
        {ev.city && <p className="mt-2 flex items-center gap-1 text-sm text-slate-400"><MapPin className="h-4 w-4" />{ev.city}</p>}
      </Card>
    </Link>
  )
}

export default function PortalHome() {
  const { user } = useAuth()
  const mine = useLoad(() => api.get('/me/events'))
  const all = useLoad(() => api.get('/events'))
  const mineIds = new Set(mine.data?.map((e) => e.id))
  return (
    <Fade className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">Olá, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-400">Seus eventos, ingressos e programação em um só lugar.</p>
      </div>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-white">Meus eventos</h2>
        {mine.loading ? <Loading /> : mine.data.length === 0 ? (
          <Empty icon={CalendarDays} title="Você ainda não tem eventos" text="Compre um ingresso para liberar programação personalizada, mapa, passaporte e Fursuit Care." action={<Link to="/events" className="btn-primary">Ver eventos</Link>} />
        ) : <div className="grid gap-4 sm:grid-cols-2">{mine.data.map((ev) => <EventCard key={ev.id} ev={ev} to={`/app/events/${ev.id}`} />)}</div>}
      </section>
      {!all.loading && all.data.some((e) => !mineIds.has(e.id)) && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-white">Descobrir eventos</h2>
          <div className="grid gap-4 sm:grid-cols-2">{all.data.filter((e) => !mineIds.has(e.id)).map((ev) => <EventCard key={ev.id} ev={ev} to={`/events/${ev.id}`} />)}</div>
        </section>
      )}
    </Fade>
  )
}
