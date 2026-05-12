"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { vivaQuestionService } from "@/services/vivaQuestionService"
import {
  BLOOMS_LEVELS,
  type BloomsLevel,
  type VivaQuestion,
  type CreateVivaQuestionPayload,
} from "@/types/vivaQuestions"

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { projectId: string }

type FormData = {
  question_text: string
  blooms_level: BloomsLevel
  question_order: string
}

const emptyForm = (nextOrder: number): FormData => ({
  question_text: "",
  blooms_level: "Remember",
  question_order: String(nextOrder),
})

// ─── Bloom's level metadata ───────────────────────────────────────────────────

const BLOOMS_META: Record<
  BloomsLevel,
  { color: string; bg: string; border: string; dot: string; description: string }
> = {
  Remember:   { color: "text-slate-600",   bg: "bg-slate-50",   border: "border-slate-200",  dot: "bg-slate-400",   description: "Recall facts and basic concepts" },
  Understand: { color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-400",    description: "Explain ideas or concepts" },
  Apply:      { color: "text-cyan-600",    bg: "bg-cyan-50",    border: "border-cyan-200",   dot: "bg-cyan-500",    description: "Use information in new situations" },
  Analyze:    { color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-200", dot: "bg-indigo-500",  description: "Draw connections among ideas" },
  Evaluate:   { color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200", dot: "bg-violet-500",  description: "Justify a decision or course of action" },
  Create:     { color: "text-sky-600",     bg: "bg-sky-50",     border: "border-sky-200",    dot: "bg-sky-500",     description: "Produce new or original work" },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VivaQuestionsTab({ projectId }: Props) {
  const [questions, setQuestions] = useState<VivaQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState<BloomsLevel | "All">("All")

  const [modal, setModal] = useState<{
    open: boolean
    editing: VivaQuestion | null
  }>({ open: false, editing: null })

  const [deleteConfirm, setDeleteConfirm] = useState<VivaQuestion | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const data = await vivaQuestionService.getAll(projectId)
      // Sort by question_order
      setQuestions([...data].sort((a, b) => a.question_order - b.question_order))
    } catch {
      toast.error("Failed to load viva questions")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered =
    filterLevel === "All"
      ? questions
      : questions.filter((q) => q.blooms_level === filterLevel)

  const levelCounts = BLOOMS_LEVELS.reduce(
    (acc, l) => ({ ...acc, [l]: questions.filter((q) => q.blooms_level === l).length }),
    {} as Record<BloomsLevel, number>,
  )

  const nextOrder = questions.length > 0
    ? Math.max(...questions.map((q) => q.question_order)) + 1
    : 1

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            {questions.length} {questions.length === 1 ? "question" : "questions"}
          </span>
          {questions.length > 0 && (
            <span className="text-xs text-gray-400">
              across {Object.values(levelCounts).filter(Boolean).length} Bloom&apos;s levels
            </span>
          )}
        </div>

        <button
          onClick={() => setModal({ open: true, editing: null })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Question
        </button>
      </div>

      {/* ── Bloom's breakdown bar ─────────────────────────────────────────── */}
      {questions.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Bloom&apos;s Taxonomy Distribution
          </p>
          <div className="flex h-4 rounded-full overflow-hidden gap-px bg-gray-100">
            {BLOOMS_LEVELS.map((level) => {
              const count = levelCounts[level]
              if (!count) return null
              const pct = (count / questions.length) * 100
              const m = BLOOMS_META[level]
              return (
                <div
                  key={level}
                  title={`${level}: ${count}`}
                  style={{ width: `${pct}%`, transition: "width 0.4s ease" }}
                  className={`${m.dot} first:rounded-l-full last:rounded-r-full`}
                />
              )
            })}
          </div>
          {/* Legend chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {BLOOMS_LEVELS.map((level) => {
              const count = levelCounts[level]
              if (!count) return null
              const m = BLOOMS_META[level]
              return (
                <button
                  key={level}
                  onClick={() => setFilterLevel(filterLevel === level ? "All" : level)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition font-medium
                    ${filterLevel === level
                      ? `${m.bg} ${m.color} ${m.border} ring-2 ring-offset-1 ring-current/30`
                      : `${m.bg} ${m.color} ${m.border} opacity-70 hover:opacity-100`
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                  {level}
                  <span className="ml-0.5 opacity-60">{count}</span>
                </button>
              )
            })}
            {filterLevel !== "All" && (
              <button
                onClick={() => setFilterLevel("All")}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
              >
                Clear filter ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {questions.length === 0 && (
        <div className="bg-white border border-dashed border-blue-200 rounded-2xl p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-base">No viva questions yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5 max-w-sm mx-auto">
            Add questions that will be asked during the viva. Tag each with a Bloom&apos;s taxonomy level.
          </p>
          <button
            onClick={() => setModal({ open: true, editing: null })}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
          >
            Add First Question
          </button>
        </div>
      )}

      {/* ── Filtered empty ────────────────────────────────────────────────── */}
      {questions.length > 0 && filtered.length === 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">No questions at the <strong>{filterLevel}</strong> level.</p>
          <button onClick={() => setFilterLevel("All")} className="text-blue-500 text-sm mt-1 hover:underline">
            Show all
          </button>
        </div>
      )}

      {/* ── Question list ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            onEdit={() => setModal({ open: true, editing: q })}
            onDelete={() => setDeleteConfirm(q)}
          />
        ))}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modal.open && (
        <QuestionModal
          editing={modal.editing}
          nextOrder={nextOrder}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={async (payload) => {
            if (modal.editing) {
              await vivaQuestionService.update(projectId, modal.editing.id, payload)
              toast.success("Question updated")
            } else {
              await vivaQuestionService.create(projectId, payload)
              toast.success("Question added")
            }
            setModal({ open: false, editing: null })
            load()
          }}
        />
      )}

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <DeleteConfirmModal
          question={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={async () => {
            await vivaQuestionService.delete(projectId, deleteConfirm.id)
            toast.success("Question deleted")
            setDeleteConfirm(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  onEdit,
  onDelete,
}: {
  question: VivaQuestion
  onEdit: () => void
  onDelete: () => void
}) {
  const m = BLOOMS_META[question.blooms_level]

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 flex gap-4 group hover:shadow-md transition-shadow">
      {/* Order number */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
        <span className="text-xs font-bold text-blue-500">{question.question_order}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium leading-relaxed">
          {question.question_text}
        </p>
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.bg} ${m.color} ${m.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
            {question.blooms_level}
          </span>
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          title="Edit"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Question Modal ───────────────────────────────────────────────────────────

function QuestionModal({
  editing,
  nextOrder,
  onClose,
  onSave,
}: {
  editing: VivaQuestion | null
  nextOrder: number
  onClose: () => void
  onSave: (payload: CreateVivaQuestionPayload) => Promise<void>
}) {
  const [form, setForm] = useState<FormData>(() =>
    editing
      ? {
          question_text: editing.question_text,
          blooms_level: editing.blooms_level,
          question_order: String(editing.question_order),
        }
      : emptyForm(nextOrder)
  )
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.question_text.trim()) e.question_text = "Question text is required"
    const o = parseInt(form.question_order)
    if (isNaN(o) || o < 1) e.question_order = "Must be a positive number"
    return e
  }

  const submit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await onSave({
        question_text: form.question_text.trim(),
        blooms_level: form.blooms_level,
        question_order: parseInt(form.question_order),
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const selectedMeta = BLOOMS_META[form.blooms_level]

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900 flex-1">
            {editing ? "Edit Question" : "New Viva Question"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Question text */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Question Text
            </label>
            <textarea
              rows={3}
              autoFocus
              className={`w-full text-sm px-3 py-2 border rounded-xl outline-none transition resize-none
                ${errors.question_text
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                } bg-white text-gray-900 placeholder:text-gray-400`}
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
              placeholder="e.g. Explain the MVC architecture used in your project."
            />
            {errors.question_text && (
              <p className="text-xs text-red-500 mt-1">{errors.question_text}</p>
            )}
          </div>

          {/* Bloom's level selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Bloom&apos;s Taxonomy Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BLOOMS_LEVELS.map((level) => {
                const m = BLOOMS_META[level]
                const isSelected = form.blooms_level === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, blooms_level: level }))}
                    className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition
                      ${isSelected
                        ? `${m.bg} ${m.border} ring-2 ring-offset-1 ${m.color} font-semibold`
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                      <span className="text-xs font-semibold">{level}</span>
                    </div>
                    <span className="text-[10px] leading-tight opacity-60">{m.description}</span>
                  </button>
                )
              })}
            </div>
            {/* Selected level preview */}
            <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${selectedMeta.bg} ${selectedMeta.border} ${selectedMeta.color}`}>
              <span className={`w-2 h-2 rounded-full ${selectedMeta.dot}`} />
              <span className="font-semibold">{form.blooms_level}</span>
              <span className="opacity-70">— {selectedMeta.description}</span>
            </div>
          </div>

          {/* Order */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Question Order
              <span className="ml-1 text-gray-400 font-normal">(determines display sequence)</span>
            </label>
            <input
              type="number"
              min={1}
              className={`w-28 text-sm px-3 py-2 border rounded-xl outline-none transition
                ${errors.question_order
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                } bg-white text-gray-900`}
              value={form.question_order}
              onChange={(e) => setForm((f) => ({ ...f, question_order: e.target.value }))}
            />
            {errors.question_order && (
              <p className="text-xs text-red-500 mt-1">{errors.question_order}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60 flex items-center gap-2"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Question"}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirmModal({
  question,
  onClose,
  onConfirm,
}: {
  question: VivaQuestion
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Delete Question</h3>
            <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5">
          <p className="text-sm text-gray-700 line-clamp-3">{question.question_text}</p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              try { await onConfirm() } finally { setDeleting(false) }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}