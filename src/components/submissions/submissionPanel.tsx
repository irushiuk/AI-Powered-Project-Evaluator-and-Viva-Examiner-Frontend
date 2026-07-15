"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../teacherDashboard/DashboardLayout"
import { submissionService, Submission } from "@/services/submissionService"
import { Project } from "@/types/project"
import { toast } from "sonner"

import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Github,
  Download,
  Eye,
  EyeOff,
} from "lucide-react"

// ── Analysis status badge config ──────────────────────────────────────────────

const analysisStatusConfig: Record<
  string,
  { label: string; icon: any; colorClass: string }
> = {
  pending: {
    label: "Analysis Pending",
    icon: Clock,
    colorClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  processing: {
    label: "Analysing...",
    icon: Loader2,
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Analysis Done",
    icon: CheckCircle2,
    colorClass: "bg-green-50 text-green-700 border-green-200",
  },
  failed: {
    label: "Analysis Failed",
    icon: AlertTriangle,
    colorClass: "bg-red-50 text-red-700 border-red-200",
  },
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function SubmissionsPanel() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  useEffect(() => {
    submissionService
      .getProjects()
      .then((data) => {
        setProjects(data)
        if (data.length > 0) setSelectedProject(data[0])
      })
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoadingProjects(false))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setLoadingSubmissions(true)
    setSubmissions([])
    submissionService
      .getSubmissions(selectedProject.id)
      .then(setSubmissions)
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setLoadingSubmissions(false))
  }, [selectedProject])

  return (
      <div className="flex flex-col lg:flex-row gap-6 h-full">

        {/* LEFT: project list */}
        <aside className="w-full lg:w-72 shrink-0 bg-white border rounded-xl p-4">
          <h2 className="text-base font-semibold mb-3">Projects</h2>

          {loadingProjects ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-400">No projects found.</p>
          ) : (
            <div className="space-y-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition ${
                    selectedProject?.id === project.id
                      ? "bg-blue-50 border-blue-300 text-blue-800"
                      : "border-transparent hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <p className="text-sm font-medium leading-snug">{project.project_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {project.status} · {project.academic_year}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* RIGHT: submissions */}
        <section className="flex-1 bg-white border rounded-xl p-5 min-w-0">
          {!selectedProject ? (
            <p className="text-sm text-gray-400">Select a project to view submissions.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-semibold">Submissions</h2>
                  <p className="text-sm text-gray-500">{selectedProject.project_name}</p>
                </div>
                {!loadingSubmissions && (
                  <span className="text-xs text-gray-400">
                    {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  Loading submissions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-14 text-gray-400">
                  <Inbox className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm">No submissions yet for this project.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((s) => (
                    <SubmissionCard key={s.id} submission={s} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

      </div>
  )
}

// ── Submission card ──────────────────────────────────────────────────────────

function SubmissionCard({ submission: s }: { submission: Submission }) {
  const [showPdf, setShowPdf] = useState(false)

  const analysisStatus = s.latest_code_analysis_status

  return (
    <div className="border rounded-xl overflow-hidden">

      {/* Card header */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        {/* Student info */}
        <div>
          <p className="font-semibold text-gray-900">{s.student_name}</p>
          <p className="text-xs text-gray-500">
            Reg No: {s.student_reg_no}
            {s.group_name && <> · Group: {s.group_name}</>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Submitted: {new Date(s.submitted_at).toLocaleString()}
          </p>
        </div>

         {/* Right side: status + actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">

          {/* Analysis status badge */}
          {analysisStatus && analysisStatusConfig[analysisStatus] && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${
                analysisStatusConfig[analysisStatus].colorClass
              }`}
            >
              {(() => {
                const IconComp = analysisStatusConfig[analysisStatus].icon;
                return <IconComp className={`h-3.5 w-3.5 ${analysisStatus === 'processing' ? 'animate-spin' : ''}`} />;
              })()}
              {analysisStatusConfig[analysisStatus].label}
            </span>
          )}

          {/* GitHub */}
          {s.github_repo_url && (
            <a
              href={s.github_repo_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub Repo
            </a>
          )}

          {/* View PDF inline */}
          {s.report_file_url && (
            <button
              onClick={() => setShowPdf((prev) => !prev)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5"
            >
              {showPdf ? (
                <><EyeOff className="h-3.5 w-3.5" /> Hide Report</>
              ) : (
                <><Eye className="h-3.5 w-3.5" /> View Report</>
              )}
            </button>
          )}

          {/* Download PDF */}
          {s.report_file_url && (
            <a
              href={s.report_file_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white hover:bg-gray-50 border text-gray-700 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}

        </div>
      </div>

      {/* Inline PDF viewer */}
      {showPdf && s.report_file_url && (
        <div className="border-t">
          <iframe
            src={s.report_file_url}
            className="w-full"
            style={{ height: "600px" }}
            title={`Report - ${s.student_name}`}
          />
        </div>
      )}

    </div>
  )
}