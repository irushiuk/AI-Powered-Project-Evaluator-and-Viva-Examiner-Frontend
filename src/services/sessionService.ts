import apiFetch from './apiClient'
import { PROJECTS_API } from '@/constants/api.constant'
import type {
  Session,
  AutoSchedulePayload,
  ManualSchedulePayload,
  UpdateSessionPayload,
  EnrolledStudent,
  EnrolledGroup,
} from '@/types/session'

export const sessionService = {
  /** GET /projects/:id/sessions/ */
  async getAll(projectId: string): Promise<Session[]> {
    const res = await apiFetch(PROJECTS_API.sessions(projectId))
    if (!res.ok) throw new Error('Failed to fetch sessions')
    const data = await res.json()
    const items = data.data ?? data
    return (Array.isArray(items) ? items : []).map((item: any) => ({
      ...item,
      id: item.session_id || item.id,
    }))
  },

  /** POST /projects/:id/sessions/schedule/auto/ */
  async scheduleAuto(projectId: string, payload: AutoSchedulePayload): Promise<Session[]> {
    const res = await apiFetch(PROJECTS_API.scheduleSessions(projectId, 'auto'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Auto-scheduling failed')
    }
    const data = await res.json()
    const items = data.data ?? data
    return (Array.isArray(items) ? items : []).map((item: any) => ({
      ...item,
      id: item.session_id || item.id,
    }))
  },

  /** POST /projects/:id/sessions/schedule/manual/ */
  async scheduleManual(projectId: string, payload: ManualSchedulePayload): Promise<Session[]> {
    const res = await apiFetch(PROJECTS_API.scheduleSessions(projectId, 'manual'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Manual scheduling failed')
    }
    const data = await res.json()
    const items = data.data ?? data
    return (Array.isArray(items) ? items : []).map((item: any) => ({
      ...item,
      id: item.session_id || item.id,
    }))
  },

  /** PUT /projects/:pid/sessions/:sid/update/ */
  async update(
    projectId: string,
    sessionId: string,
    payload: UpdateSessionPayload,
  ): Promise<Session> {
    const res = await apiFetch(PROJECTS_API.updateSession(projectId, sessionId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to update session')
    }
    const data = await res.json()
    const item = data.data ?? data
    return {
      ...item,
      id: item.session_id || item.id,
    }
  },

  /** DELETE /projects/:id/sessions/reset/ */
  async resetAll(projectId: string): Promise<void> {
    const res = await apiFetch(PROJECTS_API.resetSessions(projectId), {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to reset sessions')
  },

  /** GET /projects/:id/examiners/ — to fetch enrolled students/groups for manual scheduling */
  async getEnrolledStudents(projectId: string): Promise<EnrolledStudent[]> {
    const res = await apiFetch(PROJECTS_API.examiners(projectId))
    if (!res.ok) throw new Error('Failed to fetch enrolled students')
    const data = await res.json()
    return data.data ?? data
  },

  /** GET /projects/:id/submissions/ — fallback to get enrolled list */
  async getSubmissions(projectId: string): Promise<EnrolledStudent[]> {
    const res = await apiFetch(PROJECTS_API.submissions(projectId))
    if (!res.ok) throw new Error('Failed to fetch submissions')
    const data = await res.json()
    return data.data ?? data
  },
}