import client, { unwrap, unwrapPaginated } from './client'
import type {
  AuditLog,
  Department,
  Doctor,
  DoctorSchedule,
  Paginated,
  Service,
  Settings,
} from '@/types'

export interface ListQuery {
  page?: number
  per_page?: number
  search?: string
}

export interface DepartmentListQuery extends ListQuery {
  code?: string
}

export interface DoctorListQuery extends ListQuery {
  department_id?: number
}

export interface DoctorInput {
  name: string
  email?: string | null
  password?: string
  department_id?: number | null
  license_number: string
  specialization: string
  consultation_fee: number
  phone?: string | null
  bio?: string | null
  is_active: boolean
  schedules: DoctorSchedule[]
}

export interface AuditListQuery extends ListQuery {
  action?: string
}

export interface ServiceListQuery extends ListQuery {
  category?: string
}

const departments = {
  async list(query: DepartmentListQuery = {}): Promise<Paginated<Department>> {
    const res = await client.get('/departments', { params: query })
    return unwrapPaginated<Department>(res)
  },

  async create(payload: { name: string; code: string; description?: string }): Promise<Department> {
    const res = await client.post('/departments', payload)
    return unwrap<Department>(res)
  },

  async update(id: number, payload: Partial<{ name: string; code: string; description: string }>): Promise<Department> {
    const res = await client.put(`/departments/${id}`, payload)
    return unwrap<Department>(res)
  },

  async remove(id: number): Promise<void> {
    await client.delete(`/departments/${id}`)
  },
}

const doctors = {
  async list(query: DoctorListQuery = {}): Promise<Paginated<Doctor>> {
    const res = await client.get('/doctors', { params: query })
    return unwrapPaginated<Doctor>(res)
  },

  async available(date: string, departmentId?: number): Promise<Doctor[]> {
    const res = await client.get('/doctors/available', {
      params: departmentId ? { date, department_id: departmentId } : { date },
    })
    return unwrap<Doctor[]>(res)
  },

  async create(payload: DoctorInput): Promise<Doctor> {
    const res = await client.post('/doctors', payload)
    return unwrap<Doctor>(res)
  },

  async update(id: number, payload: Partial<DoctorInput>): Promise<Doctor> {
    const res = await client.put(`/doctors/${id}`, payload)
    return unwrap<Doctor>(res)
  },

  async remove(id: number): Promise<void> {
    await client.delete(`/doctors/${id}`)
  },

  async schedule(id: number): Promise<DoctorSchedule[]> {
    const res = await client.get(`/doctors/${id}/schedule`)
    return unwrap<DoctorSchedule[]>(res)
  },

  async updateSchedule(id: number, schedules: DoctorSchedule[]): Promise<DoctorSchedule[]> {
    const res = await client.put(`/doctors/${id}/schedule`, { schedules })
    return unwrap<DoctorSchedule[]>(res)
  },
}

const services = {
  async list(query: ServiceListQuery = {}): Promise<Paginated<Service>> {
    const res = await client.get('/services', { params: query })
    return unwrapPaginated<Service>(res)
  },

  async create(payload: { name: string; code: string; category: string; price: number; is_active?: boolean }): Promise<Service> {
    const res = await client.post('/services', payload)
    return unwrap<Service>(res)
  },

  async update(
    id: number,
    payload: Partial<{ name: string; code: string; category: string; price: number; is_active: boolean }>,
  ): Promise<Service> {
    const res = await client.put(`/services/${id}`, payload)
    return unwrap<Service>(res)
  },

  async remove(id: number): Promise<void> {
    await client.delete(`/services/${id}`)
  },
}

const settings = {
  async get(): Promise<Settings> {
    const res = await client.get('/settings')
    return unwrap<Settings>(res)
  },

  async update(payload: Partial<Settings>): Promise<Settings> {
    await client.put('/settings', payload)
    const res = await client.get('/settings')
    return unwrap<Settings>(res)
  },
}

const audit = {
  async list(query: AuditListQuery = {}): Promise<Paginated<AuditLog>> {
    const res = await client.get('/audit-logs', { params: query })
    return unwrapPaginated<AuditLog>(res)
  },
}

export const miscApi = { departments, doctors, services, settings, audit }
