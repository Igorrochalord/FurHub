import { Eye, EyeOff } from 'lucide-react'
import { createContext, useContext } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { Badge, ConfirmButton, DemoBadge, Loading, cx, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

const Ctx = createContext(null)
export const useEvent = () => useContext(Ctx)

const TABS = [
  ['', 'Dashboard', true], ['tickets', 'Ingressos'], ['attendees', 'Participantes'], ['checkin', 'Check-in'], ['schedule', 'Programação'],
  ['artists', 'Artistas'], ['volunteers', 'Voluntários'], ['finance', 'Financeiro'], ['announcements', 'Comunicados'], ['map', 'Mapa'],
  ['care', 'Fursuit Care'], ['passport', 'Passaporte'], ['reports', 'Relatórios'], ['settings', 'Configurações'],
]
const VOLUNTEER_TABS = ['checkin', 'care']

export default function EventWorkspace() {
  const { id } = useParams()
  const { user } = useAuth()
  const act = useAct()
  const { pathname } = useLocation()
  const { data: ev, loading, error, reload } = useLoad(() => api.get(`/org/events/${id}`), [id])
  if (loading && !ev) return <Loading />
  if (error) return <p className="text-rose-300">{error}</p>

  const restricted = user.role !== 'admin' && !VOLUNTEER_TABS.some((p) => pathname.endsWith(`/${p}`))
  const tabs = user.role === 'admin' ? TABS : TABS.filter(([p]) => VOLUNTEER_TABS.includes(p))
  const toggle = () =>
    act(async () => { await api.post(`/org/events/${id}/status`, { status: ev.status === 'published' ? 'draft' : 'published' }); await reload() },
      ev.status === 'published' ? 'Evento despublicado' : 'Evento publicado!')

  return (
    <Ctx.Provider value={{ ev, reload, id }}>
      <div className="mb-6">
        <Link to="/org" className="text-xs text-slate-500 hover:text-cyan-300">← Eventos</Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-white">{ev.name}</h1>
            <Badge tone={ev.status === 'published' ? 'green' : ev.status === 'cancelled' ? 'red' : 'slate'}>{ev.status === 'published' ? 'Publicado' : ev.status === 'cancelled' ? 'Cancelado' : 'Rascunho'}</Badge>
            {ev.is_demo && <DemoBadge />}
          </div>
          {user.role === 'admin' && (
            <div className="flex gap-2">
              <Link className="btn-ghost" to={`/eventos/${ev.slug}`} target="_blank"><Eye className="h-4 w-4" /> {ev.status === 'draft' ? 'Pré-visualizar' : 'Página pública'}</Link>
              {ev.status === 'published' && <ConfirmButton label="Cancelar o evento?" onConfirm={() => act(async () => { await api.post(`/org/events/${id}/status`, { status: 'cancelled' }); await reload() }, 'Evento cancelado')}>Cancelar evento</ConfirmButton>}
              <button className="btn-ghost" onClick={toggle}>{ev.status === 'published' ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}</button>
            </div>
          )}
        </div>
        <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-white/[0.07] pb-px" aria-label="Seções do evento">
          {tabs.map(([path, label, end]) => (
            <NavLink key={path} to={`/org/events/${id}/${path}`} end={end || path === ''}
              className={({ isActive }) => cx('whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
                isActive ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-white')}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      {restricted ? <Navigate to={`/org/events/${id}/checkin`} replace /> : <Outlet />}
    </Ctx.Provider>
  )
}
