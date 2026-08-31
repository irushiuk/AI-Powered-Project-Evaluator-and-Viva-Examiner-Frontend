'use client'

import React, { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Calendar, Clock, MapPin, Users, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination } from '@/components/ui/pagination'
import { formatColomboDate, formatColomboFullDate, formatColomboTime } from '@/utils/datetime'
import type { NextSession, SessionStatusFilter, StudentSessionSummary } from '@/types/session'

type MySessionsViewProps = {
  nextSession: NextSession | null
  allSessionsData: {
    count: number
    results: StudentSessionSummary[]
  }
  initialTab: SessionStatusFilter
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

function getFilterFromApiStatus(status: StudentSessionSummary['status'], phase?: string): SessionStatusFilter {
  if (phase === 'completed') return 'completed'
  if (phase === 'ongoing' || phase === 'live' || phase === 'demo_in_progress' || phase === 'viva_in_progress') return 'ongoing'
  if (status === 'in_progress') return 'ongoing'
  if (status === 'completed') return 'completed'
  return 'upcoming'
}

function SessionCard({ session }: { session: StudentSessionSummary }) {
  const status = getFilterFromApiStatus(session.status, session.phase)
  const config = getStatusConfig(status)
  const start = formatDateTime(session.scheduled_start)

  const isLive = session.phase === 'live' || session.phase === 'demo_in_progress' || session.phase === 'viva_in_progress'
  const badgeLabel = isLive ? 'Live' : (session.phase === 'ongoing' ? 'Ongoing' : config.label)
  const badgeVariant = isLive ? 'default' : config.variant

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
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
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

export function MySessionsView({ nextSession, allSessionsData, initialTab }: MySessionsViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = React.useState<SessionStatusFilter>(initialTab)
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 9

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as SessionStatusFilter)
    setCurrentPage(1) // Reset to page 1 on tab change
    
    // Optionally update the URL without forcing a server trip (shallow)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Client-Side State Filtering
  const filteredSessions = React.useMemo(() => {
    return allSessionsData.results.filter(session => {
      const status = getFilterFromApiStatus(session.status, session.phase)
      return status === activeTab
    })
  }, [allSessionsData.results, activeTab])

  // Client-Side Pagination
  const paginatedSessions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSessions.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSessions, currentPage])

  const renderSessionsGrid = (sessions: StudentSessionSummary[]) => {
    if (sessions.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No sessions</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You do not have any {initialTab} sessions at the moment.
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
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage)

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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!"
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-70">
                ({allSessionsData.results.filter(s => getFilterFromApiStatus(s.status, s.phase) === tab.value).length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-4">
          <div className="transition-opacity duration-200 ease-in-out">
            {renderSessionsGrid(paginatedSessions)}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
