import { BarChart3, CalendarDays, Check, HeartPulse, Palette, QrCode, ShieldCheck, Store, Ticket, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CardSkeleton } from '../../components/public/EventCard'
import { useState } from 'react'
import { Empty, ErrorNote, Field, Input, Spinner, Textarea } from '../../components/ui'
import { api } from '../../lib/api'
import { PLANS } from '../../lib/plans'
import { usePublic } from '../../lib/useEvents'
import { usePageMeta } from '../../lib/useMeta'

const Wrap = ({ title, lead, children }) => (
  <div className="mx-auto max-w-5xl px-4 py-12">
    <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
    {lead && <p className="mt-3 max-w-2xl text-lg text-slate-400">{lead}</p>}
    <div className="mt-8">{children}</div>
  </div>
)

export function PlansGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((p) => (
        <div key={p.id} className={`card flex flex-col p-6 ${p.hot ? 'border-violet-400/50 shadow-glow' : ''}`}>
          {p.hot && <span className="mb-2 w-fit rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-200">Mais completo</span>}
          <h3 className="font-display text-lg font-bold text-white">{p.name}</h3>
          <p className="text-sm text-slate-400">{p.who}</p>
          <p className="mt-4 font-display text-2xl font-extrabold text-white">{p.price}<span className="text-sm font-normal text-slate-500">{p.per}</span></p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">{p.items.map((it) => <li key={it} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />{it}</li>)}</ul>
          <Link to={p.id === 'enterprise' ? '/sobre' : '/cadastrar?tipo=organizador'} state={{ from: '/org' }} className={`${p.hot ? 'btn-primary' : 'btn-ghost'} mt-auto`}>{p.id === 'enterprise' ? 'Falar com a equipe' : 'Começar'}</Link>
        </div>
      ))}
    </div>
  )
}

export function Pricing() {
  usePageMeta({ title: 'Planos e preços', description: 'Planos por evento para organizadores de convenções e encontros furry.' })
  return (
    <Wrap title="Planos por evento" lead="Valores sugeridos e configuráveis, sujeitos a ajuste. Ingressos pagos têm taxa de processamento do provedor de pagamento, cobrada à parte da assinatura.">
      <PlansGrid />
      <p className="mt-6 text-sm text-slate-500">A cobrança do plano pela plataforma ainda não está ativa nesta versão: os planos são informativos.</p>
    </Wrap>
  )
}

const FEATURES = [
  [Ticket, 'Ingressos', 'Lotes, categorias e QR Code opaco.'], [QrCode, 'Check-in', 'Leitura por câmera com bloqueio de reuso.'], [CalendarDays, 'Programação', 'Painéis, workshops e desfiles.'],
  [Palette, 'Artist Alley', 'Inscrição, avaliação e mesas.'], [HeartPulse, 'Fursuit Care', 'Lounges, hidratação e pedido de ajuda.'], [Users, 'Voluntários', 'Turnos e confirmação.'],
  [Wallet, 'Financeiro', 'Receita, taxas e custos.'], [BarChart3, 'Relatórios', 'Resultados pós-evento.'],
]
export function ForOrganizers() {
  usePageMeta({ title: 'Para organizadores', description: 'Venda ingressos, faça check-in, monte a programação e cuide dos fursuiters com a FurCon Hub.' })
  return (
    <Wrap title="Organize sua próxima convenção com a FurCon Hub." lead="Divulgação no mapa, ingressos, operação e relatórios em uma única plataforma.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([Icon, t, d]) => <div key={t} className="card p-5"><span className="inline-flex rounded-xl bg-violet-500/15 p-2 text-violet-300"><Icon className="h-5 w-5" /></span><h3 className="mt-3 font-display font-bold text-white">{t}</h3><p className="mt-1 text-sm text-slate-400">{d}</p></div>)}
      </div>
      <h2 className="mt-14 font-display text-2xl font-bold text-white">Como cadastrar sua organização</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-4">
        {['Crie sua conta de organizador', 'Informe o nome da organização', 'Crie o evento em rascunho: local, datas e ingressos', 'Solicite a publicação: ele aparece na home e no mapa'].map((s, i) => (
          <li key={s} className="card p-4 text-sm text-slate-300"><b className="font-display text-2xl text-cyan-300">{i + 1}</b><p className="mt-1">{s}</p></li>
        ))}
      </ol>
      <div className="mt-8 flex gap-3"><Link to="/cadastrar?tipo=organizador" state={{ from: '/org' }} className="btn-primary px-6 py-3">Criar conta de organizador</Link><Link to="/planos" className="btn-ghost px-6 py-3">Comparar planos</Link></div>
      <h2 className="mt-14 font-display text-2xl font-bold text-white">Planos</h2><div className="mt-4"><PlansGrid /></div>
    </Wrap>
  )
}

export function About() {
  usePageMeta({ title: 'Sobre a FurCon Hub' })
  return (
    <Wrap title="Sobre a FurCon Hub" lead="O ponto de encontro digital entre a comunidade furry, os organizadores e os eventos que fazem parte dela.">
      <div className="grid gap-4 md:grid-cols-3">
        {[[ShieldCheck, 'Privacidade primeiro', 'Endereços residenciais nunca são publicados e sua localização só é usada quando você pede, sem ser armazenada.'],
          [Store, 'Para toda a comunidade', 'Visitantes exploram sem cadastro; organizadores e artistas têm ferramentas dedicadas.'],
          [Users, 'Transparência', 'Eventos de demonstração são sempre identificados. Seções de destaque usam métricas reais.']].map(([I, t, d]) => (
          <div key={t} className="card p-5"><I className="h-6 w-6 text-violet-300" /><h3 className="mt-3 font-display font-bold text-white">{t}</h3><p className="mt-1 text-sm text-slate-400">{d}</p></div>))}
      </div>
    </Wrap>
  )
}

const FAQ = [
  ['Preciso de conta para ver eventos?', 'Não. Mapa, catálogo, calendário e páginas de evento são públicos. A conta é necessária para comprar ingressos, ver seus ingressos e administrar eventos.'],
  ['Minha localização é armazenada?', 'Não. Ela só é consultada quando você clica em "Usar minha localização", com precisão reduzida, e não é gravada no servidor.'],
  ['As distâncias são de rota?', 'Não. São distâncias aproximadas em linha reta. Use o botão de rota para abrir seu aplicativo de mapas.'],
  ['Como divulgo meu evento?', 'Crie uma conta de organizador, cadastre o evento e solicite a publicação. Eventos precisam ter localização válida (ou oculta) antes de entrar no ar.'],
  ['Posso ocultar o endereço do local?', 'Sim. O organizador pode divulgar só a cidade ou nada além de "a divulgar".'],
]
export function Help() {
  usePageMeta({ title: 'Perguntas frequentes' })
  return (
    <Wrap title="Perguntas frequentes">
      <div className="space-y-3">{FAQ.map(([q, a]) => <details key={q} className="card group p-4"><summary className="cursor-pointer font-semibold text-white">{q}</summary><p className="mt-2 text-sm text-slate-400">{a}</p></details>)}</div>
    </Wrap>
  )
}

export function Artists() {
  usePageMeta({ title: 'Artistas', description: 'Artistas participantes de eventos furry publicados.' })
  const { data, loading } = usePublic('/artists')
  return (
    <Wrap title="Artistas" lead="Artistas aprovados em eventos futuros.">
      {loading ? <div className="grid gap-4 sm:grid-cols-3"><CardSkeleton /></div> : !data?.length ? <Empty icon={Palette} title="Nenhum artista confirmado ainda" text="Quando os organizadores aprovarem artistas, eles aparecem aqui." /> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <li key={a.id} className="card p-4"><p className="font-display font-bold text-white">{a.display_name}</p><p className="mt-1 text-sm text-slate-400">{a.description}</p>
              <p className="mt-2 text-xs text-slate-500">Em <Link className="text-cyan-300 hover:underline" to={`/eventos/${a.event_slug}`}>{a.event_name}</Link>{a.table_label && ` · mesa ${a.table_label}`}</p>
              {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noreferrer noopener" className="mt-2 block text-sm text-cyan-300 hover:underline">Portfólio ↗</a>}</li>
          ))}
        </ul>
      )}
    </Wrap>
  )
}

export function Terms() {
  usePageMeta({ title: 'Termos de Uso' })
  const S = ({ t, children }) => <section className="mt-6"><h2 className="font-display text-xl font-bold text-white">{t}</h2><div className="mt-2 space-y-2 text-slate-300">{children}</div></section>
  return (
    <Wrap title="Termos de Uso" lead="Regras gerais de uso da plataforma FurCon Hub.">
      <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">Modelo inicial de termos, sujeito a revisão jurídica antes do lançamento comercial.</p>
      <S t="1. Objeto"><p>A FurCon Hub é uma plataforma que permite descobrir eventos da comunidade furry e que oferece a organizadores ferramentas de divulgação, ingressos e operação.</p></S>
      <S t="2. Papel da plataforma"><p>Cada evento é de responsabilidade da organização que o publica: datas, local, preços, regras, reembolsos e segurança. A FurCon Hub pode moderar, recusar ou remover eventos que violem estes termos ou a lei.</p></S>
      <S t="3. Conta e uso"><p>Você é responsável pelas informações que fornece e por manter seu acesso seguro. É proibido publicar endereços residenciais sem autorização, conteúdo ilegal, discriminatório ou que exponha menores.</p></S>
      <S t="4. Ingressos e pagamentos"><p>As condições de compra, cancelamento e reembolso são definidas por cada organização, respeitada a legislação aplicável. Nesta versão, pagamentos são simulados.</p></S>
      <S t="5. Privacidade"><p>O tratamento de dados pessoais segue a <Link to="/privacidade" className="text-cyan-300 hover:underline">Política de Privacidade</Link>.</p></S>
      <S t="6. Contato"><p>Dúvidas? Use a página de <Link to="/contato" className="text-cyan-300 hover:underline">contato</Link>.</p></S>
    </Wrap>
  )
}

export function Contact() {
  usePageMeta({ title: 'Contato' })
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '', accept: false })
  const [state, setState] = useState({ busy: false, done: false, error: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setState({ busy: true, done: false, error: '' })
    try { await api.post('/v1/public/contact', { name: f.name, email: f.email, subject: f.subject, message: f.message, accept_privacy: f.accept }); setState({ busy: false, done: true, error: '' }) }
    catch (err) { setState({ busy: false, done: false, error: err.message }) }
  }
  return (
    <Wrap title="Contato" lead="Fale com a equipe da FurCon Hub.">
      {state.done ? <Empty icon={Check} title="Mensagem enviada" text="Obrigado! Responderemos no e-mail informado." /> : (
        <form onSubmit={submit} className="card max-w-xl space-y-4 p-6">
          <Field label="Nome"><Input required minLength={2} maxLength={120} value={f.name} onChange={set('name')} /></Field>
          <Field label="E-mail"><Input type="email" required value={f.email} onChange={set('email')} /></Field>
          <Field label="Assunto"><Input maxLength={160} value={f.subject} onChange={set('subject')} /></Field>
          <Field label="Mensagem"><Textarea rows={5} required minLength={10} maxLength={4000} value={f.message} onChange={set('message')} /></Field>
          <label className="flex items-start gap-2 text-sm text-slate-300"><input type="checkbox" className="mt-1" required checked={f.accept} onChange={set('accept')} />
            <span>Aceito a <Link to="/privacidade" className="text-cyan-300 hover:underline">política de privacidade</Link>.</span></label>
          <ErrorNote error={state.error} />
          <button className="btn-primary" disabled={state.busy}>{state.busy && <Spinner className="h-4 w-4" />} Enviar mensagem</button>
        </form>
      )}
    </Wrap>
  )
}
