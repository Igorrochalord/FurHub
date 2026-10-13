import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export const homeFor = (u) =>
  !u ? '/entrar' : u.role === 'admin' ? '/org' : u.role === 'volunteer' ? '/volunteer' : u.role === 'artist' ? '/artist' : '/app'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())

  useEffect(() => {
    if (!getToken()) return
    api.get('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const out = () => setUser(null)
    window.addEventListener('furconhub:logout', out)
    return () => window.removeEventListener('furconhub:logout', out)
  }, [])

  const accept = useCallback((res) => {
    setToken(res.access_token)
    setUser(res.user)
    return res.user
  }, [])

  const login = (email, password) => api.post('/auth/login', { email, password }).then(accept)
  const register = (body, organizer) => api.post(organizer ? '/auth/register-organizer' : '/auth/register', body).then(accept)
  const logout = () => { setToken(null); setUser(null) }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}
