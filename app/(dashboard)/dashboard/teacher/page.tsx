"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/teacherDashboard/DashboardLayout"
import { Button } from "@/components/ui/button"
import { projectService } from "@/services/projectService"
import { Project } from "@/types/project"
import { useRouter } from "next/navigation"

export default function TeacherDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const router = useRouter()

  useEffect(() => {
    projectService.getAll()
      .then(setProjects)
      .catch(() => {})
  }, [])

  const activeCount    = projects.filter((p) => p.status === "active").length
  const completedCount = projects.filter((p) => p.status === "completed").length

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Teacher Dashboard</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card title="Total Projects"     value={projects.length}  />
        <Card title="Active Projects"    value={activeCount}      />
        <Card title="Completed"          value={completedCount}   />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-2">Manage Projects</h2>
          <p className="opacity-70 mb-4">Create and manage your evaluation projects</p>
          <Button onClick={() => router.push("/dashboard/teacher/projects")}>
            View Projects
          </Button>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-semibold mb-2">Review Submissions</h2>
          <p className="opacity-70 mb-4">Check AI feedback and grade students</p>
          <Button onClick={() => router.push("/dashboard/teacher/submissions")}>
            View Submissions
          </Button>
        </GlassCard>
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
      <p className="opacity-70">{title}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  )
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
      {children}
    </div>
  )
}