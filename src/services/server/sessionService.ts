import { SESSION_API } from '@/constants/api.constant'
import type { NextSession, SessionStatusFilter, StudentSessionSummary } from '@/types/session'
import { serverFetch } from '../serverApi'

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
}
