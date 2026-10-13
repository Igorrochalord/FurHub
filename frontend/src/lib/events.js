import { Briefcase, Dices, GraduationCap, Globe, HeartHandshake, Music, Palette, PawPrint, Users } from 'lucide-react'

// Cada categoria tem ícone próprio: a distinção não depende só de cor.
export const CATEGORIES = {
  convention: { label: 'Convenção furry', icon: PawPrint },
  meetup: { label: 'Meetup', icon: Users },
  artist_fair: { label: 'Feira de artistas', icon: Palette },
  games: { label: 'Evento de jogos', icon: Dices },
  workshop: { label: 'Workshop', icon: GraduationCap },
  festival: { label: 'Festival', icon: Music },
  charity: { label: 'Evento beneficente', icon: HeartHandshake },
  virtual: { label: 'Evento virtual', icon: Globe },
  other: { label: 'Outros encontros', icon: Briefcase },
}

export const MODES = { presential: 'Presencial', online: 'Online', hybrid: 'Híbrido' }

export const STATUS = {
  soon: { label: 'Em breve', tone: 'violet' },
  open: { label: 'Inscrições abertas', tone: 'green' },
  sold_out: { label: 'Esgotado', tone: 'amber' },
  ongoing: { label: 'Acontecendo', tone: 'cyan' },
  ended: { label: 'Encerrado', tone: 'slate' },
  cancelled: { label: 'Cancelado', tone: 'red' },
}

export const AGE = { L: 'Livre', 14: '14+', 16: '16+', 18: '18+' }

export const RADII = [10, 25, 50, 100, 250, 500]

// Capitais brasileiras: pontos de referência para "perto de você" sem geolocalização do dispositivo.
export const REGIONS = [
  ['Aracaju, SE', -10.9472, -37.0731], ['Belém, PA', -1.4558, -48.5044], ['Belo Horizonte, MG', -19.9167, -43.9345],
  ['Boa Vista, RR', 2.8235, -60.6758], ['Brasília, DF', -15.7939, -47.8828], ['Campo Grande, MS', -20.4697, -54.6201],
  ['Cuiabá, MT', -15.601, -56.0974], ['Curitiba, PR', -25.4284, -49.2733], ['Florianópolis, SC', -27.5954, -48.548],
  ['Fortaleza, CE', -3.7319, -38.5267], ['Goiânia, GO', -16.6869, -49.2648], ['João Pessoa, PB', -7.1195, -34.845],
  ['Macapá, AP', 0.0349, -51.0694], ['Maceió, AL', -9.6498, -35.7089], ['Manaus, AM', -3.119, -60.0217],
  ['Natal, RN', -5.7945, -35.211], ['Palmas, TO', -10.1689, -48.3317], ['Porto Alegre, RS', -30.0346, -51.2177],
  ['Porto Velho, RO', -8.7612, -63.9004], ['Recife, PE', -8.0476, -34.877], ['Rio Branco, AC', -9.9754, -67.8249],
  ['Rio de Janeiro, RJ', -22.9068, -43.1729], ['Salvador, BA', -12.9777, -38.5016], ['São Luís, MA', -2.5307, -44.3068],
  ['São Paulo, SP', -23.5505, -46.6333], ['Teresina, PI', -5.0892, -42.8019], ['Vitória, ES', -20.3155, -40.3128],
].map(([label, lat, lon]) => ({ label, lat, lon }))

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Preset de "quando" → intervalo de datas. */
export function whenRange(when, from, to) {
  const now = new Date()
  const day = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d }
  switch (when) {
    case 'today': return { start_date: iso(now), end_date: iso(now) }
    case 'week': return { start_date: iso(now), end_date: iso(day(7 - ((now.getDay() + 6) % 7) - 1)) }
    case 'month': return { start_date: iso(now), end_date: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
    case 'next3': return { start_date: iso(now), end_date: iso(day(92)) }
    case 'custom': return { ...(from && { start_date: from }), ...(to && { end_date: to }) }
    default: return {}
  }
}

export const FILTER_KEYS = ['q', 'where', 'when', 'from', 'to', 'category', 'mode', 'free', 'open', 'lat', 'lon', 'radius', 'sort']

/** Filtros da URL (compartilháveis) → parâmetros da API. */
export function toApi(p) {
  const out = {}
  if (p.q) out.search = p.q
  if (p.where) out.where = p.where
  if (p.category) out.category = p.category
  if (p.mode) out.attendance_mode = p.mode
  if (p.free) out.free = true
  if (p.open) out.open_sales = true
  if (p.lat && p.lon) {
    out.latitude = p.lat
    out.longitude = p.lon
    if (p.radius) out.radius_km = p.radius
  }
  return { ...out, ...whenRange(p.when, p.from, p.to) }
}

export const qs = (o) => {
  const s = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null && v !== false) s.set(k, v) })
  return s.toString()
}

export function priceLabel(ev) {
  if (ev.min_price_cents == null) return null
  return ev.min_price_cents === 0 ? 'Grátis' : null
}
