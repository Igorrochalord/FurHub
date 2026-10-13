import { CalendarDays, Compass, Globe, Home, Info, Map as MapIcon, Menu, Monitor, Moon, PawPrint, Plus, Presentation, Palette, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { homeFor, useAuth } from '../../lib/auth'
import { LANGS, useT } from '../../lib/i18n'
import { useTheme } from '../../lib/theme'
import Logo from '../Logo'
import { cx } from '../ui'

const LINKS = [
  ['/', 'nav.home', Home, true], ['/eventos', 'nav.events', Compass], ['/mapa', 'nav.map', MapIcon], ['/calendario', 'nav.calendar', CalendarDays],
  ['/artistas', 'nav.artists', Palette], ['/sobre', 'nav.about', Info], ['/para-organizadores', 'nav.organizers', Presentation],
]

function LangSelect({ className = '' }) {
  const { lang, setLang, t } = useT()
  return (
    <label className={cx('relative inline-flex items-center', className)}>
      <span className="sr-only">{t('nav.language')}</span>
      <Globe className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-400" />
      <select value={lang} onChange={(e) => setLang(e.target.value)} className="appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-8 pr-3 text-sm text-slate-200 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">
        {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k} className="bg-navy-800">{k.toUpperCase()} · {v}</option>)}
      </select>
    </label>
  )
}

const THEMES = { system: ['Sistema', Monitor], light: ['Claro', Sun], dark: ['Escuro', Moon] }
function ThemeSelect({ className = '' }) {
  const { mode, setMode } = useTheme()
  const next = { system: 'light', light: 'dark', dark: 'system' }[mode]
  const [label, Icon] = THEMES[mode]
  return (
    <button type="button" onClick={() => setMode(next)} title={`Tema: ${label} (clique para alternar)`} aria-label={`Tema: ${label}. Alternar tema`}
      className={cx('inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70', className)}>
      <Icon className="h-4 w-4" /><span className="xl:sr-only">{label}</span>
    </button>
  )
}

function useCreateTarget() {
  const { user } = useAuth()
  if (user?.role === 'admin') return { to: '/org' }
  if (user) return { to: '/para-organizadores' }
  return { to: '/cadastrar?tipo=organizador', state: { from: '/org' } } // intenção preservada após cadastro/login
}

export function Navbar() {
  const { t } = useT()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const create = useCreateTarget()
  useEffect(() => setOpen(false), [loc.pathname])

  const link = ([to, key, , end]) => (
    <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-violet-500/20 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>{t(key)}</NavLink>
  )
  return (
    <header className="sticky top-0 z-[1000] border-b border-white/[0.07] bg-navy-900/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link to="/" aria-label="FurCon Hub — início" className="shrink-0"><Logo /></Link>
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Principal">{LINKS.map(link)}</nav>
        <div className="hidden items-center gap-2 whitespace-nowrap lg:flex">
          <LangSelect />
          <ThemeSelect />
          {user ? <Link to={homeFor(user)} className="btn-ghost">{t('nav.account')}</Link> : (<>
            <Link to="/entrar" className="btn-ghost">{t('nav.login')}</Link>
            <Link to="/cadastrar" className="btn-ghost">{t('nav.signup')}</Link>
          </>)}
          <Link {...create} className="btn-primary"><Plus className="h-4 w-4" />{t('nav.create')}</Link>
        </div>
        <button className="rounded-lg p-2 text-slate-200 hover:bg-white/10 lg:hidden" aria-label={open ? t('nav.close') : t('nav.menu')} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {/* telas médias: links secundários em linha */}
      <nav className="hidden items-center gap-0.5 overflow-x-auto border-t border-white/[0.05] px-4 py-1 lg:flex xl:hidden" aria-label="Principal">{LINKS.map(link)}</nav>
      {open && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-white/[0.07] bg-navy-900 px-4 pb-6 pt-3 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Principal">
            {LINKS.map(([to, key, Icon, end]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium', isActive ? 'bg-violet-500/20 text-white' : 'text-slate-300')}>
                <Icon className="h-5 w-5" />{t(key)}</NavLink>
            ))}
          </nav>
          <div className="mt-4 grid gap-2">
            {user ? <Link to={homeFor(user)} className="btn-ghost py-3">{t('nav.account')}</Link> : (<>
              <Link to="/entrar" className="btn-ghost py-3">{t('nav.login')}</Link>
              <Link to="/cadastrar" className="btn-ghost py-3">{t('nav.signup')}</Link>
            </>)}
            <Link {...create} className="btn-primary py-3"><Plus className="h-4 w-4" />{t('nav.create')}</Link>
            <LangSelect className="justify-center" />
            <ThemeSelect className="justify-center" />
          </div>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  const { t, setLang, lang } = useT()
  const create = useCreateTarget()
  const col = (title, items) => (
    <div><h3 className="font-display text-sm font-bold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-400">{items.map(([to, label, extra]) => <li key={label}><Link to={to} {...extra} className="hover:text-cyan-300">{label}</Link></li>)}</ul></div>
  )
  return (
    <footer className="mt-20 border-t border-white/[0.07] bg-navy-950/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-slate-400">Descubra, divulgue e organize convenções e encontros da comunidade furry — em um só lugar.</p>
        </div>
        {col(t('footer.events'), [['/eventos', t('nav.events')], ['/mapa', t('nav.map')], ['/calendario', t('nav.calendar')], ['/artistas', t('nav.artists')]])}
        {col(t('nav.organizers'), [[create.to, t('footer.create'), { state: create.state }], ['/para-organizadores', t('nav.organizers')], ['/planos', 'Planos e preços']])}
        {col('FurCon Hub', [['/sobre', t('footer.about')], ['/ajuda', t('footer.help')], ['/contato', 'Contato'], ['/termos', 'Termos de Uso'], ['/privacidade', t('footer.privacy')]])}
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500">
          <p><PawPrint className="mr-1 inline h-3.5 w-3.5" />{t('footer.rights')}</p>
          <p className="flex items-center gap-2">{t('footer.languages')}:
            {Object.entries(LANGS).map(([k, v]) => <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={cx('rounded px-1.5 py-0.5 hover:text-cyan-300', lang === k && 'bg-white/10 text-white')}>{v}</button>)}</p>
        </div>
      </div>
    </footer>
  )
}

export default function PublicLayout({ bare = false }) {
  const { pathname } = useLocation()
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only z-[2000] rounded bg-violet-600 px-3 py-2 text-white focus:not-sr-only focus:absolute focus:left-2 focus:top-2">Pular para o conteúdo</a>
      <Navbar />
      <main id="conteudo" className="flex-1"><Outlet /></main>
      {!bare && <Footer />}
    </div>
  )
}
