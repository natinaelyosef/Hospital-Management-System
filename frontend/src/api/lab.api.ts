import client, { unwrap, unwrapPaginated } from './client'
import type { LabRequest, LabTest, Paginated } from '@/types'

export interface LabTestListQuery {
  page?: number
  per_page?: number
  search?: string
}

export interface LabTestInput {
  name: string
  code: string
  category: string
  price: number
  description?: string
  is_active?: boolean
}

export interface LabRequestListQuery {
  page?: number
  per_page?: number
  status?: string
  search?: string
  date?: string
  patient_id?: number
<<<<<<< HEAD
  visit_id?: number
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}

export interface LabRequestInput {
  patient_id: number
  visit_id?: number
  doctor_id?: number
  priority: string
  notes?: string
  test_ids: number[]
}

export interface LabResultInput {
  lab_test_id: number
  result_value: string
  reference_range?: string
  unit?: string
  notes?: string
}

export const labApi = {
  async tests(query: LabTestListQuery = {}): Promise<Paginated<LabTest>> {
    const res = await client.get('/lab-tests', { params: query })
    return unwrapPaginated<LabTest>(res)
  },

  async createTest(payload: LabTestInput): Promise<LabTest> {
    const res = await client.post('/lab-tests', payload)
    return unwrap<LabTest>(res)
  },

  async updateTest(id: number, payload: Partial<LabTestInput>): Promise<LabTest> {
    const res = await client.put(`/lab-tests/${id}`, payload)
    return unwrap<LabTest>(res)
  },

  async removeTest(id: number): Promise<void> {
    await client.delete(`/lab-tests/${id}`)
  },

  async requests(query: LabRequestListQuery = {}): Promise<Paginated<LabRequest>> {
    const res = await client.get('/lab-requests', { params: query })
    return unwrapPaginated<LabRequest>(res)
  },

  async request(id: number): Promise<LabRequest> {
    const res = await client.get(`/lab-requests/${id}`)
    return unwrap<LabRequest>(res)
  },

  async createRequest(payload: LabRequestInput): Promise<LabRequest> {
    const res = await client.post('/lab-requests', payload)
    return unwrap<LabRequest>(res)
  },

  async start(id: number): Promise<LabRequest> {
    const res = await client.post(`/lab-requests/${id}/start`)
    return unwrap<LabRequest>(res)
  },

  async submitResults(id: number, results: LabResultInput[]): Promise<LabRequest> {
    const res = await client.post(`/lab-requests/${id}/results`, { results })
    return unwrap<LabRequest>(res)
  },

  async cancel(id: number): Promise<LabRequest> {
    const res = await client.post(`/lab-requests/${id}/cancel`)
    return unwrap<LabRequest>(res)
  },
<<<<<<< HEAD

  async reportPdf(id: number): Promise<Blob> {
    const res = await client.get(`/lab-requests/${id}/pdf`, { responseType: 'blob' })
    return res.data as Blob
  },
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}
