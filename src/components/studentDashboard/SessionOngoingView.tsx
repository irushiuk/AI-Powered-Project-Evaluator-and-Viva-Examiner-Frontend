import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RubricCard } from './RubricCard'
import type { RubricCategory } from './sessionTypes'

type SessionOngoingViewProps = {
  rubrics?: RubricCategory[]
}

export function SessionOngoingView({ rubrics }: SessionOngoingViewProps) {
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
          <Button className="w-full" size="lg">
            Join Viva Session
            <Play className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You&apos;ll be connected to the live evaluation room
          </p>
        </CardContent>
      </Card>

      {/* Evaluation Rubric */}
      {rubrics && rubrics.length > 0 && (
        <RubricCard rubrics={rubrics} />
      )}
    </div>
  )
}
