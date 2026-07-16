import apiFetch from './apiClient'
import { PROJECTS_API } from '@/constants/api.constant'
import type {
  VivaQuestion,
  CreateVivaQuestionPayload,
  UpdateVivaQuestionPayload,
} from '@/types/vivaQuestions'

export const vivaQuestionService = {
  /** GET /projects/:id/viva/questions/ */
  async getAll(projectId: string): Promise<VivaQuestion[]> {
    const res = await apiFetch(PROJECTS_API.vivaQuestions(projectId))
    if (!res.ok) throw new Error('Failed to fetch viva questions')
    const data = await res.json()
    const items = data.data ?? data
    return (Array.isArray(items) ? items : []).map((item: any) => ({
      ...item,
      id: item.question_id || item.id,
    }))
  },

  /** POST /projects/:id/viva/questions/create/ */
  async create(
    projectId: string,
    payload: CreateVivaQuestionPayload,
  ): Promise<VivaQuestion> {
    const res = await apiFetch(PROJECTS_API.createVivaQuestion(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to create question')
    }
    const data = await res.json()
    const item = data.data ?? data
    return {
      ...item,
      id: item.question_id || item.id,
    }
  },

  /** PUT /projects/:pid/viva/questions/:qid/update/ */
  async update(
    projectId: string,
    questionId: string,
    payload: UpdateVivaQuestionPayload,
  ): Promise<VivaQuestion> {
    const res = await apiFetch(PROJECTS_API.updateVivaQuestion(projectId, questionId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to update question')
    }
    const data = await res.json()
    const item = data.data ?? data
    return {
      ...item,
      id: item.question_id || item.id,
    }
  },

  /** DELETE /projects/:pid/viva/questions/:qid/delete/ */
  async delete(projectId: string, questionId: string): Promise<void> {
    const res = await apiFetch(PROJECTS_API.deleteVivaQuestion(projectId, questionId), {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete question')
  },
}