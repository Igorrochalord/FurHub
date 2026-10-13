import { CalendarDays, ClipboardList, LogOut, Menu, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Logo from '../../components/Logo'
import { cx } from '../../components/ui'
import { useAuth } from '../../lib/auth'

export default function OrgLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const items = user.role === 'admin'
    ? [{ to: '/org', label: 'Eventos', icon: CalendarDays, end: true }, { to: '/org/team', label: 'Equipe', icon: Users }]
    : [{ to: '/org', label: 'Meus turnos e eventos', icon: ClipboardList, end: true }]

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
            isActive ? 'bg-violet-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.07] bg-navy-950/60 p-5 backdrop-blur lg:flex">
        <Link to="/"><Logo /></Link>
        <p className="mb-6 mt-1 text-[11px] uppercase tracking-widest text-slate-500">{user.role === 'admin' ? 'Painel do organizador' : 'Equipe'}</p>
        {nav}
        <div className="mt-auto border-t border-white/[0.07] pt-4">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <button onClick={logout} className="btn-ghost mt-3 w-full"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-white/[0.07] bg-navy-950/60 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><Menu className="h-5 w-5" /></button>
        </header>
        {open && (
          <div className="fixed inset-0 z-40 bg-navy-950/90 p-5 lg:hidden">
            <div className="mb-6 flex items-center justify-between"><Logo />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X className="h-5 w-5" /></button></div>
            {nav}
            <button onClick={logout} className="btn-ghost mt-6 w-full"><LogOut className="h-4 w-4" /> Sair</button>
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8"><Outlet /></main>
      </div>
    </div>
  )
}
