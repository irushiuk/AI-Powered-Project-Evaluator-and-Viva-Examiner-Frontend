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
  phase?: string
  group_name?: string | null
  demo_completed_at?: string | null
}

export type NextSession = StudentSessionSummary & {
  student_name?: string | null
  student_reg_no?: string | null
}

export type SessionsByStatus = Record<SessionStatusFilter, StudentSessionSummary[]>
// ── Session returned by GET /projects/:id/sessions/ ──────────────────────────

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'pending'

export type Session = {
  id: string
  student_id?: string       // individual projects
  group_id?: string         // group projects
  student_name?: string     // populated by backend
  group_name?: string
  scheduled_start: string   // ISO 8601
  scheduled_end: string
  location_room: string
  status: SessionStatus
}

// ── Auto-scheduling payload ───────────────────────────────────────────────────

export type DateRange = {
  date: string        // "YYYY-MM-DD"
  start_time: string  // "HH:MM"
  end_time: string    // "HH:MM"
}

export type AutoSchedulePayload = {
  date_ranges: DateRange[]
  duration_per_slot_minutes: number
  location_room: string
  demo_enabled: boolean
}

// ── Manual scheduling payload ─────────────────────────────────────────────────

export type ManualSessionEntry = {
  student_id?: string
  group_id?: string
  scheduled_start: string
  scheduled_end: string
  location_room: string
}

export type ManualSchedulePayload = {
  sessions: ManualSessionEntry[]
  demo_enabled: boolean
}

// ── Update payload ────────────────────────────────────────────────────────────

export type UpdateSessionPayload = {
  scheduled_start: string
  scheduled_end: string
  location_room: string
}

// ── Enrolled student / group (returned by GET /projects/:id/sessions/) ────────

export type EnrolledStudent = {
  id: string
  full_name: string
  email?: string
}

export type EnrolledGroup = {
  id: string
  group_name: string
  members?: EnrolledStudent[]
}