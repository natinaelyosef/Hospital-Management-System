import client, { unwrap, unwrapPaginated } from './client'
import type { Appointment, AppointmentSlot, Paginated } from '@/types'

export interface AppointmentListQuery {
  page?: number
  per_page?: number
  date?: string
  status?: string
  doctor_id?: number
  patient_id?: number
  search?: string
}

export interface AppointmentInput {
  patient_id: number
  doctor_id: number
  appointment_date: string
  start_time: string
  end_time?: string
  type?: string
  reason?: string
  notes?: string
}

export interface StatusPayload {
  status: string
  cancelled_reason?: string
}

export const appointmentApi = {
  async list(query: AppointmentListQuery = {}): Promise<Paginated<Appointment>> {
    const res = await client.get('/appointments', { params: query })
    return unwrapPaginated<Appointment>(res)
  },

  async get(id: number): Promise<Appointment> {
    const res = await client.get(`/appointments/${id}`)
    return unwrap<Appointment>(res)
  },

  async create(payload: AppointmentInput): Promise<Appointment> {
    const res = await client.post('/appointments', payload)
    return unwrap<Appointment>(res)
  },

  async update(id: number, payload: Partial<AppointmentInput>): Promise<Appointment> {
    const res = await client.put(`/appointments/${id}`, payload)
    return unwrap<Appointment>(res)
  },

  async remove(id: number): Promise<void> {
    await client.delete(`/appointments/${id}`)
  },

  async updateStatus(id: number, payload: StatusPayload): Promise<Appointment> {
    const res = await client.put(`/appointments/${id}/status`, payload)
    return unwrap<Appointment>(res)
  },

  async today(): Promise<Appointment[]> {
    const res = await client.get('/appointments/today')
    return unwrap<Appointment[]>(res)
  },

  async slots(doctorId: number, date: string): Promise<AppointmentSlot[]> {
    const res = await client.get('/appointments/slots', { params: { doctor_id: doctorId, date } })
    return unwrap<AppointmentSlot[]>(res)
  },

  async queue(date = 'today'): Promise<Appointment[]> {
    const res = await client.get('/appointments/queue', { params: { date } })
    return unwrap<Appointment[]>(res)
  },

  async call(id: number): Promise<Appointment> {
    const res = await client.post(`/appointments/${id}/call`)
    return unwrap<Appointment>(res)
  },
}
