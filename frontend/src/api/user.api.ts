import client, { unwrap, unwrapPaginated } from './client'
import type { Paginated, Permission, Role, User, UserInput } from '@/types'

export interface UserListQuery {
  page?: number
  per_page?: number
  search?: string
  role_id?: number
}

export interface RoleInput {
  name: string
  label: string
  description?: string
  permissions: number[]
}

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

  async remove(id: number): Promise<void> {
    await client.delete(`/users/${id}`)
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
