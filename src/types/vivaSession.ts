export type VivaDifficulty = 'easy' | 'medium' | 'hard'

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
