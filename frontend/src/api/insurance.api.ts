import client, { unwrap, unwrapPaginated } from './client'
import type {
  InsuranceClaim,
  InsuranceClaimStatus,
  InsuranceCompany,
  Paginated,
  PatientInsurance,
} from '@/types'

export interface CompanyListQuery {
  page?: number
  per_page?: number
  search?: string
}

export interface CompanyInput {
  name: string
  code: string
  phone?: string
  email?: string
  address?: string
  is_active?: boolean
}

export interface PatientInsuranceListQuery {
  page?: number
  per_page?: number
  patient_id?: number
  company_id?: number
}

export interface PatientInsuranceInput {
  patient_id: number
  company_id: number
  policy_number: string
  holder_name: string
  coverage_percent: number
  coverage_limit?: number | null
  start_date: string
  end_date?: string | null
  is_active?: boolean
}

export interface ClaimListQuery {
  page?: number
  per_page?: number
  status?: string
}

export interface ClaimInput {
  invoice_id: number
<<<<<<< HEAD
  company_id?: number
  patient_insurance_id: number
=======
  company_id: number
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  amount: number
  notes?: string
}

export const insuranceApi = {
  async companies(query: CompanyListQuery = {}): Promise<Paginated<InsuranceCompany>> {
    const res = await client.get('/insurance-companies', { params: query })
    return unwrapPaginated<InsuranceCompany>(res)
  },

  async createCompany(payload: CompanyInput): Promise<InsuranceCompany> {
    const res = await client.post('/insurance-companies', payload)
    return unwrap<InsuranceCompany>(res)
  },

  async updateCompany(id: number, payload: Partial<CompanyInput>): Promise<InsuranceCompany> {
    const res = await client.put(`/insurance-companies/${id}`, payload)
    return unwrap<InsuranceCompany>(res)
  },

  async removeCompany(id: number): Promise<void> {
    await client.delete(`/insurance-companies/${id}`)
  },

  async policies(query: PatientInsuranceListQuery = {}): Promise<Paginated<PatientInsurance>> {
    const res = await client.get('/patient-insurances', { params: query })
    return unwrapPaginated<PatientInsurance>(res)
  },

  async createPolicy(payload: PatientInsuranceInput): Promise<PatientInsurance> {
    const res = await client.post('/patient-insurances', payload)
    return unwrap<PatientInsurance>(res)
  },

  async updatePolicy(id: number, payload: Partial<PatientInsuranceInput>): Promise<PatientInsurance> {
    const res = await client.put(`/patient-insurances/${id}`, payload)
    return unwrap<PatientInsurance>(res)
  },

  async claims(query: ClaimListQuery = {}): Promise<Paginated<InsuranceClaim>> {
    const res = await client.get('/insurance-claims', { params: query })
    return unwrapPaginated<InsuranceClaim>(res)
  },

  async createClaim(payload: ClaimInput): Promise<InsuranceClaim> {
    const res = await client.post('/insurance-claims', payload)
    return unwrap<InsuranceClaim>(res)
  },

  async updateClaim(id: number, payload: Partial<ClaimInput>): Promise<InsuranceClaim> {
    const res = await client.put(`/insurance-claims/${id}`, payload)
    return unwrap<InsuranceClaim>(res)
  },

  async updateClaimStatus(
    id: number,
    payload: { status: InsuranceClaimStatus; approved_amount?: number; notes?: string },
  ): Promise<InsuranceClaim> {
    const res = await client.put(`/insurance-claims/${id}/status`, payload)
    return unwrap<InsuranceClaim>(res)
  },
}
