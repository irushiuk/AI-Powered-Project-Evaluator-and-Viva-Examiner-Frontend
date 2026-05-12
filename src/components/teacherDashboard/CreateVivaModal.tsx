// "use client"

// import { useState, useEffect } from "react" 
// import { Viva } from "@/types/viva"
// import { Button } from "../ui/button"
// import { Rubric } from "@/types/rubric"
// import { predefinedRubrics } from "@/mock/mockRubrics"

// type Props = {
//   isOpen: boolean
//   onClose: () => void
//   onCreate: (data: Omit<Viva, "id">) => Promise<void>
//   initialData?: Viva
// }

// export default function CreateVivaModal({ isOpen, onClose, onCreate, initialData }: Props) {
//   const [module, setModule] = useState("")
//   const [duration, setDuration] = useState("")
//   const [deadline, setDeadline] = useState("")
//   const [selectedRubrics, setSelectedRubrics] = useState<Rubric[]>([])
//   const [customTitle, setCustomTitle] = useState("")
//   const [customMarks, setCustomMarks] = useState("")
//   const [isSubmitting, setIsSubmitting] = useState(false)
//   const [errors, setErrors] = useState<{ module?: string; duration?: string; deadline?: string }>({})

//   // Sync fields whenever modal opens or initialData changes
//   useEffect(() => {
//     if (isOpen) {
//       setModule(initialData?.module ?? "")
//       setDuration(initialData?.duration?.toString() ?? "")
//       setDeadline(initialData?.enrollmentDeadline ?? "")
//       setSelectedRubrics(initialData?.rubrics ?? [])
//       setCustomTitle("")
//       setCustomMarks("")
//       setErrors({})
//     }
//   }, [isOpen, initialData])

//   if (!isOpen) return null

//   const validate = () => {
//     const newErrors: typeof errors = {}
//     if (!module.trim()) newErrors.module = "Module name is required"
//     if (!duration || Number(duration) <= 0) newErrors.duration = "Valid duration is required"
//     if (!deadline) newErrors.deadline = "Deadline is required"
//     setErrors(newErrors)
//     return Object.keys(newErrors).length === 0
//   }

//   const handleClose = () => {
//     setErrors({})
//     onClose()
//   }

//   const toggleRubric = (rubric: Rubric) => {
//     const exists = selectedRubrics.find((r) => r.id === rubric.id)
//     if (exists) {
//       setSelectedRubrics((prev) => prev.filter((r) => r.id !== rubric.id))
//     } else {
//       setSelectedRubrics((prev) => [...prev, rubric])
//     }
//   }

//   const addCustomRubric = () => {
//     if (!customTitle || !customMarks) return
//     const newRubric: Rubric = {
//       id: crypto.randomUUID(),
//       title: customTitle,
//       maxMarks: Number(customMarks),
//       predefined: false,
//     }
//     setSelectedRubrics((prev) => [...prev, newRubric])
//     setCustomTitle("")
//     setCustomMarks("")
//   }

//   const handleSubmit = async () => {
//     if (!validate()) return
//     if (isSubmitting) return
//     setIsSubmitting(true)
//     try {
//       await onCreate({
//         module,
//         duration: Number(duration),
//         enrollmentDeadline: deadline,
//         status: "Enrollment Open",
//         rubrics: selectedRubrics,
//         enrolledStudents: initialData?.enrolledStudents ?? [],
//       })
//       handleClose()
//     } finally {
//       setIsSubmitting(false)
//     }
//   }

//   const isEditMode = !!initialData

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

//         {/* Header */}
//         <div className={`px-8 py-6 rounded-t-2xl ${isEditMode ? "bg-amber-50 border-b border-amber-100" : "bg-blue-50 border-b border-blue-100"}`}>
//           <div className="flex items-center gap-3">
//             <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isEditMode ? "bg-amber-100" : "bg-blue-100"}`}>
//               {isEditMode ? "✏️" : "➕"}
//             </div>
//             <div>
//               <h2 className="text-lg font-semibold text-gray-900">
//                 {isEditMode ? "Edit Viva Session" : "Create Viva Session"}
//               </h2>
//               <p className="text-xs text-gray-500 mt-0.5">
//                 {isEditMode ? `Editing: ${initialData.module}` : "Fill in the details below"}
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="px-8 py-6 space-y-5">

//           {/* Module */}
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-1.5 block">
//               Module Name / Code <span className="text-red-400">*</span>
//             </label>
//             <input
//               type="text"
//               placeholder="e.g. CS3001 or Software Engineering"
//               value={module}
//               onChange={(e) => {
//                 setModule(e.target.value)
//                 setErrors((prev) => ({ ...prev, module: undefined }))
//               }}
//               className={`w-full border rounded-xl p-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100 ${
//                 errors.module ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"
//               }`}
//             />
//             {errors.module && <p className="text-red-500 text-xs mt-1">{errors.module}</p>}
//           </div>

//           {/* Duration */}
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-1.5 block">
//               Duration per Student (minutes) <span className="text-red-400">*</span>
//             </label>
//             <input
//               type="number"
//               placeholder="e.g. 15"
//               value={duration}
//               onChange={(e) => {
//                 setDuration(e.target.value)
//                 setErrors((prev) => ({ ...prev, duration: undefined }))
//               }}
//               className={`w-full border rounded-xl p-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100 ${
//                 errors.duration ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"
//               }`}
//             />
//             {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
//           </div>

//           {/* Deadline */}
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-1.5 block">
//               Enrollment Deadline <span className="text-red-400">*</span>
//             </label>
//             <input
//               type="date"
//               value={deadline}
//               onChange={(e) => {
//                 setDeadline(e.target.value)
//                 setErrors((prev) => ({ ...prev, deadline: undefined }))
//               }}
//               className={`w-full border rounded-xl p-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100 ${
//                 errors.deadline ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"
//               }`}
//             />
//             {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
//           </div>

//           {/* Predefined Rubrics */}
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2 block">Predefined Rubrics</label>
//             <div className="border border-gray-200 rounded-xl p-3 space-y-2">
//               {predefinedRubrics.map((rubric) => {
//                 const checked = !!selectedRubrics.find((r) => r.id === rubric.id)
//                 return (
//                   <label key={rubric.id} className="flex items-center gap-3 cursor-pointer group">
//                     <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
//                       checked ? "bg-blue-500 border-blue-500" : "border-gray-300 group-hover:border-blue-300"
//                     }`}>
//                       {checked && <span className="text-white text-xs">✓</span>}
//                     </div>
//                     <input
//                       type="checkbox"
//                       checked={checked}
//                       onChange={() => toggleRubric(rubric)}
//                       className="hidden"
//                     />
//                     <span className="text-sm text-gray-700">{rubric.title}</span>
//                     <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
//                       {rubric.maxMarks} marks
//                     </span>
//                   </label>
//                 )
//               })}
//             </div>
//           </div>

//           {/* Custom Rubric */}
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2 block">Add Custom Rubric</label>
//             <div className="flex gap-2">
//               <input
//                 type="text"
//                 placeholder="Rubric title"
//                 value={customTitle}
//                 onChange={(e) => setCustomTitle(e.target.value)}
//                 className="flex-1 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
//               />
//               <input
//                 type="number"
//                 placeholder="Marks"
//                 value={customMarks}
//                 onChange={(e) => setCustomMarks(e.target.value)}
//                 className="w-24 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
//               />
//               <Button onClick={addCustomRubric} variant="outline" className="shrink-0">
//                 Add
//               </Button>
//             </div>
//           </div>

//           {/* Selected rubrics preview */}
//           {selectedRubrics.length > 0 && (
//             <div>
//               <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wide">
//                 Selected Rubrics ({selectedRubrics.length})
//               </label>
//               <div className="flex flex-wrap gap-2">
//                 {selectedRubrics.map((rubric) => (
//                   <span
//                     key={rubric.id}
//                     className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100"
//                   >
//                     {rubric.title} · {rubric.maxMarks}m
//                     <button
//                       onClick={() => setSelectedRubrics((prev) => prev.filter((r) => r.id !== rubric.id))}
//                       className="text-blue-400 hover:text-blue-700 leading-none"
//                     >
//                       ×
//                     </button>
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}

//         </div>

//         {/* Footer */}
//         <div className="px-8 py-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
//           <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
//             Cancel
//           </Button>
//           <Button
//             onClick={handleSubmit}
//             disabled={isSubmitting}
//             className={isEditMode ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
//           >
//             {isSubmitting
//               ? isEditMode ? "Saving..." : "Creating..."
//               : isEditMode ? "Save Changes" : "Create Viva"
//             }
//           </Button>
//         </div>

//       </div>
//     </div>
//   )
// }