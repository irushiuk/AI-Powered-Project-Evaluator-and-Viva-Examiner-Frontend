import { Award, BarChart3, FileDown, FileText, Github } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SessionResults } from './sessionTypes'

type SessionCompletedViewProps = {
  results: SessionResults
}

const maintainabilityColors: Record<string, string> = {
  A: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  B: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  C: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  D: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  E: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

function getMaintainabilityColor(rating: string) {
  return maintainabilityColors[rating] || maintainabilityColors.C
}

export function SessionCompletedView({ results }: SessionCompletedViewProps) {
  const codeAnalysis = results.codeAnalysis

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="submission">Submission</TabsTrigger>
        <TabsTrigger value="analysis">Code Analysis</TabsTrigger>
        <TabsTrigger value="evaluation">AI Evaluation</TabsTrigger>
        <TabsTrigger value="report">Final Report</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Final Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{results.score}</div>
              <p className="mt-1 text-xs text-muted-foreground">out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Grade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent">{results.grade}</div>
              <p className="mt-1 text-xs text-muted-foreground">Overall assessment</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{results.summary}</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="submission" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Submission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">GitHub Repository</Label>
              <a
                href={results.submission.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-2 text-primary hover:underline"
              >
                <Github className="h-4 w-4" />
                {results.submission.repo}
              </a>
            </div>

            <div>
              <Label className="text-muted-foreground">Project Report</Label>
              <Button variant="outline" className="mt-2">
                <FileDown className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analysis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Code Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Bugs</Label>
                  <Badge variant="outline">{codeAnalysis.bugs}</Badge>
                </div>
                <Progress value={Math.max(0, 100 - codeAnalysis.bugs * 10)} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Vulnerabilities</Label>
                  <Badge variant={codeAnalysis.vulnerabilities === 0 ? 'default' : 'destructive'}>
                    {codeAnalysis.vulnerabilities}
                  </Badge>
                </div>
                <Progress value={100 - codeAnalysis.vulnerabilities * 20} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Code Smells</Label>
                  <Badge variant="outline">{codeAnalysis.smells}</Badge>
                </div>
                <Progress value={Math.max(0, 100 - codeAnalysis.smells * 5)} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Duplication</Label>
                  <Badge variant="outline">{codeAnalysis.duplication}</Badge>
                </div>
                <Progress value={Math.max(0, 100 - parseInt(codeAnalysis.duplication))} />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Maintainability Rating</Label>
                <Badge className={getMaintainabilityColor(codeAnalysis.maintainability)}>
                  {codeAnalysis.maintainability}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="evaluation" className="space-y-4">
        <div className="space-y-4">
          {results.aiEvaluation.map((item) => (
            <Card key={item.criteria}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{item.criteria}</CardTitle>
                  <Badge className="bg-primary">{item.score}/10</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={item.score * 10} />
                  <p className="text-sm text-muted-foreground">{item.explanation}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="report" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Final Evaluation Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                <div className="mb-1 text-3xl font-bold text-primary">{results.score}</div>
                <p className="text-xs text-muted-foreground">Final Score</p>
              </div>
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-center">
                <div className="mb-1 text-3xl font-bold text-accent">{results.grade}</div>
                <p className="text-xs text-muted-foreground">Grade</p>
              </div>
              <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4 text-center">
                <Award className="mx-auto mb-1 h-8 w-8 text-secondary" />
                <p className="text-xs text-muted-foreground">Evaluation Complete</p>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-semibold">Feedback</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{results.feedback}</p>
            </div>

            <Button className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              Download Full Report (PDF)
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
