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

export const codeAnalysisService = {
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