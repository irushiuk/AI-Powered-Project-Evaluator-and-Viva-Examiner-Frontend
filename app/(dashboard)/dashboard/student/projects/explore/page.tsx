import { ExploreProjectsView } from '@/components/studentDashboard/ExploreProjectsView'
import { serverProjectService } from '@/services/server/projectService'

export default async function ExploreProjectsPage() {
  const initialProjects = await serverProjectService.getAvailableProjects().catch(() => [])

  return <ExploreProjectsView initialProjects={initialProjects} />
}
