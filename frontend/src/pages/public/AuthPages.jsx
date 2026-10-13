import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Logo from '../../components/Logo'
import { ErrorNote, Field, Input, Spinner, Tabs } from '../../components/ui'
import { homeFor, useAuth } from '../../lib/auth'

function Shell({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="card p-7">
          <h1 className="mb-5 font-display text-xl font-semibold text-white">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}

const DEMO = [['Organizadora', 'admin'], ['Voluntário', 'voluntario'], ['Artista', 'artista'], ['Participante', 'participante']]

export function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={loc.state?.from || homeFor(user)} replace />

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try { const u = await login(email, password); nav(loc.state?.from || homeFor(u), { replace: true }) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <Shell title="Entrar">
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-mail"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Senha"><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <ErrorNote error={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Entrar</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">Novo por aqui? <Link to="/cadastrar" state={loc.state} className="text-cyan-300 hover:underline">Criar conta</Link></p>
      {import.meta.env.VITE_SHOW_DEMO === 'true' && (
        <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <p className="mb-2 text-xs font-medium text-amber-200">Contas de DEMONSTRAÇÃO (dados fictícios)</p>
          <div className="flex flex-wrap gap-2">
            {DEMO.map(([label, u]) => (
              <button key={u} type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => { setEmail(`${u}@demo.example.com`); setPassword('Demo@12345') }}>{label}</button>
            ))}
          </div>
        </div>
      )}
    </Shell>
  )
}

export function Register() {
  const { user, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()
  const [kind, setKind] = useState(params.get('tipo') === 'organizador' ? 'organizer' : params.get('tipo') === 'artista' ? 'artist' : 'participant')
  const [f, setF] = useState({ name: '', email: '', password: '', organization_name: '', accept: false })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={loc.state?.from || homeFor(user)} replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    const body = { name: f.name, email: f.email, password: f.password, accept_privacy: f.accept, role: kind === 'artist' ? 'artist' : 'participant' }
    if (kind === 'organizer') body.organization_name = f.organization_name
    try { const u = await register(body, kind === 'organizer'); nav(kind === 'organizer' ? '/org' : loc.state?.from || homeFor(u), { replace: true }) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <Shell title="Criar conta">
      <Tabs value={kind} onChange={setKind} tabs={[{ id: 'participant', label: 'Participante' }, { id: 'artist', label: 'Artista / Vendedor' }, { id: 'organizer', label: 'Organizador' }]} />
      <form onSubmit={submit} className="mt-5 space-y-4">
        {kind === 'organizer' && <Field label="Nome da organização"><Input required value={f.organization_name} onChange={set('organization_name')} /></Field>}
        <Field label="Seu nome"><Input required value={f.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="E-mail"><Input type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres"><Input type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={f.accept} onChange={set('accept')} required />
          <span>Li e aceito a <Link to="/privacidade" target="_blank" className="text-cyan-300 hover:underline">política de privacidade</Link>.</span>
        </label>
        <ErrorNote error={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Criar conta</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">Já tem conta? <Link to="/entrar" state={loc.state} className="text-cyan-300 hover:underline">Entrar</Link></p>
    </Shell>
  )
}
