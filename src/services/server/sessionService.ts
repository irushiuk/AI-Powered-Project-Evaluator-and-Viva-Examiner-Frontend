import { SESSION_API } from '@/constants/api.constant'
import type { NextSession, SessionStatusFilter, StudentSessionSummary } from '@/types/session'
import type { RubricCategory } from '@/components/studentDashboard/sessionTypes'
import { serverFetch } from '../serverApi'

export type SessionDetail = {
  session_id: string
  project_id: string
  project_name: string
  scheduled_start: string
  scheduled_end: string
  location_room: string | null
  status: 'scheduled' | 'in_progress' | 'completed'
  demo_completed_at?: string | null
  group_name?: string | null
  group_members?: Array<{
    full_name: string
    registration_number: string
  }>
  rubrics?: RubricCategory[]
}

export const serverSessionService = {
  async getNextSession(): Promise<NextSession | null> {
    const res = await serverFetch(SESSION_API.next, {
      method: 'GET',
    })

    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error('Failed to fetch next session')
    }

    const data = await res.json()
    return data.data ?? data
  },

  async getMySessions(status: SessionStatusFilter): Promise<StudentSessionSummary[]> {
    const res = await serverFetch(SESSION_API.myStatus(status), {
      method: 'GET',
    })

    if (!res.ok) {
      throw new Error('Failed to fetch sessions')
    }

    const data = await res.json()
    return data.data ?? data
  },

  async getMySession(projectId: string): Promise<SessionDetail> {
    const res = await serverFetch(SESSION_API.mySession(projectId), {
      method: 'GET',
    })

    if (!res.ok) {
      throw new Error('Failed to fetch session')
    }

    const data = await res.json()
    return data.data ?? data
  },
}
