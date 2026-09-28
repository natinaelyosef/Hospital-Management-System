import client, { unwrap } from './client'
<<<<<<< HEAD
import type { LoginResponse, Portal, PortalProbe, SuggestedDepartment, User, Visit } from '@/types'
=======
<<<<<<< HEAD
import type { LoginResponse, Portal, PortalProbe, SuggestedDepartment, User, Visit } from '@/types'
=======
import type { LoginResponse, User } from '@/types'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
export interface RegisterPayload {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
  phone: string
  email: string
  address?: string
  emergency_contact_name: string
  emergency_contact_phone: string
  password: string
  password_confirmation: string
  chief_complaint: string
  symptoms?: string
  symptom_duration?: string
  severity?: 'mild' | 'moderate' | 'severe'
  previous_conditions?: string
  current_medications?: string
}

export interface RegisterResponse extends LoginResponse {
  patient_number: string
  /** The case opened at sign-up, already at "intake completed" for routing. */
  visit: Visit
  suggested_departments: SuggestedDepartment[]
}

export interface AcceptInvitePayload {
  token: string
  password: string
  password_confirmation: string
}

export interface ResetPasswordPayload {
  email: string
  token: string
  password: string
  password_confirmation: string
}

export const authApi = {
  /**
   * Sign in through one of the two front doors. The API refuses an account
   * that belongs to the other portal, so `portal` is always sent.
   */
  async login(email: string, password: string, portal: Portal): Promise<LoginResponse> {
    const res = await client.post('/auth/login', { email, password, portal })
    return unwrap<LoginResponse>(res)
  },

  /** Ask which front door an email belongs to, so a wrong-page sign-in can be redirected. */
  async portalForEmail(email: string): Promise<PortalProbe> {
    const res = await client.post('/auth/portal', { email })
    return unwrap<PortalProbe>(res)
  },

  /**
   * Public patient self-registration — creates the account, the patient
   * profile and the first (routable) visit case in one request.
   */
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const res = await client.post('/auth/register', payload)
    return unwrap<RegisterResponse>(res)
  },

<<<<<<< HEAD
=======
=======
export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await client.post('/auth/login', { email, password })
    return unwrap<LoginResponse>(res)
  },

>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  async logout(): Promise<void> {
    await client.post('/auth/logout')
  },

  async me(): Promise<User> {
    const res = await client.get('/auth/me')
<<<<<<< HEAD
    return unwrap<User>(res)
=======
<<<<<<< HEAD
    return unwrap<User>(res)
=======
    return unwrap<{ user: User }>(res).user
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  },

  async updateProfile(payload: ProfilePayload): Promise<User> {
    const res = await client.put('/auth/profile', payload)
    return unwrap<{ user: User }>(res).user
  },

  async changePassword(payload: PasswordPayload): Promise<void> {
    await client.post('/auth/password', payload)
  },
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

  /** Accept a staff invitation with the single-use token from the invite link. */
  async acceptInvite(payload: AcceptInvitePayload): Promise<LoginResponse> {
    const res = await client.post('/auth/invites/accept', payload)
    return unwrap<LoginResponse>(res)
  },

  /** Request a self-service password reset link for the given email. */
  async forgotPassword(email: string): Promise<{ message: string; reset_token?: string; reset_url?: string }> {
    const res = await client.post('/auth/forgot-password', { email })
    return unwrap<{ message: string; reset_token?: string; reset_url?: string }>(res)
  },

  /** Exchange a reset token for a new password. */
  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const res = await client.post('/auth/reset-password', payload)
    return unwrap<{ message: string }>(res)
  },
<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
}
