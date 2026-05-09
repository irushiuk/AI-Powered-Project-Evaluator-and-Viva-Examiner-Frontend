"use client"

import { useState } from "react"
import { Viva } from "@/types/viva"
import { Button } from "../ui/button"
import { Rubric } from "@/types/rubric"
import { predefinedRubrics } from "@/mock/mockRubrics"

type Props = {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: Omit<Viva, "id">) => Promise<void>
}

export default function CreateVivaModal({ isOpen, onClose, onCreate }: Props) {
  const [module, setModule] = useState("")
  const [duration, setDuration] = useState("")
  const [deadline, setDeadline] = useState("")
  const [selectedRubrics, setSelectedRubrics] = useState<Rubric[]>([])
  const [customTitle, setCustomTitle] = useState("")
  const [customMarks, setCustomMarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ module?: string; duration?: string; deadline?: string }>({})

  if (!isOpen) return null

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!module.trim()) newErrors.module = "Module name is required"
    if (!duration || Number(duration) <= 0) newErrors.duration = "Valid duration is required"
    if (!deadline) newErrors.deadline = "Deadline is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleClose = () => {
    setModule("")
    setDuration("")
    setDeadline("")
    setSelectedRubrics([])
    setCustomTitle("")
    setCustomMarks("")
    setErrors({})
    onClose()
  }


  const toggleRubric = (rubric: Rubric) => {

  const exists = selectedRubrics.find(
    (r) => r.id === rubric.id
  )

  if (exists) {

    setSelectedRubrics((prev) =>
      prev.filter((r) => r.id !== rubric.id)
    )

  } else {

    setSelectedRubrics((prev) => [
      ...prev,
      rubric,
    ])
  }
}

const addCustomRubric = () => {

  if (!customTitle || !customMarks) return

  const newRubric: Rubric = {
    id: crypto.randomUUID(),

    title: customTitle,

    maxMarks: Number(customMarks),

    predefined: false,
  }

  setSelectedRubrics((prev) => [
    ...prev,
    newRubric,
  ])

  setCustomTitle("")
  setCustomMarks("")
}

const handleSubmit = async () => {
    if (!validate()) return
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onCreate({
        module,
        duration: Number(duration),
        enrollmentDeadline: deadline,
        status: "Enrollment Open",
        rubrics: selectedRubrics,
        enrolledStudents: [],
      })
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }


    return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-[400px] shadow-lg">

        <h2 className="text-xl font-semibold mb-4">Create Viva Session</h2>

        {/* Module */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Module Name / Code"
            value={module}
            onChange={(e) => {
              setModule(e.target.value)
              setErrors((prev) => ({ ...prev, module: undefined }))
            }}
            className={`w-full border rounded-lg p-3 ${
              errors.module ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.module && (
            <p className="text-red-500 text-xs mt-1">{errors.module}</p>
          )}
        </div>

        {/* Duration */}
        <div className="mb-4">
          <input
            type="number"
            placeholder="Duration per student (minutes)"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value)
              setErrors((prev) => ({ ...prev, duration: undefined }))
            }}
            className={`w-full border rounded-lg p-3 ${
              errors.duration ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.duration && (
            <p className="text-red-500 text-xs mt-1">{errors.duration}</p>
          )}
        </div>

        {/* Deadline */}
        <div className="mb-6">
          <label className="text-sm text-gray-600 mb-1 block">Enrollment Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => {
              setDeadline(e.target.value)
              setErrors((prev) => ({ ...prev, deadline: undefined }))
            }}
            className={`w-full border rounded-lg p-3 ${
              errors.deadline ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.deadline && (
            <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>
          )}
        </div>

        {/* Predefined Rubrics — unchanged */}
        <div className="mb-4">
          <h3 className="font-medium mb-2">Predefined Rubrics</h3>
          {predefinedRubrics.map((rubric) => (
            <label key={rubric.id} className="flex items-center gap-2 mb-2">
              <input type="checkbox" onChange={() => toggleRubric(rubric)} />
              <span>{rubric.title} ({rubric.maxMarks})</span>
            </label>
          ))}
        </div>

        {/* Custom Rubric — unchanged */}
        <div className="mb-4">
          <h3 className="font-medium mb-2">Custom Rubric</h3>
          <div className="mb-2 flex flex-col gap-2"> 
            <input
            type="text"
            placeholder="Rubric"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
          />
          <input
            type="number"
            placeholder="Marks"
            value={customMarks}
            onChange={(e) => setCustomMarks(e.target.value)}
          />
          <Button onClick={addCustomRubric}>Add Rubric</Button>
          </div>
          
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>

      </div>
    </div>
  )
}