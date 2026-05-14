import apiFetch from './apiClient'
import { PROJECTS_API } from '@/constants/api.constant'
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
    const categories = data.data ?? data
    return categories.map((c: any) => ({
      ...c,
      id: c.category_id,
      criteria: c.criteria?.map((cr: any) => ({ ...cr, id: cr.criteria_id })) || []
    }))
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
    const category = data.data ?? data
    return {
      ...category,
      id: category.category_id,
      criteria: category.criteria?.map((cr: any) => ({ ...cr, id: cr.criteria_id })) || []
    }
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
    const category = data.data ?? data
    return {
      ...category,
      id: category.category_id,
      criteria: category.criteria?.map((cr: any) => ({ ...cr, id: cr.criteria_id })) || []
    }
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
    const criteria = data.data ?? data
    return { ...criteria, id: criteria.criteria_id }
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
    const criteria = data.data ?? data
    return { ...criteria, id: criteria.criteria_id }
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