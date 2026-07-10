import { PROJECT_API } from '@/constants/api.constant'
import type { AvailableProject, EnrolledProject } from '@/types/project'
import { serverFetch } from '../serverApi'

export const serverProjectService = {
  async getAvailableProjects(params?: {
    type?: string
    page?: number
    search?: string
  }): Promise<{ count: number; results: AvailableProject[] }> {
    const query = new URLSearchParams()
    if (params?.type) query.append('type', params.type)
    if (params?.page) query.append('page', params.page.toString())
    if (params?.search) query.append('search', params.search)

    const url = query.toString() ? `${PROJECT_API.available}?${query.toString()}` : PROJECT_API.available
    const res = await serverFetch(url, {
      method: 'GET',
    })
    if (!res.ok) {
      throw new Error('Failed to fetch available projects')
    }
    const data = await res.json()
    const payload = data.data ?? data
    return {
      count: payload.count ?? 0,
      results: payload.results ?? [],
    }
  },

  async getMyProjects(params?: {
    page?: number
  }): Promise<{ count: number; results: EnrolledProject[] }> {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())

    const url = query.toString() ? `${PROJECT_API.myEnrollments}?${query.toString()}` : PROJECT_API.myEnrollments
    const res = await serverFetch(url, {
      method: 'GET',
    })
    if (!res.ok) {
      throw new Error('Failed to fetch your projects')
    }
    const data = await res.json()
    const payload = data.data ?? data
    return {
      count: payload.count ?? 0,
      results: payload.results ?? [],
    }
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
