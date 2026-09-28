import client, { unwrap, unwrapPaginated } from './client'
<<<<<<< HEAD
import type { Paginated, Permission, Role, User, UserInput, UserStatus } from '@/types'
=======
import type { Paginated, Permission, Role, User, UserInput } from '@/types'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

export interface UserListQuery {
  page?: number
  per_page?: number
  search?: string
  role_id?: number
<<<<<<< HEAD
  status?: UserStatus
  sort?: 'name' | 'email' | 'status' | 'created_at'
  direction?: 'asc' | 'desc'
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}

export interface RoleInput {
  name: string
  label: string
  description?: string
  permissions: number[]
}

<<<<<<< HEAD
export interface InvitePayload {
  name: string
  email: string
  phone?: string
  role_id: number
}

export interface InviteResponse {
  user: User
  invite_token: string
  invite_url: string
}

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
type RoleResponse = Omit<Role, 'permissions'> & { permissions: Array<string | { name: string }> }

function normalizeRole(role: RoleResponse): Role {
  return {
    ...role,
    permissions: role.permissions.map((permission) => typeof permission === 'string' ? permission : permission.name),
    users_count: role.users_count ?? 0,
  }
}

export const userApi = {
  async list(query: UserListQuery = {}): Promise<Paginated<User>> {
    const res = await client.get('/users', { params: query })
    return unwrapPaginated<User>(res)
  },

  async create(payload: UserInput): Promise<User> {
    const res = await client.post('/users', payload)
    return unwrap<User>(res)
  },

  async update(id: number, payload: Partial<Omit<UserInput, 'password'>> & { password?: string }): Promise<User> {
    const res = await client.put(`/users/${id}`, payload)
    return unwrap<User>(res)
  },

<<<<<<< HEAD
  async remove(id: number, reason?: string): Promise<void> {
    await client.delete(`/users/${id}`, { data: reason ? { reason } : undefined })
  },

  async suspend(id: number, reason: string): Promise<User> {
    const res = await client.post(`/users/${id}/suspend`, { reason })
    return unwrap<User>(res)
  },

  async activate(id: number): Promise<User> {
    const res = await client.post(`/users/${id}/activate`)
    return unwrap<User>(res)
  },

  async resetPassword(id: number, password?: string): Promise<{ password: string }> {
    const res = await client.post(`/users/${id}/password`, password ? { password } : {})
    return unwrap<{ password: string }>(res)
  },

  /** Invite a future staff member — creates a pending account, returns the single-use link once. */
  async invite(payload: InvitePayload): Promise<InviteResponse> {
    const res = await client.post('/users/invite', payload)
    return unwrap<InviteResponse>(res)
  },

  /** Rotate the invite link for a still-pending account. */
  async resendInvite(id: number): Promise<InviteResponse> {
    const res = await client.post(`/users/${id}/invite`)
    return unwrap<InviteResponse>(res)
=======
  async remove(id: number): Promise<void> {
    await client.delete(`/users/${id}`)
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  },

  async roles(): Promise<Role[]> {
    const res = await client.get('/roles')
    return unwrap<RoleResponse[]>(res).map(normalizeRole)
  },

  async createRole(payload: RoleInput): Promise<Role> {
    const res = await client.post('/roles', payload)
    return normalizeRole(unwrap<RoleResponse>(res))
  },

  async updateRole(id: number, payload: Partial<RoleInput>): Promise<Role> {
    const res = await client.put(`/roles/${id}`, payload)
    return normalizeRole(unwrap<RoleResponse>(res))
  },

  async removeRole(id: number): Promise<void> {
    await client.delete(`/roles/${id}`)
  },

  async permissions(): Promise<Permission[]> {
    const res = await client.get('/permissions')
    return unwrap<Permission[]>(res)
  },
}
