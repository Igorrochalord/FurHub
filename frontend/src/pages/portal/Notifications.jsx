import { Bell } from 'lucide-react'
import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Empty, Fade, Loading, cx, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtStamp } from '../../lib/format'

export default function Notifications() {
  const { reloadNotes } = useOutletContext()
  const { data, loading } = useLoad(() => api.get('/me/notifications'))
  useEffect(() => {
    if (data?.some((n) => !n.read)) {
      const t = setTimeout(() => api.post('/me/notifications/read').then(reloadNotes), 1500)
      return () => clearTimeout(t)
    }
  }, [data, reloadNotes])
  if (loading) return <Loading />
  return (
    <Fade>
      <h1 className="mb-6 font-display text-2xl font-semibold text-white">Notificações</h1>
      {data.length === 0 ? <Empty icon={Bell} title="Nada por aqui" text="Comunicados, mudanças de horário e respostas da equipe aparecem aqui." /> : (
        <ul className="space-y-3">
          {data.map((n) => (
            <li key={n.id} className={cx('card p-4', !n.read && 'border-cyan-400/40')}>
              <p className="font-medium text-white">{n.title}</p>
              {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{n.body}</p>}
              <p className="mt-2 text-xs text-slate-500">{fmtStamp(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Fade>
  )
}
