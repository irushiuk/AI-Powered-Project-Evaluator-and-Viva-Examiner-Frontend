import { MySessionsView } from '@/components/studentDashboard/MySessionsView'
import { serverSessionService } from '@/services/server/sessionService'
import type { SessionStatusFilter, SessionsByStatus } from '@/types/session'

const statusFilters: SessionStatusFilter[] = ['upcoming', 'ongoing', 'completed']

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams
  const activeTab = (resolvedParams.tab as SessionStatusFilter) || 'upcoming'
  const page = Number(resolvedParams.page) || 1

  const [nextSession, activeSessionsData] = await Promise.all([
    serverSessionService.getNextSession().catch(() => null),
    serverSessionService.getMySessions(activeTab, page).catch(() => ({ count: 0, results: [] })),
  ])

  return (
    <MySessionsView
      nextSession={nextSession}
      activeSessionsData={activeSessionsData}
      initialTab={activeTab}
      currentPage={page}
    />
  )
}
