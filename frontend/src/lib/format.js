const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const money = (cents) => brl.format((cents || 0) / 100)
export const toCents = (v) => Math.round(parseFloat(String(v).replace(',', '.') || '0') * 100)
export const fromCents = (c) => ((c || 0) / 100).toFixed(2)

// Horários do evento são "relógio local do evento" (sem fuso); nunca converter.
const parts = (s) => new Date(s.length === 10 ? `${s}T00:00:00` : s)
export const fmtDate = (s) => (s ? parts(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '')
export const fmtDateLong = (s) => (s ? parts(s).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : '')
export const fmtTime = (s) => (s ? parts(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')
export const fmtDateTime = (s) => (s ? `${fmtDate(s)} ${fmtTime(s)}` : '')
export const dayKey = (s) => s.slice(0, 10)
// UTC "agora" gravado pelo servidor (created_at etc.) tem sufixo implícito Z
export const fmtStamp = (s) => (s ? new Date(`${s}Z`).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')
export const toInput = (s) => (s ? s.slice(0, 16) : '')

export const KIND_LABEL = {
  panel: 'Painel', workshop: 'Workshop', contest: 'Concurso', game: 'Jogos', parade: 'Desfile', party: 'Festa', other: 'Outro',
}
export const PLACE_LABEL = {
  room: 'Sala', entrance: 'Entrada', artist_alley: 'Artist Alley', dealers: 'Dealers Den', lounge: 'Lounge', hydration: 'Hidratação',
  rest: 'Descanso', medical: 'Posto médico', food: 'Alimentação', other: 'Outro',
}
export const CARE_LABEL = { water: 'Água / hidratação', rest: 'Preciso descansar', handler: 'Chamar handler', medical: 'Apoio médico', help: 'Outra ajuda' }

// Cores categóricas (ordem fixa) validadas para fundo escuro — ver skill dataviz.
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9']

export const fmtRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`)
export const fmtYear = (s) => (s ? parts(s).getFullYear() : '')
export const fmtKm = (d) => (d == null ? '' : d < 10 ? `${d.toFixed(1).replace('.', ',')} km` : `${Math.round(d)} km`)
