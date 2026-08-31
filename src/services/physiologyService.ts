import apiFetch from './apiClient'
import { PHYSIO_API } from '@/constants/api.constant'

/**
 * Physiological signals from the exam-station band (physical sessions only).
 *
 * Everything here is ADVISORY. Heart rate never affects a score, and elevated
 * arousal means a student found a moment demanding — it is not evidence of
 * dishonesty. The UI is responsible for saying so plainly.
 */

/** One 30-second window of the rolling arousal series. */
export interface PhysioPoint {
  t: string
  offset_ms: number
  video_timecode: string
  hr: number | null
  rmssd: number | null
  beats: number
  quality: number
  hr_z: number | null
  /** Beats per minute above the student's own resting rate. */
  hr_delta: number | null
  rmssd_ratio: number | null
  /** Rate up AND variability down together. Either alone is not enough. */
  elevated: boolean
  /**
   * False means no reading could be taken — the clip was off the finger, or
   * too few clean beats. It does NOT mean the student was calm.
   */
  usable: boolean
  reason: string
}

export interface PhysioBaseline {
  hr_mean: number | null
  hr_sd: number | null
  rmssd: number | null
  beat_count: number
  quality: number
  usable: boolean
  started_at: string | null
  ended_at: string | null
}

export interface PhysioTimeline {
  points: PhysioPoint[]
  baseline: PhysioBaseline | null
  window_s: number
  step_s: number
  has_data: boolean
  /** Share of windows that produced a reading at all, 0..1. */
  coverage?: number
  elevated_count?: number
}

export interface PhysioResponse {
  measured_student_id: string | null
  measured_student_name: string | null
  /**
   * Roster members with no band. Listed explicitly so the UI can say "not
   * measured" rather than leaving a blank that reads as "calm".
   */
  unmeasured_students: { student_id: string; name: string }[]
  device_id: string | null
  battery_pct: number | null
  timeline: PhysioTimeline | null
}

export const physiologyService = {
  /**
   * Returns null when this session has no physiological data at all — a
   * remote viva, or a physical one run without the band. Callers should
   * render nothing in that case rather than an empty widget.
   */
  async getTimeline(sessionId: string): Promise<PhysioResponse | null> {
    const res = await apiFetch(PHYSIO_API.timeline(sessionId))
    if (res.status === 404 || res.status === 403) return null
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message || 'Failed to load physiological data')
    }
    const body = await res.json()
    const data = (body.data ?? body) as PhysioResponse
    if (!data?.measured_student_id || !data.timeline?.has_data) return null
    return data
  },
}
