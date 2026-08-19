"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Building2, Laptop, LockKeyhole, Pencil, Plus, User, Users } from "lucide-react"
import { CreateProjectPayload, EvaluationMode, Project } from "@/types/project"

type Props = {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: CreateProjectPayload) => Promise<void>
  initialData?: Project
}

type Errors = {
  project_name?: string
  submission_deadline?: string
  academic_year?: string
  physical_location?: string
  physical_panel_pin?: string
}

export default function CreateProjectModal({ isOpen, onClose, onCreate, initialData }: Props) {
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [isGroupProject, setIsGroupProject] = useState(false)
  const [submissionDeadline, setSubmissionDeadline] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [evaluationMode, setEvaluationMode] = useState<EvaluationMode>("remote")
  const [physicalLocation, setPhysicalLocation] = useState("")
  const [physicalPanelPin, setPhysicalPanelPin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  // Sync fields when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setProjectName(initialData?.project_name ?? "")
      setDescription(initialData?.description ?? "")
      setIsGroupProject(initialData?.is_group_project ?? false)
      // Convert ISO datetime to datetime-local format
      setSubmissionDeadline(
        initialData?.submission_deadline
          ? initialData.submission_deadline.slice(0, 16)
          : ""
      )
      setAcademicYear(initialData?.academic_year ?? "")
      setEvaluationMode(initialData?.evaluation_mode ?? "remote")
      setPhysicalLocation(initialData?.physical_location ?? "")
      setPhysicalPanelPin("")
      setErrors({})
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const validate = (): boolean => {
    const newErrors: Errors = {}
    if (!projectName.trim()) newErrors.project_name = "Project name is required"
    if (!submissionDeadline) newErrors.submission_deadline = "Submission deadline is required"
    if (!academicYear.trim()) newErrors.academic_year = "Academic year is required"
    if (evaluationMode === "physical") {
      if (!physicalLocation.trim()) {
        newErrors.physical_location = "Physical evaluation location is required"
      }
      if (!isEditMode && physicalPanelPin.length < 4) {
        newErrors.physical_panel_pin = "Panel password must contain at least 4 characters"
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleClose = () => {
    setErrors({})
    onClose()
  }

  const handleSubmit = async () => {
    if (!validate() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onCreate({
        project_name: projectName.trim(),
        description: description.trim(),
        is_group_project: isGroupProject,
        // Convert to ISO 8601 with Z suffix as expected by backend
        submission_deadline: new Date(submissionDeadline).toISOString(),
        academic_year: academicYear.trim(),
        evaluation_mode: evaluationMode,
        ...(evaluationMode === "physical"
          ? {
              physical_location: physicalLocation.trim(),
              ...(!isEditMode ? { physical_panel_pin: physicalPanelPin } : {}),
            }
          : {}),
      })
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEditMode = !!initialData

  const inputBase =
    "w-full border rounded-xl p-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100"
  const inputNormal = `${inputBase} border-gray-200 focus:border-blue-400`
  const inputError = `${inputBase} border-red-400 bg-red-50`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div
          className={`px-8 py-6 rounded-t-2xl ${
            isEditMode
              ? "bg-amber-50 border-b border-amber-100"
              : "bg-blue-50 border-b border-blue-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
               className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                 isEditMode ? "bg-amber-100" : "bg-blue-100"
               }`}
             >
               {isEditMode ? (
                 <Pencil className="w-5 h-5 text-amber-600" />
               ) : (
                 <Plus className="w-5 h-5 text-blue-600" />
               )}
             </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditMode ? "Edit Project" : "Create New Project"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEditMode
                  ? `Editing: ${initialData.project_name}`
                  : "Fill in the details below"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-5">

          {/* Project Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Smart Campus System"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value)
                setErrors((prev) => ({ ...prev, project_name: undefined }))
              }}
              className={errors.project_name ? inputError : inputNormal}
            />
            {errors.project_name && (
              <p className="text-red-500 text-xs mt-1">{errors.project_name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Description
            </label>
            <textarea
              placeholder="Brief description of the project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputNormal} resize-none`}
            />
          </div>

          {/* Project Type Toggle */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Project Type
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsGroupProject(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition flex items-center justify-center gap-1.5 ${
                  !isGroupProject
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                <User className="w-4 h-4" /> Individual
              </button>
              <button
                type="button"
                onClick={() => setIsGroupProject(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition flex items-center justify-center gap-1.5 ${
                  isGroupProject
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                <Users className="w-4 h-4" /> Group
              </button>
            </div>
          </div>

          {/* Evaluation mode is fixed for the whole project. */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Evaluation Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isEditMode}
                onClick={() => {
                  setEvaluationMode("remote")
                  setErrors((prev) => ({
                    ...prev,
                    physical_location: undefined,
                    physical_panel_pin: undefined,
                  }))
                }}
                className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed ${
                  evaluationMode === "remote"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Laptop className="h-4 w-4" /> Remote
                </span>
                <span className="mt-1 block text-xs opacity-75">Students join from their own PCs</span>
              </button>
              <button
                type="button"
                disabled={isEditMode}
                onClick={() => setEvaluationMode("physical")}
                className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed ${
                  evaluationMode === "physical"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="h-4 w-4" /> Physical
                </span>
                <span className="mt-1 block text-xs opacity-75">Students use the examiner-room kiosk</span>
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              This method is fixed after the project is created.
            </p>
          </div>

          {evaluationMode === "physical" && (
            <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-600" /> Physical Location
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Building — Room 42"
                  value={physicalLocation}
                  onChange={(e) => {
                    setPhysicalLocation(e.target.value)
                    setErrors((prev) => ({ ...prev, physical_location: undefined }))
                  }}
                  className={errors.physical_location ? inputError : inputNormal}
                />
                {errors.physical_location && (
                  <p className="text-red-500 text-xs mt-1">{errors.physical_location}</p>
                )}
              </div>

              {!isEditMode && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <LockKeyhole className="h-4 w-4 text-emerald-600" /> Panel Password
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 4 characters"
                    value={physicalPanelPin}
                    onChange={(e) => {
                      setPhysicalPanelPin(e.target.value)
                      setErrors((prev) => ({ ...prev, physical_panel_pin: undefined }))
                    }}
                    className={errors.physical_panel_pin ? inputError : inputNormal}
                  />
                  {errors.physical_panel_pin ? (
                    <p className="text-red-500 text-xs mt-1">{errors.physical_panel_pin}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      The examiner uses this password to open and close the restricted kiosk.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submission Deadline */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Submission Deadline <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={submissionDeadline}
              onChange={(e) => {
                setSubmissionDeadline(e.target.value)
                setErrors((prev) => ({ ...prev, submission_deadline: undefined }))
              }}
              className={errors.submission_deadline ? inputError : inputNormal}
            />
            {errors.submission_deadline && (
              <p className="text-red-500 text-xs mt-1">{errors.submission_deadline}</p>
            )}
          </div>

          {/* Academic Year */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Academic Year <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 2025/2026"
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value)
                setErrors((prev) => ({ ...prev, academic_year: undefined }))
              }}
              className={errors.academic_year ? inputError : inputNormal}
            />
            {errors.academic_year && (
              <p className="text-red-500 text-xs mt-1">{errors.academic_year}</p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={isEditMode ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
          >
            {isSubmitting
              ? isEditMode ? "Saving..." : "Creating..."
              : isEditMode ? "Save Changes" : "Create Project"}
          </Button>
        </div>

      </div>
    </div>
  )
}
