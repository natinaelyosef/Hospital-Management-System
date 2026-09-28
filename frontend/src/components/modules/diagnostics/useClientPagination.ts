import { useEffect, useState } from 'react'
import type { PaginationMeta } from '@/types'

const DEFAULT_PER_PAGE = 15

/** Slices an already-loaded row set into pages and synthesises the meta `Pagination` expects. */
export function useClientPagination<T>(rows: T[], perPage: number = DEFAULT_PER_PAGE) {
  const [page, setPage] = useState(1)
  const lastPage = Math.max(1, Math.ceil(rows.length / perPage))

  useEffect(() => {
    if (page > lastPage) setPage(lastPage)
  }, [page, lastPage])

  const paged = rows.slice((page - 1) * perPage, page * perPage)
  const meta: PaginationMeta = {
    current_page: page,
    last_page: lastPage,
    per_page: perPage,
    total: rows.length,
  }

  return { page, setPage, paged, meta }
}

export default useClientPagination
