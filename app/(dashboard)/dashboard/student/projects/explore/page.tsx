import { ExploreProjectsView } from '@/components/studentDashboard/ExploreProjectsView'
import { serverProjectService } from '@/services/server/projectService'

export default async function ExploreProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; search?: string }> | { page?: string; type?: string; search?: string }
}) {
  const resolvedParams = await searchParams
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1
  const type = resolvedParams.type || 'all'
  const search = resolvedParams.search || ''

  const initialData = await serverProjectService
    .getAvailableProjects({ page, type, search })
    .catch(() => ({ count: 0, results: [] }))

  return (
    <ExploreProjectsView
      initialData={initialData}
      currentPage={page}
      initialFilter={type as 'all' | 'individual' | 'group'}
      initialSearch={search}
    />
  )
}
