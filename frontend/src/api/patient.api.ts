import client, { unwrap, unwrapPaginated } from './client'
import type {
  Appointment,
  Invoice,
  Paginated,
  Patient,
  PatientDocument,
  PatientSummary,
  PatientInput,
  Prescription,
  VitalSign,
  VitalSignInput,
  Visit,
} from '@/types'

export interface ListQuery {
  page?: number
  per_page?: number
  search?: string
}

export interface PatientListQuery extends ListQuery {
  gender?: string
  blood_group?: string
}

export const patientApi = {
  async list(query: PatientListQuery = {}): Promise<Paginated<Patient>> {
    const res = await client.get('/patients', { params: query })
    return unwrapPaginated<Patient>(res)
  },

  async get(id: number): Promise<Patient> {
    const res = await client.get(`/patients/${id}`)
    return unwrap<Patient>(res)
  },

  async create(payload: PatientInput): Promise<Patient> {
    const res = await client.post('/patients', payload)
    return unwrap<Patient>(res)
  },

  async update(id: number, payload: Partial<PatientInput>): Promise<Patient> {
    const res = await client.put(`/patients/${id}`, payload)
    return unwrap<Patient>(res)
  },

  async remove(id: number): Promise<void> {
    await client.delete(`/patients/${id}`)
  },

  async search(term: string): Promise<Patient[]> {
    const res = await client.post('/patients/search', { search: term })
    return unwrap<Patient[]>(res)
  },

  async summary(): Promise<PatientSummary> {
    const res = await client.get('/patients/summary')
    return unwrap<PatientSummary>(res)
  },

  async documents(id: number, query: ListQuery = {}): Promise<Paginated<PatientDocument>> {
    const res = await client.get(`/patients/${id}/documents`, { params: query })
    return unwrapPaginated<PatientDocument>(res)
  },

  async uploadDocument(id: number, file: File): Promise<PatientDocument> {
    const form = new FormData()
    form.append('file', file)
    const res = await client.post(`/patients/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return unwrap<PatientDocument>(res)
  },

  async removeDocument(documentId: number): Promise<void> {
    await client.delete(`/documents/${documentId}`)
  },

  async visits(id: number, query: ListQuery = {}): Promise<Paginated<Visit>> {
    const res = await client.get(`/patients/${id}/visits`, { params: query })
    return unwrapPaginated<Visit>(res)
  },

  async appointments(id: number, query: ListQuery = {}): Promise<Paginated<Appointment>> {
    const res = await client.get(`/patients/${id}/appointments`, { params: query })
    return unwrapPaginated<Appointment>(res)
  },

  async prescriptions(id: number, query: ListQuery = {}): Promise<Paginated<Prescription>> {
    const res = await client.get(`/patients/${id}/prescriptions`, { params: query })
    return unwrapPaginated<Prescription>(res)
  },

  async invoices(id: number, query: ListQuery = {}): Promise<Paginated<Invoice>> {
    const res = await client.get(`/patients/${id}/invoices`, { params: query })
    return unwrapPaginated<Invoice>(res)
  },

  async vitals(id: number, query: ListQuery = {}): Promise<Paginated<VitalSign>> {
    const res = await client.get(`/patients/${id}/vitals`, { params: query })
    return unwrapPaginated<VitalSign>(res)
  },

  async recordVitals(id: number, payload: VitalSignInput): Promise<VitalSign> {
    const res = await client.post(`/patients/${id}/vitals`, payload)
    return unwrap<VitalSign>(res)
  },
}
