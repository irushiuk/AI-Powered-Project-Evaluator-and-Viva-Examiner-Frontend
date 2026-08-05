'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  MessageSquareText,
  Play,
  RefreshCw,
  UserX,
  Users,
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
  const [triggering, setTriggering] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<CvQuestionMarker | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const load = useCallback(async () => {
    try {
      const data = await cvAnalysisService.getSummary(sessionId)
      setSummary(data)
      setNotFound(data === null)
    } catch (err) {
      console.warn('Behavioral report load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void load()
  }, [load])

  // Poll while the analysis is running.
  useEffect(() => {
    if (summary?.status !== 'processing' && summary?.status !== 'pending') return
    const id = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(id)
  }, [summary?.status, load])

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

  function seekTo(tMs: number) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = tMs / 1000
    void video.play().catch(() => {})
    video.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const artifact = summary?.artifact ?? null
  // Flags carry a student_id, not a name — resolve it so a group viva's
  // "Moments to review" says who, not just when.
  const nameFor = (studentId?: string | null) =>
    artifact?.per_student.find((s) => s.student_id === studentId)?.display_name ?? null
  const allFlags: CvIntegrityFlag[] = artifact
    ? [
        ...artifact.session_flags,
        ...artifact.per_student.flatMap((s) => s.integrity_flags),
      ].sort((a, b) => a.t_ms - b.t_ms)
    : []
  const questions: CvQuestionMarker[] = [...(summary?.question_timeline ?? [])].sort(
    (a, b) => a.offset_ms - b.offset_ms,
  )

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
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Behavioral Report
          </h3>
          <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
            advisory — not part of scoring
          </span>
        </div>
        {summary?.status === 'completed' && (
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
            title="Re-run analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading report…
          </div>
        ) : notFound ? (
          <div className="text-sm text-gray-500 space-y-3">
            <p>
              No behavioral analysis exists for this session yet. It is
              generated from the session recording after the viva ends.
            </p>
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {triggering ? 'Queueing…' : 'Run analysis'}
            </button>
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
            {/* Per-student summary */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Speaking</th>
                    <th className="pb-2 font-medium">Turns</th>
                    <th className="pb-2 font-medium">Attention</th>
                    <th className="pb-2 font-medium">Look-aways</th>
                    <th className="pb-2 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {artifact.per_student.map((s) => (
                    <tr key={s.student_id}>
                      <td className="py-2 font-medium text-gray-900">
                        {s.display_name}
                      </td>
                      <td className="py-2 text-gray-600">
                        {formatMs(s.speaking_time_ms)}
                        {artifact.mode === 'group' && (
                          <span className="text-gray-400">
                            {' '}({Math.round(s.speaking_share * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-gray-600">{s.turn_count}</td>
                      <td className="py-2">
                        {s.attention_pct == null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className={attentionColor(s.attention_pct)}>
                            {s.attention_pct.toFixed(0)}%
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-gray-600">
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
                      <td className="py-2 text-gray-600">
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
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Moments to review ({allFlags.length})
                </p>
                {allFlags.map((flag, i) => (
                  <button
                    key={i}
                    onClick={() => seekTo(flag.t_ms)}
                    disabled={!summary?.playback_url}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-left disabled:cursor-default"
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

            {/* Session recording player. The caption stands in for the AI
                examiner's voice, which is spoken by the student's browser and
                so never reaches the recording. */}
            {summary?.playback_url ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={summary.playback_url}
                  controls
                  preload="metadata"
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full rounded-xl border border-gray-200 bg-black"
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
            ) : (
              <p className="text-xs text-gray-400">
                Recording playback unavailable.
              </p>
            )}

            {/* Question chapters */}
            {questions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5 text-blue-500" />
                  Questions asked ({questions.length})
                </p>
                {questions.map((q) => (
                  <button
                    key={q.question_id}
                    onClick={() => seekTo(q.offset_ms)}
                    disabled={!summary?.playback_url}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left disabled:cursor-default ${
                      activeQuestion?.question_id === q.question_id
                        ? 'bg-blue-100'
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-blue-700 shrink-0">
                      Q{q.order}
                    </span>
                    <span className="flex-1 text-xs text-gray-700 line-clamp-2">
                      {q.question_text}
                    </span>
                    <span className="text-xs font-mono text-blue-700 flex items-center gap-1 shrink-0">
                      <Play className="w-3 h-3" /> {formatMs(q.offset_ms)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
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

function flagIcon(kind: CvIntegrityFlag['kind']) {
  if (kind === 'student_absent') return <UserX className="w-3.5 h-3.5 text-amber-600 shrink-0" />
  if (kind === 'extra_person') return <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
  if (kind === 'gaze_off_screen') return <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
  return <MessageSquareText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
}
