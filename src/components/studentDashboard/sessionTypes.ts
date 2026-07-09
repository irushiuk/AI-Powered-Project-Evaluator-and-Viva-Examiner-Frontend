export type SessionStatus = 'upcoming' | 'ongoing' | 'completed'

export type RubricCriteria = {
  criteria_id: string
  criteria_name: string
  max_score: number
  weight_in_category: number | null
  description: string | null
}

export type RubricCategory = {
  category_id: string
  category_name: string
  weight_percentage: number
  description: string | null
  criteria: RubricCriteria[]
}

export type CodeAnalysis = {
  bugs: number
  vulnerabilities: number
  smells: number
  duplication: string
  maintainability: string
}

export type AiEvaluationItem = {
  criteria: string
  score: number
  explanation: string
}

export type SessionResults = {
  score: number
  grade: string
  summary: string
  submission: {
    repo: string
    report: string
    reportUrl?: string | null
  }
  codeAnalysis: CodeAnalysis
  aiEvaluation: AiEvaluationItem[]
  feedback: string
}

export type StudentSession = {
  id: string
  projectTitle: string
  lecturer: string
  date: string
  time: string
  /** Raw ISO scheduled start (UTC-aware) — use this for time math, not date/time. */
  startsAt?: string
  status: SessionStatus
  description: string
  rubrics?: RubricCategory[]
  results?: SessionResults
}

