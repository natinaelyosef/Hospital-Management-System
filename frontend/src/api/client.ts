import axios, { type AxiosResponse } from 'axios'
import type { ApiResponse, Paginated, PaginationMeta } from '@/types'

export const TOKEN_KEY = 'medicare_token'
export const USER_KEY = 'medicare_user'

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
}

const client = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
<<<<<<< HEAD
    const cannotReachApi = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')
    return {
      message: cannotReachApi
        ? 'Cannot reach the hospital server. Make sure the backend is running at http://localhost:8000, then try again.'
        : body?.message ?? error.message ?? 'Request failed',
=======
    return {
      message: body?.message ?? error.message ?? 'Request failed',
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
      errors: body?.errors,
      status: error.response?.status,
    }
  }
  return { message: error instanceof Error ? error.message : 'Request failed' }
}

client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
<<<<<<< HEAD
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    // Either front door counts as a login page, so a 401 there is a plain
    // "please sign in" rather than a reason to clear the session.
    const onLoginPage =
      path.startsWith('/login') ||
      path.startsWith('/patient/login') ||
      path.startsWith('/staff/login')
=======
    const onLoginPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/login')
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    const isLoginAttempt = axios.isAxiosError(error) && Boolean(error.config?.url?.includes('/auth/login'))

    if (status === 401 && !onLoginPage && !isLoginAttempt) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
<<<<<<< HEAD
      // Send the visitor back to the chooser, which remembers the front door
      // they came from.
      window.location.assign('/start')
=======
      window.location.assign('/login')
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    }
    return Promise.reject(normalizeError(error))
  },
)

/**
 * Every success payload wraps its primary payload in `data`.
 * `unwrap(res)` returns `res.data.data`, falling back to `res.data` for bare payloads.
 */
export function unwrap<T>(res: AxiosResponse<ApiResponse<T> | T>): T {
  const body = res.data as { data?: T }
  if (body && typeof body === 'object' && 'data' in body) return body.data as T
  return res.data as T
}

/**
 * List payload in one of two shapes:
 * - paginated `{ data: T[], meta }`
 * - lookup `{ data: T[] }` or a bare `T[]`
 * Returns `{ data, meta }`, synthesising a single-page meta when the server omits it.
 */
export function unwrapPaginated<T>(res: AxiosResponse): Paginated<T> {
  const body = res.data as { data?: T[]; meta?: PaginationMeta } | undefined
  const data = Array.isArray(body)
    ? (body as unknown as T[])
    : Array.isArray(body?.data)
      ? body.data
      : []
  const meta: PaginationMeta = (body && !Array.isArray(body) ? body.meta : undefined) ?? {
    current_page: 1,
    last_page: 1,
    per_page: data.length || 15,
    total: data.length,
  }
  return { data, meta }
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as ApiError).message === 'string') {
    return (error as ApiError).message
  }
  if (error instanceof Error) return error.message
  return fallback
}

export function getFieldErrors(error: unknown): Record<string, string[]> {
  if (error && typeof error === 'object' && 'errors' in error) {
    const errors = (error as ApiError).errors
    if (errors) return errors
  }
  return {}
}

export default client
