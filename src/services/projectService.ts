import apiFetch from './apiClient'
import { PROJECTS_API } from '@/constants/api.constant'
import { Project, CreateProjectPayload } from '@/types/project'

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
}