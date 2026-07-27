import apiFetch from './apiClient'
import { CODE_ANALYSIS_API } from '@/constants/api.constant'

export interface CodeAnalysisReport {
  executive_summary: string
  strengths: string[]
  concerns: { severity: string; issue: string; recommendation: string }[]
  metrics_interpretation: string
  security_assessment: string
  maintainability_verdict: string
  overall_recommendation: string
  recommendation_reason: string
}

export interface CodeAnalysisStatus {
  id: string
  analysis_status: 'pending' | 'fetching' | 'scanning' | 'summarizing' | 'questioning' | 'completed' | 'failed'
  analysis_error: string | null
  language_detected: string | null
  build_system_detected: string | null
  build_command: string | null
  sonar_report_url: string | null
  quality_status: string | null
  quality_reason: string | null
  uploaded_at: string
  analyzed_at: string | null
  questions_generated_at: string | null
}

export const codeAnalysisService = {
  async getStatus(codeSubmissionId: string): Promise<CodeAnalysisStatus> {
    const res = await apiFetch(CODE_ANALYSIS_API.status(codeSubmissionId))
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to fetch code analysis status')
    }
    const data = await res.json()
    return data.data ?? data
  },

  async getReport(codeSubmissionId: string): Promise<CodeAnalysisReport> {
    const res = await apiFetch(CODE_ANALYSIS_API.codeAnalysisReport(codeSubmissionId))
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to fetch code analysis report')
    }
    const data = await res.json()
    return data.report ?? data
  },
}