import client, { unwrap } from './client'

export interface SearchHit {
  id: number
  title: string
  subtitle: string
  url: string
}

export type SearchScope =
  | 'patients'
  | 'doctors'
  | 'appointments'
  | 'prescriptions'
  | 'lab_requests'
  | 'admissions'
  | 'invoices'

export type SearchResults = Partial<Record<SearchScope, SearchHit[]>>

export const searchApi = {
  async global(query: string, scope?: SearchScope[]): Promise<SearchResults> {
    const res = await client.get('/search', {
      params: scope && scope.length > 0 ? { q: query, scope: scope.join(',') } : { q: query },
    })
    return unwrap<SearchResults>(res)
  },
}
