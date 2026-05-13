import { ProjectDetailView } from '@/components/studentDashboard/ProjectDetailView'
import { serverProjectService } from '@/services/server/projectService'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const resolvedParams = await params
  
  // Fetch data server-side
  const allProjects = await serverProjectService.getMyProjects().catch(() => [])
  const project = allProjects.find((p) => p.id === resolvedParams.projectId) || null
  
  let submissionData = null
  if (project?.submission_status === 'submitted') {
    submissionData = await serverProjectService.getSubmissionDetails(resolvedParams.projectId).catch(() => null)
  }

  return <ProjectDetailView initialProject={project} initialSubmissionData={submissionData} />
}
