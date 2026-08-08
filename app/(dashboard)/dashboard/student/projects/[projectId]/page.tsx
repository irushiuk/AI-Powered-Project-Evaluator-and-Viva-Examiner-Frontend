import { ProjectDetailView } from '@/components/studentDashboard/ProjectDetailView'
import { serverProjectService } from '@/services/server/projectService'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const resolvedParams = await params

  const projectsData = await serverProjectService.getMyProjects().catch(() => ({ count: 0, results: [] }))
  const projectList = Array.isArray(projectsData) ? projectsData : (projectsData.results || [])
  const project = projectList.find((p) => p.id === resolvedParams.projectId) || null

  let submissionData = null
  if (project?.submission_status === 'submitted') {
    const rawSubmission = await serverProjectService.getSubmissionDetails(resolvedParams.projectId).catch(() => null)
    submissionData = rawSubmission ? {
  submitted_at: rawSubmission.submitted_at,
  github_repo_url: rawSubmission.github_repo_url ?? null,
  report_file_url: rawSubmission.report_file_url ?? null,
  code_submission_id: rawSubmission.latest_code_submission_id ?? null, // ← was code_submission_id
} : null
  }

  return <ProjectDetailView initialProject={project} initialSubmissionData={submissionData} />
}