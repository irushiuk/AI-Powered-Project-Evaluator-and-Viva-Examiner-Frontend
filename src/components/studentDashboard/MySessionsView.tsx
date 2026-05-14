'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Calendar, Clock, MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatColomboDate, formatColomboFullDate, formatColomboTime } from '@/utils/datetime'
import type { NextSession, SessionStatusFilter, SessionsByStatus, StudentSessionSummary } from '@/types/session'

type MySessionsViewProps = {
  nextSession: NextSession | null
  sessionsByStatus: SessionsByStatus
}

const tabs: Array<{ value: SessionStatusFilter; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
]

function formatDateTime(value: string) {
  return {
    date: formatColomboDate(value),
    fullDate: formatColomboFullDate(value),
    time: formatColomboTime(value),
  }
}

function getStatusConfig(status: SessionStatusFilter) {
  switch (status) {
    case 'upcoming':
      return { variant: 'outline' as const, label: 'Scheduled', action: 'View & Prepare' }
    case 'ongoing':
      return { variant: 'default' as const, label: 'In Progress', action: 'Join Session' }
    case 'completed':
      return { variant: 'secondary' as const, label: 'Completed', action: 'View Results' }
  }
}

function getFilterFromApiStatus(status: StudentSessionSummary['status']): SessionStatusFilter {
  if (status === 'in_progress') return 'ongoing'
  if (status === 'completed') return 'completed'
  return 'upcoming'
}

function SessionCard({ session }: { session: StudentSessionSummary }) {
  const status = getFilterFromApiStatus(session.status)
  const config = getStatusConfig(status)
  const start = formatDateTime(session.scheduled_start)

  return (
    <Card className="flex h-full flex-col border-border/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg leading-snug">{session.project_name}</CardTitle>
            <CardDescription>
              {session.group_name ? `Group: ${session.group_name}` : 'Individual evaluation session'}
            </CardDescription>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-5">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {start.date} at {start.time}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              Ends at {formatDateTime(session.scheduled_end).time}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{session.location_room || 'Location TBA'}</span>
          </div>
          {session.group_name && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{session.group_name}</span>
            </div>
          )}
        </div>

        <Link href={`/dashboard/student/sessions/${session.session_id}?projectId=${session.project_id}`}>
          <Button className="w-full cursor-pointer" variant={status === 'completed' ? 'outline' : 'default'}>
            {config.action}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export function MySessionsView({ nextSession, sessionsByStatus }: MySessionsViewProps) {
  const [activeTab, setActiveTab] = useState<SessionStatusFilter>('upcoming')

  const renderSessionsGrid = (sessions: StudentSessionSummary[]) => {
    if (sessions.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No sessions</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You do not have any {activeTab} sessions at the moment.
            </p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard key={session.session_id} session={session} />
        ))}
      </div>
    )
  }

  const nextStart = nextSession ? formatDateTime(nextSession.scheduled_start) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
        <p className="mt-2 text-muted-foreground">
          Your current project evaluation sessions and viva status.
        </p>
      </div>

      {nextSession && nextStart && (
        <Link href={`/dashboard/student/sessions/${nextSession.session_id}?projectId=${nextSession.project_id}`}>
          <Card className="border-primary/20 bg-primary/5 transition hover:border-primary/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Next Evaluation</h3>
                  </div>
                  <p className="text-2xl font-bold">{nextSession.project_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {nextSession.group_name ? `Group: ${nextSession.group_name}` : 'Individual session'}
                  </p>
                </div>
                <Button size="sm" className="cursor-pointer">
                  View & Prepare
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {nextStart.fullDate}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {nextStart.time}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {nextSession.location_room || 'Location TBA'}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className='-mt-5'></div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SessionStatusFilter)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!"
            >
              {tab.label} ({sessionsByStatus[tab.value].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6 space-y-4">
            {renderSessionsGrid(sessionsByStatus[tab.value])}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
