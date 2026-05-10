import { Calendar, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Countdown } from './Countdown'
import { SubmissionForm } from './SubmissionForm'
import type { StudentSession } from './sessionTypes'

type SessionUpcomingViewProps = {
  session: StudentSession
}

export function SessionUpcomingView({ session }: SessionUpcomingViewProps) {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Session Countdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            <Countdown targetDate={session.date} targetTime={session.time} />
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Session not started yet. Check back closer to the scheduled time.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Submit Your Work Now
          </CardTitle>
          <CardDescription>Prepare your submission before the session starts</CardDescription>
        </CardHeader>
        <CardContent>
          <SubmissionForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preparation Checklist</CardTitle>
          <CardDescription>Make sure you're ready before the session starts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Requirements:</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Stable internet connection</li>
              <li>Updated code pushed to GitHub</li>
              <li>Project documentation ready</li>
              <li>Webcam and microphone enabled</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
