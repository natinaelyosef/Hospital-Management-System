import client, { unwrap } from './client'
import type { SuggestedDepartment, WorkflowTask } from '@/types'

export const workflowApi = {
  /** Role-aware task buckets (counts + deep links) for queue widgets. */
  async summary(): Promise<WorkflowTask[]> {
    const res = await client.get('/workflow/summary')
    return unwrap<WorkflowTask[]>(res)
  },

  /** Rank departments against a free-text complaint to guide routing. */
  async suggestDepartments(complaint: string): Promise<SuggestedDepartment[]> {
    const res = await client.get('/departments/suggest', { params: { complaint } })
    return unwrap<SuggestedDepartment[]>(res)
  },
}
