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