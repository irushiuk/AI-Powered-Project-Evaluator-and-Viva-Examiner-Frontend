'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Calendar, Clock, User, MapPin, Users, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type SessionFilter = 'all' | 'open' | 'enrolled'

type AvailableSession = {
  id: string
  projectTitle: string
  lecturer: string
  department: string
  date: string
  time: string
  description: string
  enrolled: boolean
}

const INITIAL_SESSIONS: AvailableSession[] = [
  {
    id: '101',
    projectTitle: 'AI-Powered Student Performance Tracker',
    lecturer: 'Dr. Kavisha Perera',
    department: 'Computer Engineering',
    date: '2026-05-18',
    time: '09:30 AM',
    description: 'Evaluation slot for intelligent analytics and student tracking projects.',
    enrolled: false,
  },
  {
    id: '102',
    projectTitle: 'Smart Waste Management System',
    lecturer: 'Prof. Nishan Fernando',
    department: 'Civil and Environmental Engineering',
    date: '2026-05-20',
    time: '11:00 AM',
    description: 'Created session for IoT and sustainability-focused project reviews.',
    enrolled: false,
  },
  {
    id: '103',
    projectTitle: 'Wireless Energy Monitoring Dashboard',
    lecturer: 'Dr. Heshani Silva',
    department: 'Electrical and Information Engineering',
    date: '2026-05-22',
    time: '02:00 PM',
    description: 'Created session for energy monitoring, networking, and data visualization projects.',
    enrolled: false,
  },
  {
    id: '104',
    projectTitle: 'Autonomous Marine Navigation Simulator',
    lecturer: 'Eng. Malika Jayasinghe',
    department: 'Marine Engineering and Naval Architecture',
    date: '2026-05-24',
    time: '10:30 AM',
    description: 'Design review session for ship systems and marine automation projects.',
    enrolled: false,
  },
  {
    id: '105',
    projectTitle: 'Industrial Robot Arm Control Platform',
    lecturer: 'Dr. Sameera Wickramasinghe',
    department: 'Mechanical and Manufacturing Engineering',
    date: '2026-05-26',
    time: '01:30 PM',
    description: 'Project session focused on automation, CAD/CAM, and smart manufacturing.',
    enrolled: true,
  },
]

function getSessionBadge(session: AvailableSession) {
  if (session.enrolled) {
    return { label: 'Enrolled', variant: 'default' as const }
  }

  return { label: 'Open', variant: 'secondary' as const }
}

export function AllSessionsView() {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<SessionFilter>('all')
  const [pendingSession, setPendingSession] = useState<AvailableSession | null>(null)

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase()

    return sessions.filter((session) => {
      const matchesSearch =
        !term ||
        session.projectTitle.toLowerCase().includes(term) ||
        session.lecturer.toLowerCase().includes(term) ||
        session.description.toLowerCase().includes(term) ||
        session.department.toLowerCase().includes(term)

      const matchesFilter =
        filter === 'all' ||
        (filter === 'open' && !session.enrolled) ||
        (filter === 'enrolled' && session.enrolled)

      return matchesSearch && matchesFilter
    })
  }, [filter, search, sessions])

  const handleEnroll = (sessionId: string) => {
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId || session.enrolled) {
          return session
        }

        return {
          ...session,
          enrolled: true,
        }
      }),
    )
  }

  const handleEnrollClick = (session: AvailableSession) => {
    if (session.enrolled) {
      return
    }

    setPendingSession(session)
  }

  const confirmEnroll = () => {
    if (!pendingSession) {
      return
    }

    handleEnroll(pendingSession.id)
    setPendingSession(null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">All Sessions</h1>
        <p className="text-muted-foreground">
          Search created sessions, filter them, and enroll in the ones you want to attend.
        </p>
      </div>

      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr] lg:grid-cols-[2fr_0.9fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search sessions, lecturers, departments..."
                className="pl-9"
              />
            </div>

            <Select value={filter} onValueChange={(value) => setFilter(value as SessionFilter)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Filter sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="open">Open Sessions</SelectItem>
                <SelectItem value="enrolled">My Enrolled Sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No sessions match your search or filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSessions.map((session) => {
            const badge = getSessionBadge(session)

            return (
              <Card key={session.id} className="flex h-full flex-col border-border/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg leading-snug">{session.projectTitle}</CardTitle>
                      <CardDescription>{session.description}</CardDescription>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-5">
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{session.lecturer}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{session.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{session.time}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full cursor-pointer"
                      disabled={session.enrolled}
                      onClick={() => handleEnrollClick(session)}
                    >
                      {session.enrolled ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Enrolled
                        </span>
                      ) : (
                        'Enroll Now'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={Boolean(pendingSession)} onOpenChange={(open) => !open && setPendingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm enrollment</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSession
                ? `Do you want to enroll in "${pendingSession.projectTitle}" with ${pendingSession.lecturer}?`
                : 'Do you want to enroll in this session?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEnroll}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
