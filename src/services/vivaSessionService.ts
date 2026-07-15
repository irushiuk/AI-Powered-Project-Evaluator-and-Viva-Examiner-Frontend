import { API_BASE, SESSION_API, VIVA_API } from '@/constants/api.constant'
import type {
  CurrentQuestionResponse,
  StartVivaResponse,
  SubmitVivaAnswerResponse,
  VivaSessionStatusResponse,
} from '@/types/vivaSession'
import apiFetch from './apiClient'

async function readJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      (typeof data === 'string' ? data : '') ||
      fallbackMessage
    throw new Error(message)
  }

  return (data?.data ?? data) as T
}

export const vivaSessionService = {
  async startSession(sessionId: string): Promise<StartVivaResponse> {
    const res = await apiFetch(VIVA_API.startSession, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })

    return readJson<StartVivaResponse>(res, 'Failed to start viva session')
  },

  async submitAnswer(
    sessionId: string,
    questionId: string,
    answerText: string,
  ): Promise<SubmitVivaAnswerResponse> {
    const res = await apiFetch(VIVA_API.submitAnswer(sessionId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: questionId,
        answer_text: answerText,
      }),
    })

    return readJson<SubmitVivaAnswerResponse>(res, 'Failed to submit answer')
  },

  async getSessionStatus(sessionId: string): Promise<VivaSessionStatusResponse> {
    const res = await apiFetch(VIVA_API.sessionStatus(sessionId))

    return readJson<VivaSessionStatusResponse>(res, 'Failed to fetch viva status')
  },

  /** Latest AI question for the session (read-only). Group members poll this
   * so their screens advance when a teammate answers. */
  async getCurrentQuestion(sessionId: string): Promise<CurrentQuestionResponse> {
    const res = await apiFetch(VIVA_API.currentQuestion(sessionId))

    return readJson<CurrentQuestionResponse>(res, 'Failed to fetch current question')
  },

  /** Student starts the demo/presentation phase (scheduled → demo in progress). */
  async startDemo(sessionId: string): Promise<void> {
    const res = await apiFetch(SESSION_API.startDemo(sessionId), { method: 'POST' })

    await readJson<unknown>(res, 'Failed to start the demo')
  },

  /** Student starts the viva directly, no demo (scheduled → viva in progress). */
  async startViva(sessionId: string): Promise<void> {
    const res = await apiFetch(SESSION_API.startViva(sessionId), { method: 'POST' })

    await readJson<unknown>(res, 'Failed to start the viva')
  },

  /** Presenting student ends the demo phase — sets demo_completed_at so every
   * participant's UI moves on to the AI viva. */
  async endDemo(sessionId: string): Promise<void> {
    const res = await apiFetch(SESSION_API.endDemo(sessionId), { method: 'POST' })

    await readJson<unknown>(res, 'Failed to end the demo')
  },

  /** Sends a presence ping heartbeat to mark the current student as active in the Agora room. */
  async sendPresencePing(sessionId: string): Promise<any> {
    const res = await apiFetch(`${API_BASE}/sessions/${sessionId}/presence/`, {
      method: 'POST',
    })

    return readJson<any>(res, 'Failed to send presence heartbeat')
  },

  /** Start background GPU warmup on Modal */
  async startWarmup(sessionId: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/sessions/${sessionId}/start-warmup/`, { method: 'POST' })
    await readJson<unknown>(res, 'Failed to trigger warmup')
  },

  /** Upload audio slice WebM chunk */
  async uploadDemoAudio(sessionId: string, formData: FormData): Promise<any> {
    const res = await apiFetch(`${API_BASE}/sessions/${sessionId}/demo-audio/`, {
      method: 'POST',
      body: formData,
    })
    return readJson<any>(res, 'Failed to upload audio chunk')
  },

  /** Upload JPEG slide screenshot */
  async uploadDemoScreenshot(sessionId: string, formData: FormData): Promise<any> {
    const res = await apiFetch(`${API_BASE}/sessions/${sessionId}/demo-screenshot/`, {
      method: 'POST',
      body: formData,
    })
    return readJson<any>(res, 'Failed to upload slide screenshot')
  },

  /** Get queue process status */
  async getDemoQueueStatus(sessionId: string): Promise<{ drained: boolean; total: number; processed: number; failed: number }> {
    const res = await apiFetch(`${API_BASE}/sessions/${sessionId}/demo-queue-status/`)
    return readJson<any>(res, 'Failed to fetch queue status')
  },
}
