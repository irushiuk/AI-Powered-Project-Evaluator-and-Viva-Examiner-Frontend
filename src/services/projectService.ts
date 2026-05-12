import { PROJECT_API } from '@/constants/api.constant'
import { apiFetch } from './apiClient'

export type AvailableProject = {
  id: string
  project_name: string
  description: string | null
  is_group_project: boolean
  submission_deadline: string | null
  lead_examiner_name: string | null
  enrolled: boolean
}

export type SessionDetails = {
  session_id: string
  scheduled_start: string
  scheduled_end: string
  location_room: string
  status: 'scheduled' | 'in_progress' | 'completed'
}

export type GroupInfo = {
  group_id: string
  group_name: string
  members: string[]
}

export type EnrolledProject = {
  id: string
  project_name: string
  description: string | null
  is_group_project: boolean
  submission_deadline: string | null
  status: string
  academic_year: string | null
  submission_status: 'submitted' | 'not_submitted'
  session_details: SessionDetails | null
  group_info: GroupInfo | null
}

export const projectService = {
  async getAvailableProjects(): Promise<AvailableProject[]> {
    const res = await apiFetch(PROJECT_API.available, {
      method: 'GET',
    })
    if (!res.ok) {
      throw new Error('Failed to fetch available projects')
    }
    const data = await res.json()
    return data.data ?? data
  },

  async getMyProjects(): Promise<EnrolledProject[]> {
    const res = await apiFetch(PROJECT_API.myEnrollments, {
      method: 'GET',
    })
    if (!res.ok) {
      throw new Error('Failed to fetch your projects')
    }
    const data = await res.json()
    return data.data ?? data
  },

  async getSubmissionDetails(projectId: string) {
    const res = await apiFetch(PROJECT_API.submission(projectId), {
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

  async submitProjectWork(projectId: string, formData: FormData) {
    const res = await apiFetch(PROJECT_API.submitWork(projectId), {
      method: 'POST',
      body: formData, // Do not set Content-Type header when using FormData; fetch does it automatically with bounds
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || 'Failed to submit work')
    }
    const data = await res.json()
    return data.data ?? data
  },

  async enrollInProject(projectId: string, groupNumber?: string): Promise<void> {
    const res = await apiFetch(PROJECT_API.enroll(projectId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groupNumber ? { group_number: groupNumber } : {}),
    })
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || 'Failed to enroll in project')
    }
  },
}
