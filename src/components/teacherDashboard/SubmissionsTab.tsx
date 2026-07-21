"use client"

import { useState, useEffect } from "react"
import { submissionService, Submission } from "@/services/submissionService"
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
  Code,
} from "lucide-react"
import { codeAnalysisService, CodeAnalysisReport } from "@/services/codeAnalysisService"

const analysisStatusConfig: Record<
  string,
  { label: string; icon: any; colorClass: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    colorClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  fetching: {
    label: "Fetching code...",
    icon: Loader2,
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  processing: {
    label: "Analysing",
    icon: Loader2,
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  scanning: {
    label: "Scanning code...",
    icon: Loader2,
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  summarizing: {
    label: "Summarizing code...",
    icon: Loader2,
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  questioning: {
    label: "Generating questions...",
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
        <Inbox className="h-10 w-10 text-gray-400 mx-auto mb-3" />
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

  // The submissions list only returns the raw stored analysis_status, which
  // can get stuck at "scanning" forever unless something calls the
  // status endpoint (which triggers refresh_submission on the backend:
  // polls SonarCloud, computes quality, generates the final report, and
  // only then flips status to "completed"). So track status locally and
  // refresh it from the real status endpoint on mount.
  const [status, setStatus] = useState(s.latest_code_analysis_status)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [showCodeReport, setShowCodeReport] = useState(false)
  const [codeReport, setCodeReport] = useState<CodeAnalysisReport | null>(null)
  const [loadingCodeReport, setLoadingCodeReport] = useState(false)

  useEffect(() => {
    if (!s.latest_code_submission_id) return
    if (status === 'completed' || status === 'failed') return

    let cancelled = false
    const poll = async () => {
      try {
        const result = await codeAnalysisService.getStatus(s.latest_code_submission_id as string)
        if (!cancelled) {
          setStatus(result.analysis_status)
          setAnalysisError(result.analysis_error)
        }
      } catch {
        // Silently ignore; badge just keeps showing the last known status.
      }
    }

    poll()
    const interval = setInterval(poll, 10000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [s.latest_code_submission_id, status])


  const handleViewCodeReport = async () => {
    if (showCodeReport) {
      setShowCodeReport(false)
      return
    }
    if (!s.latest_code_submission_id) return

    if (!codeReport) {
      setLoadingCodeReport(true)
      try {
        const report = await codeAnalysisService.getReport(s.latest_code_submission_id)
        setCodeReport(report)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load code analysis report')
        setLoadingCodeReport(false)
        return
      }
      setLoadingCodeReport(false)
    }
    setShowCodeReport(true)
  }

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

          {status && analysisStatusConfig[status] && (
            <span
              title={status === 'failed' && analysisError ? analysisError : undefined}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${analysisStatusConfig[status].colorClass}`}
            >
              {(() => {
                const IconComp = analysisStatusConfig[status].icon;
                const inProgress = ['processing', 'fetching', 'scanning', 'summarizing', 'questioning'].includes(status)
                return <IconComp className={`h-3.5 w-3.5 ${inProgress ? 'animate-spin' : ''}`} />;
              })()}
              {analysisStatusConfig[status].label}
            </span>
          )}

          {s.github_repo_url && (
            <a
              href={s.github_repo_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          )}

          {s.report_file_url && (
            <>
              <button
                onClick={() => setShowPdf((p) => !p)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5"
              >
                {showPdf ? (
                  <><EyeOff className="h-3.5 w-3.5" /> Hide Report</>
                ) : (
                  <><Eye className="h-3.5 w-3.5" /> View Report</>
                )}
              </button>
              <a
                href={s.report_file_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-gray-50 border text-gray-700 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </>
          )}

          {s.latest_code_submission_id && status === 'completed' && (
            <button
              onClick={handleViewCodeReport}
              disabled={loadingCodeReport}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Code className="h-3.5 w-3.5" />
              {loadingCodeReport ? "Loading..." : showCodeReport ? "Hide Code Analysis" : "View Code Analysis"}
            </button>
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

      {/* Code analysis report */}
      {showCodeReport && codeReport && (
        <div className="border-t p-5 space-y-4 bg-gray-50">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Executive Summary</h3>
            <p className="text-sm text-gray-600 mt-1">{codeReport.executive_summary}</p>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-xs font-medium text-gray-500">Verdict:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              codeReport.overall_recommendation === 'pass' ? 'bg-green-50 text-green-700 border-green-200' :
              codeReport.overall_recommendation === 'needs_improvement' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {codeReport.overall_recommendation}
            </span>
            <span className="text-xs text-gray-500">{codeReport.recommendation_reason}</span>
          </div>

          {codeReport.strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Strengths</h3>
              <ul className="text-sm text-gray-600 mt-1 list-disc list-inside space-y-0.5">
                {codeReport.strengths.map((str, i) => <li key={i}>{str}</li>)}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Concerns</h3>
            <div className="space-y-2 mt-1">
              {codeReport.concerns.map((c, i) => (
                <div key={i} className="text-sm border rounded-lg p-2.5 bg-white">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium mr-2 ${
                    c.severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                    c.severity === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {c.severity}
                  </span>
                  <p className="text-gray-700 mt-1">{c.issue}</p>
                  <p className="text-gray-500 text-xs mt-1">→ {c.recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Security Assessment</h3>
            <p className="text-sm text-gray-600 mt-1">{codeReport.security_assessment}</p>
          </div>
        </div>
      )}

    </div>
  )
}