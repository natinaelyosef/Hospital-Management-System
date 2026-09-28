import client, { unwrap, unwrapPaginated } from './client'
import type { MedicalNote, NoteType, Paginated, VitalSign, VitalSignInput, Visit } from '@/types'

export interface VisitListQuery {
  page?: number
  per_page?: number
  patient_id?: number
  doctor_id?: number
  date?: string
  status?: string
  search?: string
}

export interface VisitInput {
  patient_id: number
  doctor_id?: number
  appointment_id?: number
  department_id?: number
  type?: string
  chief_complaint?: string
  symptoms?: string
  diagnosis?: string
  treatment?: string
  medical_notes?: string
  follow_up_date?: string | null
}

export interface MedicalNoteInput {
  note_type: NoteType
  content: string
}

export const visitApi = {
  async list(query: VisitListQuery = {}): Promise<Paginated<Visit>> {
    const res = await client.get('/visits', { params: query })
    return unwrapPaginated<Visit>(res)
  },

  async get(id: number): Promise<Visit> {
    const res = await client.get(`/visits/${id}`)
    return unwrap<Visit>(res)
  },

  async create(payload: VisitInput): Promise<Visit> {
    const res = await client.post('/visits', payload)
    return unwrap<Visit>(res)
  },

  async update(id: number, payload: Partial<VisitInput>): Promise<Visit> {
    const res = await client.put(`/visits/${id}`, payload)
    return unwrap<Visit>(res)
  },

  async complete(id: number): Promise<Visit> {
    const res = await client.post(`/visits/${id}/complete`)
    return unwrap<Visit>(res)
  },

  async vitals(id: number): Promise<VitalSign[]> {
    const res = await client.get(`/visits/${id}/vitals`)
    return unwrap<VitalSign[]>(res)
  },

  async recordVitals(id: number, payload: VitalSignInput): Promise<VitalSign> {
    const res = await client.post(`/visits/${id}/vitals`, payload)
    return unwrap<VitalSign>(res)
  },

  async notes(id: number): Promise<MedicalNote[]> {
    const res = await client.get(`/visits/${id}/notes`)
    return unwrap<MedicalNote[]>(res)
  },

  async addNote(id: number, payload: MedicalNoteInput): Promise<MedicalNote> {
    const res = await client.post(`/visits/${id}/notes`, payload)
    return unwrap<MedicalNote>(res)
  },
}
