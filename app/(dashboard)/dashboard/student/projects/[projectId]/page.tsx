import { ProjectDetailView } from '@/components/studentDashboard/ProjectDetailView'
import { serverProjectService } from '@/services/server/projectService'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const resolvedParams = await params
  
  // Fetch data server-side
  const projectsData = await serverProjectService.getMyProjects().catch(() => ({ count: 0, results: [] }))
  const projectList = Array.isArray(projectsData) ? projectsData : (projectsData.results || [])
  const project = projectList.find((p) => p.id === resolvedParams.projectId) || null
  
  let submissionData = null
  if (project?.submission_status === 'submitted') {
    submissionData = await serverProjectService.getSubmissionDetails(resolvedParams.projectId).catch(() => null)
  }

  return <ProjectDetailView initialProject={project} initialSubmissionData={submissionData} />
}
