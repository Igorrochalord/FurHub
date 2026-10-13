import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const LANGS = { pt: 'Português', en: 'English', es: 'Español' }
const KEY = 'furconhub.lang'

const D = {
  pt: {
    'nav.home': 'Início', 'nav.events': 'Explorar Eventos', 'nav.map': 'Mapa', 'nav.calendar': 'Calendário', 'nav.artists': 'Artistas',
    'nav.about': 'Sobre', 'nav.organizers': 'Para Organizadores', 'nav.login': 'Entrar', 'nav.signup': 'Criar Conta', 'nav.create': 'Criar Evento',
    'nav.account': 'Minha conta', 'nav.menu': 'Abrir menu', 'nav.close': 'Fechar menu', 'nav.language': 'Idioma',
    'hero.title': 'Descubra onde a Furry Fandom se encontra.',
    'hero.sub': 'Explore convenções, encontros, festivais e experiências da comunidade furry. Encontre eventos próximos, conheça artistas e planeje sua próxima aventura.',
    'hero.explore': 'Explorar Eventos', 'hero.map': 'Ver Mapa', 'hero.promote': 'Divulgar Meu Evento',
    'search.what': 'O que você procura?', 'search.what.ph': 'Evento, organização, atividade…', 'search.where': 'Onde?', 'search.where.ph': 'Cidade, estado ou país',
    'search.when': 'Quando?', 'search.category': 'Categoria', 'search.go': 'Buscar Eventos', 'search.all': 'Qualquer data', 'search.allcat': 'Todas',
    'search.today': 'Hoje', 'search.week': 'Esta semana', 'search.month': 'Este mês', 'search.next3': 'Próximos meses', 'search.custom': 'Intervalo personalizado',
    'search.from': 'De', 'search.to': 'Até', 'search.mylocation': 'Usar minha localização', 'search.radius': 'Raio',
    'sections.upcoming': 'Próximos eventos', 'sections.nearby': 'Eventos perto de você', 'sections.featured': 'Em destaque', 'sections.map': 'Explore eventos pelo mapa',
    'sections.organizers': 'Organize sua próxima convenção com a FurCon Hub.', 'common.seeAll': 'Ver todos', 'common.openMap': 'Abrir Mapa Completo',
    'common.empty': 'Nenhum evento encontrado', 'common.loading': 'Carregando…', 'common.retry': 'Tentar de novo',
    'card.view': 'Ver Evento', 'card.onmap': 'Ver no Mapa', 'card.tickets': 'Ingressos', 'card.from': 'a partir de', 'card.free': 'Grátis', 'card.online': 'Online',
    'footer.about': 'Sobre a plataforma', 'footer.events': 'Eventos', 'footer.create': 'Criar Evento', 'footer.organizers': 'Para Organizadores', 'footer.help': 'Perguntas frequentes',
    'footer.privacy': 'Política de Privacidade', 'footer.languages': 'Idiomas', 'footer.rights': 'Feito para a comunidade furry.',
  },
  en: {
    'nav.home': 'Home', 'nav.events': 'Explore Events', 'nav.map': 'Map', 'nav.calendar': 'Calendar', 'nav.artists': 'Artists',
    'nav.about': 'About', 'nav.organizers': 'For Organizers', 'nav.login': 'Log in', 'nav.signup': 'Sign up', 'nav.create': 'Create Event',
    'nav.account': 'My account', 'nav.menu': 'Open menu', 'nav.close': 'Close menu', 'nav.language': 'Language',
    'hero.title': 'Discover where the Furry Fandom meets.',
    'hero.sub': 'Explore conventions, meetups, festivals and community experiences. Find nearby events, meet artists and plan your next adventure.',
    'hero.explore': 'Explore Events', 'hero.map': 'View Map', 'hero.promote': 'Promote My Event',
    'search.what': 'What are you looking for?', 'search.what.ph': 'Event, organization, activity…', 'search.where': 'Where?', 'search.where.ph': 'City, state or country',
    'search.when': 'When?', 'search.category': 'Category', 'search.go': 'Search Events', 'search.all': 'Any date', 'search.allcat': 'All',
    'search.today': 'Today', 'search.week': 'This week', 'search.month': 'This month', 'search.next3': 'Coming months', 'search.custom': 'Custom range',
    'search.from': 'From', 'search.to': 'To', 'search.mylocation': 'Use my location', 'search.radius': 'Radius',
    'sections.upcoming': 'Upcoming events', 'sections.nearby': 'Events near you', 'sections.featured': 'Featured', 'sections.map': 'Explore events on the map',
    'sections.organizers': 'Run your next convention with FurCon Hub.', 'common.seeAll': 'See all', 'common.openMap': 'Open Full Map',
    'common.empty': 'No events found', 'common.loading': 'Loading…', 'common.retry': 'Try again',
    'card.view': 'View Event', 'card.onmap': 'Show on Map', 'card.tickets': 'Tickets', 'card.from': 'from', 'card.free': 'Free', 'card.online': 'Online',
    'footer.about': 'About the platform', 'footer.events': 'Events', 'footer.create': 'Create Event', 'footer.organizers': 'For Organizers', 'footer.help': 'FAQ',
    'footer.privacy': 'Privacy Policy', 'footer.languages': 'Languages', 'footer.rights': 'Made for the furry community.',
  },
  es: {
    'nav.home': 'Inicio', 'nav.events': 'Explorar Eventos', 'nav.map': 'Mapa', 'nav.calendar': 'Calendario', 'nav.artists': 'Artistas',
    'nav.about': 'Acerca de', 'nav.organizers': 'Para Organizadores', 'nav.login': 'Entrar', 'nav.signup': 'Crear Cuenta', 'nav.create': 'Crear Evento',
    'nav.account': 'Mi cuenta', 'nav.menu': 'Abrir menú', 'nav.close': 'Cerrar menú', 'nav.language': 'Idioma',
    'hero.title': 'Descubre dónde se encuentra la Furry Fandom.',
    'hero.sub': 'Explora convenciones, encuentros, festivales y experiencias de la comunidad furry. Encuentra eventos cercanos, conoce artistas y planifica tu próxima aventura.',
    'hero.explore': 'Explorar Eventos', 'hero.map': 'Ver Mapa', 'hero.promote': 'Promocionar Mi Evento',
    'search.what': '¿Qué buscas?', 'search.what.ph': 'Evento, organización, actividad…', 'search.where': '¿Dónde?', 'search.where.ph': 'Ciudad, estado o país',
    'search.when': '¿Cuándo?', 'search.category': 'Categoría', 'search.go': 'Buscar Eventos', 'search.all': 'Cualquier fecha', 'search.allcat': 'Todas',
    'search.today': 'Hoy', 'search.week': 'Esta semana', 'search.month': 'Este mes', 'search.next3': 'Próximos meses', 'search.custom': 'Rango personalizado',
    'search.from': 'Desde', 'search.to': 'Hasta', 'search.mylocation': 'Usar mi ubicación', 'search.radius': 'Radio',
    'sections.upcoming': 'Próximos eventos', 'sections.nearby': 'Eventos cerca de ti', 'sections.featured': 'Destacados', 'sections.map': 'Explora eventos en el mapa',
    'sections.organizers': 'Organiza tu próxima convención con FurCon Hub.', 'common.seeAll': 'Ver todos', 'common.openMap': 'Abrir Mapa Completo',
    'common.empty': 'No se encontraron eventos', 'common.loading': 'Cargando…', 'common.retry': 'Reintentar',
    'card.view': 'Ver Evento', 'card.onmap': 'Ver en el Mapa', 'card.tickets': 'Entradas', 'card.from': 'desde', 'card.free': 'Gratis', 'card.online': 'En línea',
    'footer.about': 'Sobre la plataforma', 'footer.events': 'Eventos', 'footer.create': 'Crear Evento', 'footer.organizers': 'Para Organizadores', 'footer.help': 'Preguntas frecuentes',
    'footer.privacy': 'Política de Privacidad', 'footer.languages': 'Idiomas', 'footer.rights': 'Hecho para la comunidad furry.',
  },
}

const I18n = createContext(null)
export const useT = () => useContext(I18n)

function initial() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && D[saved]) return saved
  } catch { /* storage indisponível */ }
  const nav = (navigator.language || 'pt').slice(0, 2)
  return D[nav] ? nav : 'pt'
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initial)
  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang
    try { localStorage.setItem(KEY, lang) } catch { /* ignore */ }
  }, [lang])
  const t = useCallback((k) => D[lang][k] ?? D.pt[k] ?? k, [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])
  return <I18n.Provider value={value}>{children}</I18n.Provider>
}
