import apiFetch from './apiClient'
import { PROJECTS_API } from '@/constants/api.constant'
import { Project } from '@/types/project'

export type Submission = {
  id: string
  project: string
  student_name: string
  student_reg_no: string
  group_name: string | null
  report_file_url: string
  github_repo_url: string
  submitted_at: string
  latest_code_submission_id: string | null
  latest_code_analysis_status: 'pending' | 'processing' | 'completed' | 'failed' | null
}

export const submissionService = {
  async getProjects(): Promise<Project[]> {
    const res = await apiFetch(PROJECTS_API.list)
    if (!res.ok) throw new Error('Failed to fetch projects')
    const data = await res.json()
    return data.data ?? data
  },

  async getSubmissions(projectId: string): Promise<Submission[]> {
    const res = await apiFetch(PROJECTS_API.submissions(projectId))
    if (!res.ok) throw new Error('Failed to fetch submissions')
    const data = await res.json()
    return data.data ?? data
  },
}