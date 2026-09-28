import client, { unwrap, unwrapPaginated } from './client'
import type { Notification, Paginated } from '@/types'

export const notificationApi = {
  async list(query: { page?: number; per_page?: number } = {}): Promise<Paginated<Notification>> {
    const res = await client.get('/notifications', { params: query })
    return unwrapPaginated<Notification>(res)
  },

  async markRead(id: number): Promise<void> {
    await client.post(`/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await client.post('/notifications/read-all')
  },

  async unreadCount(): Promise<number> {
    const res = await client.get('/notifications/unread-count')
    return unwrap<{ count: number }>(res).count
  },
}
