"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Project } from "@/types/project"
import { projectService } from "@/services/projectService"
import { toast } from "sonner"

type Props = {
  project: Project
  onActivated: () => void
}

export default function ProjectCard({ project, onActivated }: Props) {
  const router = useRouter()
  const [activating, setActivating] = useState(false)

  const statusStyles: Record<string, { bar: string; badge: string }> = {
    draft:     { bar: "bg-yellow-400", badge: "bg-yellow-50 text-yellow-600 border-yellow-200" },
    active:    { bar: "bg-green-400",  badge: "bg-green-50 text-green-600 border-green-200"   },
    completed: { bar: "bg-blue-400",   badge: "bg-blue-50 text-blue-600 border-blue-200"      },
  }
  const style = statusStyles[project.status] ?? statusStyles.draft

  const handleActivate = async () => {
    setActivating(true)
    try {
      await projectService.activate(project.id)
      toast.success(`${project.project_name} is now active`)
      onActivated()
    } catch {
      toast.error("Failed to activate project")
    } finally {
      setActivating(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Status colour strip */}
      <div className={`h-1 w-full ${style.bar}`} />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">

          {/* Left: info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {project.project_name}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${style.badge}`}
              >
                {project.status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-purple-50 text-purple-600 border-purple-200">
                {project.is_group_project ? "👥 Group" : "👤 Individual"}
              </span>
            </div>

            {project.description && (
              <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">
                {project.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span>📅 Deadline: {new Date(project.submission_deadline).toLocaleDateString()}</span>
              <span>🎓 {project.academic_year}</span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {project.status === "draft" && (
              <button
                onClick={handleActivate}
                disabled={activating}
                className="text-xs bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition font-medium"
              >
                {activating ? "Activating..." : "✅ Activate"}
              </button>
            )}

            <button
              onClick={() => router.push(`/dashboard/teacher/projects/${project.id}`)}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg transition font-medium"
            >
              Open →
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}