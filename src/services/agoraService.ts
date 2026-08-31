import apiFetch from './apiClient'
import { SESSIONS_API } from '@/constants/api.constant'

export interface AgoraTokenData {
  app_id: string
  channel: string
  token: string
  uid: number
  screen_share_token?: string
  screen_share_uid?: number
}

export interface AgoraRosterData {
  roster: Record<number, string>
  screenShareUids: number[]
}

export const agoraService = {
  async getAgoraToken(sessionId: string): Promise<AgoraTokenData> {
    const res = await apiFetch(SESSIONS_API.agoraToken(sessionId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to generate Agora token')
    }

    const data = await res.json()
    return (data.data ?? data) as AgoraTokenData
  },

  async getAgoraRoster(sessionId: string): Promise<AgoraRosterData> {
    const res = await apiFetch(SESSIONS_API.agoraRoster(sessionId), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      return { roster: {}, screenShareUids: [] }
    }

    const data = await res.json()
    return {
      roster: (data.roster ?? {}) as Record<number, string>,
      screenShareUids: Array.isArray(data.screen_share_uids)
        ? data.screen_share_uids.map(Number).filter(Number.isFinite)
        : [],
    }
  },
}
