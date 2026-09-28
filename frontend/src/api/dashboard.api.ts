import client, { unwrap } from './client'
import type { DashboardData } from '@/types'

export const dashboardApi = {
  async get(): Promise<DashboardData> {
    const res = await client.get('/dashboard')
    return unwrap<DashboardData>(res)
  },
}
