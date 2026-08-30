import apiFetch from './apiClient'
import { ATTRIBUTION_API } from '@/constants/api.constant'

/**
 * Speaker attribution — who answered, in a group viva.
 *
 * A group session records everyone at once, so "who answered" cannot be read
 * off the request. Providers in the client observe who was speaking and post
 * timestamped evidence here; the backend fuses it and files each answer
 * against the right student.
 *
 * Evidence is best-effort by design: if a batch fails to reach the server the
 * viva carries on and the answer scores to the group, which is what happened
 * before attribution existed. Nothing in this file may throw into the session.
 */

export type EvidenceSource = 'agora_volume' | 'agora_stt' | 'live_cv'

export interface VolumeEvent {
  uid: string
  t_start: string // ISO-8601
  t_end: string
  level: number // 0..100
}

export interface AttributionItem {
  attribution_id: string
  answer_id: string
  question_order: number
  question_text: string
  answer_text: string | null
  student_id: string | null
  student_name: string | null
  provisional_student_id: string | null
  provisional_student_name: string | null
  share: number
  margin: number
  outcome: 'attributed' | 'uncertain' | 'no_evidence' | 'manual' | 'error'
  co_speakers: string[]
  source_breakdown: Record<string, unknown>
  status: 'provisional' | 'reconciled' | 'confirmed' | 'disputed'
  needs_review: boolean
}

export interface AttributionReview {
  items: AttributionItem[]
  needs_review_count: number
  roster: { student_id: string; name: string }[]
}

/**
 * Someone the cameras followed but could not name — almost always a student
 * who never uploaded an enrolment photo. Their marks are held here rather
 * than discarded, so identifying them hands the marks over intact.
 */
export interface UnknownSpeaker {
  unknown_speaker_id: string
  label: string
  answers_contributed: number
  total_share: number
  first_seen: string | null
  last_seen: string | null
  resolved_student_id: string | null
  resolved_student_name: string | null
}

export interface UnknownSpeakerList {
  items: UnknownSpeaker[]
  unresolved_count: number
  roster: { student_id: string; name: string }[]
}

export interface SeatBinding {
  binding_id: string
  student_id: string | null
  track_ref?: string
  bbox?: number[] | null
  method?: string
  confidence: number
  identity_confidence?: number | null
  votes?: number
  frames_processed?: number
}

export interface SpeakerDetectionTestResult {
  bindings: Array<SeatBinding & { student_name: string; email: string | null }>
  accounts: Array<{ student_id: string; student_name: string; email: string; has_photo: boolean }>
  missing_accounts: string[]
  missing_photos: string[]
  frames_processed: number
}

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      (body as { message?: string })?.message ||
      (body as { error?: string })?.error ||
      fallback
    throw new Error(message)
  }
  return ((body as { data?: T })?.data ?? body) as T
}

export const attributionService = {
  async testSpeakerBinding(frames: Blob[]): Promise<SpeakerDetectionTestResult> {
    const body = new FormData()
    frames.forEach((frame, index) => {
      body.append('frames', frame, `speaker-test-${index + 1}.jpg`)
    })
    const res = await apiFetch(ATTRIBUTION_API.speakerDetectionTest, { method: 'POST', body })
    return readJson(res, 'Failed to test face binding')
  },
  /** Post a batch of speaker evidence. Never throws — returns 0 on failure. */
  async sendEvidence(
    sessionId: string,
    source: EvidenceSource,
    events: unknown[],
  ): Promise<number> {
    if (!events.length) return 0
    try {
      const res = await apiFetch(ATTRIBUTION_API.evidence(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, events }),
      })
      if (!res.ok) return 0
      const body = await res.json().catch(() => null)
      return (body?.data?.stored as number) ?? 0
    } catch {
      // Attribution is decision-support; a dropped batch must not surface as
      // an error during someone's exam.
      return 0
    }
  },

  /** Examiner review queue: every answer and who it was credited to. */
  async getReview(sessionId: string): Promise<AttributionReview> {
    const res = await apiFetch(ATTRIBUTION_API.answers(sessionId))
    return readJson<AttributionReview>(res, 'Failed to load attribution review')
  },

  /** Confirm the resolved speaker, or override it with `studentId`. */
  async confirm(
    sessionId: string,
    answerId: string,
    studentId?: string,
  ): Promise<{ answer_id: string; student_id: string | null; status: string }> {
    const res = await apiFetch(ATTRIBUTION_API.confirm(sessionId, answerId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentId ? { student_id: studentId } : {}),
    })
    return readJson(res, 'Failed to confirm the attribution')
  },

  /** Re-resolve every answer now that post-hoc CV evidence exists. */
  async reconcile(sessionId: string): Promise<Record<string, number>> {
    const res = await apiFetch(ATTRIBUTION_API.reconcile(sessionId), {
      method: 'POST',
    })
    return readJson(res, 'Failed to reconcile attribution')
  },

  /** People the CV followed but could not name, and the marks they hold. */
  async getUnknownSpeakers(sessionId: string): Promise<UnknownSpeakerList> {
    const res = await apiFetch(ATTRIBUTION_API.unknownSpeakers(sessionId))
    return readJson<UnknownSpeakerList>(res, 'Failed to load unknown speakers')
  },

  /** Identify an unknown speaker; their held marks move to that student. */
  async resolveUnknownSpeaker(
    sessionId: string,
    unknownSpeakerId: string,
    studentId: string,
  ): Promise<{ label: string; resolved_student_id: string }> {
    const res = await apiFetch(ATTRIBUTION_API.unknownSpeakers(sessionId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unknown_speaker_id: unknownSpeakerId,
        student_id: studentId,
      }),
    })
    return readJson(res, 'Failed to identify that speaker')
  },

  /** Current seat bindings for a physical session. */
  async getBindings(
    sessionId: string,
  ): Promise<{ bindings: SeatBinding[]; missing_enrollment: string[] }> {
    const res = await apiFetch(ATTRIBUTION_API.bind(sessionId))
    return readJson(res, 'Failed to load seat bindings')
  },
}

/**
 * Collects Agora `volume-indicator` samples into speaking spans.
 *
 * Agora reports approximately every two seconds. Samples are coalesced into
 * contiguous spans and flushed periodically, while a single positive sample
 * still represents its preceding reporting interval.
 *
 * A UID drops out of the "speaking" set once it has been quiet for
 * GAP_MS — brief dips below the threshold are breath pauses, not turn ends.
 */
export class ActiveSpeakerCollector {
  private open = new Map<string, { start: number; last: number; peak: number }>()
  private pending: VolumeEvent[] = []
  private timer: ReturnType<typeof setInterval> | null = null

  /** Below this level a publisher is background noise, not speech. */
  static readonly THRESHOLD = 15
  /** Agora's documented volume-indicator reporting interval. */
  static readonly SAMPLE_PERIOD_MS = 2000
  /** One quiet report closes the current speaking span. */
  static readonly GAP_MS = 1800
  /** Spans shorter than this are noise; the backend drops them anyway. */
  static readonly MIN_SPAN_MS = 250

  constructor(
    private sessionId: string,
    private observedUid: string | number,
    private flushMs = 5000,
  ) {}

  start() {
    if (this.timer) return
    this.timer = setInterval(() => void this.flush(), this.flushMs)
  }

  /** Feed one `volume-indicator` payload from the Agora client. */
  observe(volumes: { uid: string | number; level: number }[]) {
    const now = Date.now()

    for (const { uid, level } of volumes) {
      const key = String(uid)
      if (key !== String(this.observedUid)) continue
      if (level >= ActiveSpeakerCollector.THRESHOLD) {
        const span = this.open.get(key)
        if (span) {
          span.last = now
          span.peak = Math.max(span.peak, level)
        } else {
          this.open.set(key, {
            start: now - ActiveSpeakerCollector.SAMPLE_PERIOD_MS,
            last: now,
            peak: level,
          })
        }
      }
    }

    // Close spans that have gone quiet.
    for (const [key, span] of [...this.open]) {
      if (now - span.last >= ActiveSpeakerCollector.GAP_MS) {
        this.close(key, span)
      }
    }
  }

  private close(key: string, span: { start: number; last: number; peak: number }) {
    this.open.delete(key)
    if (span.last - span.start < ActiveSpeakerCollector.MIN_SPAN_MS) return
    this.pending.push({
      uid: key,
      t_start: new Date(span.start).toISOString(),
      t_end: new Date(span.last).toISOString(),
      level: span.peak,
    })
  }

  /** Send whatever has closed so far. Safe to call at any time. */
  async flush(): Promise<number> {
    if (!this.pending.length) return 0
    const batch = this.pending
    this.pending = []
    return attributionService.sendEvidence(this.sessionId, 'agora_volume', batch)
  }

  /** Close every open span and send the tail. Call when the session ends. */
  async stop(): Promise<number> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    for (const [key, span] of [...this.open]) this.close(key, span)
    return this.flush()
  }
}
