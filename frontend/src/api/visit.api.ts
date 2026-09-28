import client, { unwrap, unwrapPaginated } from './client'
<<<<<<< HEAD
import type {
  MedicalNote,
  NoteType,
  Paginated,
  SuggestedDepartment,
  TimelineEntry,
  VitalSign,
  VitalSignInput,
  Visit,
  VisitPriority,
  VisitSeverity,
} from '@/types'
=======
import type { MedicalNote, NoteType, Paginated, VitalSign, VitalSignInput, Visit } from '@/types'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

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

<<<<<<< HEAD
export interface IntakeVitals {
  bp_systolic?: number
  bp_diastolic?: number
  temperature?: number
  pulse?: number
  oxygen_saturation?: number
  weight?: number
  height?: number
  respiratory_rate?: number
  notes?: string
}

export interface IntakePayload {
  patient_id: number
  type: string
  priority?: VisitPriority
  chief_complaint: string
  symptoms?: string
  symptom_duration?: string
  severity?: VisitSeverity
  previous_conditions?: string
  current_medications?: string
  allergies?: string
  intake_notes?: string
  department_id?: number
  visit_date?: string
  vitals?: IntakeVitals
}

export interface IntakeResponse {
  visit: Visit
  suggested_departments: SuggestedDepartment[]
}

export interface ReferPayload {
  department_id: number
  doctor_id?: number
  priority?: VisitPriority
  notes?: string
}

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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

<<<<<<< HEAD
  async complete(id: number, payload?: { diagnosis?: string; note?: string }): Promise<Visit> {
    const res = await client.post(`/visits/${id}/complete`, payload ?? {})
    return unwrap<Visit>(res)
  },

  /** Patient Complaint / Initial Assessment — reception or the patient themselves. */
  async intake(payload: IntakePayload): Promise<IntakeResponse> {
    const res = await client.post('/visits/intake', payload)
    return unwrap<IntakeResponse>(res)
  },

  async updateIntake(id: number, payload: Partial<IntakePayload>): Promise<Visit> {
    const res = await client.put(`/visits/${id}/intake`, payload)
    return unwrap<Visit>(res)
  },

  /** Route the case to a department (optionally naming a doctor). */
  async refer(id: number, payload: ReferPayload): Promise<Visit> {
    const res = await client.post(`/visits/${id}/refer`, payload)
    return unwrap<Visit>(res)
  },

  async startTriage(id: number): Promise<Visit> {
    const res = await client.post(`/visits/${id}/start-triage`)
    return unwrap<Visit>(res)
  },

  async completeTriage(id: number, payload?: { priority?: VisitPriority; note?: string }): Promise<Visit> {
    const res = await client.post(`/visits/${id}/complete-triage`, payload ?? {})
    return unwrap<Visit>(res)
  },

  async startConsultation(id: number): Promise<Visit> {
    const res = await client.post(`/visits/${id}/start-consultation`)
    return unwrap<Visit>(res)
  },

  async labReviewed(id: number, note?: string): Promise<Visit> {
    const res = await client.post(`/visits/${id}/lab-reviewed`, note ? { note } : {})
    return unwrap<Visit>(res)
  },

  async cancelVisit(id: number, note?: string): Promise<Visit> {
    const res = await client.post(`/visits/${id}/cancel`, note ? { note } : {})
    return unwrap<Visit>(res)
  },

  /** Immutable handoff history for the Patient Journey timeline. */
  async timeline(id: number): Promise<TimelineEntry[]> {
    const res = await client.get(`/visits/${id}/timeline`)
    return unwrap<TimelineEntry[]>(res)
  },

=======
  async complete(id: number): Promise<Visit> {
    const res = await client.post(`/visits/${id}/complete`)
    return unwrap<Visit>(res)
  },

>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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
