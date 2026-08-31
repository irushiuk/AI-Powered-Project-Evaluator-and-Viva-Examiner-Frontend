'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, BatteryLow, HeartPulse, Info } from 'lucide-react'
import {
  physiologyService,
  type PhysioPoint,
  type PhysioResponse,
} from '@/services/physiologyService'

/**
 * Fewest beats a window may rest on and still be drawn as a heart rate.
 *
 * A rate computed from one or two intervals is a single artifact, not a
 * measurement: a doubled or missed beat alone can read as 156 bpm. The
 * analyser already refuses to JUDGE such windows (it wants 20 clean beats for
 * variability); this stops the chart from DISPLAYING them as though they were
 * real, which is worse than showing nothing because it invites the reader to
 * explain a number that never happened.
 */
const MIN_BEATS_TO_PLOT = 5

/**
 * Heart-rate arousal from the exam-station band, inside the behavioural tab.
 *
 * Renders NOTHING unless this session actually has physiological data. Only
 * physical sessions run with a band have it, so an always-present empty panel
 * would be noise on every other report.
 *
 * Two framing rules the UI has to carry, not just the backend:
 *   1. Arousal is not deception. A raised heart rate means the student found
 *      a moment demanding. Saying more than that is not supported.
 *   2. No reading is not a calm reading. Windows where the clip lost contact
 *      are drawn as gaps, and unmeasured students are named.
 */
export default function PhysiologySection({
  sessionId,
  onSeek,
  canSeek,
}: {
  sessionId: string
  /** Shares the recording player with the rest of the report. */
  onSeek: (tMs: number, leadInMs?: number) => void
  canSeek: boolean
}) {
  const [data, setData] = useState<PhysioResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    physiologyService
      .getTimeline(sessionId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        // Advisory extra: a failure here must not take down the behavioural
        // report the examiner actually came for.
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const points = data?.timeline?.points ?? []

  // Consecutive elevated windows are one moment, not eight. Collapsing them
  // is what turns a curve into something an examiner can act on.
  const moments = useMemo(() => collapse(points), [points])

  const hrRange = useMemo(() => {
    // Any point with a rate, not only ones an arousal verdict could be formed
    // for. Without a baseline every point is `usable: false`, and requiring it
    // here hid the whole chart on exactly the sessions where the raw trace is
    // the only thing left to show.
    const values = points
      .filter((p) => p.hr != null && p.beats >= MIN_BEATS_TO_PLOT)
      .map((p) => p.hr as number)
    if (!values.length) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    // Keep a floor on the span so a steady trace does not render as noise
    // amplified to full height.
    return { min: Math.min(min, max - 10), max: Math.max(max, min + 10) }
  }, [points])

  if (loading || !data || !data.timeline?.has_data) return null

  const baseline = data.timeline.baseline
  const coverage = data.timeline.coverage ?? 0

  return (
    <div className="border-t border-gray-100 px-5 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <HeartPulse className="h-4 w-4 text-rose-500" />
            Heart rate &amp; arousal
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Worn by {data.measured_student_name ?? 'the student'} · relative to
            their own resting baseline
          </p>
        </div>
        {typeof data.battery_pct === 'number' && data.battery_pct < 20 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
            <BatteryLow className="h-3 w-3" />
            Band battery {data.battery_pct}%
          </span>
        )}
      </div>

      {/* The single most important sentence in this panel. */}
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-400" />
        <span>
          Advisory only — this never affects a score. A raised heart rate means
          the student found a moment demanding; it is <strong>not</strong> an
          indication of dishonesty.
        </span>
      </p>

      {!baseline?.usable ? (
        <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
          No usable calm baseline was captured for this session, so no arousal
          comparison can be made. The readings below are raw heart rate only.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
          <span>
            Resting{' '}
            <strong className="font-mono text-gray-900">
              {baseline.hr_mean?.toFixed(0)} bpm
            </strong>
          </span>
          <span>
            Resting variability{' '}
            <strong className="font-mono text-gray-900">
              {baseline.rmssd?.toFixed(0)} ms
            </strong>
          </span>
          <span>
            Signal coverage{' '}
            <strong className="font-mono text-gray-900">
              {Math.round(coverage * 100)}%
            </strong>
          </span>
        </div>
      )}

      {hrRange && (
        <Trace
          points={points}
          min={hrRange.min}
          max={hrRange.max}
          onSeek={onSeek}
          canSeek={canSeek}
        />
      )}

      <div className="mt-5">
        <h4 className="text-xs font-semibold text-gray-900">
          Moments of raised arousal
        </h4>
        {moments.length === 0 ? (
          <p className="mt-1.5 text-xs text-gray-400">
            {baseline?.usable
              ? 'None — the student’s heart rate stayed within their resting range.'
              : 'Not assessed without a baseline.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {moments.map((m) => (
              <li key={m.start.offset_ms}>
                <button
                  type="button"
                  onClick={() => onSeek(m.start.offset_ms, 3000)}
                  disabled={!canSeek}
                  className="flex w-full items-center gap-3 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-left text-xs transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="font-mono font-medium text-rose-700">
                    {m.start.video_timecode}
                  </span>
                  <span className="text-gray-600">
                    +{m.peakDelta.toFixed(0)} bpm above resting, variability
                    down to {Math.round((m.minRatio ?? 0) * 100)}%
                  </span>
                  <span className="ml-auto whitespace-nowrap text-gray-400">
                    {Math.round(m.durationS)}s
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.unmeasured_students.length > 0 && (
        <p className="mt-5 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-500">
          <strong className="text-gray-700">Not measured:</strong>{' '}
          {data.unmeasured_students.map((s) => s.name).join(', ')} — only one
          band was worn in this session. No data is not the same as a calm
          reading.
        </p>
      )}
    </div>
  )
}

/** Sparkline of heart rate, with elevated windows tinted and gaps left blank. */
function Trace({
  points,
  min,
  max,
  onSeek,
  canSeek,
}: {
  points: PhysioPoint[]
  min: number
  max: number
  onSeek: (tMs: number, leadInMs?: number) => void
  canSeek: boolean
}) {
  const height = 56
  const span = Math.max(max - min, 1)

  return (
    <div className="mt-4">
      <div className="flex h-14 items-end gap-px overflow-hidden rounded-lg bg-gray-50 p-1">
        {points.map((p) => {
          if (p.hr == null || p.beats < MIN_BEATS_TO_PLOT) {
            // A gap, drawn as a gap. Filling it with a baseline value would
            // assert a reading that was never taken. Note this tests the RATE,
            // not `usable`: a point with a real pulse but no baseline to
            // compare against is still a measurement worth drawing.
            return (
              <div
                key={p.offset_ms}
                title={
                p.hr == null
                  ? `${p.video_timecode} — no reading (${p.reason})`
                  : `${p.video_timecode} — only ${p.beats} beat(s), too few to trust`
              }
                className="h-full min-w-[2px] flex-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#e5e7eb_2px,#e5e7eb_4px)]"
              />
            )
          }
          const pct = Math.max(6, Math.min(100, ((p.hr - min) / span) * 100))
          return (
            <button
              key={p.offset_ms}
              type="button"
              onClick={() => onSeek(p.offset_ms, 2000)}
              disabled={!canSeek}
              title={`${p.video_timecode} — ${p.hr.toFixed(0)} bpm${
                p.hr_delta != null ? ` (${p.hr_delta >= 0 ? '+' : ''}${p.hr_delta.toFixed(0)})` : ''
              }`}
              style={{ height: `${(pct / 100) * height}px` }}
              className={`min-w-[2px] flex-1 rounded-sm transition disabled:cursor-not-allowed ${
                p.elevated
                  ? 'bg-rose-500 hover:bg-rose-600'
                  : 'bg-gray-300 hover:bg-gray-400'
              } ${
                // Without a baseline nothing can be called elevated, so the
                // trace is shown plainly rather than implying "all normal".
                p.usable ? '' : 'opacity-70'
              }`}
            />
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
        <Key className="bg-rose-500" label="Raised arousal" />
        <Key className="bg-gray-300" label="Within resting range" />
        <Key
          className="bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#e5e7eb_2px,#e5e7eb_4px)] border border-gray-200"
          label="No reading (clip off finger)"
        />
      </div>
    </div>
  )
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  )
}

interface Moment {
  start: PhysioPoint
  durationS: number
  peakDelta: number
  minRatio: number | null
}

/** Collapse runs of consecutive elevated windows into single moments. */
function collapse(points: PhysioPoint[]): Moment[] {
  const out: Moment[] = []
  let run: PhysioPoint[] = []

  const flush = () => {
    if (!run.length) return
    const first = run[0]
    const last = run[run.length - 1]
    out.push({
      start: first,
      durationS: Math.max(
        (last.offset_ms - first.offset_ms) / 1000,
        1,
      ),
      peakDelta: Math.max(...run.map((p) => p.hr_delta ?? 0)),
      minRatio: run.reduce<number | null>((lowest, p) => {
        if (p.rmssd_ratio == null) return lowest
        return lowest == null ? p.rmssd_ratio : Math.min(lowest, p.rmssd_ratio)
      }, null),
    })
    run = []
  }

  for (const point of points) {
    if (point.elevated) run.push(point)
    else flush()
  }
  flush()
  return out
}
