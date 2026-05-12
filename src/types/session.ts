export type SessionStatusFilter = 'upcoming' | 'ongoing' | 'completed'

export type ApiSessionStatus = 'scheduled' | 'in_progress' | 'completed'

export type StudentSessionSummary = {
  session_id: string
  project_id: string
  project_name: string
  scheduled_start: string
  scheduled_end: string
  location_room: string | null
  status: ApiSessionStatus
  group_name?: string | null
  demo_completed_at?: string | null
}

export type NextSession = StudentSessionSummary & {
  student_name?: string | null
  student_reg_no?: string | null
}

export type SessionsByStatus = Record<SessionStatusFilter, StudentSessionSummary[]>
