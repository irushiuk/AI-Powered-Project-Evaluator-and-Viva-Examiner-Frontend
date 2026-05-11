'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Calendar, User, ArrowRight, Clock, AlertCircle } from 'lucide-react'

// Mock data
const MOCK_SESSIONS = [
  {
    id: '1',
    projectTitle: 'AI-Powered Chat Application',
    lecturer: 'Dr. Sarah Johnson',
    date: '2026-05-15',
    time: '2:00 PM',
    status: 'upcoming' as const,
    description: 'Final evaluation for your chat application project'
  },
  {
    id: '2',
    projectTitle: 'Real-time Collaboration Tool',
    lecturer: 'Prof. Mike Chen',
    date: '2025-05-10',
    time: '10:00 AM',
    status: 'ongoing' as const,
    description: 'Live code review and discussion'
  },
  {
    id: '3',
    projectTitle: 'E-Commerce Platform',
    lecturer: 'Dr. Emily Davis',
    date: '2025-05-05',
    time: '3:30 PM',
    status: 'completed' as const,
    description: 'Project evaluation completed'
  },
  {
    id: '4',
    projectTitle: 'Data Analytics Dashboard',
    lecturer: 'Prof. Robert Wilson',
    date: '2026-05-20',
    time: '1:00 PM',
    status: 'upcoming' as const,
    description: 'Evaluation session for analytics project'
  },
  {
    id: '5',
    projectTitle: 'Machine Learning Model',
    lecturer: 'Dr. Lisa Park',
    date: '2025-05-08',
    time: '11:30 AM',
    status: 'ongoing' as const,
    description: 'Deep learning project evaluation'
  },
  {
    id: '6',
    projectTitle: 'Mobile App Development',
    lecturer: 'Dr. James Thompson',
    date: '2025-04-28',
    time: '4:00 PM',
    status: 'completed' as const,
    description: 'Mobile application project review'
  }
]

type SessionStatus = 'upcoming' | 'ongoing' | 'completed'

interface Session {
  id: string
  projectTitle: string
  lecturer: string
  date: string
  time: string
  status: SessionStatus
  description: string
}

function SessionCard({ session }: { session: Session }) {
  type StatusConfig = {
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
    label: string
    icon: string
  }

  const getStatusConfig = (status: SessionStatus): StatusConfig => {
    switch (status) {
      case 'upcoming':
        return { variant: 'outline', label: 'Prepare Submission', icon: '📋' }
      case 'ongoing':
        return { variant: 'default', label: 'Submit Now', icon: '🔴' }
      case 'completed':
        return { variant: 'secondary', label: 'View Results', icon: '✓' }
      default:
        return { variant: 'outline', label: status, icon: '' }
    }
  }

  const getActionButton = (status: SessionStatus, id: string) => {
    switch (status) {
      case 'upcoming':
        return (
          <Link href={`/dashboard/student/sessions/${id}`}>
            <Button className="w-full cursor-pointer" variant="default">
              Prepare & Submit
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )
      case 'ongoing':
        return (
          <Link href={`/dashboard/student/sessions/${id}`}>
            <Button className="w-full cursor-pointer" variant="default">
              Submit Project
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )
      case 'completed':
        return (
          <Link href={`/dashboard/student/sessions/${id}`}>
            <Button className="w-full cursor-pointer" variant="default">
              View Results
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )
    }
  }

  const config = getStatusConfig(session.status)

  return (
    <Card className="flex h-full flex-col hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{session.projectTitle}</CardTitle>
            <CardDescription className="mt-1">{session.description}</CardDescription>
          </div>
          <Badge variant={config.variant} className="ml-2">
            {config.icon} {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-muted-foreground">
            <User className="w-4 h-4 mr-2" />
            {session.lecturer}
          </div>
          <div className="flex items-center text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {session.time}
          </div>
        </div>
        <div className="mt-auto pt-2">
          {getActionButton(session.status, session.id)}
        </div>
      </CardContent>
    </Card>
  )
}

function SessionSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div className="flex-1">
            <Skeleton className="h-6 w-2/3 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

export default function SessionsPage() {
  const [activeTab, setActiveTab] = useState<SessionStatus>('upcoming')

  // Filter sessions by status
  const upcomingSessions = MOCK_SESSIONS.filter(s => s.status === 'upcoming')
  const ongoingSessions = MOCK_SESSIONS.filter(s => s.status === 'ongoing')
  const completedSessions = MOCK_SESSIONS.filter(s => s.status === 'completed')
  
  // Get the next upcoming session for "Top Session"
  const topSession = upcomingSessions[0]

  const renderSessionsGrid = (sessions: Session[]) => {
    if (sessions.length === 0) {
      return (
        <Card>
          <CardContent className="pt-8">
            <div className="text-center">
              <p className="text-muted-foreground">No sessions</p>
              <p className="text-sm text-muted-foreground mt-2">You don't have any {activeTab} sessions at the moment.</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
        <p className="text-muted-foreground mt-2">Your current project evaluation sessions and submission status</p>
      </div>

      {/* Top Session Alert */}
      {topSession && (
        <Link href={`/dashboard/student/sessions/${topSession.id}`}>
          <Card className="bg-linear-to-r from-primary/5 to-accent/5 border-primary/20 hover:border-primary/40 cursor-pointer transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Next Evaluation</h3>
                  </div>
                  <p className="text-2xl font-bold">{topSession.projectTitle}</p>
                  <p className="text-sm text-muted-foreground">with {topSession.lecturer}</p>
                </div>
                <Button variant="default" size="sm" className="cursor-pointer">
                  View & Prepare
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {new Date(topSession.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {topSession.time}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className='py-0'>

      </div>


      {/* All Sessions Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SessionStatus)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="upcoming"
            className="flex items-center gap-2 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!"
          >
            Upcoming ({upcomingSessions.length})
          </TabsTrigger>
          <TabsTrigger
            value="ongoing"
            className="flex items-center gap-2 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!"
          >
            Ongoing ({ongoingSessions.length})
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex items-center gap-2 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!"
          >
            Completed ({completedSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {renderSessionsGrid(upcomingSessions)}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4 mt-6">
          {renderSessionsGrid(ongoingSessions)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {renderSessionsGrid(completedSessions)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
