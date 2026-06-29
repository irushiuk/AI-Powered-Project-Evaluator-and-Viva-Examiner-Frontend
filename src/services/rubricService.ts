import apiFetch from './apiClient'
import { API_BASE, PROJECTS_API } from '@/constants/api.constant'
import type {
  RubricCategory,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateCriteriaPayload,
  UpdateCriteriaPayload,
} from '@/types/rubric'

export const rubricService = {
  /** GET /projects/:id/rubrics/ */
  async getAll(projectId: string): Promise<RubricCategory[]> {
    const res = await apiFetch(PROJECTS_API.rubrics(projectId))
    if (!res.ok) throw new Error('Failed to fetch rubrics')
    const data = await res.json()
    return data.data ?? data
  },

  /** POST /projects/:id/rubrics/categories/create/ */
  async createCategory(
    projectId: string,
    payload: CreateCategoryPayload,
  ): Promise<RubricCategory> {
    const res = await apiFetch(PROJECTS_API.createRubricCategory(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to create category')
    }
    const data = await res.json()
    return data.data ?? data
  },

  /** PUT /projects/:pid/rubrics/categories/:cid/update/ */
  async updateCategory(
    projectId: string,
    categoryId: string,
    payload: UpdateCategoryPayload,
  ): Promise<RubricCategory> {
    const res = await apiFetch(PROJECTS_API.updateRubricCategory(projectId, categoryId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to update category')
    }
    const data = await res.json()
    return data.data ?? data
  },

  /** DELETE /projects/:pid/rubrics/categories/:cid/delete/ */
  async deleteCategory(projectId: string, categoryId: string): Promise<void> {
    const res = await apiFetch(PROJECTS_API.deleteRubricCategory(projectId, categoryId), {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete category')
  },

  /** POST /projects/:pid/rubrics/categories/:cid/criteria/create/ */
  async createCriteria(
    projectId: string,
    categoryId: string,
    payload: CreateCriteriaPayload,
  ) {
    const res = await apiFetch(PROJECTS_API.createCriteria(projectId, categoryId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to create criteria')
    }
    const data = await res.json()
    return data.data ?? data
  },

  /** PUT /projects/:pid/rubrics/categories/:cid/criteria/:criId/update/ */
  async updateCriteria(
    projectId: string,
    categoryId: string,
    criteriaId: string,
    payload: UpdateCriteriaPayload,
  ) {
    const res = await apiFetch(PROJECTS_API.updateCriteria(projectId, categoryId, criteriaId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to update criteria')
    }
    const data = await res.json()
    return data.data ?? data
  },

  /** POST /api/viva/rubric/upload-preview/ */
  async uploadPreview(projectId: string, file: File): Promise<any> {
    const formData = new FormData()
    formData.append('rubric_file', file)
    const res = await apiFetch(`${API_BASE}/viva/rubric/upload-preview/`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to parse rubric')
    }
    return res.json()
  },

  /** POST /api/viva/rubric/confirm-save/ */
  /** Saves the AI-extracted rubric into an existing project via individual category/criteria endpoints */
  async confirmSave(projectId: string, previewData: any): Promise<void> {
    const categories: any[] = previewData?.rubric_categories ?? []

    for (const cat of categories) {
      // Create the category
      const catRes = await apiFetch(PROJECTS_API.createRubricCategory(projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: cat.category_name,
          weight_percentage: cat.weight_percentage,
          description: cat.description ?? '',
        }),
      })
      if (!catRes.ok) {
        const err = await catRes.json().catch(() => ({}))
        throw new Error(err.message || `Failed to create category: ${cat.category_name}`)
      }
      const catData = await catRes.json()
      const categoryId = catData?.data?.category_id ?? catData?.category_id ?? catData?.id

      // Create each criterion under this category
      for (const cr of cat.criteria ?? []) {
        const crRes = await apiFetch(PROJECTS_API.createCriteria(projectId, categoryId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            criteria_name: cr.criteria_name,
            max_score: cr.max_score,
            weight_in_category: cr.weight_in_category ?? 100,
            description: cr.description ?? '',
          }),
        })
        if (!crRes.ok) {
          const err = await crRes.json().catch(() => ({}))
          throw new Error(err.message || `Failed to create criterion: ${cr.criteria_name}`)
        }
      }
    }
},

  /** DELETE /projects/:pid/rubrics/categories/:cid/criteria/:criId/delete/ */
  async deleteCriteria(
    projectId: string,
    categoryId: string,
    criteriaId: string,
  ): Promise<void> {
    const res = await apiFetch(PROJECTS_API.deleteCriteria(projectId, categoryId, criteriaId), {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete criteria')
  },
}