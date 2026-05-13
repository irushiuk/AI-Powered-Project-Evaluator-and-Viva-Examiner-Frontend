// src/services/evaluationService.ts
// Drop-in replacement for the standalone evaluationService.ts you wrote.
// Uses the shared apiFetch (handles auth headers + 401 logout) and the
// centralised PROJECTS_API / SESSIONS_API constants — keeps everything
// consistent with the rest of the codebase.

import apiFetch from './apiClient'
import { PROJECTS_API, SESSIONS_API } from '@/constants/api.constant'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvalSessionStatus =
  | 'pending'
  | 'in_progress'
  | 'demo_completed'
  | 'completed'

export interface ActiveSession {
  session_id: string
  project_name: string
  student_full_name: string
  registration_number: string
  group_name: string | null
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  demo_completed_at: string | null
  location_room: string
  status: EvalSessionStatus
}

export interface SessionPanelOpenResponse {
  message: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  const json = await res.json()
  // Backend wraps payload under `.data`; fall back to root for older routes
  return (json.data ?? json) as T
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * POST /api/projects/<project_id>/session-panel/open/
 * Teacher opens the evaluation panel for the day.
 */
export async function openSessionPanel(
  projectId: string,
): Promise<SessionPanelOpenResponse> {
  const res = await apiFetch(PROJECTS_API.openPanel(projectId), {
    method: 'POST',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<SessionPanelOpenResponse>
}

/**
 * GET /api/projects/<project_id>/session-panel/active/
 * Returns the currently in-progress session, or null when none is active.
 */
export async function getActiveSession(
  projectId: string,
): Promise<ActiveSession | null> {
  const res = await apiFetch(PROJECTS_API.activePanel(projectId))
  if (res.status === 404) return null
  return ok<ActiveSession>(res)
}

/**
 * POST /api/sessions/<session_id>/start-demo/
 * Marks the student's demo as started.
 */
export async function startDemo(sessionId: string): Promise<ActiveSession> {
  const res = await apiFetch(SESSIONS_API.startDemo(sessionId), {
    method: 'POST',
  })
  return ok<ActiveSession>(res)
}

/**
 * POST /api/sessions/<session_id>/complete-demo/
 * Marks the demo as complete — viva phase begins.
 */
export async function completeDemo(sessionId: string): Promise<ActiveSession> {
  const res = await apiFetch(SESSIONS_API.completeDemo(sessionId), {
    method: 'POST',
  })
  return ok<ActiveSession>(res)
}

/**
 * POST /api/sessions/<session_id>/end-viva/
 * Ends the viva with optional video / audio upload.
 */
export async function endViva(
  sessionId: string,
  videoFile?: File | null,
  audioFile?: File | null,
): Promise<ActiveSession> {
  const form = new FormData()
  if (videoFile) form.append('video_file', videoFile)
  if (audioFile) form.append('audio_file', audioFile)

  // Do NOT set Content-Type — the browser must set the multipart boundary
  const res = await apiFetch(SESSIONS_API.endViva(sessionId), {
    method: 'POST',
    body: form,
  })
  return ok<ActiveSession>(res)
}