import { CalendarDays, MapPin, Ticket } from 'lucide-react'

/** Composição original (sem personagens protegidos): silhueta canina geométrica, ingresso e marcador de mapa. */
export default function HeroArt({ className = '' }) {
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-md ${className}`} aria-hidden="true">
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-violet-500/30 via-cyan-400/10 to-pink-400/20 blur-2xl" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full drop-shadow-2xl">
        <defs>
          <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#38BDF8" /></linearGradient>
          <linearGradient id="hg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F472B6" /><stop offset="1" stopColor="#8B5CF6" /></linearGradient>
        </defs>
        <circle cx="200" cy="205" r="150" fill="#141B2D" stroke="url(#hg1)" strokeWidth="3" />
        <path d="M105 170 L120 70 L180 125 Z" fill="url(#hg1)" /><path d="M295 170 L280 70 L220 125 Z" fill="url(#hg1)" />
        <path d="M122 150 L128 100 L160 128 Z" fill="#F472B6" opacity=".85" /><path d="M278 150 L272 100 L240 128 Z" fill="#F472B6" opacity=".85" />
        <path d="M95 205 C95 140 150 115 200 115 C250 115 305 140 305 205 C305 265 255 305 200 305 C145 305 95 265 95 205Z" fill="#202A3F" />
        <path d="M200 215 L150 275 C170 300 230 300 250 275Z" fill="#F8FAFC" opacity=".92" />
        <ellipse cx="200" cy="232" rx="17" ry="12" fill="#0B1020" />
        <ellipse cx="155" cy="190" rx="14" ry="17" fill="#F8FAFC" /><ellipse cx="245" cy="190" rx="14" ry="17" fill="#F8FAFC" />
        <circle cx="158" cy="192" r="8" fill="#0B1020" /><circle cx="242" cy="192" r="8" fill="#0B1020" />
        <circle cx="161" cy="188" r="2.6" fill="#fff" /><circle cx="245" cy="188" r="2.6" fill="#fff" />
        <g fill="url(#hg2)" transform="translate(300 292) scale(.9)"><ellipse cx="16" cy="21" rx="9" ry="7" /><ellipse cx="5" cy="11" rx="3.6" ry="4.6" /><ellipse cx="12" cy="4" rx="3.6" ry="4.6" /><ellipse cx="21" cy="4" rx="3.6" ry="4.6" /><ellipse cx="28" cy="11" rx="3.6" ry="4.6" /></g>
      </svg>
      <div className="absolute -left-2 top-10 flex -rotate-6 items-center gap-2 rounded-2xl border border-white/10 bg-navy-800/90 px-3 py-2 shadow-lg backdrop-blur">
        <span className="rounded-lg bg-violet-500/25 p-1.5 text-violet-300"><Ticket className="h-4 w-4" /></span>
        <span className="text-xs"><b className="block text-white">Ingresso</b><span className="text-slate-400">QR seguro</span></span>
      </div>
      <div className="absolute -right-2 top-28 flex rotate-3 items-center gap-2 rounded-2xl border border-white/10 bg-navy-800/90 px-3 py-2 shadow-lg backdrop-blur">
        <span className="rounded-lg bg-cyan-400/20 p-1.5 text-cyan-300"><MapPin className="h-4 w-4" /></span>
        <span className="text-xs"><b className="block text-white">No mapa</b><span className="text-slate-400">perto de você</span></span>
      </div>
      <div className="absolute bottom-6 left-4 flex rotate-2 items-center gap-2 rounded-2xl border border-white/10 bg-navy-800/90 px-3 py-2 shadow-lg backdrop-blur">
        <span className="rounded-lg bg-pink-400/20 p-1.5 text-pink-400"><CalendarDays className="h-4 w-4" /></span>
        <span className="text-xs"><b className="block text-white">Programação</b><span className="text-slate-400">dia a dia</span></span>
      </div>
    </div>
  )
}
