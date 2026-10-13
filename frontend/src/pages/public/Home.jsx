import { motion } from 'framer-motion'
import { BarChart3, CalendarDays, HeartPulse, Map as MapIcon, Palette, Ticket, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EventCard, { CardSkeleton } from '../../components/public/EventCard'
import EventsMap from '../../components/public/EventsMap'
import HeroArt from '../../components/public/HeroArt'
import SearchBar from '../../components/public/SearchBar'
import { Empty } from '../../components/ui'
import { REGIONS, qs } from '../../lib/events'
import { useT } from '../../lib/i18n'
import { askLocation } from '../../lib/maps'
import { usePublic } from '../../lib/useEvents'
import { usePageMeta } from '../../lib/useMeta'

const EMPTY_F = { q: '', where: '', when: '', from: '', to: '', category: '', mode: '', free: '', open: '', lat: '', lon: '', radius: '', sort: '' }
const FEATURES = [[Ticket, 'Ingressos'], [Users, 'Check-in'], [CalendarDays, 'Programação'], [Palette, 'Artist Alley'], [HeartPulse, 'Fursuit Care'], [Users, 'Voluntários'], [Wallet, 'Financeiro'], [BarChart3, 'Relatórios']]
const TABS = [['featured', 'Convenções em destaque'], ['newest', 'Recém-anunciados'], ['popular', 'Mais procurados'], ['free', 'Gratuitos'], ['online', 'Online'], ['artist_fairs', 'Feiras de artistas'], ['open_sales', 'Inscrições abertas']]

function Section({ title, action, children, id }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 pt-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{title}</h2>{action}
      </div>
      {children}
    </section>
  )
}

function Grid({ items, loading, error, empty, reload }) {
  if (loading) return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
  if (error) return <Empty icon={CalendarDays} title="Não foi possível carregar os eventos" text={error} action={<button className="btn-ghost" onClick={reload}>Tentar de novo</button>} />
  if (!items?.length) return empty
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((e) => <EventCard key={e.id} ev={e} />)}</div>
}

export default function Home() {
  const { t } = useT()
  const nav = useNavigate()
  usePageMeta({})
  const [msg, setMsg] = useState('')
  const upcoming = usePublic('/events', { limit: 6 })
  const hl = usePublic('/highlights')
  const [tab, setTab] = useState('featured')
  const [region, setRegion] = useState(REGIONS.find((r) => r.label.startsWith('Brasília')))
  const [located, setLocated] = useState(false)
  const nearby = usePublic('/events/nearby', { latitude: region.lat, longitude: region.lon, radius_km: 500, limit: 6 })
  const markers = usePublic('/events/map', { limit: 200 })

  const go = (f) => nav(`/eventos?${qs({ ...f })}`)
  const locate = async () => {
    setMsg('')
    try { const p = await askLocation(); setRegion({ label: 'Sua localização (aprox.)', lat: p.lat, lon: p.lon }); setLocated(true) }
    catch (e) { setMsg(e.message) }
  }
  const emptyAll = (
    <Empty icon={CalendarDays} title="Nenhum evento publicado ainda" text="Seja a primeira organização a divulgar um evento furry na plataforma."
      action={<Link to="/cadastrar?tipo=organizador" state={{ from: '/org' }} className="btn-primary">{t('hero.promote')}</Link>} />
  )
  const nb = nearby.data?.items || []
  const sameCity = nb.filter((e) => region.label.toLowerCase().startsWith((e.city || '~').toLowerCase()))
  const rest = nb.filter((e) => !sameCity.includes(e))

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-10 pt-12 lg:grid-cols-[1.15fr_.85fr] lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">Convenções · Meetups · Festivais</span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              <span className="hero-title">{t('hero.title')}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-400">{t('hero.sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/eventos" className="btn-primary px-6 py-3">{t('hero.explore')}</Link>
              <Link to="/mapa" className="btn-ghost px-6 py-3"><MapIcon className="h-4 w-4" />{t('hero.map')}</Link>
              <Link to="/para-organizadores" className="btn-ghost px-6 py-3">{t('hero.promote')}</Link>
            </div>
          </motion.div>
          <HeroArt className="hidden lg:block" />
        </div>
        <div className="mx-auto max-w-7xl px-4"><SearchBar filters={EMPTY_F} onApply={go} onError={setMsg} />
          {msg && <p role="alert" className="mt-2 text-sm text-amber-300">{msg}</p>}</div>
      </section>

      <Section title={t('sections.upcoming')} action={<Link to="/eventos" className="text-sm font-semibold text-cyan-300 hover:underline">{t('common.seeAll')} →</Link>}>
        <Grid {...upcoming} items={upcoming.data?.items} empty={emptyAll} />
      </Section>

      <Section title={t('sections.nearby')} id="perto">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-400">Região de referência{' '}
            <select className="input !inline-block !w-auto" value={located ? '' : region.label} onChange={(e) => { setLocated(false); setRegion(REGIONS.find((r) => r.label === e.target.value)) }}>
              {located && <option value="">Sua localização (aprox.)</option>}
              {REGIONS.map((r) => <option key={r.label}>{r.label}</option>)}
            </select></label>
          <button className="btn-ghost" onClick={locate}>{t('search.mylocation')}</button>
          <Link to={`/mapa?${qs({ lat: region.lat, lon: region.lon, radius: 500, sort: 'distance' })}`} className="btn-ghost">Visualizar todos no mapa</Link>
        </div>
        <p className="mb-4 text-xs text-slate-500">Distâncias aproximadas em linha reta, não de rota. Sua localização só é usada após você clicar no botão e não é armazenada.</p>
        {nearby.loading ? <Grid loading /> : nb.length === 0 ? (
          <Empty icon={MapIcon} title="Nenhum evento em até 500 km" text="Tente outra região ou veja todos os eventos." action={<Link to="/eventos" className="btn-ghost">Ver todos</Link>} />
        ) : (<>
          {sameCity.length > 0 && <><h3 className="mb-3 font-display font-bold text-white">Na cidade selecionada</h3><div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{sameCity.map((e) => <EventCard key={e.id} ev={e} />)}</div></>}
          {rest.length > 0 && <><h3 className="mb-3 font-display font-bold text-white">Em regiões próximas (por distância)</h3><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rest.map((e) => <EventCard key={e.id} ev={e} />)}</div></>}
        </>)}
      </Section>

      <Section title={t('sections.featured')}>
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${tab === k ? 'border-violet-400/60 bg-violet-500/20 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>{label}</button>
          ))}
        </div>
        <Grid {...hl} items={hl.data?.[tab]} empty={<Empty icon={CalendarDays} title="Nada por aqui ainda" text={tab === 'popular' ? 'Esta seção usa o número de ingressos emitidos (métrica real) e aparece quando houver vendas.' : 'Nenhum evento nesta seção no momento.'} />} />
      </Section>

      <Section title={t('sections.map')} action={<Link to="/mapa" className="btn-primary">{t('common.openMap')}</Link>}>
        <div className="card overflow-hidden">
          {markers.loading ? <div className="h-[420px] animate-pulse bg-white/5" /> : (
            <EventsMap compact className="h-[420px]" items={markers.data?.items || []} />
          )}
        </div>
        {!markers.loading && !markers.data?.items?.length && <p className="mt-3 text-sm text-slate-500">Ainda não há eventos presenciais com localização pública.</p>}
      </Section>

      <Section title={t('sections.organizers')}>
        <div className="card relative overflow-hidden p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-slate-400">Venda ingressos, faça o check-in por QR Code, monte a programação, receba artistas e acompanhe tudo em um painel.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/para-organizadores" className="btn-primary">Conhecer a Plataforma</Link>
                <Link to="/planos" className="btn-ghost">Ver planos</Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">Como começar: crie sua conta de organizador → cadastre a organização → crie o evento em rascunho → solicite a publicação.</p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FEATURES.map(([Icon, label]) => (
                <li key={label} className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center text-sm text-slate-200">
                  <Icon className="h-6 w-6 text-violet-300" />{label}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  )
}

