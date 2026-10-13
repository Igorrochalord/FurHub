export function Paw({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pawg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <g fill="url(#pawg)">
        <ellipse cx="16" cy="21" rx="6.5" ry="5" />
        <ellipse cx="8" cy="14" rx="2.6" ry="3.4" />
        <ellipse cx="13" cy="8.8" rx="2.6" ry="3.4" />
        <ellipse cx="19" cy="8.8" rx="2.6" ry="3.4" />
        <ellipse cx="24" cy="14" rx="2.6" ry="3.4" />
      </g>
    </svg>
  )
}

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-white ${className}`}>
      <Paw className="h-7 w-7" />
      FurCon <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Hub</span>
    </span>
  )
}
