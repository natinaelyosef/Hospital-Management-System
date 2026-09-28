import client, { unwrap, unwrapPaginated } from './client'
<<<<<<< HEAD
import type { Invoice, Paginated, Prescription, PrescriptionItem, PrescriptionStatus } from '@/types'
=======
<<<<<<< HEAD
import type { Invoice, Paginated, Prescription, PrescriptionItem, PrescriptionStatus } from '@/types'
=======
import type { Paginated, Prescription, PrescriptionItem, PrescriptionStatus } from '@/types'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

export interface PrescriptionListQuery {
  page?: number
  per_page?: number
  status?: string
  search?: string
  patient_id?: number
<<<<<<< HEAD
  visit_id?: number
=======
<<<<<<< HEAD
  visit_id?: number
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  /** Pharmacist handoff: prepare the bill document (medicines + lab costs) for the accountant. */
  async prepareInvoice(id: number, payload: { discount?: number; tax?: number; notes?: string } = {}): Promise<Invoice> {
    const res = await client.post(`/prescriptions/${id}/invoice`, payload)
    return unwrap<Invoice>(res)
  },

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  async pending(query: PrescriptionListQuery = {}): Promise<Paginated<Prescription>> {
    const res = await client.get('/prescriptions/pending', { params: query })
    return unwrapPaginated<Prescription>(res)
  },
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

  async pdf(id: number): Promise<Blob> {
    const res = await client.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' })
    return res.data as Blob
  },
<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
}
