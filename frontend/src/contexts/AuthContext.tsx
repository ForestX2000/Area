
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  clearAuth,
  getAuth,
  login as loginAuth,
  register as registerAuth,
  setAuth,
  type User,
} from '../utils/auth'

interface AuthContextType {
  user: User | null
  token: string | null
  isReady: boolean
  login: (
    email: string,
    password: string,
  ) => { ok: boolean; error?: string; user?: User }
  register: (
    name: string,
    email: string,
    password: string,
  ) => { ok: boolean; error?: string; user?: User }
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    if (auth) {
      setToken(auth.token)
      setUser(auth.user)
    }
    setIsReady(true)
  }, [])

  function login(email: string, password: string) {
    const result = loginAuth(email, password)
    if (result.ok && result.user) {
      const newToken = 'mock-token-' + crypto.randomUUID()
      setAuth(newToken, result.user)
      setToken(newToken)
      setUser(result.user)
    }
    return result
  }

  function register(
    name: string,
    email: string,
    password: string,
  ): { ok: boolean; error?: string; user?: User } {
    const result = registerAuth(name, email, password)
    if (result.ok && result.user) {
      const newToken = 'mock-token-' + crypto.randomUUID()
      setAuth(newToken, result.user)
      setToken(newToken)
      setUser(result.user)
    }
    return result
  }

  function logout() {
    clearAuth()
    setToken(null)
    setUser(null)
  }

  if (!isReady) return null

  return (
    <AuthContext.Provider
      value={{ user, token, isReady: true, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри AuthProvider')
  }
  return ctx
}
