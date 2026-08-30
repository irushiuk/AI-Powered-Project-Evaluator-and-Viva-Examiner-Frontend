'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Play,
  RefreshCw,
  UserX,
  Users,
  Volume2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  cvAnalysisService,
  type CvIntegrityFlag,
  type CvQuestionMarker,
  type CvSummaryResponse,
} from '@/services/cvAnalysisService'

/**
 * Examiner-only behavioral report for a completed session.
 *
 * Everything shown here is ADVISORY decision-support: attention, speaking
 * share and integrity flags never affect any score. Flags are timecoded
 * evidence pointers — clicking one seeks the session recording so the
 * examiner can judge the moment themselves.
 *
 * The AI examiner's voice is not in the recording (it is spoken by the
 * student's browser and cannot be captured), so its questions are overlaid on
 * the player as chapters and a caption instead.
 */
export default function BehavioralReportCard({ sessionId }: { sessionId: string }) {
  const [summary, setSummary] = useState<CvSummaryResponse | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<CvQuestionMarker | null>(null)
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null)
  const [videoDurationMs, setVideoDurationMs] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const data = await cvAnalysisService.getSummary(sessionId)
      setSummary(data)
      setNotFound(data === null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load behavioral report')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void load()
  }, [load])

  // Poll while recording finalization is creating the report, and while the
  // analysis itself is pending/running.
  useEffect(() => {
    if (!notFound && summary?.status !== 'processing' && summary?.status !== 'pending') return
    const id = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(id)
  }, [notFound, summary?.status, load])

  async function handleTrigger() {
    setTriggering(true)
    try {
      await cvAnalysisService.triggerAnalysis(sessionId)
      toast.success('Behavioral analysis queued')
      window.setTimeout(() => void load(), 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to queue analysis')
    } finally {
      setTriggering(false)
    }
  }

  function seekTo(tMs: number, leadInMs = 0) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, tMs - leadInMs) / 1000
    void video.play().catch(() => {})
    video.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const artifact = summary?.artifact ?? null
  // Flags carry a student_id, not a name — resolve it so a group viva's
  // "Moments to review" says who, not just when.
  const nameFor = (studentId?: string | null) =>
    artifact?.per_student.find((s) => s.student_id === studentId)?.display_name ?? null
  const allFlags: CvIntegrityFlag[] = useMemo(
    () =>
      artifact
        ? [
            ...artifact.session_flags,
            ...artifact.per_student.flatMap((student) => student.integrity_flags),
          ].sort((a, b) => a.t_ms - b.t_ms)
        : [],
    [artifact],
  )
  const questions: CvQuestionMarker[] = useMemo(
    () =>
      [...(summary?.question_timeline ?? [])].sort(
        (a, b) => a.offset_ms - b.offset_ms,
      ),
    [summary?.question_timeline],
  )
  const inferredDurationMs = useMemo(() => {
    const lastFlag = Math.max(0, ...allFlags.map((flag) => flag.t_ms + 5000))
    const lastQuestion = Math.max(0, ...questions.map((question) => question.offset_ms + 10000))
    const lastSpeech = Math.max(
      0,
      ...(artifact?.timeline.map((event) => event.t_end_ms) ?? []),
    )
    return Math.max(1000, lastFlag, lastQuestion, lastSpeech)
  }, [allFlags, artifact?.timeline, questions])
  const timelineDurationMs = videoDurationMs || inferredDurationMs

  // The question on screen at the current playhead = the last one asked at or
  // before it.
  function handleTimeUpdate() {
    const video = videoRef.current
    if (!video || questions.length === 0) return
    const nowMs = video.currentTime * 1000
    let current: CvQuestionMarker | null = null
    for (const q of questions) {
      if (q.offset_ms <= nowMs) current = q
      else break
    }
    setActiveQuestion((prev) =>
      prev?.question_id === current?.question_id ? prev : current,
    )
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Behavioral Review
          </h3>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
            Advisory only
          </span>
        </div>
        {summary?.status === 'completed' && (
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
            title="Run the analysis again"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
            Re-run analysis
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 p-5 sm:p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading report…
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <p>{loadError}</p>
            <button onClick={() => void load()} className="mt-3 font-semibold hover:underline">
              Try again
            </button>
          </div>
        ) : notFound ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing the session recording for behavioral analysis…
          </div>
        ) : summary?.status === 'processing' || summary?.status === 'pending' ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing the session recording… this can take a few minutes.
          </div>
        ) : summary?.status === 'failed' ? (
          <div className="text-sm space-y-2">
            <p className="text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Analysis failed
            </p>
            {summary.error_message && (
              <p className="text-xs text-gray-500 font-mono break-all">
                {summary.error_message}
              </p>
            )}
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        ) : artifact ? (
          <>
            <div className="order-0 flex gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-xs leading-relaxed text-blue-800">
                These signals identify moments worth reviewing. They do not prove
                misconduct and never change a student&apos;s score automatically.
              </p>
            </div>
            {/* Per-student summary */}
            <div className="order-4 overflow-x-auto rounded-xl border border-gray-200 p-4 sm:p-5">
              <SectionTitle
                title="Full behavioral results"
                subtitle="A session-level summary for each participant."
              />
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-3 pt-4 font-medium">Student</th>
                    <th className="pb-3 pt-4 font-medium">Speaking</th>
                    <th className="pb-3 pt-4 font-medium">Turns</th>
                    <th className="pb-3 pt-4 font-medium">Attention</th>
                    <th className="pb-3 pt-4 font-medium">Look-aways</th>
                    <th className="pb-3 pt-4 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {artifact.per_student.map((s) => (
                    <tr key={s.student_id}>
                      <td className="py-3 font-medium text-gray-900">
                        {s.display_name}
                      </td>
                      <td className="py-3 text-gray-600">
                        {formatMs(s.speaking_time_ms)}
                        {artifact.mode === 'group' && (
                          <span className="text-gray-400">
                            {' '}({Math.round(s.speaking_share * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-600">{s.turn_count}</td>
                      <td className="py-3">
                        {s.attention_pct == null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className={attentionColor(s.attention_pct)}>
                            {s.attention_pct.toFixed(0)}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-600">
                        {s.off_screen_glance_count ? (
                          <>
                            {s.off_screen_glance_count}
                            <span className="text-gray-400">
                              {' '}({formatMs(s.off_screen_time_ms)} off screen)
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-600">
                        {s.integrity_flags.length || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {artifact.mode === 'group' && artifact.unattributed_speaking_ms > 0 && (
                <p className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {formatMs(artifact.unattributed_speaking_ms)} of speech could
                  not be attributed to a specific student.
                </p>
              )}
            </div>

            {/* Integrity flags — timecoded evidence for human review */}
            {allFlags.length > 0 && (
              <div className="order-2 space-y-3 rounded-xl border border-gray-200 p-4 sm:p-5">
                <SectionTitle
                  title={`Moments to review (${allFlags.length})`}
                  subtitle="Playback begins two seconds before each detected moment."
                />
                {allFlags.map((flag, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedMoment(`${flag.kind}-${flag.t_ms}-${i}`)
                      seekTo(flag.t_ms, 2000)
                    }}
                    disabled={!summary?.playback_url}
                    className={`w-full flex items-center gap-2 px-3 py-3 rounded-lg border text-left disabled:cursor-default transition ${
                      selectedMoment === `${flag.kind}-${flag.t_ms}-${i}`
                        ? 'border-amber-300 bg-amber-100 ring-2 ring-amber-100'
                        : 'border-amber-100 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    {flagIcon(flag.kind)}
                    <span className="flex-1 text-xs text-gray-700">
                      {nameFor(flag.student_id) && (
                        <span className="font-medium text-gray-900">
                          {nameFor(flag.student_id)}:{' '}
                        </span>
                      )}
                      {flag.note}
                    </span>
                    <span className="text-xs font-mono text-amber-700 flex items-center gap-1">
                      <Play className="w-3 h-3" /> {flag.video_timecode}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {allFlags.length === 0 && (
              <div className="order-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
                <SectionTitle
                  title="Moments to review (0)"
                  subtitle="No unusual moments were flagged in this recording."
                />
              </div>
            )}

            {/* Session recording player. The caption stands in for the AI
                examiner's voice, which is spoken by the student's browser and
                so never reaches the recording. */}
            {summary?.playback_url ? (
              <div className="order-1 mx-auto w-full max-w-3xl space-y-3">
                <SectionTitle
                  title="Session recording"
                  subtitle="Select a timeline marker or review moment to jump through the recording."
                />
                <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-black">
                  <video
                    ref={videoRef}
                    src={summary.playback_url}
                    controls
                    preload="metadata"
                    onLoadedMetadata={(event) => setVideoDurationMs(event.currentTarget.duration * 1000)}
                    onTimeUpdate={handleTimeUpdate}
                    className="aspect-video w-full bg-black"
                  />
                  {activeQuestion && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-12 px-3">
                      <p className="mx-auto max-w-2xl rounded-lg bg-black/75 px-3 py-1.5 text-center text-xs leading-snug text-white">
                        <span className="font-semibold text-blue-300">
                          Q{activeQuestion.order}:{' '}
                        </span>
                        {activeQuestion.question_text}
                      </p>
                    </div>
                  )}
                  </div>
              </div>
            ) : (
              <p className="order-1 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
                Recording playback unavailable.
              </p>
            )}

            <div className="order-3 rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                <SectionTitle
                  title="Session timeline"
                  subtitle="Questions, behavioral flags, and attributed speaking activity."
                />
                <span className="font-mono text-xs text-gray-400">
                  {formatMs(timelineDurationMs)} total
                </span>
              </div>

              <div className="relative h-12 rounded-xl bg-gray-100">
                <div className="absolute inset-y-0 left-1/4 w-px bg-white" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-white" />
                <div className="absolute inset-y-0 left-3/4 w-px bg-white" />

                {artifact.timeline.map((event, index) => {
                  const start = markerPosition(event.t_start_ms, timelineDurationMs)
                  const end = markerPosition(event.t_end_ms, timelineDurationMs)
                  const studentName = nameFor(event.student_id) ?? 'Student'
                  return (
                    <button
                      key={`${event.student_id}-${event.t_start_ms}-${index}`}
                      type="button"
                      title={`${studentName} speaking, ${formatMs(event.t_start_ms)}–${formatMs(event.t_end_ms)}`}
                      aria-label={`${studentName} speaking at ${formatMs(event.t_start_ms)}`}
                      onClick={() => seekTo(event.t_start_ms)}
                      disabled={!summary?.playback_url}
                      className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-emerald-500 transition hover:bg-emerald-600 disabled:cursor-default"
                      style={{ left: `${start}%`, width: `${Math.max(0.7, end - start)}%` }}
                    />
                  )
                })}

                {questions.map((question) => (
                  <TimelinePoint
                    key={question.question_id}
                    position={markerPosition(question.offset_ms, timelineDurationMs)}
                    color="bg-blue-500"
                    label={`Q${question.order} at ${formatMs(question.offset_ms)}`}
                    onClick={() => seekTo(question.offset_ms)}
                    disabled={!summary?.playback_url}
                  />
                ))}

                {allFlags.map((flag, index) => (
                  <TimelinePoint
                    key={`${flag.kind}-${flag.t_ms}-${index}`}
                    position={markerPosition(flag.t_ms, timelineDurationMs)}
                    color={flag.kind === 'gaze_off_screen' ? 'bg-amber-500' : 'bg-red-500'}
                    label={`${flagLabel(flag.kind)} at ${flag.video_timecode}`}
                    onClick={() => seekTo(flag.t_ms, 2000)}
                    disabled={!summary?.playback_url}
                    emphasized
                  />
                ))}
              </div>

              <div className="mt-2 flex justify-between font-mono text-[10px] text-gray-400">
                <span>0:00</span>
                <span>{formatMs(timelineDurationMs * 0.25)}</span>
                <span>{formatMs(timelineDurationMs * 0.5)}</span>
                <span>{formatMs(timelineDurationMs * 0.75)}</span>
                <span>{formatMs(timelineDurationMs)}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-gray-500">
                <Legend color="bg-blue-500" label="Question" />
                <Legend color="bg-amber-500" label="Look-away" />
                <Legend color="bg-red-500" label="Other review flag" />
                <Legend color="bg-emerald-500" label="Speaking" />
              </div>
            </div>

          </>
        ) : null}
      </div>
    </section>
  )
}

function formatMs(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function attentionColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-600 font-medium'
  if (pct >= 50) return 'text-amber-600 font-medium'
  return 'text-red-600 font-medium'
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
    </div>
  )
}

function TimelinePoint({
  position,
  color,
  label,
  onClick,
  disabled,
  emphasized = false,
}: {
  position: number
  color: string
  label: string
  onClick: () => void
  disabled: boolean
  emphasized?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full ${color} shadow-sm transition disabled:cursor-default ${
        emphasized ? 'h-8 w-3 ring-2 ring-white hover:h-9' : 'h-5 w-2 hover:h-6 hover:w-2.5'
      }`}
      style={{ left: `${position}%` }}
    />
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
    </span>
  )
}

function markerPosition(tMs: number, durationMs: number): number {
  return Math.min(99, Math.max(1, (tMs / durationMs) * 100))
}

function flagLabel(kind: CvIntegrityFlag['kind']): string {
  if (kind === 'student_absent') return 'Student not visible'
  if (kind === 'extra_person') return 'Additional person visible'
  if (kind === 'gaze_off_screen') return 'Sustained look-away'
  return 'Unknown person visible'
}

function flagIcon(kind: CvIntegrityFlag['kind']) {
  if (kind === 'student_absent') return <UserX className="w-3.5 h-3.5 text-amber-600 shrink-0" />
  if (kind === 'extra_person') return <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
  if (kind === 'gaze_off_screen') return <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
  if (kind === 'unknown_face') return <UserX className="w-3.5 h-3.5 text-red-600 shrink-0" />
  return <Volume2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
}
