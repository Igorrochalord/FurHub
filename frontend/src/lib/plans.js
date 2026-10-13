// Valores sugeridos e configuráveis (não definitivos). Cobrança SaaS, taxas de pagamento e custos de terceiros são separados.
export const PLANS = [
  { id: 'meetup', name: 'Meetup', price: 'R$ 149', per: '/evento', who: 'Encontros pequenos', items: ['Página pública', 'Divulgação no mapa', 'Programação', 'Inscrições básicas', 'QR Code e check-in', 'Relatórios essenciais'] },
  { id: 'indie', name: 'Indie', price: 'R$ 499', per: '/evento', who: 'Eventos comunitários', items: ['Tudo do Meetup', 'Ingressos por categoria', 'Artistas', 'Voluntários', 'Notificações', 'Mapas internos básicos', 'Passaporte furry básico', 'Mais relatórios'] },
  { id: 'pro', name: 'Convention Pro', price: 'R$ 1.499', per: '/evento', who: 'Convenções completas', hot: true, items: ['Tudo do Indie', 'Financeiro', 'Dealers Den', 'Fursuit Care', 'Concursos', 'Patrocinadores', 'Central operacional', 'Analytics', 'Personalização ampliada'] },
  { id: 'enterprise', name: 'Enterprise', price: 'Sob orçamento', per: '', who: 'Grandes operações', items: ['Marca branca', 'Domínio próprio', 'API', 'Integrações', 'Suporte contratado', 'Relatórios especializados', 'Implantação personalizada'] },
]
