import { UserPlus, UserX } from 'lucide-react'
import { useState } from 'react'
import { Badge, ConfirmButton, Fade, Field, FormModal, Input, Loading, PageHeader, Select, Table, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function Team() {
  const { user } = useAuth()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get('/org/team'))
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'volunteer' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const add = async () => { await api.post('/org/team', f); setF({ name: '', email: '', password: '', role: 'volunteer' }); reload() }

  return (
    <Fade>
      <PageHeader title="Equipe" subtitle="Voluntários fazem check-in e atendem o Fursuit Care; administradores gerenciam tudo na organização."
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" /> Adicionar membro</button>} />
      {loading ? <Loading /> : (
        <Table head={['Nome', 'E-mail', 'Função', '']}>
          {data.map((m) => (
            <tr key={m.id}>
              <td className="td font-medium text-white">{m.name}</td><td className="td text-slate-400">{m.email}</td>
              <td className="td"><Badge tone={m.role === 'admin' ? 'violet' : 'cyan'}>{m.role === 'admin' ? 'Administrador' : 'Voluntário'}</Badge></td>
              <td className="td text-right">{m.id !== user.id && <ConfirmButton aria-label="Remover" onConfirm={() => act(async () => { await api.del(`/org/team/${m.id}`); reload() }, 'Acesso removido')}><UserX className="h-4 w-4" /></ConfirmButton>}</td>
            </tr>
          ))}
        </Table>
      )}
      <FormModal open={open} onClose={() => setOpen(false)} title="Adicionar membro" onSubmit={add}>
        <Field label="Nome"><Input required value={f.name} onChange={set('name')} /></Field>
        <Field label="E-mail"><Input type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Senha provisória" hint="Mínimo 8 caracteres. Peça para a pessoa trocar no primeiro acesso."><Input type="password" minLength={8} required value={f.password} onChange={set('password')} /></Field>
        <Field label="Função"><Select value={f.role} onChange={set('role')}><option value="volunteer">Voluntário</option><option value="admin">Administrador</option></Select></Field>
      </FormModal>
    </Fade>
  )
}
