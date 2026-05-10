'use client'

import { ArrowLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MOCK_SESSIONS } from '@/components/studentDashboard/mockSessions'
import { SessionCompletedView } from '@/components/studentDashboard/SessionCompletedView'
import { SessionHeaderCard } from '@/components/studentDashboard/SessionHeaderCard'
import { SessionOngoingView } from '@/components/studentDashboard/SessionOngoingView'
import { SessionUpcomingView } from '@/components/studentDashboard/SessionUpcomingView'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const session = MOCK_SESSIONS[sessionId]

  if (!session) {
    return (
      <div className="space-y-4">
        <Button className="cursor-pointer" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-8">
            <p className="text-muted-foreground">Session not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button className="cursor-pointer" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Sessions
      </Button>

      <SessionHeaderCard session={session} />

      <div className="mt-8">
        {session.status === 'upcoming' && <SessionUpcomingView session={session} />}
        {session.status === 'ongoing' && <SessionOngoingView />}
        {session.status === 'completed' && session.results && (
          <SessionCompletedView results={session.results} />
        )}
      </div>
    </div>
  )
}
