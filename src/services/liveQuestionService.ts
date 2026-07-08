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
  question_order: number
  asked_at: string
  answer: LiveQuestionAnswer | null
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
  async pending(sessionId: string): Promise<LiveQuestion | null> {
    const res = await apiFetch(LIVE_QUESTIONS_API.pending(sessionId))
    const data = await ok<{ pending: LiveQuestion | null }>(
      res, 'Failed to check for examiner questions',
    )
    return data.pending
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
}
