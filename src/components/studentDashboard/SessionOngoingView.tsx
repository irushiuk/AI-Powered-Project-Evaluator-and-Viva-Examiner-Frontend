import { Github, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SubmissionForm } from './SubmissionForm'

export function SessionOngoingView() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Submit Your Work
            </CardTitle>
            <CardDescription>Provide your repository and project report</CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionForm />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Ready to Join?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" size="lg">
              Join Viva Session
              <Play className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You'll be connected to the live evaluation room
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
