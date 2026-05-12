"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/teacherDashboard/DashboardLayout"
import RubricsTab from "@/components/teacherDashboard/RubircsTab"
import VivaQuestionsTab from "@/components/teacherDashboard/VivaQuestionsTab"
import SessionsTab from "@/components/teacherDashboard/SessionsTab"
import SubmissionsTab from "@/components/teacherDashboard/SubmissionsTab"
import { projectService } from "@/services/projectService"
import { Project } from "@/types/project"
import { toast } from "sonner"

type Tab = "overview" | "rubrics" | "questions" | "sessions" | "submissions"

const TABS: { key: Tab; label: string}[] = [
  { key: "overview",    label: "Overview"},
  { key: "rubrics",     label: "Rubrics"},
  { key: "questions",   label: "Viva Questions"},
  { key: "sessions",    label: "Sessions"},
  { key: "submissions", label: "Submissions"},
]

export default function ProjectDetailPage() {
  // Fix: cast params correctly to avoid undefined id
  const params = useParams()
  const id = params.id as string

  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const data = await projectService.getDetail(id)
        setProject(data)
      } catch {
        toast.error("Failed to load project")
        router.push("/dashboard/teacher/projects")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  if (loading) {
    return (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          Loading project...
        </div>
    )
  }

  if (!project || !id) return null

  const statusStyles: Record<string, string> = {
    draft:     "bg-blue-50 text-blue-600 border-blue-200",
    active:    "bg-blue-50  text-blue-600  border-blue-200",
    completed: "bg-blue-50   text-blue-600   border-blue-200",
  }

  return (
        <div>
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/teacher/projects")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition"
      >
        ← Back to Projects
      </button>

      {/* Project header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${statusStyles[project.status] ?? statusStyles.draft}`}>
                {project.status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-purple-50 text-purple-600 border-purple-200">
                {project.is_group_project ? "👥 Group" : "👤 Individual"}
              </span>
            </div>

            {project.description && (
              <p className="text-sm text-gray-500 mt-2 max-w-2xl">{project.description}</p>
            )}

            <div className="flex flex-wrap gap-5 mt-3 text-sm text-gray-500">
              <span>📅 Deadline: {new Date(project.submission_deadline).toLocaleString()}</span>
              <span>🎓 {project.academic_year}</span>
              {/* <span>🆔 <span className="font-mono text-xs">{project.id}</span></span> */}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
             {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview"    && <OverviewTab project={project} />}
        {activeTab === "rubrics"     && <RubricsTab projectId={id} />}
        {activeTab === "questions"   && <VivaQuestionsTab projectId={id} />}
        {activeTab === "sessions"    && <SessionsTab projectId={id} isGroupProject={project.is_group_project} />}
        {activeTab === "submissions" && <SubmissionsTab projectId={id} />}
      </div>

      </div>

  )
}

function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <InfoCard label="Status"        value={project.status} />
      <InfoCard label="Type"          value={project.is_group_project ? "Group" : "Individual"} />
      <InfoCard label="Academic Year" value={project.academic_year} />
      <InfoCard label="Deadline"      value={new Date(project.submission_deadline).toLocaleDateString()} />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-base font-semibold text-gray-800 capitalize">{value}</p>
    </div>
  )
}

function ComingSoon({ label, description }: { label: string; description: string }) {
  return (
    <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-14 text-center">
      <p className="text-3xl mb-3">🔧</p>
      <p className="text-gray-600 font-medium">{label}</p>
      <p className="text-gray-400 text-sm mt-1">{description}</p>
    </div>
  )
}