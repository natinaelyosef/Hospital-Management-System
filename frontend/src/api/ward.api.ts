import client, { unwrap, unwrapPaginated } from './client'
import type { Admission, Bed, BedAvailability, Paginated, Room, Ward } from '@/types'

export interface WardListQuery {
  page?: number
  per_page?: number
  search?: string
}

export interface WardInput {
  name: string
  code: string
  floor?: string
  type: string
}

export interface RoomInput {
  room_number: string
  type: string
  tariff: number
  capacity: number
}

export interface BedInput {
  bed_number: string
  status?: string
}

export interface AdmissionListQuery {
  page?: number
  per_page?: number
  status?: string
  search?: string
  ward_id?: number
}

export interface AdmissionInput {
  patient_id: number
  ward_id: number
  room_id: number
  bed_id: number
  consultant_id?: number
  diagnosis?: string
}

export const wardApi = {
  async wards(query: WardListQuery = {}): Promise<Paginated<Ward>> {
    const res = await client.get('/wards', { params: query })
    return unwrapPaginated<Ward>(res)
  },

  async ward(id: number): Promise<Ward> {
    const res = await client.get(`/wards/${id}`)
    return unwrap<Ward>(res)
  },

  async createWard(payload: WardInput): Promise<Ward> {
    const res = await client.post('/wards', payload)
    return unwrap<Ward>(res)
  },

  async updateWard(id: number, payload: Partial<WardInput>): Promise<Ward> {
    const res = await client.put(`/wards/${id}`, payload)
    return unwrap<Ward>(res)
  },

  async removeWard(id: number): Promise<void> {
    await client.delete(`/wards/${id}`)
  },

  async rooms(wardId: number): Promise<Room[]> {
    const res = await client.get(`/wards/${wardId}/rooms`)
    return unwrap<Room[]>(res)
  },

  async createRoom(wardId: number, payload: RoomInput): Promise<Room> {
    const res = await client.post(`/wards/${wardId}/rooms`, payload)
    return unwrap<Room>(res)
  },

  async updateRoom(wardId: number, roomId: number, payload: Partial<RoomInput>): Promise<Room> {
    const res = await client.put(`/wards/${wardId}/rooms/${roomId}`, payload)
    return unwrap<Room>(res)
  },

  async removeRoom(wardId: number, roomId: number): Promise<void> {
    await client.delete(`/wards/${wardId}/rooms/${roomId}`)
  },

  async beds(roomId: number): Promise<Bed[]> {
    const res = await client.get(`/rooms/${roomId}/beds`)
    return unwrap<Bed[]>(res)
  },

  async createBed(roomId: number, payload: BedInput): Promise<Bed> {
    const res = await client.post(`/rooms/${roomId}/beds`, payload)
    return unwrap<Bed>(res)
  },

  async updateBed(roomId: number, bedId: number, payload: Partial<BedInput>): Promise<Bed> {
    const res = await client.put(`/rooms/${roomId}/beds/${bedId}`, payload)
    return unwrap<Bed>(res)
  },

  async removeBed(roomId: number, bedId: number): Promise<void> {
    await client.delete(`/rooms/${roomId}/beds/${bedId}`)
  },

  async bedAvailability(): Promise<BedAvailability> {
    const res = await client.get('/wards/beds/availability')
    return unwrap<BedAvailability>(res)
  },

  async admissions(query: AdmissionListQuery = {}): Promise<Paginated<Admission>> {
    const res = await client.get('/admissions', { params: query })
    return unwrapPaginated<Admission>(res)
  },

  async admission(id: number): Promise<Admission> {
    const res = await client.get(`/admissions/${id}`)
    return unwrap<Admission>(res)
  },

  async admit(payload: AdmissionInput): Promise<Admission> {
    const res = await client.post('/admissions', payload)
    return unwrap<Admission>(res)
  },

  async transfer(id: number, payload: { ward_id: number; room_id: number; bed_id: number }): Promise<Admission> {
    const res = await client.put(`/admissions/${id}/transfer`, payload)
    return unwrap<Admission>(res)
  },

  async discharge(id: number, payload: { outcome: string; discharge_summary?: string }): Promise<Admission> {
    const res = await client.put(`/admissions/${id}/discharge`, payload)
    return unwrap<Admission>(res)
  },
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

  async dischargePdf(id: number): Promise<Blob> {
    const res = await client.get(`/admissions/${id}/pdf`, { responseType: 'blob' })
    return res.data as Blob
  },
<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
}
