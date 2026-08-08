'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShieldCheck, ShieldAlert, ShieldX, Loader2,
  ChevronDown, ChevronUp, Download, AlertTriangle,
  CheckCircle2, Info, ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { codeAnalysisService, type CodeAnalysisReport, type CodeAnalysisStatus } from '@/services/codeAnalysisService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  codeSubmissionId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting to start...',
  fetching: 'Fetching repository...',
  scanning: 'Running SonarCloud analysis...',
  summarizing: 'Summarising code with AI...',
  questioning: 'Generating viva questions...',
  completed: 'Analysis complete',
  failed: 'Analysis failed',
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'text-red-600 bg-red-50 border-red-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  low: 'text-blue-600 bg-blue-50 border-blue-200',
}

const RECOMMENDATION_STYLES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pass: {
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
    label: 'Pass',
  },
  pass_with_concerns: {
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: <ShieldAlert className="w-5 h-5 text-amber-600" />,
    label: 'Pass with Concerns',
  },
  needs_improvement: {
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: <ShieldX className="w-5 h-5 text-red-600" />,
    label: 'Needs Improvement',
  },
}

function isTerminal(status: string) {
  return status === 'completed' || status === 'failed'
}

// ─── PDF Download ─────────────────────────────────────────────────────────────

function downloadReportAsPDF(report: CodeAnalysisReport, status: CodeAnalysisStatus) {
  const rec = RECOMMENDATION_STYLES[report.overall_recommendation] ?? RECOMMENDATION_STYLES.pass_with_concerns

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 24px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; color: #1e3a5f; }
    h2 { font-size: 16px; color: #1e3a5f; margin-top: 24px; margin-bottom: 6px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
    .badge { display:inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .pass { background:#d1fae5; color:#065f46; }
    .pass_with_concerns { background:#fef3c7; color:#92400e; }
    .needs_improvement { background:#fee2e2; color:#991b1b; }
    .concern { border-left: 3px solid #ef4444; padding: 8px 12px; margin-bottom: 8px; background: #fff5f5; }
    .concern.medium { border-color: #f59e0b; background:#fffbeb; }
    .concern.low { border-color: #3b82f6; background:#eff6ff; }
    .concern-title { font-weight: 600; font-size: 14px; }
    .concern-rec { color: #555; font-size: 13px; margin-top: 4px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
    p { margin: 6px 0; }
    .section { margin-bottom: 20px; }
    .footer { margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>Code Analysis Report</h1>
  <div class="meta">
    Language: <strong>${status.language_detected ?? 'Unknown'}</strong> &nbsp;|&nbsp;
    Generated: <strong>${status.analyzed_at ? new Date(status.analyzed_at).toLocaleString() : 'N/A'}</strong>
  </div>

  <div class="section">
    <span class="badge ${report.overall_recommendation}">${rec.label}</span>
    <p style="margin-top:8px; color:#555;">${report.recommendation_reason}</p>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <p>${report.executive_summary}</p>
  </div>

  <div class="section">
    <h2>Strengths</h2>
    <ul>${(report.strengths ?? []).map(s => `<li>${s}</li>`).join('')}</ul>
  </div>

  <div class="section">
    <h2>Concerns</h2>
    ${(report.concerns ?? []).map(c => `
      <div class="concern ${c.severity}">
        <div class="concern-title">[${c.severity.toUpperCase()}] ${c.issue}</div>
        <div class="concern-rec">↳ ${c.recommendation}</div>
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Metrics Interpretation</h2>
    <p>${report.metrics_interpretation}</p>
  </div>

  <div class="section">
    <h2>Security Assessment</h2>
    <p>${report.security_assessment}</p>
  </div>

  <div class="section">
    <h2>Maintainability</h2>
    <p>${report.maintainability_verdict}</p>
  </div>

  <div class="footer">Generated by AI-Powered Project Evaluator &amp; Viva Examiner</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => {
      win.print()
      URL.revokeObjectURL(url)
    }
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CodeAnalysisCard({ codeSubmissionId }: Props) {
  const [status, setStatus] = useState<CodeAnalysisStatus | null>(null)
  const [report, setReport] = useState<CodeAnalysisReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const s = await codeAnalysisService.getStatus(codeSubmissionId)
      setStatus(s)

      if (s.analysis_status === 'completed' && !report) {
        try {
          const r = await codeAnalysisService.getReport(codeSubmissionId)
          setReport(r)
        } catch {
          // report may not be ready yet — will retry on next poll
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis')
    } finally {
      setLoading(false)
    }
  }, [codeSubmissionId, report])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll every 10s until terminal
  useEffect(() => {
    if (!status || isTerminal(status.analysis_status)) return
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [status, fetchStatus])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading analysis...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-500">{error}</CardContent>
      </Card>
    )
  }

  if (!status) return null

  const isComplete = status.analysis_status === 'completed'
  const isFailed = status.analysis_status === 'failed'
  const rec = report ? (RECOMMENDATION_STYLES[report.overall_recommendation] ?? RECOMMENDATION_STYLES.pass_with_concerns) : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {isComplete && rec ? rec.icon : isFailed
                ? <ShieldX className="w-5 h-5 text-red-500" />
                : <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
              Code Analysis
            </CardTitle>
            <CardDescription className="mt-1">
              {STATUS_LABELS[status.analysis_status] ?? status.analysis_status}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {isComplete && report && (
              <>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${rec?.color}`}>
                  {rec?.label}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReportAsPDF(report, status)}
                  className="flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Report
                </Button>
              </>
            )}
            {status.sonar_report_url && (
              <a href={status.sonar_report_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  SonarCloud
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardHeader>

      {/* In-progress bar */}
      {!isTerminal(status.analysis_status) && (
        <CardContent>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
              style={{
                width: {
                  pending: '5%',
                  fetching: '20%',
                  scanning: '50%',
                  summarizing: '75%',
                  questioning: '90%',
                }[status.analysis_status] ?? '10%',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">This usually takes 2–4 minutes.</p>
        </CardContent>
      )}

      {/* Failed */}
      {isFailed && (
        <CardContent>
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{status.analysis_error ?? 'Analysis failed. Please try resubmitting your code.'}</span>
          </div>
        </CardContent>
      )}

      {/* Completed — Report */}
      {isComplete && report && (
        <CardContent className="space-y-4">

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
            {report.executive_summary}
          </div>

          {/* Recommendation reason */}
          <p className="text-sm text-muted-foreground">{report.recommendation_reason}</p>

          {/* Toggle details */}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? 'Hide details' : 'Show full report'}
          </button>

          {showDetails && (
            <div className="space-y-5 pt-1">

              {/* Strengths */}
              {report.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Strengths</p>
                  <ul className="space-y-1.5">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {report.concerns?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Concerns</p>
                  <div className="space-y-2">
                    {report.concerns.map((c, i) => (
                      <div key={i} className={`rounded-xl border p-3 text-sm ${SEVERITY_COLORS[c.severity] ?? SEVERITY_COLORS.low}`}>
                        <p className="font-semibold">{c.issue}</p>
                        <p className="mt-1 opacity-80">↳ {c.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Metrics</p>
                <p className="text-sm text-gray-700 leading-relaxed">{report.metrics_interpretation}</p>
              </div>

              {/* Security */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Security</p>
                <div className="flex items-start gap-2 text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  {report.security_assessment}
                </div>
              </div>

              {/* Maintainability */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Maintainability</p>
                <p className="text-sm text-gray-700 leading-relaxed">{report.maintainability_verdict}</p>
              </div>

            </div>
          )}
        </CardContent>
      )}

      {/* Completed but report not ready yet */}
      {isComplete && !report && (
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Report is being generated...
          </div>
        </CardContent>
      )}
    </Card>
  )
}