import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'

export default function Privacy() {
  const S = ({ t, children }) => <section className="mt-6"><h2 className="font-display text-lg font-semibold text-white">{t}</h2><div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div></section>
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link to="/"><Logo /></Link>
      <h1 className="mt-8 font-display text-3xl font-semibold text-white">Política de privacidade</h1>
      <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
        Modelo inicial para a versão de desenvolvimento. Antes de operar comercialmente, revise-o com assessoria jurídica (LGPD) e preencha os dados do controlador.
      </p>
      <S t="O que coletamos">
        <p>Nome, e-mail e senha (armazenada apenas como hash). Quando você compra ingresso: nome do crachá, lote e forma de pagamento. Opcionalmente: perfil de fursona, inscrições de artista, conquistas e pedidos de ajuda do Fursuit Care.</p>
      </S>
      <S t="Privacidade por padrão">
        <p>Seu perfil de fursona é privado até que você o torne público. A equipe de check-in vê apenas o nome do crachá e o lote. O QR Code é um código aleatório sem dados pessoais e pode ser renovado a qualquer momento antes do uso. Não coletamos localização.</p>
      </S>
      <S t="Menores de idade">
        <p>Organizadores devem definir regras de idade e responsáveis para cada evento. Evitamos coletar dados além do necessário e não expomos publicamente dados de participantes.</p>
      </S>
      <S t="Seus direitos">
        <p>Em <strong>Meus dados</strong> você pode exportar tudo o que guardamos sobre você e excluir sua conta. Ingressos pagos permanecem anonimizados por obrigação contábil.</p>
      </S>
      <S t="Retenção">
        <p>Cada evento define um prazo (padrão: 180 dias após o término) após o qual ingressos, pedidos de ajuda e notificações são anonimizados.</p>
      </S>
    </div>
  )
}
