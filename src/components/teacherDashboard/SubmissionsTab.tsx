"use client"

import { useState, useEffect } from "react"
import { submissionService, Submission } from "@/services/submissionService"
import { toast } from "sonner"

const analysisStatusStyles: Record<string, string> = {
  pending:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  completed:  "bg-green-50 text-green-700 border-green-200",
  failed:     "bg-red-50 text-red-700 border-red-200",
}

const analysisStatusLabel: Record<string, string> = {
  pending:    "⏳ Pending",
  processing: "⚙️ Analysing",
  completed:  "✅ Analysis Done",
  failed:     "❌ Analysis Failed",
}

export default function SubmissionsTab({ projectId }: { projectId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    submissionService
      .getSubmissions(projectId)
      .then(setSubmissions)
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading submissions...
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-white border rounded-2xl p-14 text-center">
        <p className="text-3xl mb-3">📭</p>
        <p className="text-gray-500 font-medium">No submissions yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Students haven't submitted their projects yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-500">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {submissions.map((s) => (
        <SubmissionCard key={s.id} submission={s} />
      ))}
    </div>
  )
}

function SubmissionCard({ submission: s }: { submission: Submission }) {
  const [showPdf, setShowPdf] = useState(false)
  const status = s.latest_code_analysis_status

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        {/* Student info */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{s.student_name}</p>
            {s.group_name && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                {s.group_name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Reg No: {s.student_reg_no}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Submitted: {new Date(s.submitted_at).toLocaleString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">

          {status && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${analysisStatusStyles[status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
              {analysisStatusLabel[status] ?? status}
            </span>
          )}

          {s.github_repo_url && (
            <a
              href={s.github_repo_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
            >
              GitHub ↗
            </a>
          )}

          {s.report_file_url && (
            <>
              <button
                onClick={() => setShowPdf((p) => !p)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
              >
                {showPdf ? "Hide Report" : "View Report"}
              </button>
              <a
                href={s.report_file_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-gray-50 border text-gray-700 rounded-lg text-xs font-medium transition"
              >
                Download ↓
              </a>
            </>
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
            title={`Report – ${s.student_name}`}
          />
        </div>
      )}

    </div>
  )
}