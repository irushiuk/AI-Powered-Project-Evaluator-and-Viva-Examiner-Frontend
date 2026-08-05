import apiFetch from './apiClient'
import { CV_ANALYSIS_API } from '@/constants/api.constant'

// ── Types mirror exam-station-cv's SessionSummary artifact (schema 1.0) ──

export interface CvIntegrityFlag {
  t_ms: number
  video_timecode: string
  kind: 'unknown_face' | 'extra_person' | 'student_absent' | 'gaze_off_screen'
  note: string
  student_id?: string | null
}

export interface CvAttributionEvent {
  t_start_ms: number
  t_end_ms: number
  student_id: string
  confidence: number
}

export interface CvStudentSummary {
  student_id: string
  display_name: string
  speaking_time_ms: number
  speaking_share: number
  turn_count: number
  attention_pct: number | null
  /** Sustained look-aways: the count, and total time spent off screen. */
  off_screen_glance_count: number
  off_screen_time_ms: number
  integrity_flags: CvIntegrityFlag[]
}

export interface CvArtifact {
  schema_version: string
  session_id: string
  mode: 'individual' | 'group'
  generated_at: string
  per_student: CvStudentSummary[]
  timeline: CvAttributionEvent[]
  unattributed_speaking_ms: number
  session_flags: CvIntegrityFlag[]
}

/**
 * A question placed at its offset into the session recording. The AI examiner
 * speaks via the browser's speech synthesiser, which no recording can capture,
 * so the player shows the question text at these points instead.
 */
export interface CvQuestionMarker {
  question_id: string
  question_text: string
  offset_ms: number
  source: string
  order: number
}

export interface CvSummaryResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  artifact: CvArtifact | null
  recording_url: string
  playback_url: string | null
  question_timeline: CvQuestionMarker[]
  error_message: string
  updated_at: string
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const err = await res.json().catch(() => ({}))
  throw new Error(err.message || fallback)
}

export const cvAnalysisService = {
  /** Examiner: (re)queue analysis for a session that has a recording. */
  async triggerAnalysis(sessionId: string): Promise<void> {
    const res = await apiFetch(CV_ANALYSIS_API.triggerAnalysis(sessionId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) await parseError(res, 'Failed to queue CV analysis')
  },

  /** Examiner: fetch the behavioral report. Returns null when none exists. */
  async getSummary(sessionId: string): Promise<CvSummaryResponse | null> {
    const res = await apiFetch(CV_ANALYSIS_API.summary(sessionId))
    if (res.status === 404) return null
    if (!res.ok) await parseError(res, 'Failed to load behavioral report')
    const body = await res.json()
    return (body.data ?? body) as CvSummaryResponse
  },
}
