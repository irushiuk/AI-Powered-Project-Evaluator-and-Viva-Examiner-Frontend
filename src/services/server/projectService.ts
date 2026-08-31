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

  /**
   * Finds one enrolled project by id. `my-enrollments` is paginated at 9, so
   * a project the student enrolled in earlier can sit past page 1 — page
   * through until it turns up rather than only looking at the first page.
   */
  async findMyProject(projectId: string): Promise<EnrolledProject | null> {
    const pageSize = 9
    const firstPage = await this.getMyProjects({ page: 1 })
    const match = firstPage.results.find((p) => p.id === projectId)
    if (match) return match

    const totalPages = Math.ceil(firstPage.count / pageSize)
    for (let page = 2; page <= totalPages; page += 1) {
      const { results } = await this.getMyProjects({ page })
      const found = results.find((p) => p.id === projectId)
      if (found) return found
    }

    return null
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
