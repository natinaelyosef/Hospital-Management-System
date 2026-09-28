import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface UsePaginationOptions {
  defaultPerPage?: number
  pageKey?: string
  perPageKey?: string
}

/** Keeps `page` / `per_page` in sync with the URL query string. */
export function usePagination(options: UsePaginationOptions = {}) {
  const { defaultPerPage = 15, pageKey = 'page', perPageKey = 'per_page' } = options
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get(pageKey) ?? '1') || 1)
  const perPage = Math.max(1, Number(searchParams.get(perPageKey) ?? defaultPerPage) || defaultPerPage)

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === '') next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setPage = useCallback((next: number) => update({ [pageKey]: next > 1 ? String(next) : null }), [update, pageKey])
  const setPerPage = useCallback(
    (next: number) => update({ [perPageKey]: String(next), [pageKey]: null }),
    [update, perPageKey, pageKey],
  )
  const resetPage = useCallback(() => setPage(1), [setPage])

  return useMemo(
    () => ({ page, perPage, setPage, setPerPage, resetPage, query: { page, per_page: perPage } }),
    [page, perPage, setPage, setPerPage, resetPage],
  )
}

export default usePagination
