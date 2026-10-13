import { CalendarPlus, Copy, Crown, ExternalLink, Globe, MapPin, Navigation, ShieldAlert, Share2, ShoppingCart, Ticket } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Banner, StatusBadge, placeLabel } from '../../components/public/EventCard'
import EventsMap from '../../components/public/EventsMap'
import EventMap, { MapLegend } from '../../components/EventMap'
import { Badge, Card, DemoBadge, Empty, Field, FormModal, Input, Loading, Modal, Select, Tabs, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { AGE, CATEGORIES, MODES } from '../../lib/events'
import { dayKey, fmtDateLong, fmtRange, fmtTime, money } from '../../lib/format'
import { navLinks } from '../../lib/maps'
import { usePublic } from '../../lib/useEvents'
import { usePageMeta } from '../../lib/useMeta'

const ymd = (s) => s.replaceAll('-', '')
const nextDay = (s) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + 1); return ymd(d.toISOString().slice(0, 10)) }

function Overview({ ev }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <h2 className="font-display text-xl font-bold text-white">Sobre o evento</h2>
        <p className="mt-3 whitespace-pre-wrap text-slate-300">{ev.description || 'A organização ainda não publicou uma descrição.'}</p>
        {ev.is_demo && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">Evento de demonstração: nenhum dado aqui é real e nenhum pagamento é processado.</p>}
      </div>
      <Card>
        <dl className="space-y-3 text-sm">
          {[['Organização', ev.organization], ['Categoria', CATEGORIES[ev.category]?.label], ['Formato', MODES[ev.attendance_mode]],
            ['Classificação indicativa', AGE[ev.age_rating]], ['Capacidade', ev.capacity && `${ev.capacity} pessoas`], ['Fuso horário', ev.timezone]]
            .filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="text-right text-slate-200">{v}</dd></div>)}
        </dl>
      </Card>
    </div>
  )
}

function Schedule({ ev, user }) {
  const days = useMemo(() => {
    const m = {}
    ev.schedule.forEach((s) => (m[dayKey(s.starts_at)] ||= []).push(s))
    return Object.entries(m)
  }, [ev.schedule])
  return (
    <div className="space-y-8">
      {days.map(([d, items]) => (
        <div key={d}>
          <h3 className="mb-3 font-display font-bold capitalize text-white">{fmtDateLong(d)}</h3>
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.id} className="card flex gap-4 p-4">
                <p className="w-24 shrink-0 font-display text-sm font-bold text-cyan-300">{fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}</p>
                <div><p className="font-semibold text-white">{s.title}</p>
                  <p className="text-sm text-slate-400">{[s.room, s.speaker].filter(Boolean).join(' · ')}</p>
                  {s.spots_left != null && <Badge tone={s.spots_left ? 'cyan' : 'red'}>{s.spots_left ? `${s.spots_left} vagas` : 'Lotado'}</Badge>}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-sm text-slate-500">{user ? <Link to={`/app/events/${ev.id}`} className="text-cyan-300 hover:underline">Abrir minha agenda deste evento →</Link> : <>Para favoritar atividades e se inscrever em workshops, <Link to="/entrar" className="text-cyan-300 hover:underline">entre na sua conta</Link>.</>}</p>
    </div>
  )
}

function Location({ ev }) {
  const toast = useToast()
  const links = navLinks(ev)
  const exact = ev.location_visibility === 'public' && ev.attendance_mode !== 'online'
  const copy = async () => { try { await navigator.clipboard.writeText(links.text); toast('Endereço copiado') } catch { toast('Não foi possível copiar', 'err') } }
  if (ev.attendance_mode === 'online') return <p className="text-slate-300">Este é um evento online. O acesso é liberado pela organização aos participantes inscritos.</p>
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        <dl className="space-y-2 text-sm text-slate-300">
          {ev.venue && <div><dt className="text-xs uppercase text-slate-500">Local</dt><dd className="text-base font-semibold text-white">{ev.venue}</dd></div>}
          {exact && ev.address && <div><dt className="text-xs uppercase text-slate-500">Endereço</dt><dd>{ev.address}{ev.district && `, ${ev.district}`}{ev.postal_code && ` · CEP ${ev.postal_code}`}</dd></div>}
          <div><dt className="text-xs uppercase text-slate-500">Cidade</dt><dd>{placeLabel(ev)}</dd></div>
        </dl>
        {!exact && <p className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 text-sm text-violet-200">A organização optou por não divulgar o endereço exato por enquanto. Ele será informado aos participantes.</p>}
        {exact && (
          <div className="flex flex-wrap gap-2">
            <a className="btn-primary" href={links.google} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" />Google Maps</a>
            <a className="btn-ghost" href={links.osm} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />OpenStreetMap</a>
            <a className="btn-ghost" href={links.waze} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Waze</a>
            <button className="btn-ghost" onClick={copy}><Copy className="h-4 w-4" />Copiar endereço</button>
          </div>
        )}
        {exact && <p className="text-xs text-slate-500">As rotas abrem no aplicativo escolhido; a FurCon Hub não calcula tempo de percurso.</p>}
      </div>
      {ev.latitude != null && <div className="card overflow-hidden"><EventsMap compact className="h-80" items={[ev]} /></div>}
    </div>
  )
}

function Tickets({ ev, onBuy }) {
  if (!ev.ticket_types.length) return <Empty icon={Ticket} title="Ingressos ainda não disponíveis" text="A organização ainda não abriu as vendas." />
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ev.ticket_types.map((t) => (
        <Card key={t.id} className={t.is_vip ? 'border-violet-400/40' : ''}>
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="font-display font-bold text-white">{t.name} {t.is_vip && <Crown className="inline h-4 w-4 text-violet-300" />}</h3><p className="text-sm text-slate-400">{t.description}</p></div>
            <p className="font-display text-xl font-extrabold text-white">{t.price_cents ? money(t.price_cents) : 'Grátis'}</p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            {t.left > 0 ? <Badge tone={t.left < 20 ? 'amber' : 'cyan'}>{t.left} restantes</Badge> : <Badge tone="red">Esgotado</Badge>}
            <button className="btn-primary" disabled={!t.purchasable} onClick={() => onBuy(t)}><ShoppingCart className="h-4 w-4" />Comprar</button>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function EventDetails() {
  const { slug } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  const { data: ev, loading, error, reload } = usePublic(`/events/${encodeURIComponent(slug)}`)
  const [tab, setTab] = useState('overview')
  const [buy, setBuy] = useState(null)
  const [badge, setBadge] = useState('')
  const [method, setMethod] = useState('pix')
  const [choose, setChoose] = useState(null) // ingresso escolhido por quem não está logado
  const [guest, setGuest] = useState(null)
  const [gf, setGf] = useState({ email: '', badge: '', accept: false })

  const jsonLd = ev && ev.indexable ? {
    '@context': 'https://schema.org', '@type': 'Event', name: ev.name, startDate: ev.start_date, endDate: ev.end_date, description: ev.description?.slice(0, 300),
    eventAttendanceMode: ev.attendance_mode === 'online' ? 'https://schema.org/OnlineEventAttendanceMode' : ev.attendance_mode === 'hybrid' ? 'https://schema.org/MixedEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled', organizer: { '@type': 'Organization', name: ev.organization },
    ...(ev.attendance_mode !== 'online' && ev.venue ? { location: { '@type': 'Place', name: ev.venue, address: { '@type': 'PostalAddress', streetAddress: ev.address, addressLocality: ev.city, addressRegion: ev.state, addressCountry: ev.country } } } : {}),
    ...(ev.banner_url ? { image: ev.banner_url } : {}),
  } : undefined
  usePageMeta({ title: ev?.name || 'Evento', description: ev ? `${ev.name} — ${fmtRange(ev.start_date, ev.end_date)} · ${placeLabel(ev)}. ${ev.description?.slice(0, 120) || ''}` : undefined, image: ev?.banner_url || undefined, noindex: ev ? !ev.indexable : false, jsonLd })

  const sections = useMemo(() => {
    if (!ev) return []
    const s = ev.sections
    return [['overview', 'Visão Geral'], s.schedule && ['schedule', 'Programação'], s.tickets && ['tickets', 'Ingressos'], ['location', 'Localização'],
      s.map && ['map', 'Mapa do Evento'], s.artists && ['artists', 'Artistas'], s.dealers && ['dealers', 'Comerciantes'], s.parade && ['parade', 'Fursuit Parade']].filter(Boolean)
  }, [ev])
  useEffect(() => { if (ev && loc.hash === '#ingressos' && ev.sections.tickets) setTab('tickets') }, [ev, loc.hash])

  if (loading) return <Loading />
  if (error) return <div className="mx-auto max-w-xl px-4 py-20"><Empty icon={MapPin} title="Evento não encontrado" text="O link pode estar incorreto ou o evento não está mais publicado." action={<Link to="/eventos" className="btn-primary">Explorar eventos</Link>} /></div>

  const share = async () => {
    const url = window.location.href
    try { if (navigator.share) await navigator.share({ title: ev.name, url }); else { await navigator.clipboard.writeText(url); toast('Link copiado') } } catch { /* cancelado */ }
  }
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.name)}&dates=${ymd(ev.start_date)}/${nextDay(ev.end_date)}&location=${encodeURIComponent(navLinks(ev).text)}&details=${encodeURIComponent(window.location.href)}`
  const start = (t) => {
    if (!user) return setChoose(t)
    if (user.role !== 'participant' && user.role !== 'artist') return toast('Contas de equipe não compram ingressos. Use uma conta de participante.', 'err')
    setBuy(t); setBadge('')
  }
  const purchase = async () => {
    await api.post(`/events/${ev.id}/purchase`, { ticket_type_id: buy.id, badge_name: badge, payment_method: method })
    reload(); nav('/app/tickets')
  }
  const guestBuy = async () => {
    const r = await api.post(`/v1/public/events/${ev.slug}/guest-checkout`, { ticket_type_id: guest.id, badge_name: gf.badge, email: gf.email, payment_method: method, accept_privacy: gf.accept })
    nav(r.access_path)
  }
  const people = (kind) => ev.artists.filter((a) => a.kind === kind)
  const cancelled = ev.status === 'cancelled'

  return (
    <>
      <div className="relative">
        <Banner ev={ev} className="h-56 sm:h-72 lg:h-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/50 to-transparent" />
      </div>
      <div className="mx-auto -mt-24 max-w-6xl px-4 pb-6">
        <div className="relative flex flex-wrap items-center gap-2"><StatusBadge status={ev.status} />{ev.is_demo && <DemoBadge />}
          <Badge tone="slate"><Globe className="h-3 w-3" />{MODES[ev.attendance_mode]}</Badge><Badge tone="slate"><ShieldAlert className="h-3 w-3" />{AGE[ev.age_rating]}</Badge></div>
        <h1 className="relative mt-3 font-display text-3xl font-extrabold text-white sm:text-5xl">{ev.name}</h1>
        <p className="mt-2 text-slate-400">por <span className="text-slate-200">{ev.organization}</span></p>
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-300">
          <span>{fmtRange(ev.start_date, ev.end_date)}</span><span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{placeLabel(ev)}{ev.venue && ` · ${ev.venue}`}</span>
        </p>
        {ev.preview && <p role="status" className="mt-4 rounded-xl border border-violet-400/30 bg-violet-400/10 p-3 text-sm text-violet-200">Pré-visualização privada: este evento ainda é um rascunho e só a sua equipe pode ver esta página.</p>}
        {cancelled && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">Este evento foi cancelado pela organização. A venda de ingressos está encerrada.</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {ev.sections.tickets && !cancelled && <button className="btn-primary" onClick={() => { setTab('tickets'); document.getElementById('abas')?.scrollIntoView({ behavior: 'smooth' }) }}><Ticket className="h-4 w-4" />Ingressos</button>}
          <button className="btn-ghost" onClick={share}><Share2 className="h-4 w-4" />Compartilhar</button>
          <a className="btn-ghost" href={`/api/v1/public/events/${ev.slug}/calendar.ics`}><CalendarPlus className="h-4 w-4" />Arquivo .ics</a>
          <a className="btn-ghost" href={gcal} target="_blank" rel="noreferrer"><CalendarPlus className="h-4 w-4" />Google Agenda</a>
        </div>

        <div id="abas" className="mt-10 scroll-mt-24 overflow-x-auto"><Tabs value={tab} onChange={setTab} tabs={sections.map(([id, label]) => ({ id, label }))} /></div>
        <div className="mt-6">
          {tab === 'overview' && <Overview ev={ev} />}
          {tab === 'schedule' && <Schedule ev={ev} user={user} />}
          {tab === 'tickets' && <Tickets ev={ev} onBuy={start} />}
          {tab === 'location' && <Location ev={ev} />}
          {tab === 'map' && <div><EventMap places={ev.places} /><MapLegend /></div>}
          {(tab === 'artists' || tab === 'dealers') && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {people(tab === 'artists' ? 'artist' : 'dealer').map((a) => (
                <li key={a.id} className="card p-4"><p className="font-display font-bold text-white">{a.display_name}</p><p className="mt-1 text-sm text-slate-400">{a.description}</p>
                  {a.table_label && <Badge tone="violet">Mesa {a.table_label}</Badge>}
                  {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noreferrer noopener" className="mt-2 block text-sm text-cyan-300 hover:underline">Portfólio ↗</a>}</li>
              ))}
            </ul>
          )}
          {tab === 'parade' && (
            <div className="space-y-4">
              {ev.schedule.filter((s) => s.kind === 'parade').map((s) => <Card key={s.id}><p className="font-semibold text-white">{s.title}</p><p className="text-sm text-slate-400">{fmtDateLong(s.starts_at)} · {fmtTime(s.starts_at)} · {s.room}</p></Card>)}
              {ev.care_guidelines && <Card><h3 className="font-display font-bold text-white">Fursuit Care</h3><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{ev.care_guidelines}</p></Card>}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!choose} onClose={() => setChoose(null)} title={`Comprar: ${choose?.name}`}>
        <p className="text-sm text-slate-300">Você pode comprar sem criar conta. O ingresso fica num link secreto que você deve guardar; com uma conta, ele fica salvo no seu perfil.</p>
        <div className="mt-5 grid gap-3">
          <button className="btn-primary py-3" onClick={() => { setGuest(choose); setChoose(null); setGf({ email: '', badge: '', accept: false }) }}>Continuar como convidado</button>
          <button className="btn-ghost py-3" onClick={() => nav('/entrar', { state: { from: `${loc.pathname}#ingressos` } })}>Entrar na minha conta</button>
          <button className="btn-ghost py-3" onClick={() => nav('/cadastrar', { state: { from: `${loc.pathname}#ingressos` } })}>Criar conta</button>
        </div>
      </Modal>
      <FormModal open={!!guest} onClose={() => setGuest(null)} title={`Compra como convidado: ${guest?.name}`} onSubmit={guestBuy} submitLabel={guest?.price_cents ? `Pagar ${money(guest.price_cents)}` : 'Confirmar inscrição'}>
        <Field label="E-mail" hint="Usado apenas para contato sobre este pedido."><Input type="email" required autoComplete="email" value={gf.email} onChange={(e) => setGf({ ...gf, email: e.target.value })} /></Field>
        <Field label="Nome no crachá" hint="Pode ser seu nome social ou o da sua fursona."><Input required maxLength={80} value={gf.badge} onChange={(e) => setGf({ ...gf, badge: e.target.value })} /></Field>
        {guest?.price_cents > 0 && <Field label="Forma de pagamento"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option value="pix">Pix</option><option value="card">Cartão</option></Select></Field>}
        <label className="flex items-start gap-2 text-sm text-slate-300"><input type="checkbox" className="mt-1" required checked={gf.accept} onChange={(e) => setGf({ ...gf, accept: e.target.checked })} />
          <span>Aceito a <Link to="/privacidade" target="_blank" className="text-cyan-300 hover:underline">política de privacidade</Link>.</span></label>
        {guest?.price_cents > 0 && <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">Ambiente de demonstração: o pagamento é simulado e nenhuma cobrança real é feita.</p>}
      </FormModal>
      <FormModal open={!!buy} onClose={() => setBuy(null)} title={`Comprar: ${buy?.name}`} onSubmit={purchase} submitLabel={buy?.price_cents ? `Pagar ${money(buy.price_cents)}` : 'Confirmar inscrição'}>
        <Field label="Nome no crachá" hint="Pode ser seu nome social ou o nome da sua fursona — é o único dado exibido no check-in."><Input required maxLength={80} value={badge} onChange={(e) => setBadge(e.target.value)} /></Field>
        {buy?.price_cents > 0 && (<>
          <Field label="Forma de pagamento"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option value="pix">Pix</option><option value="card">Cartão</option></Select></Field>
          <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">Ambiente de demonstração: o pagamento é simulado e nenhuma cobrança real é feita.</p>
        </>)}
      </FormModal>
    </>
  )
}
