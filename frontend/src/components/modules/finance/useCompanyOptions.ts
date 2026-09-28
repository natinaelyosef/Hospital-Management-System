import { useQuery } from '@tanstack/react-query'
import { insuranceApi } from '@/api/insurance.api'

/** Shared, cached lookup used by pickers and selects across the finance module. */
export const COMPANY_LOOKUP = { page: 1, per_page: 100 }

export function useCompanyOptions() {
  return useQuery({
    queryKey: ['insurance-companies', COMPANY_LOOKUP],
    queryFn: () => insuranceApi.companies(COMPANY_LOOKUP),
    staleTime: 5 * 60_000,
  })
}
