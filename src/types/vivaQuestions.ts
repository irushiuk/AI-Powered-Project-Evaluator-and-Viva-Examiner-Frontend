export const BLOOMS_LEVELS = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
] as const

export type BloomsLevel = (typeof BLOOMS_LEVELS)[number]

export type VivaQuestion = {
  id: string
  question_text: string
  blooms_level: BloomsLevel
  question_order: number
}

export type CreateVivaQuestionPayload = {
  question_text: string
  blooms_level: BloomsLevel
  question_order: number
}

export type UpdateVivaQuestionPayload = Partial<CreateVivaQuestionPayload>