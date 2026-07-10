import { MyProjectsView } from '@/components/studentDashboard/MyProjectsView'
import { serverProjectService } from '@/services/server/projectService'

export default async function MyProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }> | { page?: string }
}) {
  const resolvedParams = await searchParams
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1
  const initialData = await serverProjectService.getMyProjects({ page }).catch(() => ({ count: 0, results: [] }))

  return <MyProjectsView initialData={initialData} currentPage={page} />
}
