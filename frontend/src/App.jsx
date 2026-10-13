import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Loading } from './components/ui'
import { homeFor, useAuth } from './lib/auth'
const PortalLayout = lazy(() => import('./pages/portal/PortalLayout'))
const OrgLayout = lazy(() => import('./pages/org/OrgLayout'))
import PublicLayout from './components/public/PublicLayout'
import Home from './pages/public/Home'
import EventsCatalog from './pages/public/EventsCatalog'
const EventsMapPage = lazy(() => import('./pages/public/EventsMapPage'))
import EventDetails from './pages/public/EventDetails'
import CalendarPage from './pages/public/CalendarPage'
import { About, Artists, Contact, ForOrganizers, Help, Pricing, Terms } from './pages/public/InfoPages'
import GuestTicket from './pages/public/GuestTicket'
import { api } from './lib/api'
import { useLoad } from './components/ui'
import { Login, Register } from './pages/public/AuthPages'
import Privacy from './pages/public/Privacy'
const OrgEvents = lazy(() => import('./pages/org/OrgEvents'))
const Team = lazy(() => import('./pages/org/Team'))
const VolunteerHome = lazy(() => import('./pages/org/VolunteerHome'))
const EventWorkspace = lazy(() => import('./pages/org/EventWorkspace'))
const Dashboard = lazy(() => import('./pages/org/Dashboard'))
const TicketsAdmin = lazy(() => import('./pages/org/TicketsAdmin'))
const Attendees = lazy(() => import('./pages/org/Attendees'))
const Checkin = lazy(() => import('./pages/org/Checkin'))
const ScheduleAdmin = lazy(() => import('./pages/org/ScheduleAdmin'))
const ArtistsAdmin = lazy(() => import('./pages/org/ArtistsAdmin'))
const VolunteersAdmin = lazy(() => import('./pages/org/VolunteersAdmin'))
const FinanceAdmin = lazy(() => import('./pages/org/FinanceAdmin'))
const Announcements = lazy(() => import('./pages/org/Announcements'))
const MapAdmin = lazy(() => import('./pages/org/MapAdmin'))
const CareAdmin = lazy(() => import('./pages/org/CareAdmin'))
const PassportAdmin = lazy(() => import('./pages/org/PassportAdmin'))
const Reports = lazy(() => import('./pages/org/Reports'))
const EventSettings = lazy(() => import('./pages/org/EventSettings'))
const PortalHome = lazy(() => import('./pages/portal/PortalHome'))
const Wallet = lazy(() => import('./pages/portal/Wallet'))
const FursonaPage = lazy(() => import('./pages/portal/FursonaPage'))
const Notifications = lazy(() => import('./pages/portal/Notifications'))
const MyData = lazy(() => import('./pages/portal/MyData'))
const EventHub = lazy(() => import('./pages/portal/EventHub'))
const ArtistHome = lazy(() => import('./pages/portal/ArtistHome'))

function Guard({ roles, children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/entrar" state={{ from: loc.pathname }} replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/eventos" element={<EventsCatalog />} />
        <Route path="/eventos/:slug" element={<EventDetails />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/artistas" element={<Artists />} />
        <Route path="/para-organizadores" element={<ForOrganizers />} />
        <Route path="/planos" element={<Pricing />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/ajuda" element={<Help />} />
        <Route path="/privacidade" element={<Privacy />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/contato" element={<Contact />} />
        <Route path="/ingresso/:token" element={<GuestTicket />} />
      </Route>
      <Route element={<PublicLayout bare />}><Route path="/mapa" element={<EventsMapPage />} /></Route>
      <Route path="/entrar" element={<Login />} />
      <Route path="/cadastrar" element={<Register />} />
      <Route path="/login" element={<Navigate to="/entrar" replace />} />
      <Route path="/register" element={<Navigate to="/cadastrar" replace />} />
      <Route path="/events" element={<Navigate to="/eventos" replace />} />
      <Route path="/events/:id" element={<LegacyEvent />} />

      <Route path="/org" element={<Guard roles={['admin', 'volunteer']}><OrgLayout /></Guard>}>
        <Route index element={<OrgIndex />} />
        <Route path="shifts" element={<VolunteerHome />} />
        <Route path="team" element={<Guard roles={['admin']}><Team /></Guard>} />
        <Route path="events/:id" element={<EventWorkspace />}>
          <Route index element={<Dashboard />} />
          <Route path="tickets" element={<TicketsAdmin />} />
          <Route path="attendees" element={<Attendees />} />
          <Route path="checkin" element={<Checkin />} />
          <Route path="schedule" element={<ScheduleAdmin />} />
          <Route path="artists" element={<ArtistsAdmin />} />
          <Route path="volunteers" element={<VolunteersAdmin />} />
          <Route path="finance" element={<FinanceAdmin />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="map" element={<MapAdmin />} />
          <Route path="care" element={<CareAdmin />} />
          <Route path="passport" element={<PassportAdmin />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<EventSettings />} />
        </Route>
      </Route>

      <Route path="/app" element={<Guard roles={['participant', 'artist']}><PortalLayout /></Guard>}>
        <Route index element={<PortalHome />} />
        <Route path="tickets" element={<Wallet />} />
        <Route path="fursona" element={<FursonaPage />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="data" element={<MyData />} />
        <Route path="events/:id" element={<EventHub />} />
        <Route path="artist" element={<Guard roles={['artist']}><ArtistHome /></Guard>} />
      </Route>
      <Route path="/artist" element={<Navigate to="/app/artist" replace />} />
      <Route path="/volunteer" element={<Navigate to="/org/shifts" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

function OrgIndex() {
  const { user } = useAuth()
  return user.role === 'admin' ? <OrgEvents /> : <VolunteerHome />
}

function LegacyEvent() {
  const { id } = useParams()
  const { data, error } = useLoad(() => api.get(`/events/${id}`), [id])
  if (error) return <Navigate to="/eventos" replace />
  return data ? <Navigate to={`/eventos/${data.event.slug}`} replace /> : <Loading />
}
