import client, { unwrap } from './client'

export interface PublicDepartment {
  id: number
  name: string
  code: string
  description: string | null
}

export interface PublicDoctor {
  name: string | null
  specialization: string | null
  department: string | null
  consultation_fee: number
}

export interface PublicOverview {
  hospital: {
    name: string
    address: string | null
    phone: string | null
    email: string | null
    currency: string
  }
  departments: PublicDepartment[]
  doctors: PublicDoctor[]
  stats: {
    patients: number
    doctors: number
    departments: number
  }
}

export const publicApi = {
  /** Unauthenticated content for the public hospital website. */
  async overview(): Promise<PublicOverview> {
    const res = await client.get('/public/overview')
    return unwrap<PublicOverview>(res)
  },
}
