export type RubricCriteria = {
  criteria_id: string
  criteria_name: string
  max_score: number
  weight_in_category: number
  description?: string
}

export type RubricCategory = {
  category_id: string          // ← was "id", backend returns "category_id"
  category_name: string
  weight_percentage: number
  description?: string
  criteria: RubricCriteria[]
}

// Payloads
export type CreateCategoryPayload = {
  category_name: string
  weight_percentage: number
  description?: string
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>

export type CreateCriteriaPayload = {
  criteria_name: string
  max_score: number
  weight_in_category: number
  description?: string
}

export type UpdateCriteriaPayload = Partial<CreateCriteriaPayload>