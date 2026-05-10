export type SessionStatus = 'upcoming' | 'ongoing' | 'completed'

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
  status: SessionStatus
  description: string
  results?: SessionResults
}
