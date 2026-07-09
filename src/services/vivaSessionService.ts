import { VIVA_API } from '@/constants/api.constant'
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
}
