import client, { unwrap } from './client'
import type { LoginResponse, User } from '@/types'

export interface ProfilePayload {
  name?: string
  phone?: string
  email?: string
}

export interface PasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await client.post('/auth/login', { email, password })
    return unwrap<LoginResponse>(res)
  },

  async logout(): Promise<void> {
    await client.post('/auth/logout')
  },

  async me(): Promise<User> {
    const res = await client.get('/auth/me')
    return unwrap<{ user: User }>(res).user
  },

  async updateProfile(payload: ProfilePayload): Promise<User> {
    const res = await client.put('/auth/profile', payload)
    return unwrap<{ user: User }>(res).user
  },

  async changePassword(payload: PasswordPayload): Promise<void> {
    await client.post('/auth/password', payload)
  },
}
