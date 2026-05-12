export type AvailableProject = {
  id: string
  project_name: string
  description: string | null
  is_group_project: boolean
  submission_deadline: string | null
  lead_examiner_name: string | null
  enrolled: boolean
}

export type SessionDetails = {
  session_id: string
  scheduled_start: string
  scheduled_end: string
  location_room: string
  status: 'scheduled' | 'in_progress' | 'completed'
}

export type GroupInfo = {
  group_id: string
  group_name: string
  members: string[]
}

export type EnrolledProject = {
  id: string
  project_name: string
  description: string | null
  is_group_project: boolean
  submission_deadline: string | null
  status: string
  academic_year: string | null
  submission_status: 'submitted' | 'not_submitted'
  session_details: SessionDetails | null
  group_info: GroupInfo | null
}
