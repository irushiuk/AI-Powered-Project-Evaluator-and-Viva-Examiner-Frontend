export type VivaDifficulty = 'easy' | 'medium' | 'hard'
export type VivaTtsStatus = 'disabled' | 'pending' | 'ready' | 'failed' | 'unavailable'

/** Outcome of a server-side speech-to-text call for one recorded utterance. */
export type VivaSttStatus = 'ready' | 'empty' | 'disabled' | 'failed'

export type VivaTranscriptionResponse = {
  text: string
  stt_status: VivaSttStatus
  language_code?: string
  language_probability?: number | null
  latency_ms?: number
}

export type BloomsLevel =
  | 'Remember'
  | 'Understand'
  | 'Apply'
  | 'Analyze'
  | 'Evaluate'
  | 'Create'

export type VivaQuestion = {
  question_id: string
  question_text: string
  blooms_level: BloomsLevel
  difficulty: VivaDifficulty
  criterion: string
  question_number: number
  tts_status?: VivaTtsStatus
  audio_url?: string | null
}

export type StartVivaResponse = VivaQuestion & {
  message: string
  session_id: string
}

export type SubmitVivaAnswerResponse = {
  answer_saved: boolean
  score: number
  reasoning: string
  strengths: string
  gaps: string
  session_complete: boolean
  message?: string
  next_question?: VivaQuestion
}

export type SessionPhase =
  | 'scheduled'
  | 'ongoing'
  | 'live'
  | 'demo_in_progress'
  | 'viva_in_progress'
  | 'completed'

export type VivaSessionStatusResponse = {
  session_id: string
  status: 'scheduled' | 'in_progress' | 'completed'
  phase: SessionPhase
  demo_enabled: boolean
  demo_completed_at: string | null
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  total_questions_asked: number
  total_answers_submitted: number
}

export type CurrentQuestionResponse = {
  question: VivaQuestion | null
  session_complete: boolean
}
