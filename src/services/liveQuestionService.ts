import apiFetch from './apiClient'
import { LIVE_QUESTIONS_API } from '@/constants/api.constant'

export interface LiveQuestionAnswer {
  answer_text: string
  answered_at: string
  answered_by: string
}

export interface LiveQuestion {
  question_id: string
  question_text: string
  ready?: boolean
  question_order: number
  asked_at: string
  answer: LiveQuestionAnswer | null
}

export interface PendingLiveQuestion {
  pending: LiveQuestion | null
  examiner_speaking: boolean
  paused: boolean
}

export interface SessionTakeoverStatus {
  paused: boolean
  ai_questions_asked: number
  examiner_questions_asked: number
  max_ai_questions: number
  session_status: string
}

async function ok<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || fallback)
  return (body.data ?? body) as T
}

export const liveQuestionService = {
  /** Examiner: send a typed question to the student mid-viva. */
  async ask(sessionId: string, questionText: string): Promise<LiveQuestion> {
    const res = await apiFetch(LIVE_QUESTIONS_API.ask(sessionId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: questionText }),
    })
    return ok<LiveQuestion>(res, 'Failed to send the question')
  },

  /** Examiner: all interjected questions with answers as they arrive. */
  async list(sessionId: string): Promise<LiveQuestion[]> {
    const res = await apiFetch(LIVE_QUESTIONS_API.list(sessionId))
    return ok<LiveQuestion[]>(res, 'Failed to load live questions')
  },

  /** Student: poll for the oldest unanswered examiner question. */
  async pending(sessionId: string): Promise<PendingLiveQuestion> {
    const res = await apiFetch(LIVE_QUESTIONS_API.pending(sessionId))
    const data = await ok<PendingLiveQuestion>(
      res, 'Failed to check for examiner questions',
    )
    return {
      pending: data.pending,
      examiner_speaking: Boolean(data.examiner_speaking),
      paused: Boolean(data.paused),
    }
  },

  /** Student: answer an examiner question. */
  async answer(
    sessionId: string,
    questionId: string,
    answerText: string,
  ): Promise<void> {
    const res = await apiFetch(LIVE_QUESTIONS_API.answer(sessionId, questionId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer_text: answerText }),
    })
    await ok(res, 'Failed to submit the answer')
  },

  // -------------------------------------------------------------------------
  // Examiner Takeover Flow
  // -------------------------------------------------------------------------

  async takeover(sessionId: string): Promise<{ paused: boolean; ai_questions_asked: number }> {
    const res = await apiFetch(LIVE_QUESTIONS_API.takeover(sessionId), {
      method: 'POST',
    })
    return ok(res, 'Failed to take over session')
  },

  async resume(sessionId: string): Promise<{ paused: boolean }> {
    const res = await apiFetch(LIVE_QUESTIONS_API.resume(sessionId), {
      method: 'POST',
    })
    return ok(res, 'Failed to resume session')
  },

  async endSession(sessionId: string): Promise<{ ended: boolean }> {
    const res = await apiFetch(LIVE_QUESTIONS_API.endSession(sessionId), {
      method: 'POST',
    })
    return ok(res, 'Failed to end session')
  },

  async status(sessionId: string): Promise<SessionTakeoverStatus> {
    const res = await apiFetch(LIVE_QUESTIONS_API.status(sessionId))
    return ok<SessionTakeoverStatus>(res, 'Failed to get takeover status')
  },

  async createPreemptive(sessionId: string): Promise<{ question_id: string }> {
    const res = await apiFetch(LIVE_QUESTIONS_API.preemptive(sessionId), {
      method: 'POST',
    })
    const q = await ok<LiveQuestion>(res, 'Failed to create preemptive question')
    return { question_id: q.question_id }
  },

  async updatePreemptive(sessionId: string, questionId: string, text: string): Promise<void> {
    const res = await apiFetch(LIVE_QUESTIONS_API.updatePreemptive(sessionId, questionId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: text }),
    })
    await ok(res, 'Failed to update preemptive question text')
  },
}
