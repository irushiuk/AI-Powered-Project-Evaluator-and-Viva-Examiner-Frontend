import { Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { StudentSession } from './sessionTypes'

type SessionHeaderCardProps = {
  session: StudentSession
}

function getStatusBadge(status: StudentSession['status']) {
  switch (status) {
    case 'upcoming':
      return <Badge variant="secondary">Upcoming</Badge>
    case 'ongoing':
      return <Badge>Ongoing</Badge>
    case 'completed':
      return <Badge variant="outline">Completed</Badge>
    default:
      return null
  }
}

export function SessionHeaderCard({ session }: SessionHeaderCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-3xl">{session.projectTitle}</CardTitle>
            <CardDescription className="mt-2">{session.description}</CardDescription>
          </div>
          {getStatusBadge(session.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Lecturer</p>
              <p className="text-muted-foreground">{session.lecturer}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Date & Time</p>
              <p className="text-muted-foreground">
                {new Date(session.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                at {session.time}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
