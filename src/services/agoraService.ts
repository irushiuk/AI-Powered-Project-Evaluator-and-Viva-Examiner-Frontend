import apiFetch from './apiClient'
import { SESSIONS_API } from '@/constants/api.constant'

export interface AgoraTokenData {
  app_id: string
  channel: string
  token: string
  uid: number
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
}
