import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { serverSessionService } from '@/services/server/sessionService'
import { SessionCompletedView } from '@/components/studentDashboard/SessionCompletedView'
import { SessionHeaderCard } from '@/components/studentDashboard/SessionHeaderCard'
import { SessionOngoingView } from '@/components/studentDashboard/SessionOngoingView'
import { SessionUpcomingView } from '@/components/studentDashboard/SessionUpcomingView'
import type { StudentSession } from '@/components/studentDashboard/sessionTypes'
import type { SessionResults } from '@/components/studentDashboard/sessionTypes'

type PageProps = {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ projectId?: string }>
}

export default async function SessionDetailPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params
  const { projectId: projectIdParam } = await searchParams

  // The session API is project-scoped, so the caller normally passes the
  // project id along. Links that omit it (or a bookmarked/shared URL) still
  // resolve here by looking the session up in the student's own session list.
  let projectId = projectIdParam
  if (!projectId) {
    projectId = await serverSessionService
      .getAllMySessions()
      .then((data) => data.results.find((s) => s.session_id === sessionId)?.project_id)
      .catch(() => undefined)
  }

  if (!projectId) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/student/sessions">
          <Button className="cursor-pointer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-8">
            <p className="text-muted-foreground">
              This session could not be found in your sessions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  let session: StudentSession | null = null
  let results: SessionResults | null = null
  let resultsStatus: 'ready' | 'pending_approval' | 'unavailable' = 'unavailable'
  let error: string | null = null
  const serverTime = new Date().toISOString()

  try {
    const sessionData = await serverSessionService.getMySession(projectId)
    if (sessionData.status === 'completed') {
      const resultLoad = await serverSessionService
        .getCompletedSessionResults(
          projectId,
          sessionId,
          sessionData.submission_id,
          sessionData.latest_code_submission_id,
        )
        .catch(() => ({ status: 'unavailable' as const, results: null }))
      results = resultLoad.results
      resultsStatus = resultLoad.status
    }

    // Map backend response to frontend StudentSession type
    session = {
      id: sessionData.session_id,
      projectTitle: sessionData.project_name,
      lecturer: 'TBA',
      date: new Date(sessionData.scheduled_start).toISOString().split('T')[0],
      time: new Date(sessionData.scheduled_start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      startsAt: sessionData.scheduled_start,
      status:
        sessionData.status === 'scheduled'
          ? 'upcoming'
          : sessionData.status === 'in_progress'
            ? 'ongoing'
            : 'completed',
      description: 'Session evaluation',
      ...(sessionData.rubrics && { rubrics: sessionData.rubrics }),
      ...(results && { results }),
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch session'
  }

  if (error || !session) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/student/sessions">
          <Button className="cursor-pointer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-8">
            <p className="text-muted-foreground">{error || 'Session not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/student/sessions" className="mb-4 block">
        <Button className="cursor-pointer">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Button>
      </Link>

      <SessionHeaderCard session={session} />

      <div className="mt-8">
        {session.status === 'upcoming' && <SessionUpcomingView session={session} serverTime={serverTime} />}
        {session.status === 'ongoing' && <SessionOngoingView sessionId={sessionId} rubrics={session.rubrics} />}
        {session.status === 'completed' && session.results && <SessionCompletedView results={session.results} />}
        {session.status === 'completed' && !session.results && resultsStatus === 'pending_approval' && (
          <Card>
            <CardContent className="pt-8">
              <p className="font-medium text-amber-700">Waiting for examiner approval</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your session is complete. Your final score will appear here after the examiner approves it.
              </p>
            </CardContent>
          </Card>
        )}
        {session.status === 'completed' && !session.results && resultsStatus === 'unavailable' && (
          <Card>
            <CardContent className="pt-8">
              <p className="text-muted-foreground">
                The session is completed, but the final results could not be loaded.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
