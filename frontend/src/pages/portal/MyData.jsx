import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, ConfirmButton, ErrorNote, Fade, Field, Input, useAct, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function MyData() {
  const { user, logout } = useAuth()
  const act = useAct()
  const toast = useToast()
  const [pw, setPw] = useState({ current_password: '', new_password: '' })
  const [error, setError] = useState('')

  const exportData = () => act(async () => {
    const d = await api.get('/me/export')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }))
    a.download = 'meus-dados-furconhub.json'; a.click()
  })
  const changePw = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post('/auth/password', pw); setPw({ current_password: '', new_password: '' }); toast('Senha alterada') } catch (err) { setError(err.message) }
  }
  return (
    <Fade className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Meus dados e privacidade</h1>
      <Card className="space-y-3">
        <p className="text-sm text-slate-300">Conta: <strong className="text-white">{user.email}</strong></p>
        <p className="text-sm text-slate-400">Veja a <Link to="/privacidade" className="text-cyan-300 hover:underline">política de privacidade</Link>.</p>
        <button className="btn-ghost" onClick={exportData}><Download className="h-4 w-4" /> Exportar meus dados (JSON)</button>
      </Card>
      <Card>
        <form onSubmit={changePw} className="space-y-3">
          <h2 className="font-display font-semibold text-white">Alterar senha</h2>
          <Field label="Senha atual"><Input type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
          <Field label="Nova senha"><Input type="password" required minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
          <ErrorNote error={error} />
          <button className="btn-ghost">Alterar</button>
        </form>
      </Card>
      <Card className="space-y-3 border-rose-500/20">
        <h2 className="font-display font-semibold text-white">Excluir conta</h2>
        <p className="text-sm text-slate-400">Remove seu perfil, fursona, favoritos e conquistas. Ingressos pagos permanecem anonimizados por obrigação contábil.</p>
        <ConfirmButton label="Confirmar exclusão definitiva" onConfirm={() => act(async () => { await api.del('/me'); logout() })}><Trash2 className="h-4 w-4" /> Excluir minha conta</ConfirmButton>
      </Card>
    </Fade>
  )
}
