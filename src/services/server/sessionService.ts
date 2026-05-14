import { CODE_ANALYSIS_API, PROJECT_API, SESSION_API, VIVA_API } from '@/constants/api.constant'
import type { NextSession, SessionStatusFilter, StudentSessionSummary } from '@/types/session'
import type { RubricCategory } from '@/components/studentDashboard/sessionTypes'
import type { SessionResults } from '@/components/studentDashboard/sessionTypes'
import { serverFetch } from '../serverApi'

export type SessionDetail = {
  session_id: string
  project_id: string
  project_name: string
  scheduled_start: string
  scheduled_end: string
  location_room: string | null
  status: 'scheduled' | 'in_progress' | 'completed'
  demo_completed_at?: string | null
  group_name?: string | null
  submission_id?: string | null
  latest_code_submission_id?: string | null
  latest_code_analysis_status?: string | null
  group_members?: Array<{
    full_name: string
    registration_number: string
  }>
  rubrics?: RubricCategory[]
}

type SubmissionDetail = {
  report_file_url: string
  github_repo_url: string
  latest_code_submission_id: string | null
}

type VivaSessionReport = {
  overall_score: number
  per_criterion_scores: Record<string, number>
  xai_report: {
    overall_summary?: string
    strengths?: string
    gaps?: string
    examiner_recommendation?: string
  }
}

type SonarSummary = {
  sonar_metrics?: {
    bugs?: number
    vulnerabilities?: number
    code_smells?: number
    duplicated_lines_density?: number | string
    maintainability_rating?: string | number
  }
  sonar_dashboard?: {
    maintainability?: { rating?: string }
  }
}

function scoreToGrade(score: number) {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function formatDuplication(value: unknown) {
  if (typeof value === 'number') return `${value}%`
  if (typeof value === 'string') return value.includes('%') ? value : `${value}%`
  return '0%'
}

function mapMaintainability(value: unknown) {
  if (typeof value === 'string' && value) return value.toUpperCase()
  if (typeof value === 'number') {
    if (value <= 1) return 'A'
    if (value <= 2) return 'B'
    if (value <= 3) return 'C'
    if (value <= 4) return 'D'
    return 'E'
  }
  return 'C'
}

function buildAiEvaluation(report: VivaSessionReport): SessionResults['aiEvaluation'] {
  return Object.entries(report.per_criterion_scores || {}).map(([criteria, score]) => ({
    criteria,
    score: Number(score) || 0,
    explanation: `This criterion was scored ${Number(score) || 0}/10 in the final viva report.`,
  }))
}

export const serverSessionService = {
  async getNextSession(): Promise<NextSession | null> {
    const res = await serverFetch(SESSION_API.next, {
      method: 'GET',
    })

    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error('Failed to fetch next session')
    }

    const data = await res.json()
    return data.data ?? data
  },

  async getMySessions(status: SessionStatusFilter): Promise<StudentSessionSummary[]> {
    const res = await serverFetch(SESSION_API.myStatus(status), {
      method: 'GET',
    })

    if (!res.ok) {
      throw new Error('Failed to fetch sessions')
    }

    const data = await res.json()
    return data.data ?? data
  },

  async getMySession(projectId: string): Promise<SessionDetail> {
    const res = await serverFetch(SESSION_API.mySession(projectId), {
      method: 'GET',
    })

    if (!res.ok) {
      throw new Error('Failed to fetch session')
    }

    const data = await res.json()
    return data.data ?? data
  },

  async getCompletedSessionResults(
    projectId: string,
    sessionId: string,
    submissionId?: string | null,
    latestCodeSubmissionId?: string | null,
  ): Promise<SessionResults | null> {
    const [submissionRes, reportRes] = await Promise.all([
      serverFetch(PROJECT_API.submission(projectId), { method: 'GET' }),
      serverFetch(VIVA_API.sessionReport(sessionId), { method: 'GET' }),
    ])

    if (!submissionRes.ok || !reportRes.ok) {
      return null
    }

    const submissionData = await submissionRes.json()
    const submissions = submissionData.data ?? submissionData
    const submission: SubmissionDetail | null = Array.isArray(submissions)
      ? (submissions.find((item: { id?: string }) => item.id === submissionId) ?? submissions[0] ?? null)
      : null
    if (!submission) return null

    const reportData = await reportRes.json()
    const report: VivaSessionReport = reportData.data ?? reportData

    let sonarSummary: SonarSummary | null = null
    const codeSubmissionId = latestCodeSubmissionId || submission.latest_code_submission_id
    if (codeSubmissionId) {
      const sonarRes = await serverFetch(CODE_ANALYSIS_API.sonarSummary(codeSubmissionId), {
        method: 'GET',
      })
      if (sonarRes.ok) {
        const sonarData = await sonarRes.json()
        sonarSummary = sonarData.data ?? sonarData
      }
    }

    const sonarMetrics = sonarSummary?.sonar_metrics ?? {}
    const dashboardMaintainability = sonarSummary?.sonar_dashboard?.maintainability?.rating

    return {
      score: report.overall_score ?? 0,
      grade: scoreToGrade(report.overall_score ?? 0),
      summary:
        report.xai_report?.overall_summary ||
        report.xai_report?.strengths ||
        'No final viva summary was returned.',
      submission: {
        repo: submission.github_repo_url || 'No GitHub repository provided',
        report: submission.report_file_url.split('/').pop() || 'Project Report',
        reportUrl: submission.report_file_url,
      },
      codeAnalysis: {
        bugs: Number(sonarMetrics.bugs ?? 0),
        vulnerabilities: Number(sonarMetrics.vulnerabilities ?? 0),
        smells: Number(sonarMetrics.code_smells ?? 0),
        duplication: formatDuplication(sonarMetrics.duplicated_lines_density),
        maintainability: mapMaintainability(dashboardMaintainability ?? sonarMetrics.maintainability_rating),
      },
      aiEvaluation: buildAiEvaluation(report),
      feedback:
        report.xai_report?.examiner_recommendation ||
        report.xai_report?.gaps ||
        report.xai_report?.strengths ||
        'No feedback was returned.',
    }
  },
}
