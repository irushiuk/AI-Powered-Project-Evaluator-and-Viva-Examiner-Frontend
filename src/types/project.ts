export type ProjectStatus = 'draft' | 'active' | 'completed'

export type Project = {
  id: string
  project_name: string
  description: string
  is_group_project: boolean
  submission_deadline: string
  status: ProjectStatus
  academic_year: string
  created_at: string
}

export type CreateProjectPayload = {
  project_name: string
  description: string
  is_group_project: boolean
  submission_deadline: string
  academic_year: string
}