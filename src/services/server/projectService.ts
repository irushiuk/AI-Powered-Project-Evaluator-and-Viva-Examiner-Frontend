import { PROJECT_API } from '@/constants/api.constant'
import { serverFetch } from '../serverApi'
import type { AvailableProject, EnrolledProject } from '../projectService'

export const serverProjectService = {
  async getAvailableProjects(): Promise<AvailableProject[]> {
    const res = await serverFetch(PROJECT_API.available, {
      method: 'GET',
    })
    if (!res.ok) {
      throw new Error('Failed to fetch available projects')
    }
    const data = await res.json()
    return data.data ?? data
  },

  async getMyProjects(): Promise<EnrolledProject[]> {
    const res = await serverFetch(PROJECT_API.myEnrollments, {
      method: 'GET',
    })
    if (!res.ok) {
      throw new Error('Failed to fetch your projects')
    }
    const data = await res.json()
    return data.data ?? data
  },

  async getSubmissionDetails(projectId: string) {
    const res = await serverFetch(PROJECT_API.submission(projectId), {
      method: 'GET',
    })
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error('Failed to fetch submission details')
    }
    const data = await res.json()
    const subs = data.data ?? data
    return Array.isArray(subs) && subs.length > 0 ? subs[0] : null
  },
}
