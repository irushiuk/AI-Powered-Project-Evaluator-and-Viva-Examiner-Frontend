import { MySessionsView } from '@/components/studentDashboard/MySessionsView'
import { serverSessionService } from '@/services/server/sessionService'
import type { SessionStatusFilter } from '@/types/session'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams
  const activeTab = (resolvedParams.tab as SessionStatusFilter) || 'upcoming'

  const [nextSession, allSessionsData] = await Promise.all([
    serverSessionService.getNextSession().catch(() => null),
    serverSessionService.getAllMySessions().catch(() => ({ count: 0, results: [] })),
  ])

  return (
    <MySessionsView
      nextSession={nextSession}
      allSessionsData={allSessionsData}
      initialTab={activeTab}
    />
  )
}
