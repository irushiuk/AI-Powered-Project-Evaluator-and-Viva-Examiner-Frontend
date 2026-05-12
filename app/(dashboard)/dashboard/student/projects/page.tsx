import { MyProjectsView } from '@/components/studentDashboard/MyProjectsView'
import { serverProjectService } from '@/services/server/projectService'

export default async function MyProjectsPage() {
  const initialProjects = await serverProjectService.getMyProjects().catch(() => [])

  return <MyProjectsView initialProjects={initialProjects} />
}
