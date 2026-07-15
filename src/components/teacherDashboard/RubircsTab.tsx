"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  FileText,
  Sparkles,
  X,
  Loader2,
} from "lucide-react"
import { rubricService } from "@/services/rubricService"
import type {
  RubricCategory,
  RubricCriteria,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateCriteriaPayload,
} from "@/types/rubric"

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { projectId: string }

type CategoryFormData = {
  category_name: string
  weight_percentage: string
  description: string
}

type CriteriaFormData = {
  criteria_name: string
  max_score: string
  weight_in_category: string
  description: string
}

const emptyCategoryForm = (): CategoryFormData => ({
  category_name: "",
  weight_percentage: "",
  description: "",
})

const emptyCriteriaForm = (): CriteriaFormData => ({
  criteria_name: "",
  max_score: "",
  weight_in_category: "",
  description: "",
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalWeight(categories: RubricCategory[]) {
  return categories.reduce((s, c) => s + Number(c.weight_percentage), 0)
}

function weightColor(pct: number) {
  if (pct > 100) return "text-red-600 bg-red-50 border-red-200"
  if (pct === 100) return "text-emerald-600 bg-emerald-50 border-emerald-200"
  return "text-amber-600 bg-amber-50 border-amber-200"
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RubricsTab({ projectId }: Props) {
  const [categories, setCategories] = useState<RubricCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [extracting, setExtracting] = useState(false)

  // Category modal state
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean
    editing: RubricCategory | null
  }>({ open: false, editing: null })

  // Criteria modal state
  const [criteriaModal, setCriteriaModal] = useState<{
    open: boolean
    categoryId: string
    editing: RubricCriteria | null
  }>({ open: false, categoryId: "", editing: null })

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    type: "category" | "criteria"
    categoryId: string
    criteriaId?: string
    name: string
  } | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const data = await rubricService.getAll(projectId)
      setCategories(data)
    } catch {
      toast.error("Failed to load rubrics")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  // ── Expand toggle ──────────────────────────────────────────────────────────

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  // ── Summary numbers ───────────────────────────────────────────────────────

  const total = totalWeight(categories)
  const totalCriteria = categories.reduce((s, c) => s + c.criteria.length, 0)

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Total weight pill */}
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${weightColor(total)}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {total.toFixed(0)}% allocated
          </span>

          {total !== 100 && (
            <span className="text-xs text-gray-400">
              (must reach 100% before activating)
            </span>
          )}

          <span className="text-xs text-gray-400">
            {categories.length} {categories.length === 1 ? "category" : "categories"} ·{" "}
            {totalCriteria} {totalCriteria === 1 ? "criterion" : "criteria"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload a rubric document — AI extracts categories + criteria */}
          <label
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer
              ${extracting
                ? "bg-gray-100 text-gray-400 cursor-wait"
                : "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"}`}
          >
            {extracting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
            {extracting ? "Extracting…" : "Upload Rubric File"}
            <input
              type="file"
              accept=".pdf,.docx,.md,.markdown,.txt"
              className="hidden"
              disabled={extracting}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = "" // allow re-selecting the same file
                if (!file) return
                setExtracting(true)
                try {
                  const message = await rubricService.extractFromFile(projectId, file)
                  toast.success(message)
                  await load()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Extraction failed")
                } finally {
                  setExtracting(false)
                }
              }}
            />
          </label>

          <button
            onClick={() => setCategoryModal({ open: true, editing: null })}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </div>
      </div>

      {/* ── Weight bar ───────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Weight Distribution
          </p>
          <div className="flex h-5 rounded-full overflow-hidden gap-px bg-gray-100">
            {categories.map((cat, idx) => {
              const colors = [
                "bg-blue-500", "bg-indigo-500", "bg-violet-500",
                "bg-sky-500", "bg-cyan-500", "bg-teal-500",
              ]
              const color = colors[idx % colors.length]
              const width = Math.min(Number(cat.weight_percentage), 100)
              return (
                <div
                  key={cat.id}
                  title={`${cat.category_name}: ${cat.weight_percentage}%`}
                  style={{ width: `${width}%`, transition: "width 0.4s ease" }}
                  className={`${color} first:rounded-l-full last:rounded-r-full`}
                />
              )
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {categories.map((cat, idx) => {
              const colors = [
                "bg-blue-500", "bg-indigo-500", "bg-violet-500",
                "bg-sky-500", "bg-cyan-500", "bg-teal-500",
              ]
              return (
                <div key={cat.id} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${colors[idx % colors.length]}`} />
                  <span className="text-xs text-gray-600">
                    {cat.category_name}{" "}
                    <span className="text-gray-400">{cat.weight_percentage}%</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {categories.length === 0 && (
        <div className="bg-white border border-dashed border-blue-200 rounded-2xl p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-blue-400" />
          </div>
          <p className="text-gray-700 font-semibold text-base">No rubric categories yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">
            Add categories like "Technical", "Presentation", and "Documentation", then define criteria within each.
          </p>
          <button
            onClick={() => setCategoryModal({ open: true, editing: null })}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
          >
            Add First Category
          </button>
        </div>
      )}

      {/* ── Category cards ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const isOpen = expandedIds.has(cat.id)
          const catColors = [
            { ring: "ring-blue-200", bg: "bg-blue-500", light: "bg-blue-50", text: "text-blue-700" },
            { ring: "ring-indigo-200", bg: "bg-indigo-500", light: "bg-indigo-50", text: "text-indigo-700" },
            { ring: "ring-violet-200", bg: "bg-violet-500", light: "bg-violet-50", text: "text-violet-700" },
            { ring: "ring-sky-200", bg: "bg-sky-500", light: "bg-sky-50", text: "text-sky-700" },
            { ring: "ring-cyan-200", bg: "bg-cyan-500", light: "bg-cyan-50", text: "text-cyan-700" },
            { ring: "ring-teal-200", bg: "bg-teal-500", light: "bg-teal-50", text: "text-teal-700" },
          ]
          const c = catColors[idx % catColors.length]

          return (
            <div
              key={cat.id}
              className={`bg-white border border-gray-200 rounded-2xl overflow-hidden transition-shadow ${isOpen ? "shadow-md" : "shadow-sm hover:shadow-md"}`}
            >
              {/* Category header row */}
              <div className="flex items-center gap-3 p-4 sm:p-5">
                {/* Color dot */}
                <div className={`w-3 h-3 rounded-full ${c.bg} shrink-0`} />

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      {cat.category_name}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.light} ${c.text}`}>
                      {cat.weight_percentage}%
                    </span>
                    {cat.criteria.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {cat.criteria.length} {cat.criteria.length === 1 ? "criterion" : "criteria"}
                      </span>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{cat.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Add criteria */}
                  <button
                    onClick={() => {
                      setCriteriaModal({ open: true, categoryId: cat.id, editing: null })
                      if (!isOpen) toggleExpand(cat.id)
                    }}
                    title="Add criteria"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span className="hidden sm:inline">Criteria</span>
                  </button>

                  {/* Edit category */}
                  <button
                    onClick={() => setCategoryModal({ open: true, editing: cat })}
                    title="Edit category"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete category */}
                  <button
                    onClick={() =>
                      setDeleteConfirm({
                        open: true,
                        type: "category",
                        categoryId: cat.id,
                        name: cat.category_name,
                      })
                    }
                    title="Delete category"
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Criteria list */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 sm:px-5 pb-4 pt-3 space-y-2">
                  {cat.criteria.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-400">No criteria yet.</p>
                      <button
                        onClick={() =>
                          setCriteriaModal({ open: true, categoryId: cat.id, editing: null })
                        }
                        className="text-sm text-blue-500 hover:text-blue-700 font-medium mt-1 transition"
                      >
                        + Add first criterion
                      </button>
                    </div>
                  ) : (
                    cat.criteria.map((cr) => (
                      <CriteriaRow
                        key={cr.id}
                        criteria={cr}
                        onEdit={() =>
                          setCriteriaModal({
                            open: true,
                            categoryId: cat.id,
                            editing: cr,
                          })
                        }
                        onDelete={() =>
                          setDeleteConfirm({
                            open: true,
                            type: "criteria",
                            categoryId: cat.id,
                            criteriaId: cr.id,
                            name: cr.criteria_name,
                          })
                        }
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {categoryModal.open && (
        <CategoryModal
          editing={categoryModal.editing}
          onClose={() => setCategoryModal({ open: false, editing: null })}
          onSave={async (payload) => {
            if (categoryModal.editing) {
              await rubricService.updateCategory(projectId, categoryModal.editing.id, payload as UpdateCategoryPayload)
              toast.success("Category updated")
            } else {
              await rubricService.createCategory(projectId, payload as CreateCategoryPayload)
              toast.success("Category created")
            }
            setCategoryModal({ open: false, editing: null })
            load()
          }}
        />
      )}

      {criteriaModal.open && (
        <CriteriaModal
          editing={criteriaModal.editing}
          onClose={() => setCriteriaModal({ open: false, categoryId: "", editing: null })}
          onSave={async (payload) => {
            if (criteriaModal.editing) {
              await rubricService.updateCriteria(
                projectId,
                criteriaModal.categoryId,
                criteriaModal.editing.id,
                payload,
              )
              toast.success("Criterion updated")
            } else {
              await rubricService.createCriteria(projectId, criteriaModal.categoryId, payload)
              toast.success("Criterion created")
            }
            setCriteriaModal({ open: false, categoryId: "", editing: null })
            load()
          }}
        />
      )}

      {deleteConfirm?.open && (
        <DeleteConfirmModal
          name={deleteConfirm.name}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={async () => {
            if (deleteConfirm.type === "category") {
              await rubricService.deleteCategory(projectId, deleteConfirm.categoryId)
              toast.success("Category deleted")
            } else if (deleteConfirm.criteriaId) {
              await rubricService.deleteCriteria(
                projectId,
                deleteConfirm.categoryId,
                deleteConfirm.criteriaId,
              )
              toast.success("Criterion deleted")
            }
            setDeleteConfirm(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// ─── Criteria Row ─────────────────────────────────────────────────────────────

function CriteriaRow({
  criteria,
  onEdit,
  onDelete,
}: {
  criteria: RubricCriteria
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
      <div className="w-1 h-full min-h-8 rounded-full bg-blue-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{criteria.criteria_name}</span>
          <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
            Max: {criteria.max_score}
          </span>
          <span className="text-xs bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
            {criteria.weight_in_category}% of category
          </span>
        </div>
        {criteria.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{criteria.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Category Modal ───────────────────────────────────────────────────────────

function CategoryModal({
  editing,
  onClose,
  onSave,
}: {
  editing: RubricCategory | null
  onClose: () => void
  onSave: (payload: CreateCategoryPayload | UpdateCategoryPayload) => Promise<void>
}) {
  const [form, setForm] = useState<CategoryFormData>(() =>
    editing
      ? {
          category_name: editing.category_name,
          weight_percentage: String(editing.weight_percentage),
          description: editing.description ?? "",
        }
      : emptyCategoryForm()
  )
  const [errors, setErrors] = useState<Partial<CategoryFormData>>({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e: Partial<CategoryFormData> = {}
    if (!form.category_name.trim()) e.category_name = "Required"
    const w = parseFloat(form.weight_percentage)
    if (isNaN(w) || w <= 0 || w > 100) e.weight_percentage = "Enter a value between 1–100"
    return e
  }

  const submit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await onSave({
        category_name: form.category_name.trim(),
        weight_percentage: parseFloat(form.weight_percentage),
        description: form.description.trim() || undefined,
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalBox
        title={editing ? "Edit Category" : "New Rubric Category"}
        icon={
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
        }
        onClose={onClose}
      >
        <div className="space-y-4">
          <Field label="Category Name" error={errors.category_name}>
            <input
              className={inputCls(!!errors.category_name)}
              value={form.category_name}
              onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
              placeholder="e.g. Technical Implementation"
              autoFocus
            />
          </Field>

          <Field label="Weight (%)" error={errors.weight_percentage} hint="How much this category contributes to the total score">
            <input
              type="number"
              min={1}
              max={100}
              step={0.01}
              className={inputCls(!!errors.weight_percentage)}
              value={form.weight_percentage}
              onChange={(e) => setForm((f) => ({ ...f, weight_percentage: e.target.value }))}
              placeholder="e.g. 40"
            />
          </Field>

          <Field label="Description" optional>
            <textarea
              rows={2}
              className={inputCls(false) + " resize-none"}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this category evaluates"
            />
          </Field>
        </div>

        <ModalFooter onClose={onClose} onSave={submit} saving={saving} saveLabel={editing ? "Save Changes" : "Create Category"} />
      </ModalBox>
    </Overlay>
  )
}

// ─── Criteria Modal ───────────────────────────────────────────────────────────

function CriteriaModal({
  editing,
  onClose,
  onSave,
}: {
  editing: RubricCriteria | null
  onClose: () => void
  onSave: (payload: CreateCriteriaPayload) => Promise<void>
}) {
  const [form, setForm] = useState<CriteriaFormData>(() =>
    editing
      ? {
          criteria_name: editing.criteria_name,
          max_score: String(editing.max_score),
          weight_in_category: String(editing.weight_in_category),
          description: editing.description ?? "",
        }
      : emptyCriteriaForm()
  )
  const [errors, setErrors] = useState<Partial<CriteriaFormData>>({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e: Partial<CriteriaFormData> = {}
    if (!form.criteria_name.trim()) e.criteria_name = "Required"
    const ms = parseFloat(form.max_score)
    if (isNaN(ms) || ms <= 0) e.max_score = "Must be greater than 0"
    const wc = parseFloat(form.weight_in_category)
    if (isNaN(wc) || wc <= 0 || wc > 100) e.weight_in_category = "Enter a value between 1–100"
    return e
  }

  const submit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await onSave({
        criteria_name: form.criteria_name.trim(),
        max_score: parseFloat(form.max_score),
        weight_in_category: parseFloat(form.weight_in_category),
        description: form.description.trim() || undefined,
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalBox
        title={editing ? "Edit Criterion" : "New Criterion"}
        icon={
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
        }
        onClose={onClose}
      >
        <div className="space-y-4">
          <Field label="Criterion Name" error={errors.criteria_name}>
            <input
              className={inputCls(!!errors.criteria_name)}
              value={form.criteria_name}
              onChange={(e) => setForm((f) => ({ ...f, criteria_name: e.target.value }))}
              placeholder="e.g. Code Structure & Architecture"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Max Score" error={errors.max_score}>
              <input
                type="number"
                min={1}
                step={0.5}
                className={inputCls(!!errors.max_score)}
                value={form.max_score}
                onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))}
                placeholder="e.g. 25"
              />
            </Field>

            <Field label="Weight in Category (%)" error={errors.weight_in_category}>
              <input
                type="number"
                min={1}
                max={100}
                step={0.01}
                className={inputCls(!!errors.weight_in_category)}
                value={form.weight_in_category}
                onChange={(e) => setForm((f) => ({ ...f, weight_in_category: e.target.value }))}
                placeholder="e.g. 50"
              />
            </Field>
          </div>

          <Field label="Description" optional>
            <textarea
              rows={2}
              className={inputCls(false) + " resize-none"}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What does this criterion evaluate?"
            />
          </Field>
        </div>

        <ModalFooter onClose={onClose} onSave={submit} saving={saving} saveLabel={editing ? "Save Changes" : "Add Criterion"} />
      </ModalBox>
    </Overlay>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  name,
  onClose,
  onConfirm,
}: {
  name: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)
  return (
    <Overlay onClose={onClose}>
      <ModalBox title="Confirm Delete" onClose={onClose}>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900">&ldquo;{name}&rdquo;</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-6">
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
      </ModalBox>
    </Overlay>
  )
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

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

function ModalBox({
  title,
  icon,
  children,
  onClose,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
        {icon}
        <h2 className="text-base font-bold text-gray-900 flex-1">{title}</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  error,
  hint,
  optional,
  children,
}: {
  label: string
  error?: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {optional && <span className="ml-1 text-gray-400 font-normal">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function ModalFooter({
  onClose,
  onSave,
  saving,
  saveLabel,
}: {
  onClose: () => void
  onSave: () => void
  saving: boolean
  saveLabel: string
}) {
  return (
    <div className="flex justify-end gap-2 mt-6">
      <button
        onClick={onClose}
        disabled={saving}
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  )
}

function inputCls(hasError: boolean) {
  return `w-full text-sm px-3 py-2 border rounded-xl outline-none transition
    ${hasError
      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
      : "border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
    } bg-white text-gray-900 placeholder:text-gray-400`
}