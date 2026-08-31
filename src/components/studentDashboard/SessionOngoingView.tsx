import { Play, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinSessionGate } from './JoinSessionGate'
import { RubricCard } from './RubricCard'
import type { RubricCategory } from './sessionTypes'

type SessionOngoingViewProps = {
  sessionId: string
  rubrics?: RubricCategory[]
}

export function SessionOngoingView({ sessionId, rubrics }: SessionOngoingViewProps) {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Your Viva is Live
          </CardTitle>
          <CardDescription>Join the session when you are ready</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <JoinSessionGate
            sessionId={sessionId}
            label="Join Viva Session"
            className="w-full"
          />
          <p className="text-center text-xs text-muted-foreground">
            You&apos;ll be connected to the live evaluation room
          </p>
        </CardContent>
      </Card>

      {/* Evaluation Rubric */}
      {rubrics && rubrics.length > 0 && (
        <RubricCard rubrics={rubrics} />
      )}
      {(!rubrics || rubrics.length === 0) && (
        <Card className="border-dashed border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Evaluation Rubric
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The evaluation rubric is not yet available for this session.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
