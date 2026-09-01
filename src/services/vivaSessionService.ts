import { API_BASE, SESSION_API, VIVA_API } from '@/constants/api.constant'
import type {
  CurrentQuestionResponse,
  StartVivaResponse,
  SubmitVivaAnswerResponse,
  VivaSessionStatusResponse,
  VivaTranscriptionResponse,
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

/** Filename extension the transcription provider dispatches on. */
function audioExtension(mimeType: string): string {
  const base = (mimeType || '').split(';')[0].toLowerCase()
  if (base.includes('ogg')) return 'ogg'
  if (base.includes('mp4')) return 'mp4'
  if (base.includes('mpeg')) return 'mp3'
  if (base.includes('wav')) return 'wav'
  return 'webm'
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

  /** Fetch generated question speech. A 202 response means speculation is
   * still running; callers may retry briefly before using browser speech. */
  async getQuestionAudio(
    sessionId: string,
    questionId: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    return apiFetch(VIVA_API.questionAudio(sessionId, questionId), { signal })
  },

  /**
   * Transcribes one recorded utterance server-side (ElevenLabs Scribe). The
   * provider key stays on the backend; the browser only uploads audio.
   */
  async transcribeAnswerAudio(
    sessionId: string,
    audio: Blob,
    signal?: AbortSignal,
  ): Promise<VivaTranscriptionResponse> {
    const form = new FormData()
    form.append('audio', audio, `answer.${audioExtension(audio.type)}`)

    const res = await apiFetch(VIVA_API.transcribeAnswer(sessionId), {
      method: 'POST',
      body: form,
      signal,
    })

    if (res.status === 503) return { text: '', stt_status: 'disabled' }

    return readJson<VivaTranscriptionResponse>(res, 'Failed to transcribe the answer')
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
  /** Get the detailed session report containing AI thinking/strategy */
  async getSessionDetailedReport(sessionId: string): Promise<any> {
    const res = await apiFetch(VIVA_API.detailedReport(sessionId))
    return readJson<any>(res, 'Failed to fetch detailed report')
  },

  /** Examiner overrides the score of a single answer */
  async patchAnswerScore(sessionId: string, answerId: string, overrideScore: number, overrideNote: string): Promise<any> {
    const res = await apiFetch(VIVA_API.patchAnswerScore(sessionId, answerId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        override_score: overrideScore,
        override_note: overrideNote,
      }),
    })
    return readJson<any>(res, 'Failed to update answer score')
  },

  /** Examiner approves all scores for the session */
  async approveSessionScores(sessionId: string): Promise<any> {
    const res = await apiFetch(VIVA_API.approveScores(sessionId), {
      method: 'POST',
    })
    return readJson<any>(res, 'Failed to approve session scores')
  },
}
