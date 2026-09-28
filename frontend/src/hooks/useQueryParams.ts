import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface UseQueryParamsResult {
  params: URLSearchParams
  get: (key: string, fallback?: string) => string | null
  has: (key: string) => boolean
  set: (patch: Record<string, string | null | undefined>, options?: { replace?: boolean }) => void
  clear: (keys?: string[]) => void
}

/** Thin typed wrapper around the current URL query string. */
export function useQueryParams(): UseQueryParamsResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const set = useCallback(
    (patch: Record<string, string | null | undefined>, options: { replace?: boolean } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined || value === '') next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: options.replace ?? true },
      )
    },
    [setSearchParams],
  )

  const clear = useCallback(
    (keys?: string[]) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          const list = keys ?? [...next.keys()]
          for (const key of list) next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const get = useCallback((key: string, fallback: string | null = null) => searchParams.get(key) ?? fallback, [searchParams])
  const has = useCallback((key: string) => searchParams.has(key), [searchParams])

  return useMemo(() => ({ params: searchParams, get, has, set, clear }), [searchParams, get, has, set, clear])
}

export default useQueryParams
