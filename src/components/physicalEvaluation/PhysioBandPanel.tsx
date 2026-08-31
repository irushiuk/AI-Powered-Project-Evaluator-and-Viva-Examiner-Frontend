'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BatteryLow, Check, HeartPulse, Loader2, X } from 'lucide-react'
import {
  physicalEvaluationService,
  type PhysioDeviceState,
} from '@/services/physicalEvaluationService'

const CALM_SECONDS = 45
const POLL_MS = 3000
/** How many times to silently retry a failed capture before asking for help. */
const MAX_ATTEMPTS = 3

/**
 * Heart-rate band setup — autonomous.
 *
 * The student has enough to comply with during a viva, so this asks for as
 * close to nothing as it can. Once the band is on a finger and streaming, the
 * calm baseline records itself and retries itself; there is no button to
 * press and nothing to remember.
 *
 * Two things still have to be true, and the panel drives both:
 *
 *   1. The band must be BOUND to whoever is wearing it. An individual session
 *      has one candidate so it binds itself. A group session cannot be
 *      inferred — someone has to say who put it on — so that is the single
 *      remaining interaction.
 *   2. A CALM BASELINE must exist. Capture waits for live signal first:
 *      counting down while the clip is still being fitted would burn the
 *      window and produce a baseline of nothing.
 *
 * The whole panel is optional. A session run without the band shows it idle
 * and nothing downstream depends on it.
 */
export default function PhysioBandPanel({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<PhysioDeviceState | null>(null)
  const [studentId, setStudentId] = useState('')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState('')

  // Refs, not state: the poll loop reads these and must not re-subscribe.
  const capturingRef = useRef(false)
  const attemptsRef = useRef(0)
  // Auto-bind is a one-shot. If another kiosk tab claims the same band, this
  // panel must not immediately claim it back - two tabs would then trade the
  // band every poll and neither session would ever collect a clean baseline.
  const autoBoundRef = useRef(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    const data = await physicalEvaluationService.getPhysioDevice(sessionId)
    if (!data) return null
    setState(data)
    if (data.student_id) setStudentId(data.student_id)
    return data
  }, [sessionId])

  const finishCapture = useCallback(async () => {
    try {
      const result = await physicalEvaluationService.stopBaseline(sessionId)
      if (!result.usable) attemptsRef.current += 1
      setAttempts(attemptsRef.current)
    } catch {
      attemptsRef.current += 1
      setAttempts(attemptsRef.current)
    } finally {
      capturingRef.current = false
      setRemaining(null)
      await refresh()
    }
  }, [sessionId, refresh])

  const beginCapture = useCallback(async () => {
    if (capturingRef.current) return
    capturingRef.current = true
    setError('')
    try {
      await physicalEvaluationService.startBaseline(sessionId)
      setRemaining(CALM_SECONDS)
      countdownRef.current = setInterval(() => {
        setRemaining((left) => {
          if (left === null) return null
          if (left > 1) return left - 1
          if (countdownRef.current) clearInterval(countdownRef.current)
          void finishCapture()
          return null
        })
      }, 1000)
    } catch (e) {
      capturingRef.current = false
      setError(e instanceof Error ? e.message : 'Could not start the calm period')
    }
  }, [sessionId, finishCapture])

  // The whole state machine: bind if we can, then capture once signal is live.
  useEffect(() => {
    let stopped = false

    const tick = async () => {
      const data = await refresh()
      if (stopped || !data) return

      // Bind automatically when there is only one possible wearer, once.
      if (!data.student_id && data.roster.length === 1 && !autoBoundRef.current) {
        autoBoundRef.current = true
        try {
          await physicalEvaluationService.bindPhysioDevice(
            sessionId,
            data.device_id || 'VivaSense-HR',
            data.roster[0].student_id,
          )
          await refresh()
        } catch {
          // A group session, or a race with another tab. The dropdown covers it.
        }
        return
      }

      if (!data.student_id) return                    // waiting on the dropdown
      if (data.baseline_state === 'ready') return     // done
      if (data.baseline_state === 'capturing') return // a window is already open
      if (capturingRef.current) return
      if (attemptsRef.current >= MAX_ATTEMPTS) return

      // Only start once beats are genuinely arriving with contact.
      if (data.signal?.live) void beginCapture()
    }

    void tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      stopped = true
      clearInterval(id)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [sessionId, refresh, beginCapture])

  async function chooseWearer(id: string) {
    setStudentId(id)
    if (!id) return
    try {
      await physicalEvaluationService.bindPhysioDevice(
        sessionId,
        state?.device_id || 'VivaSense-HR',
        id,
      )
      attemptsRef.current = 0
      setAttempts(0)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign the band')
    }
  }

  if (!state || state.roster.length === 0) return null

  const needsWearer = !state.student_id && state.roster.length > 1
  const status = describe(state, remaining, attempts)

  return (
    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-rose-300">
          <HeartPulse className="h-4 w-4" />
          <span className="text-sm font-semibold">Heart-rate band</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            Optional
          </span>
        </div>
        {typeof state.battery_pct === 'number' && state.battery_pct < 20 && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-300">
            <BatteryLow className="h-3.5 w-3.5" /> Battery {state.battery_pct}%
          </span>
        )}
      </div>

      {/* The only interaction, and only when it cannot be inferred. */}
      {needsWearer && (
        <div className="mt-4">
          <label
            htmlFor="physio-student"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Who is wearing the band?
          </label>
          <select
            id="physio-student"
            value={studentId}
            onChange={(e) => void chooseWearer(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 outline-none focus:border-rose-400"
          >
            <option value="">Nobody — skip heart-rate capture</option>
            {state.roster.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2.5">
        <span className="mt-0.5">{status.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${status.tone}`}>{status.title}</p>
          {status.detail && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {status.detail}
            </p>
          )}
          {remaining !== null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-rose-500 transition-all duration-1000 ease-linear"
                style={{
                  width: `${((CALM_SECONDS - remaining) / CALM_SECONDS) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}

interface Status {
  icon: React.ReactNode
  title: string
  detail?: string
  tone: string
}

/** One line describing exactly where capture has got to, and nothing to click. */
function describe(
  state: PhysioDeviceState,
  remaining: number | null,
  attempts: number,
): Status {
  const spinner = <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
  const dot = <span className="block h-2 w-2 rounded-full bg-slate-600" />

  if (!state.student_id) {
    return {
      icon: dot,
      tone: 'text-slate-400',
      title: 'No band assigned',
      detail:
        state.roster.length > 1
          ? 'Choose who is wearing it, or leave this session without heart-rate data.'
          : 'Waiting for a band.',
    }
  }

  if (remaining !== null) {
    return {
      icon: spinner,
      tone: 'text-rose-200',
      title: `Recording calm baseline — ${remaining}s`,
      detail: `Ask ${state.student_name} to sit still and quiet until this finishes.`,
    }
  }

  if (state.baseline_state === 'ready') {
    return {
      icon: <Check className="h-4 w-4 text-emerald-400" />,
      tone: 'text-emerald-300',
      title: `Ready — baseline recorded for ${state.student_name}`,
      detail: 'Heart-rate capture will run for the rest of the session.',
    }
  }

  if (attempts >= MAX_ATTEMPTS) {
    return {
      icon: <X className="h-4 w-4 text-amber-400" />,
      tone: 'text-amber-300',
      title: 'Could not get a clean reading',
      detail:
        'Check the finger clip is snug and the hand is still. The viva can go ahead — the report will show heart rate without an arousal comparison.',
    }
  }

  if (!state.signal?.live) {
    // "No finger detected" and "nothing is reaching us at all" look identical
    // from the outside and send you to opposite places - the clip, or the
    // relay. `recent_samples` is what tells them apart, so it decides the
    // wording rather than the contact flag alone.
    const nothingArriving = (state.signal?.recent_samples ?? 0) === 0
    return {
      icon: spinner,
      tone: 'text-slate-300',
      title: nothingArriving
        ? 'No data reaching the system from the band'
        : `Waiting for the band on ${state.student_name}`,
      detail: nothingArriving
        ? 'The band may be streaming to its screen while nothing relays it here. Check the station relay is running (VivaSenseStationRelay) and that the band is powered.'
        : 'No finger detected on the sensor yet — fit the clip and the calm period starts by itself.',
    }
  }

  return {
    icon: spinner,
    tone: 'text-slate-300',
    title: 'Pulse found — starting the calm period',
    detail: attempts > 0 ? `Retrying (attempt ${attempts + 1}).` : undefined,
  }
}
