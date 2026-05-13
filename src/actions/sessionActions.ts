"use server"

import { serverSessionService, type SessionDetail } from '@/services/server/sessionService'

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export async function getSessionDetailAction(projectId: string): Promise<ActionResult<SessionDetail>> {
  try {
    const session = await serverSessionService.getMySession(projectId)
    return { ok: true, data: session }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch session' }
  }
}
