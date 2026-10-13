import { AlertCircle, Bookmark, BookmarkCheck, CalendarDays, Check, ExternalLink, HeartPulse, LifeBuoy, MapPin, Palette, Trophy, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import EventMap, { MapLegend, PLACE_ICON } from '../../components/EventMap'
import { Badge, Card, DemoBadge, Empty, ErrorNote, Fade, Field, FormModal, Input, Loading, Select, Tabs, cx, useAct, useLoad, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { CARE_LABEL, dayKey, fmtDateLong, fmtStamp, fmtTime, KIND_LABEL, PLACE_LABEL } from '../../lib/format'
import { groupByDay } from '../org/ScheduleAdmin'
import { CAT } from '../org/PassportAdmin'

export default function EventHub() {
  const { id } = useParams()
  const [tab, setTab] = useState('schedule')
  const { data, loading, error } = useLoad(() => api.get(`/events/${id}`), [id])
  if (loading) return <Loading />
  if (error) return <p className="text-rose-300">{error}</p>
  const ev = data.event
  return (
    <Fade className="space-y-6">
      <div>
        {ev.is_demo && <div className="mb-2"><DemoBadge /></div>}
        <h1 className="font-display text-2xl font-semibold text-white">{ev.name}</h1>
        <p className="text-sm text-slate-400">{[ev.venue, ev.city].filter(Boolean).join(', ')}</p>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'schedule', label: 'Programação' }, { id: 'map', label: 'Mapa' }, { id: 'artists', label: 'Artistas' },
        { id: 'care', label: 'Fursuit Care' }, { id: 'passport', label: 'Passaporte' }]} />
      {tab === 'schedule' && <Schedule id={id} />}
      {tab === 'map' && <MapTab id={id} />}
      {tab === 'artists' && <Artists id={id} />}
      {tab === 'care' && <Care id={id} />}
      {tab === 'passport' && <Passport id={id} />}
    </Fade>
  )
}

function Schedule({ id }) {
  const act = useAct()
  const [onlyMine, setOnlyMine] = useState(false)
  const { data, loading, reload } = useLoad(() => api.get(`/events/${id}/schedule`), [id])
  if (loading) return <Loading />
  const items = onlyMine ? data.filter((i) => i.favorited || i.signed_up) : data
  const base = (i) => `/events/${id}/schedule/${i.id}`
  return (
    <div className="space-y-6">
      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Mostrar só minha programação (favoritos e inscrições)</label>
      {items.length === 0 ? <Empty icon={CalendarDays} title={onlyMine ? 'Você ainda não favoritou nada' : 'Programação ainda não divulgada'} /> :
        groupByDay(items).map(([day, list]) => (
          <section key={day}>
            <h2 className="mb-3 font-display text-sm font-semibold capitalize text-cyan-300">{fmtDateLong(day)}</h2>
            <div className="space-y-2">
              {list.map((i) => (
                <div key={i.id} className="card flex flex-wrap items-center gap-3 p-4">
                  <div className="w-24 shrink-0 text-sm font-medium text-white">{fmtTime(i.starts_at)}–{fmtTime(i.ends_at)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{i.title}</p>
                    <p className="text-xs text-slate-400">{[i.room, i.speaker].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Badge tone="violet">{KIND_LABEL[i.kind]}</Badge>
                  {i.capacity && (i.signed_up
                    ? <button className="btn-ghost !border-emerald-400/30 text-emerald-300" onClick={() => act(async () => { await api.del(`${base(i)}/signup`); reload() }, 'Inscrição cancelada')}><Check className="h-4 w-4" />Inscrito</button>
                    : <button className="btn-ghost" disabled={i.spots_left === 0} onClick={() => act(async () => { await api.post(`${base(i)}/signup`); reload() }, 'Inscrição confirmada')}><Users className="h-4 w-4" />{i.spots_left === 0 ? 'Lotado' : `Inscrever (${i.spots_left} vagas)`}</button>)}
                  <button aria-label={i.favorited ? 'Remover dos favoritos' : 'Favoritar'} aria-pressed={i.favorited}
                    className={cx('rounded-xl p-2 transition', i.favorited ? 'text-cyan-300' : 'text-slate-500 hover:text-white')}
                    onClick={() => act(async () => { i.favorited ? await api.del(`${base(i)}/favorite`) : await api.post(`${base(i)}/favorite`); reload() })}>
                    {i.favorited ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

function MapTab({ id }) {
  const { data, loading } = useLoad(() => api.get(`/events/${id}/places`), [id])
  const [sel, setSel] = useState(null)
  if (loading) return <Loading />
  if (!data.length) return <Empty icon={MapPin} title="Mapa ainda não publicado" />
  const Icon = sel && (PLACE_ICON[sel.kind] || MapPin)
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2"><EventMap places={data} selectedId={sel?.id} onSelect={setSel} /><MapLegend /></div>
      <Card>
        {sel ? (<><Icon className="h-6 w-6 text-cyan-300" /><h3 className="mt-2 font-display font-semibold text-white">{sel.name}</h3>
          <Badge tone="violet">{PLACE_LABEL[sel.kind]}</Badge>{sel.hours && <p className="mt-2 text-sm text-slate-400">{sel.hours}</p>}<p className="mt-2 text-sm text-slate-300">{sel.description}</p></>)
          : <p className="text-sm text-slate-500">Toque em um ponto do mapa para ver detalhes.</p>}
      </Card>
    </div>
  )
}

function Artists({ id }) {
  const { data, loading } = useLoad(() => api.get(`/events/${id}/artists`), [id])
  if (loading) return <Loading />
  if (!data.length) return <Empty icon={Palette} title="Nenhum artista confirmado ainda" />
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((a) => (
        <Card key={a.id}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-semibold text-white">{a.display_name}</h3>
            <div className="flex gap-1"><Badge tone="cyan">{a.kind === 'artist' ? 'Artist Alley' : 'Dealers'}</Badge>{a.table_label && <Badge tone="violet">Mesa {a.table_label}</Badge>}</div>
          </div>
          <p className="mt-2 text-sm text-slate-300">{a.description}</p>
          {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"><ExternalLink className="h-4 w-4" />Portfólio</a>}
        </Card>
      ))}
    </div>
  )
}

function Care({ id }) {
  const toast = useToast()
  const { data, loading } = useLoad(() => api.get(`/events/${id}/care`), [id])
  const mine = useLoad(() => api.get(`/events/${id}/care-requests/mine`).catch(() => []), [id])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ kind: 'water', location: '', message: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  if (loading) return <Loading />
  const send = async () => { await api.post(`/events/${id}/care-requests`, f); toast('Pedido enviado à equipe'); mine.reload() }
  const groups = ['lounge', 'rest', 'hydration', 'medical']
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 border-violet-400/30">
        <div><h3 className="flex items-center gap-2 font-display font-semibold text-white"><LifeBuoy className="h-5 w-5 text-violet-300" />Precisa de ajuda?</h3>
          <p className="text-sm text-slate-400">Água, descanso, handler ou apoio médico. Exige ingresso do evento.</p></div>
        <button className="btn-primary" onClick={() => setOpen(true)}>Pedir ajuda à equipe</button>
      </Card>
      {mine.data?.length > 0 && (
        <Card><h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Meus pedidos</h3>
          <ul className="divide-y divide-white/5 text-sm">
            {mine.data.map((r) => (<li key={r.id} className="flex items-center justify-between py-2"><span>{CARE_LABEL[r.kind]} <span className="text-xs text-slate-500">· {fmtStamp(r.created_at)}</span></span>
              <Badge tone={{ open: 'red', in_progress: 'amber', resolved: 'green' }[r.status]}>{{ open: 'Aguardando', in_progress: 'A caminho', resolved: 'Resolvido' }[r.status]}</Badge></li>))}
          </ul></Card>
      )}
      {data.guidelines && <Card><h3 className="mb-2 flex items-center gap-2 font-display font-semibold text-white"><HeartPulse className="h-5 w-5 text-cyan-300" />Orientações para fursuiters e handlers</h3>
        <p className="whitespace-pre-wrap text-sm text-slate-300">{data.guidelines}</p></Card>}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.spots.length === 0 && <p className="text-sm text-slate-500">A organização ainda não cadastrou espaços de apoio.</p>}
        {groups.flatMap((g) => data.spots.filter((s) => s.kind === g)).map((s) => {
          const Icon = PLACE_ICON[s.kind]
          return (<Card key={s.id}><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-cyan-300" /><h4 className="font-medium text-white">{s.name}</h4></div>
            <p className="mt-1 text-xs text-slate-500">{PLACE_LABEL[s.kind]}{s.hours && ` · ${s.hours}`}</p><p className="mt-2 text-sm text-slate-300">{s.description}</p></Card>)
        })}
      </div>
      {data.parades.length > 0 && (
        <Card><h3 className="mb-2 font-display font-semibold text-white">Horários dos desfiles</h3>
          <ul className="space-y-1 text-sm text-slate-300">{data.parades.map((p) => <li key={p.id}><span className="capitalize text-cyan-300">{fmtDateLong(dayKey(p.starts_at))}</span> · {fmtTime(p.starts_at)}–{fmtTime(p.ends_at)} · {p.room}</li>)}</ul></Card>
      )}
      <FormModal open={open} onClose={() => setOpen(false)} title="Pedir ajuda à equipe" onSubmit={send} submitLabel="Enviar pedido">
        <Field label="O que você precisa?"><Select value={f.kind} onChange={set('kind')}>{Object.entries(CARE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Onde você está?"><Input value={f.location} onChange={set('location')} placeholder="Hall central, perto da escada…" /></Field>
        <Field label="Detalhes (opcional)"><Input value={f.message} onChange={set('message')} maxLength={400} /></Field>
        <p className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" />Em emergência médica, procure imediatamente o posto médico ou a equipe mais próxima.</p>
      </FormModal>
    </div>
  )
}

function Passport({ id }) {
  const toast = useToast()
  const { data, loading, reload } = useLoad(() => api.get(`/events/${id}/passport`), [id])
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  if (loading) return <Loading />
  const claim = async (e) => {
    e.preventDefault(); setError('')
    try { const r = await api.post(`/events/${id}/passport/claim`, { code }); toast(`Conquista: ${r.name}`); setCode(''); reload() } catch (err) { setError(err.message) }
  }
  const pct = data.total_points ? Math.round((data.points * 100) / data.total_points) : 0
  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex items-end justify-between"><div><p className="text-xs uppercase tracking-wide text-slate-400">Pontos</p><p className="font-display text-3xl font-bold text-white">{data.points}<span className="text-base text-slate-500"> / {data.total_points}</span></p></div><UserCheck className="h-8 w-8 text-violet-300" /></div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${pct}%` }} /></div>
        <form onSubmit={claim} className="flex gap-2 pt-2"><Input placeholder="Código da atividade (ex.: no estande do artista)" value={code} onChange={(e) => setCode(e.target.value)} required aria-label="Código da conquista" /><button className="btn-primary">Resgatar</button></form>
        <ErrorNote error={error} />
        <p className="text-xs text-slate-500">Os códigos ficam nos locais das atividades. Nenhuma localização é rastreada.</p>
      </Card>
      {data.items.length === 0 ? <Empty icon={Trophy} title="Nenhuma conquista disponível" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.items.map((a) => (
            <Card key={a.id} className={cx('flex gap-3', !a.earned && 'opacity-60')}>
              <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.earned ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-500')}>{a.earned ? <Check className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}</span>
              <div><p className="font-medium text-white">{a.name} <span className="text-xs text-slate-500">+{a.points}</span></p><p className="text-sm text-slate-400">{a.description}</p><Badge tone="violet">{CAT[a.category]}</Badge></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
