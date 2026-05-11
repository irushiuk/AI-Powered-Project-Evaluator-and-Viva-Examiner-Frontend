import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { RubricCategory } from './sessionTypes'

type RubricCardProps = {
  rubrics: RubricCategory[]
}

export function RubricCard({ rubrics }: RubricCardProps) {
  const totalMaxScore = rubrics.reduce(
    (sum, cat) =>
      sum + cat.criteria.reduce((cSum, cr) => cSum + cr.max_score, 0),
    0,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Evaluation Rubric
        </CardTitle>
        <CardDescription>
          You will be evaluated across {rubrics.length} categories — total{' '}
          {totalMaxScore} points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rubrics.map((category) => {
          const categoryMaxScore = category.criteria.reduce(
            (sum, cr) => sum + cr.max_score,
            0,
          )

          return (
            <div key={category.category_id} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-semibold">{category.category_name}</h4>
                  {category.description && (
                    <p className="text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {category.weight_percentage}% — {categoryMaxScore} pts
                </Badge>
              </div>

              {/* Criteria List */}
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                {category.criteria.map((criterion) => (
                  <div
                    key={criterion.criteria_id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {criterion.criteria_name}
                      </p>
                      {criterion.description && (
                        <p className="text-xs text-muted-foreground">
                          {criterion.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {criterion.max_score} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Weight Distribution Bar */}
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Weight Distribution
          </p>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {rubrics.map((category, idx) => {
              const colors = [
                'bg-primary',
                'bg-accent',
                'bg-blue-500',
                'bg-green-500',
                'bg-orange-500',
                'bg-purple-500',
              ]
              return (
                <div
                  key={category.category_id}
                  className={`${colors[idx % colors.length]} transition-all`}
                  style={{ width: `${category.weight_percentage}%` }}
                  title={`${category.category_name}: ${category.weight_percentage}%`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {rubrics.map((category, idx) => {
              const dotColors = [
                'bg-primary',
                'bg-accent',
                'bg-blue-500',
                'bg-green-500',
                'bg-orange-500',
                'bg-purple-500',
              ]
              return (
                <div
                  key={category.category_id}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${dotColors[idx % dotColors.length]}`}
                  />
                  {category.category_name} ({category.weight_percentage}%)
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
