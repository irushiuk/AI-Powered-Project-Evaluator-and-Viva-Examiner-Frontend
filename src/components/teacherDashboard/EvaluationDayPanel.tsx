"use client"

// src/components/teacherDashboard/EvaluationPanel.tsx
//
// Evaluation-day control panel for the teacher (examiner).
// Plugs straight into the existing teacher project detail page as a new tab:
//
//   import EvaluationPanel from "@/components/teacherDashboard/EvaluationPanel"
//   ...
//   {activeTab === "evaluation" && <EvaluationPanel projectId={id} />}
//
// The component is fully self-contained: it owns the polling loop, the
// media recorder, and all state transitions.  No props beyond `projectId`.

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import {
  openSessionPanel,
  getActiveSession,
  startDemo,
  completeDemo,
  endViva,
  ActiveSession,
  EvalSessionStatus,
} from "@/services/evaluationService"
import { formatColomboTime } from "@/utils/datetime"
import AgoraVideoRoom from "@/components/agora/AgoraVideoRoom"
import BehavioralReportCard from "@/components/teacherDashboard/BehavioralReportCard"
import LiveInterjectionCard from "@/components/teacherDashboard/LiveInterjectionCard"

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return "—"
  return formatColomboTime(iso)
}

function elapsed(from: string | null): string {
  if (!from) return "0:00"
  const secs = Math.floor((Date.now() - new Date(from).getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

// ─── status badge ─────────────────────────────────────────────────────────────

const STATUS_META: Record<
  EvalSessionStatus,
  { label: string; dot: string; ring: string; bg: string; text: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-gray-400",
    ring: "ring-gray-200",
    bg: "bg-gray-50",
    text: "text-gray-600",
  },
  in_progress: {
    label: "Demo in Progress",
    dot: "bg-amber-400 animate-pulse",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  demo_completed: {
    label: "Viva in Progress",
    dot: "bg-blue-500 animate-pulse",
    ring: "ring-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
}

function StatusBadge({ status }: { status: EvalSessionStatus }) {
  const m = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${m.ring} ${m.bg} ${m.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  )
}

// ─── upload picker ────────────────────────────────────────────────────────────

function FilePicker({
  label,
  accept,
  file,
  onChange,
}: {
  label: string
  accept: string
  file: File | null
  onChange: (f: File | null) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
        >
          {file ? "📎 " + file.name : "Choose file…"}
        </button>
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}

// ─── elapsed ticker ───────────────────────────────────────────────────────────

function ElapsedTicker({ from }: { from: string | null }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!from) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [from])
  if (!from) return null
  return (
    <span className="tabular-nums font-mono text-xs text-gray-400">
      {elapsed(from)}
    </span>
  )
}

// ─── Confirmation modal ───────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  children,
}: {
  title: string
  description: string
  confirmLabel: string
  confirmClass?: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
        {children}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`text-sm px-4 py-2 rounded-xl text-white font-medium transition ${confirmClass ?? "bg-blue-600 hover:bg-blue-700"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-medium text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export type EvaluationPanelProps = {
  projectId: string
}

export default function EvaluationPanel({ projectId }: EvaluationPanelProps) {
  // ── Panel state ─────────────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false)
  const [opening, setOpening] = useState(false)

  // ── Active session ──────────────────────────────────────────────────────────
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)

  // ── Action loading guards ───────────────────────────────────────────────────
  const [busy, setBusy] = useState(false)

  // ── Confirm modals ──────────────────────────────────────────────────────────
  const [confirmingDemo, setConfirmingDemo] = useState(false)
  const [confirmingViva, setConfirmingViva] = useState(false)

  // ── Viva end uploads ────────────────────────────────────────────────────────
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  // ─── fetch / poll ──────────────────────────────────────────────────────────

  const fetchActive = useCallback(async () => {
    if (!panelOpen) return
    try {
      const s = await getActiveSession(projectId)
      setSession(s)
    } catch (err) {
      // silent poll failure — don't spam toasts
      console.error("getActiveSession:", err)
    }
  }, [projectId, panelOpen])

  // Poll every 8 s while the panel is open and session not yet completed
  useEffect(() => {
    if (!panelOpen) return
    fetchActive()
    if (session?.status === "completed") return
    const id = setInterval(fetchActive, 8000)
    return () => clearInterval(id)
  }, [panelOpen, fetchActive, session?.status])

  // ─── handlers ─────────────────────────────────────────────────────────────

  async function handleOpenPanel() {
    setOpening(true)
    try {
      const res = await openSessionPanel(projectId)
      toast.success(res.message || "Evaluation panel opened")
      setPanelOpen(true)
      setLoadingSession(true)
      const s = await getActiveSession(projectId)
      setSession(s)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open panel")
    } finally {
      setOpening(false)
      setLoadingSession(false)
    }
  }

  async function handleStartDemo() {
    if (!session) return
    setBusy(true)
    try {
      const updated = await startDemo(session.session_id)
      setSession(updated)
      toast.success("Demo started")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start demo")
    } finally {
      setBusy(false)
    }
  }

  async function handleCompleteDemo() {
    if (!session) return
    setBusy(true)
    setConfirmingDemo(false)
    try {
      const updated = await completeDemo(session.session_id)
      setSession(updated)
      toast.success("Demo marked complete — viva phase started")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete demo")
    } finally {
      setBusy(false)
    }
  }

  async function handleEndViva() {
    if (!session) return
    setBusy(true)
    setConfirmingViva(false)
    try {
      const updated = await endViva(session.session_id, videoFile, audioFile)
      setSession(updated)
      setVideoFile(null)
      setAudioFile(null)
      toast.success("Viva ended successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end viva")
    } finally {
      setBusy(false)
    }
  }

  // ─── render: panel not opened yet ─────────────────────────────────────────

  if (!panelOpen) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl mb-5">
          🎓
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Evaluation Day Panel
        </h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          Open the panel to begin calling students one by one. The system will
          serve the next scheduled session automatically.
        </p>
        <button
          disabled={opening}
          onClick={handleOpenPanel}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60"
        >
          {opening ? "Opening…" : "🚀 Open Evaluation Panel"}
        </button>
      </div>
    )
  }

  // ─── render: loading first session ────────────────────────────────────────

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Loading active session…
      </div>
    )
  }

  // ─── render: no active session (all done or none scheduled) ───────────────

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl mb-4">
          ✅
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          No active session
        </h2>
        <p className="text-sm text-gray-400 max-w-xs mb-5">
          All sessions for this project may be completed, or none have been
          scheduled yet.
        </p>
        <button
          onClick={fetchActive}
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Refresh
        </button>
      </div>
    )
  }

  // ─── render: active session card ──────────────────────────────────────────

  const isCompleted = session.status === "completed"

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Video Call Room — available as soon as the panel is open so the
          examiner can join the call and ask questions right away, regardless
          of whether the student runs a demo first. */}
      {!isCompleted && (
        <>
          <AgoraVideoRoom sessionId={session.session_id} />
          <LiveInterjectionCard sessionId={session.session_id} />
        </>
      )}

      {/* Session card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Card header */}
        <div className="px-6 py-4 bg-linear-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-0.5">
              Active Session
            </p>
            <h2 className="text-xl font-bold text-white leading-tight">
              {session.student_full_name ||
                session.group_name ||
                "Unknown"}
            </h2>
            {session.registration_number && (
              <p className="text-blue-200 text-xs mt-0.5 font-mono">
                {session.registration_number}
              </p>
            )}
          </div>
          <StatusBadge status={session.status} />
        </div>

        {/* Session meta */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-gray-100">
          <InfoRow label="Project" value={session.project_name} />
          <InfoRow label="Room" value={session.location_room} />
          <InfoRow
            label="Scheduled"
            value={`${fmt(session.scheduled_start)} → ${fmt(session.scheduled_end)}`}
          />
          <InfoRow
            label="Demo started"
            value={session.actual_start ? fmt(session.actual_start) : "Not started"}
          />
          <InfoRow
            label="Demo ended"
            value={session.demo_completed_at ? fmt(session.demo_completed_at) : "—"}
          />
          {session.group_name && (
            <InfoRow label="Group" value={session.group_name} />
          )}
        </div>

        {/* Timer strip */}
        {session.status === "in_progress" && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <p className="text-xs font-medium text-amber-700">⏱ Demo elapsed</p>
            <ElapsedTicker from={session.actual_start} />
          </div>
        )}
        {session.status === "demo_completed" && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <p className="text-xs font-medium text-blue-700">⏱ Viva elapsed</p>
            <ElapsedTicker from={session.demo_completed_at} />
          </div>
        )}

        {/* Action area */}
        <div className="px-6 py-5 bg-gray-50">
          {isCompleted ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Session complete
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Click Refresh to load the next scheduled student.
                </p>
              </div>
              <button
                onClick={fetchActive}
                className="ml-auto text-sm px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
              >
                Next student →
              </button>
            </div>
          ) : session.status === "pending" ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-500">
                Student is present — start their demo when ready.
              </p>
              <button
                disabled={busy}
                onClick={handleStartDemo}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm"
              >
                {busy ? "Starting…" : "▶ Start Demo"}
              </button>
            </div>
          ) : session.status === "in_progress" ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-500">
                Demo is running. Mark complete when the student finishes.
              </p>
              <button
                disabled={busy}
                onClick={() => setConfirmingDemo(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm"
              >
                {busy ? "Saving…" : "✅ Complete Demo"}
              </button>
            </div>
          ) : session.status === "demo_completed" ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Viva is in progress. Upload recordings (optional) and end when done.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FilePicker
                  label="Video recording"
                  accept="video/*"
                  file={videoFile}
                  onChange={setVideoFile}
                />
                <FilePicker
                  label="Audio recording"
                  accept="audio/*"
                  file={audioFile}
                  onChange={setAudioFile}
                />
              </div>
              <div className="flex justify-end">
                <button
                  disabled={busy}
                  onClick={() => setConfirmingViva(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm"
                >
                  {busy ? "Ending…" : "🏁 End Viva"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Behavioral report — advisory CV analysis of the session recording */}
      {isCompleted && <BehavioralReportCard sessionId={session.session_id} />}

      {/* Manual refresh hint */}
      {!isCompleted && (
        <p className="text-center text-xs text-gray-400">
          Auto-refreshes every 8 s ·{" "}
          <button
            onClick={fetchActive}
            className="underline underline-offset-2 hover:text-gray-600 transition"
          >
            refresh now
          </button>
        </p>
      )}

      {/* Confirm: complete demo */}
      {confirmingDemo && (
        <ConfirmModal
          title="Mark demo as complete?"
          description="This will end the demo phase and immediately start the viva for this student."
          confirmLabel="Complete Demo"
          confirmClass="bg-blue-600 hover:bg-blue-700"
          onConfirm={handleCompleteDemo}
          onCancel={() => setConfirmingDemo(false)}
        />
      )}

      {/* Confirm: end viva */}
      {confirmingViva && (
        <ConfirmModal
          title="End viva session?"
          description="This action cannot be undone. The session will be marked as completed."
          confirmLabel="End Viva"
          confirmClass="bg-emerald-600 hover:bg-emerald-700"
          onConfirm={handleEndViva}
          onCancel={() => setConfirmingViva(false)}
        >
          {(videoFile || audioFile) && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              📎 Uploading:{" "}
              {[videoFile?.name, audioFile?.name].filter(Boolean).join(", ")}
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  )
}