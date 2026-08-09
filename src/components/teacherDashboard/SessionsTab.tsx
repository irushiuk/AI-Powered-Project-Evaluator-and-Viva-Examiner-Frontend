"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { sessionService } from "@/services/sessionService"
import {
  Session,
  AutoSchedulePayload,
  ManualSchedulePayload,
  ManualSessionEntry,
  DateRange,
  UpdateSessionPayload,
} from "@/types/session"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  Trash2,
  Pencil,
  Sparkles,
  MapPin,
  FileText,
  Monitor,
} from "lucide-react"
import { toast } from "sonner"
import { formatColomboDateTime, formatColomboTime, getColomboTimezoneLabel } from "@/utils/datetime"

// ─────────────────────────────────────────────
// Main SessionsTab
// ─────────────────────────────────────────────
export default function SessionsTab({
  projectId,
  isGroupProject,
}: {
  projectId: string
  isGroupProject: boolean
}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduleMode, setScheduleMode] = useState<"auto" | "manual" | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const refresh = async () => {
    try {
      const data = await sessionService.getAll(projectId)
      setSessions(data)
    } catch (err) {
      toast.error("Failed to load sessions")
      console.error("SessionsTab error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!projectId) return
    refresh()
  }, [projectId])

  const handleReset = async () => {
    setResetting(true)
    try {
      await sessionService.resetAll(projectId)
      toast.success("All sessions reset")
      setConfirmReset(false)
      await refresh()
    } catch {
      toast.error("Failed to reset sessions")
    } finally {
      setResetting(false)
    }
  }

  const statusStyles: Record<string, string> = {
    scheduled:   "bg-blue-50 text-blue-600 border-blue-200",
    in_progress: "bg-yellow-50 text-yellow-600 border-yellow-200",
    completed:   "bg-green-50 text-green-600 border-green-200",
    pending:     "bg-gray-50 text-gray-500 border-gray-200",
    expired:     "bg-red-50 text-red-600 border-red-200",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading sessions...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule and manage viva sessions for this project
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sessions.length > 0 && (
            confirmReset ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <span className="text-xs text-red-600 font-medium">Reset all sessions?</span>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg transition"
                >
                  {resetting ? "Resetting..." : "Yes, Reset"}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 px-3 py-1.5 rounded-lg transition flex items-center"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Reset All
              </button>
            )
          )}
          <Button variant="outline" onClick={() => setScheduleMode("manual")}>
            <Pencil className="mr-2 h-4 w-4" /> Manual Schedule
          </Button>
          <Button onClick={() => setScheduleMode("auto")}>
            <Sparkles className="mr-2 h-4 w-4" /> Auto Schedule
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-14 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <p className="text-gray-500 font-medium">No sessions scheduled yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">
            Use auto-scheduling to assign slots automatically, or add sessions manually.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setScheduleMode("manual")}>
              <Pencil className="mr-2 h-4 w-4" /> Manual
            </Button>
            <Button onClick={() => setScheduleMode("auto")}>
              <Sparkles className="mr-2 h-4 w-4" /> Auto Schedule
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, idx) => {
            const expiredNow = (session.status === 'scheduled' || session.status === 'in_progress') && new Date() > new Date(session.scheduled_end);
            const displayStatus = expiredNow ? 'expired' : session.status;

            return (
            <div
              key={session.id}
              className={`border rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap ${expiredNow ? 'bg-gray-50 border-red-100 opacity-90' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {isGroupProject
                      ? session.group_name ?? "Group Session"
                      : session.student_name ?? "Student Session"}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 items-center">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {formatColomboDateTime(session.scheduled_start)}
                    </span>
                    <span>→ {formatColomboTime(session.scheduled_end)}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {session.location_room}
                    </span>
                    <span>({getColomboTimezoneLabel()})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${statusStyles[displayStatus] ?? statusStyles.pending}`}>
                  {displayStatus.replace("_", " ")}
                </span>
                {displayStatus === "scheduled" && (
                  <button
                    onClick={() => setEditingSession(session)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                )}
                {displayStatus === "in_progress" && (
                  <Link href={`/dashboard/teacher/sessions/${session.id}/live-room`}>
                    <button className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1 font-semibold cursor-pointer">
                      <Monitor className="h-3 w-3" /> Join Live Session
                    </button>
                  </Link>
                )}
                {displayStatus === "completed" && (
                  <Link href={`/dashboard/teacher/sessions/${session.id}/report`}>
                    <button className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                      <FileText className="h-3 w-3" /> AI Analysis & Report
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {scheduleMode === "auto" && (
        <AutoScheduleModal
          projectId={projectId}
          onClose={() => setScheduleMode(null)}
          onScheduled={async () => { setScheduleMode(null); await refresh() }}
        />
      )}

      {scheduleMode === "manual" && (
        <ManualScheduleModal
          projectId={projectId}
          isGroupProject={isGroupProject}
          onClose={() => setScheduleMode(null)}
          onScheduled={async () => { setScheduleMode(null); await refresh() }}
        />
      )}

      {editingSession && (
        <EditSessionModal
          projectId={projectId}
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onUpdated={async () => { setEditingSession(null); await refresh() }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Auto Schedule Modal
// ─────────────────────────────────────────────
function AutoScheduleModal({
  projectId,
  onClose,
  onScheduled,
}: {
  projectId: string
  onClose: () => void
  onScheduled: () => void
}) {
  const [dateRanges, setDateRanges] = useState<DateRange[]>([
    { date: "", start_time: "", end_time: "" },
  ])
  const [duration, setDuration] = useState("")
  const [room, setRoom] = useState("")
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [maxTotalQuestions, setMaxTotalQuestions] = useState("10")
  const [vivaWeightPercentage, setVivaWeightPercentage] = useState("100")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addDateRange = () =>
    setDateRanges((prev) => [...prev, { date: "", start_time: "", end_time: "" }])

  const removeDateRange = (idx: number) =>
    setDateRanges((prev) => prev.filter((_, i) => i !== idx))

  const updateDateRange = (idx: number, field: keyof DateRange, value: string) =>
    setDateRanges((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    )

  const validate = () => {
    const e: Record<string, string> = {}
    if (!duration || Number(duration) <= 0) e.duration = "Duration is required"
    if (!room.trim()) e.room = "Room is required"
    dateRanges.forEach((r, i) => {
      if (!r.date) e[`date_${i}`] = "Date required"
      if (!r.start_time) e[`start_${i}`] = "Start time required"
      if (!r.end_time) e[`end_${i}`] = "End time required"
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || submitting) return
    setSubmitting(true)
    const payload: AutoSchedulePayload = {
      date_ranges: dateRanges,
      duration_per_slot_minutes: Number(duration),
      location_room: room.trim(),
      demo_enabled: demoEnabled,
      max_total_questions: Number(maxTotalQuestions) || undefined,
      viva_weight_percentage: Number(vivaWeightPercentage) || undefined,
    }
    try {
      await sessionService.scheduleAuto(projectId, payload)
      toast.success("Sessions auto-scheduled successfully")
      onScheduled()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-scheduling failed")
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase = "border rounded-xl p-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-100 border-gray-200 focus:border-blue-400"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="px-7 py-5 bg-blue-50 border-b border-blue-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Auto Schedule Sessions</h2>
              <p className="text-xs text-gray-500 mt-0.5">Provide date ranges and the system assigns slots</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-5 space-y-5">

          {/* Date ranges */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Date Ranges</label>
              <button onClick={addDateRange} className="text-xs text-blue-600 hover:text-blue-800 underline">
                + Add date
              </button>
            </div>
            <div className="space-y-3">
              {dateRanges.map((range, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Day {idx + 1}</span>
                    {dateRanges.length > 1 && (
                      <button onClick={() => removeDateRange(idx)} className="text-xs text-red-400 hover:text-red-600">
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={range.date}
                    onChange={(e) => updateDateRange(idx, "date", e.target.value)}
                    className={`w-full ${inputBase} ${errors[`date_${idx}`] ? "border-red-400 bg-red-50" : ""}`}
                  />
                  {errors[`date_${idx}`] && <p className="text-red-500 text-xs">{errors[`date_${idx}`]}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Start time</label>
                      <input
                        type="time"
                        value={range.start_time}
                        onChange={(e) => updateDateRange(idx, "start_time", e.target.value)}
                        className={`w-full ${inputBase} ${errors[`start_${idx}`] ? "border-red-400 bg-red-50" : ""}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">End time</label>
                      <input
                        type="time"
                        value={range.end_time}
                        onChange={(e) => updateDateRange(idx, "end_time", e.target.value)}
                        className={`w-full ${inputBase} ${errors[`end_${idx}`] ? "border-red-400 bg-red-50" : ""}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Duration per Slot (minutes) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 30"
              min={5}
              value={duration}
              onChange={(e) => { setDuration(e.target.value); setErrors((p) => ({ ...p, duration: "" })) }}
              className={`w-full ${inputBase} ${errors.duration ? "border-red-400 bg-red-50" : ""}`}
            />
            {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
          </div>

          {/* Room */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Location / Room <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Room 301"
              value={room}
              onChange={(e) => { setRoom(e.target.value); setErrors((p) => ({ ...p, room: "" })) }}
              className={`w-full ${inputBase} ${errors.room ? "border-red-400 bg-red-50" : ""}`}
            />
            {errors.room && <p className="text-red-500 text-xs mt-1">{errors.room}</p>}
          </div>

          <label className="flex items-start gap-3 cursor-pointer bg-gray-50 rounded-xl p-3">
            <input
              type="checkbox"
              checked={demoEnabled}
              onChange={(e) => setDemoEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
            />
            <span className="text-sm">
              <span className="font-medium text-gray-700">Include a demo / presentation phase</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Students present (screen share) before the AI viva begins. Leave
                off to go straight to AI questions.
              </span>
            </span>
          </label>

          {/* Max Questions Settings */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Max Total Questions (Viva limit)
              </label>
              <input
                type="number"
                placeholder="e.g. 10"
                min={1}
                value={maxTotalQuestions}
                onChange={(e) => setMaxTotalQuestions(e.target.value)}
                className={`w-full ${inputBase}`}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Viva Weight (%)
              </label>
              <input
                type="number"
                placeholder="e.g. 20"
                min={1}
                max={100}
                value={vivaWeightPercentage}
                onChange={(e) => setVivaWeightPercentage(e.target.value)}
                className={`w-full ${inputBase}`}
              />
            </div>
          </div>
        </div>

        <div className="px-7 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Scheduling..." : "Auto Schedule"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Manual Schedule Modal
// ─────────────────────────────────────────────
function ManualScheduleModal({
  projectId,
  isGroupProject,
  onClose,
  onScheduled,
}: {
  projectId: string
  isGroupProject: boolean
  onClose: () => void
  onScheduled: () => void
}) {
  const [entries, setEntries] = useState<ManualSessionEntry[]>([
    { student_id: "", group_id: "", scheduled_start: "", scheduled_end: "", location_room: "" },
  ])
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [maxTotalQuestions, setMaxTotalQuestions] = useState("10")
  const [vivaWeightPercentage, setVivaWeightPercentage] = useState("100")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addEntry = () =>
    setEntries((prev) => [
      ...prev,
      { student_id: "", group_id: "", scheduled_start: "", scheduled_end: "", location_room: "" },
    ])

  const removeEntry = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx))

  const updateEntry = (idx: number, field: keyof ManualSessionEntry, value: string) =>
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))

  const validate = () => {
    const e: Record<string, string> = {}
    entries.forEach((entry, i) => {
      const idField = isGroupProject ? "group_id" : "student_id"
      if (!entry[idField]) e[`id_${i}`] = `${isGroupProject ? "Group" : "Student"} ID required`
      if (!entry.scheduled_start) e[`start_${i}`] = "Start time required"
      if (!entry.scheduled_end) e[`end_${i}`] = "End time required"
      if (!entry.location_room.trim()) e[`room_${i}`] = "Room required"
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || submitting) return
    setSubmitting(true)
    const sessions: ManualSessionEntry[] = entries.map((entry) => ({
      ...(isGroupProject ? { group_id: entry.group_id } : { student_id: entry.student_id }),
      scheduled_start: new Date(entry.scheduled_start).toISOString(),
      scheduled_end: new Date(entry.scheduled_end).toISOString(),
      location_room: entry.location_room.trim(),
    }))
    try {
      await sessionService.scheduleManual(projectId, { 
        sessions, 
        demo_enabled: demoEnabled,
        max_total_questions: Number(maxTotalQuestions) || undefined,
        viva_weight_percentage: Number(vivaWeightPercentage) || undefined,
      })
      toast.success("Manual sessions scheduled successfully")
      onScheduled()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Manual scheduling failed")
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase = "w-full border rounded-xl p-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-100 border-gray-200 focus:border-blue-400"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        <div className="px-7 py-5 bg-purple-50 border-b border-purple-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Manual Schedule Sessions</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign specific time slots to {isGroupProject ? "groups" : "students"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-7 py-5 space-y-4">
          {entries.map((entry, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Session {idx + 1}</span>
                {entries.length > 1 && (
                  <button onClick={() => removeEntry(idx)} className="text-xs text-red-400 hover:text-red-600">
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  {isGroupProject ? "Group ID" : "Student ID"} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${isGroupProject ? "group" : "student"} UUID`}
                  value={isGroupProject ? entry.group_id ?? "" : entry.student_id ?? ""}
                  onChange={(e) => updateEntry(idx, isGroupProject ? "group_id" : "student_id", e.target.value)}
                  className={`${inputBase} font-mono text-xs ${errors[`id_${idx}`] ? "border-red-400 bg-red-50" : ""}`}
                />
                {errors[`id_${idx}`] && <p className="text-red-500 text-xs mt-0.5">{errors[`id_${idx}`]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Start <span className="text-red-400">*</span></label>
                  <input
                    type="datetime-local"
                    value={entry.scheduled_start}
                    onChange={(e) => updateEntry(idx, "scheduled_start", e.target.value)}
                    className={`${inputBase} ${errors[`start_${idx}`] ? "border-red-400 bg-red-50" : ""}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">End <span className="text-red-400">*</span></label>
                  <input
                    type="datetime-local"
                    value={entry.scheduled_end}
                    onChange={(e) => updateEntry(idx, "scheduled_end", e.target.value)}
                    className={`${inputBase} ${errors[`end_${idx}`] ? "border-red-400 bg-red-50" : ""}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Room <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Room 101"
                  value={entry.location_room}
                  onChange={(e) => updateEntry(idx, "location_room", e.target.value)}
                  className={`${inputBase} ${errors[`room_${idx}`] ? "border-red-400 bg-red-50" : ""}`}
                />
                {errors[`room_${idx}`] && <p className="text-red-500 text-xs mt-0.5">{errors[`room_${idx}`]}</p>}
              </div>
            </div>
          ))}

          <button
            onClick={addEntry}
            className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-500 transition"
          >
            + Add Another Session
          </button>

          {/* Demo phase toggle — applies to all sessions scheduled here */}
          <label className="flex items-start gap-3 cursor-pointer bg-gray-50 rounded-xl p-3">
            <input
              type="checkbox"
              checked={demoEnabled}
              onChange={(e) => setDemoEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
            />
            <span className="text-sm">
              <span className="font-medium text-gray-700">Include a demo / presentation phase</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Students present (screen share) before the AI viva begins. Leave
                off to go straight to AI questions.
              </span>
            </span>
          </label>

          {/* Max Questions Settings */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Max Total Questions (Viva limit)
              </label>
              <input
                type="number"
                placeholder="e.g. 10"
                min={1}
                value={maxTotalQuestions}
                onChange={(e) => setMaxTotalQuestions(e.target.value)}
                className={`w-full ${inputBase}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Viva Weight (%)
              </label>
              <input
                type="number"
                placeholder="e.g. 20"
                min={1}
                max={100}
                value={vivaWeightPercentage}
                onChange={(e) => setVivaWeightPercentage(e.target.value)}
                className={`w-full ${inputBase}`}
              />
            </div>
          </div>
        </div>

        <div className="px-7 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
          >
            {submitting ? "Scheduling..." : "Schedule Sessions"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Edit Session Modal
// ─────────────────────────────────────────────
function EditSessionModal({
  projectId,
  session,
  onClose,
  onUpdated,
}: {
  projectId: string
  session: Session
  onClose: () => void
  onUpdated: () => void
}) {
  const [start, setStart] = useState(session.scheduled_start.slice(0, 16))
  const [end, setEnd] = useState(session.scheduled_end.slice(0, 16))
  const [room, setRoom] = useState(session.location_room)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!start) e.start = "Start time required"
    if (!end) e.end = "End time required"
    if (!room.trim()) e.room = "Room required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || submitting) return
    setSubmitting(true)
    const payload: UpdateSessionPayload = {
      scheduled_start: new Date(start).toISOString(),
      scheduled_end: new Date(end).toISOString(),
      location_room: room.trim(),
    }
    try {
      await sessionService.update(projectId, session.id, payload)
      toast.success("Session updated")
      onUpdated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update session")
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase = "w-full border rounded-xl p-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        <div className="px-7 py-5 bg-amber-50 border-b border-amber-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Edit Session</h2>
              <p className="text-xs text-gray-500 mt-0.5">Update the time slot or room</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Start Time <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => { setStart(e.target.value); setErrors((p) => ({ ...p, start: "" })) }}
              className={`${inputBase} ${errors.start ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"}`}
            />
            {errors.start && <p className="text-red-500 text-xs mt-1">{errors.start}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              End Time <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => { setEnd(e.target.value); setErrors((p) => ({ ...p, end: "" })) }}
              className={`${inputBase} ${errors.end ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"}`}
            />
            {errors.end && <p className="text-red-500 text-xs mt-1">{errors.end}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Room <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Room 101"
              value={room}
              onChange={(e) => { setRoom(e.target.value); setErrors((p) => ({ ...p, room: "" })) }}
              className={`${inputBase} ${errors.room ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"}`}
            />
            {errors.room && <p className="text-red-500 text-xs mt-1">{errors.room}</p>}
          </div>
        </div>

        <div className="px-7 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}