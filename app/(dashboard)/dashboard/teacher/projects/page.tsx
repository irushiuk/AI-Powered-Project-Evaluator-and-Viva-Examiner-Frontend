"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/teacherDashboard/DashboardLayout"
import CreateProjectModal from "@/components/teacherDashboard/CreateProjectModal"
import ProjectCard from "@/components/teacherDashboard/ProjectCard"
import { Button } from "@/components/ui/button"
import { projectService } from "@/services/projectService"
import { Project, CreateProjectPayload } from "@/types/project"
import { toast } from "sonner"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const refresh = async () => {
    try {
      const data = await projectService.getAll()
      setProjects(data)
    } catch {
      toast.error("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const handleCreate = async (payload: CreateProjectPayload) => {
    await projectService.create(payload)
    toast.success("Project created successfully")
    await refresh()
  }

  // Counts
  const draftCount  = projects.filter((p) => p.status === "draft").length
  const activeCount = projects.filter((p) => p.status === "active").length
  const doneCount   = projects.filter((p) => p.status === "completed").length

  return (
    <div>
      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your projects
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ New Project</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Draft"     value={draftCount}  color="blue" />
        <SummaryCard label="Active"    value={activeCount} color="blue"  />
        <SummaryCard label="Completed" value={doneCount}   color="blue"   />
      </div>

      {/* Project list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border rounded-2xl p-14 text-center">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-gray-500 font-medium">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            Create your first project to get started
          </p>
          <Button onClick={() => setModalOpen(true)}>+ New Project</Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onActivated={refresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* Summary Card */
function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: "yellow" | "green" | "blue"
}) {
  const colors = {
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-700",
    green:  "bg-green-50  border-green-100  text-green-700",
    blue:   "bg-blue-50   border-blue-100   text-blue-700",
  }
  return (
    <div className={`border rounded-2xl p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}