import apiFetch from './apiClient'
import { PROJECTS_API, PROJECT_API } from '@/constants/api.constant'
import { Project, CreateProjectPayload, AvailableProject, EnrolledProject } from '@/types/project'

export const projectService = {

  async getAll(): Promise<Project[]> {
    const res = await apiFetch(PROJECTS_API.list)
    if (!res.ok) throw new Error('Failed to fetch projects')
    const data = await res.json()
    return data.data ?? data
  },

  async create(payload: CreateProjectPayload): Promise<Project> {
    const res = await apiFetch(PROJECTS_API.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to create project')
    }
    const data = await res.json()
    return data.data ?? data
  },

  async getDetail(id: string): Promise<Project> {
    const res = await apiFetch(PROJECTS_API.detail(id))
    if (!res.ok) throw new Error('Failed to fetch project')
    const data = await res.json()
    return data.data ?? data
  },

  async activate(id: string): Promise<void> {
    const res = await apiFetch(PROJECTS_API.activate(id), { method: 'PATCH' })
    if (!res.ok) throw new Error('Failed to activate project')
  },

  async getAvailable(params: {
    type: string
    page: number
    search?: string
  }): Promise<{
    count: number
    next: string | null
    previous: string | null
    results: AvailableProject[]
  }> {
    const query = new URLSearchParams({
      type: params.type,
      page: params.page.toString(),
    })
    if (params.search) {
      query.append('search', params.search)
    }
    const res = await apiFetch(`${PROJECT_API.available}?${query.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch available projects')
    return res.json()
  },

  async getMyEnrollments(params: {
    page: number
  }): Promise<{
    count: number
    next: string | null
    previous: string | null
    results: EnrolledProject[]
  }> {
    const query = new URLSearchParams({
      page: params.page.toString(),
    })
    const res = await apiFetch(`${PROJECT_API.myEnrollments}?${query.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch enrolled projects')
    return res.json()
  },
}