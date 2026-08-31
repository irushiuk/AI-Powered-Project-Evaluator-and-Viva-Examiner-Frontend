// Rubric Category
export type RubricCriteria = {
  id: string
  criteria_name: string
  max_score: number
  weight_in_category: number
  description?: string
  is_individual: boolean
}

export type RubricCategory = {
  id: string
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
  is_individual: boolean
}

export type UpdateCriteriaPayload = Partial<CreateCriteriaPayload>
