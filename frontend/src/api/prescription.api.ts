import client, { unwrap, unwrapPaginated } from './client'
import type { Invoice, Paginated, Prescription, PrescriptionItem, PrescriptionStatus } from '@/types'

export interface PrescriptionListQuery {
  page?: number
  per_page?: number
  status?: string
  search?: string
  patient_id?: number
  visit_id?: number
  doctor_id?: number
}

export interface PrescriptionInput {
  patient_id: number
  visit_id?: number
  diagnosis?: string
  notes?: string
  items: Omit<PrescriptionItem, 'id' | 'medicine_name'>[]
}

export const prescriptionApi = {
  async list(query: PrescriptionListQuery = {}): Promise<Paginated<Prescription>> {
    const res = await client.get('/prescriptions', { params: query })
    return unwrapPaginated<Prescription>(res)
  },

  async get(id: number): Promise<Prescription> {
    const res = await client.get(`/prescriptions/${id}`)
    return unwrap<Prescription>(res)
  },

  async create(payload: PrescriptionInput): Promise<Prescription> {
    const res = await client.post('/prescriptions', payload)
    return unwrap<Prescription>(res)
  },

  async updateStatus(id: number, status: PrescriptionStatus): Promise<Prescription> {
    const res = await client.put(`/prescriptions/${id}/status`, { status })
    return unwrap<Prescription>(res)
  },

  /** Pharmacist handoff: prepare the bill document (medicines + lab costs) for the accountant. */
  async prepareInvoice(id: number, payload: { discount?: number; tax?: number; notes?: string } = {}): Promise<Invoice> {
    const res = await client.post(`/prescriptions/${id}/invoice`, payload)
    return unwrap<Invoice>(res)
  },

  async pending(query: PrescriptionListQuery = {}): Promise<Paginated<Prescription>> {
    const res = await client.get('/prescriptions/pending', { params: query })
    return unwrapPaginated<Prescription>(res)
  },

  async pdf(id: number): Promise<Blob> {
    const res = await client.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' })
    return res.data as Blob
  },
}
