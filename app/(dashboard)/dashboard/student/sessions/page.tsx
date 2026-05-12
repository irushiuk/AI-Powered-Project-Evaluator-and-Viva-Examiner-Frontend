import { MySessionsView } from '@/components/studentDashboard/MySessionsView'
import { serverSessionService } from '@/services/server/sessionService'
import type { SessionStatusFilter, SessionsByStatus } from '@/types/session'

const statusFilters: SessionStatusFilter[] = ['upcoming', 'ongoing', 'completed']

export default async function SessionsPage() {
  const [nextSession, sessionGroups] = await Promise.all([
    serverSessionService.getNextSession().catch(() => null),
    Promise.all(
      statusFilters.map(async (status) => [
        status,
        await serverSessionService.getMySessions(status).catch(() => []),
      ] as const),
    ),
  ])

  const sessionsByStatus = Object.fromEntries(sessionGroups) as SessionsByStatus

  return <MySessionsView nextSession={nextSession} sessionsByStatus={sessionsByStatus} />
}
