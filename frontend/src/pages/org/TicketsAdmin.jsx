import { Crown, Pencil, Plus, Ticket, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, ConfirmButton, Empty, Fade, Field, FormModal, Input, Loading, PageHeader, Table, Textarea, useAct, useLoad } from '../../components/ui'
import { api } from '../../lib/api'
import { fromCents, money, toCents } from '../../lib/format'
import { useEvent } from './EventWorkspace'

const blank = { name: '', description: '', price: '', quantity: 100, is_vip: false, active: true }

export default function TicketsAdmin() {
  const { id } = useEvent()
  const act = useAct()
  const { data, loading, reload } = useLoad(() => api.get(`/org/events/${id}/ticket-types`), [id])
  const [edit, setEdit] = useState(null) // null | 'new' | tipo
  const [f, setF] = useState(blank)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const open = (t) => { setEdit(t || 'new'); setF(t ? { ...t, price: fromCents(t.price_cents) } : blank) }

  const save = async () => {
    const body = { name: f.name, description: f.description, price_cents: toCents(f.price), quantity: Number(f.quantity), is_vip: f.is_vip, active: f.active }
    if (edit === 'new') await api.post(`/org/events/${id}/ticket-types`, body)
    else await api.put(`/org/events/${id}/ticket-types/${edit.id}`, body)
    reload()
  }

  return (
    <Fade>
      <PageHeader title="Ingressos" subtitle="Lotes e categorias. A taxa do provedor de pagamento é calculada no servidor a cada venda."
        actions={<button className="btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> Novo lote</button>} />
      {loading ? <Loading /> : data.length === 0 ? (
        <Empty icon={Ticket} title="Nenhum ingresso configurado" text="Crie ao menos um lote para poder publicar o evento." />
      ) : (
        <Table head={['Lote', 'Preço', 'Vendidos', 'Status', '']}>
          {data.map((t) => (
            <tr key={t.id}>
              <td className="td"><span className="font-medium text-white">{t.name}</span> {t.is_vip && <Badge tone="violet"><Crown className="h-3 w-3" />VIP</Badge>}
                <div className="text-xs text-slate-500">{t.description}</div></td>
              <td className="td">{t.price_cents ? money(t.price_cents) : 'Grátis'}</td>
              <td className="td">{t.sold} / {t.quantity}</td>
              <td className="td"><Badge tone={t.active ? 'green' : 'slate'}>{t.active ? 'À venda' : 'Pausado'}</Badge></td>
              <td className="td">
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost" aria-label="Editar" onClick={() => open(t)}><Pencil className="h-4 w-4" /></button>
                  <ConfirmButton aria-label="Excluir" onConfirm={() => act(async () => { await api.del(`/org/events/${id}/ticket-types/${t.id}`); reload() }, 'Lote excluído')}><Trash2 className="h-4 w-4" /></ConfirmButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <FormModal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Novo lote' : 'Editar lote'} onSubmit={save}>
        <Field label="Nome"><Input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Descrição"><Textarea value={f.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preço (R$)" hint="0 = gratuito"><Input required inputMode="decimal" value={f.price} onChange={set('price')} /></Field>
          <Field label="Quantidade"><Input type="number" min="1" required value={f.quantity} onChange={set('quantity')} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_vip} onChange={set('is_vip')} /> Categoria VIP</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={set('active')} /> À venda</label>
      </FormModal>
    </Fade>
  )
}
