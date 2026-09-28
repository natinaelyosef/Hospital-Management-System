import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
<<<<<<< HEAD
import { authApi, type AcceptInvitePayload, type RegisterPayload, type RegisterResponse } from '@/api/auth.api'
import { TOKEN_KEY, USER_KEY } from '@/api/client'
import type { Portal, User } from '@/types'
=======
import { authApi } from '@/api/auth.api'
import { TOKEN_KEY, USER_KEY } from '@/api/client'
import type { User } from '@/types'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
<<<<<<< HEAD
  /** The front door this session belongs to, derived from the signed-in role. */
  portal: Portal | null
  login: (email: string, password: string, portal: Portal) => Promise<User>
  register: (payload: RegisterPayload) => Promise<RegisterResponse>
  acceptInvite: (payload: AcceptInvitePayload) => Promise<User>
=======
  login: (email: string, password: string) => Promise<User>
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  logout: () => Promise<void>
  updateUser: (user: User) => void
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (...permissions: string[]) => boolean
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

<<<<<<< HEAD
/** Patients and staff are separated by role, not by permission. */
function portalOf(user: User | null): Portal | null {
  if (!user) return null
  return user.role?.name === 'patient' ? 'patient' : 'staff'
}

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(() => readStoredUser())
<<<<<<< HEAD
  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem(TOKEN_KEY)) && !readStoredUser(),
  )
=======
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const restored = useRef(false)

  useEffect(() => {
    if (!token || restored.current) {
      if (!token) setLoading(false)
      return
    }
    restored.current = true
    let active = true
    authApi
      .me()
      .then((me) => {
        if (!active) return
        setUser(me)
        localStorage.setItem(USER_KEY, JSON.stringify(me))
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])

<<<<<<< HEAD
  const login = useCallback(async (email: string, password: string, portal: Portal): Promise<User> => {
    const result = await authApi.login(email, password, portal)
=======
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const result = await authApi.login(email, password)
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
    restored.current = true
    setToken(result.token)
    setUser(result.user)
    setLoading(false)
    return result.user
  }, [])

<<<<<<< HEAD
  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const result = await authApi.register(payload)
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
    restored.current = true
    setToken(result.token)
    setUser(result.user)
    setLoading(false)
    return result
  }, [])

  const acceptInvite = useCallback(async (payload: AcceptInvitePayload): Promise<User> => {
    const result = await authApi.acceptInvite(payload)
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
    restored.current = true
    setToken(result.token)
    setUser(result.user)
    setLoading(false)
    return result.user
  }, [])

  const logout = useCallback(async () => {    try {
=======
  const logout = useCallback(async () => {
    try {
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
      await authApi.logout()
    } catch {
      // session already invalid — clear locally regardless
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    restored.current = false
  }, [])

  const updateUser = useCallback((next: User) => {
    setUser(next)
    localStorage.setItem(USER_KEY, JSON.stringify(next))
  }, [])

  const permissions = useMemo(() => new Set(user?.role?.permissions ?? []), [user])

  const hasPermission = useCallback(
    (permission: string) => permissions.has(permission),
    [permissions],
  )

  const hasAnyPermission = useCallback(
    (...list: string[]) => list.length === 0 || list.some((permission) => permissions.has(permission)),
    [permissions],
  )

  const hasRole = useCallback((role: string) => user?.role?.name === role, [user])

<<<<<<< HEAD
  const portal = useMemo(() => portalOf(user), [user])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, portal, login, register, acceptInvite, logout, updateUser, hasPermission, hasAnyPermission, hasRole }),
    [user, token, loading, portal, login, register, acceptInvite, logout, updateUser, hasPermission, hasAnyPermission, hasRole],
=======
  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, logout, updateUser, hasPermission, hasAnyPermission, hasRole }),
    [user, token, loading, login, logout, updateUser, hasPermission, hasAnyPermission, hasRole],
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
