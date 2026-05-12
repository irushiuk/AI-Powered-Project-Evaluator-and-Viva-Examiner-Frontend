'use client'

import Link from 'next/link'
import {
  Calendar,
  Clock,
  Users,
  UserCircle,
  Upload,
  CheckCircle2,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import type { EnrolledProject } from '@/services/projectService'

function getSubmissionBadge(project: EnrolledProject) {
  if (project.submission_status === 'submitted') {
    return { label: 'Submitted', variant: 'default' as const }
  }
  return { label: 'Not Submitted', variant: 'secondary' as const }
}

function getDeadlineLabel(deadline: string | null) {
  if (!deadline) return 'No deadline'
  const d = new Date(deadline)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MyProjectsView({ initialProjects = [] }: { initialProjects?: EnrolledProject[] }) {
  const projects = initialProjects

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground">
            Projects you&apos;re enrolled in
          </p>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t enrolled in any projects yet.
            </p>
            <Link href="/dashboard/student/projects/explore">
              <Button className="mt-4" variant="default">
                Explore Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
        <p className="text-muted-foreground">
          Projects you&apos;re enrolled in — submit your work and track your
          progress.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const badge = getSubmissionBadge(project)

          return (
            <Card
              key={project.id}
              className="flex h-full flex-col border-border/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg leading-snug">
                      {project.project_name}
                    </CardTitle>
                    <CardDescription>
                      {project.description ?? 'No description provided.'}
                    </CardDescription>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col justify-between gap-5">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {project.is_group_project ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <UserCircle className="h-4 w-4" />
                    )}
                    <span>
                      {project.is_group_project
                        ? `Group: ${project.group_info?.group_name ?? 'Unknown'}`
                        : 'Individual Project'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Deadline: {getDeadlineLabel(project.submission_deadline)}
                    </span>
                  </div>
                  {project.session_details && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Viva:{' '}
                        {new Date(
                          project.session_details.scheduled_start,
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        — {project.session_details.status}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {project.submission_status === 'not_submitted' ? (
                    <Link
                      href={`/dashboard/student/projects/${project.id}`}
                    >
                      <Button className="w-full cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Work
                      </Button>
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/student/projects/${project.id}`}
                    >
                      <Button
                        className="w-full cursor-pointer"
                        variant="outline"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Submission
                      </Button>
                    </Link>
                  )}

                  {project.session_details && (
                    <Link
                      href={`/dashboard/student/sessions/${project.session_details.session_id}`}
                    >
                      <Button
                        className="w-full cursor-pointer"
                        variant="secondary"
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Go to Session
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
