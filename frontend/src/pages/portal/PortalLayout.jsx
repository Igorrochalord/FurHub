import { Bell, CalendarDays, LogOut, PawPrint, Palette, ShieldCheck, Ticket } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Logo from '../../components/Logo'
import { cx, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function PortalLayout() {
  const { user, logout } = useAuth()
  const { data: notes, reload } = useLoad(() => api.get('/me/notifications'))
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t) }, [reload])
  const unread = notes?.filter((n) => !n.read).length || 0

  const items = [
    ['/app', 'Início', CalendarDays, true], ['/app/tickets', 'Ingressos', Ticket], ['/app/fursona', 'Fursona', PawPrint],
    ...(user.role === 'artist' ? [['/app/artist', 'Artista', Palette]] : []),
    ['/app/data', 'Meus dados', ShieldCheck],
  ]
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-navy-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/app"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map(([to, label, Icon, end]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium', isActive ? 'bg-violet-500/15 text-white' : 'text-slate-400 hover:text-white')}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link to="/app/notifications" aria-label={`Notificações${unread ? ` (${unread} novas)` : ''}`} className="relative rounded-xl p-2 text-slate-300 hover:bg-white/10">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-navy-950">{unread}</span>}
            </Link>
            <button onClick={logout} aria-label="Sair" className="rounded-xl p-2 text-slate-300 hover:bg-white/10"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8"><Outlet context={{ reloadNotes: reload }} /></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/[0.07] bg-navy-950/90 py-2 backdrop-blur md:hidden" aria-label="Navegação principal">
        {items.map(([to, label, Icon, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 px-3 text-[11px]', isActive ? 'text-cyan-300' : 'text-slate-500')}>
            <Icon className="h-5 w-5" />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
