'use client'

import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  UserCircle,
  Upload,
  CheckCircle2,
  Github,
  FileText,
  ArrowRight,
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
import { SubmissionForm } from './SubmissionForm'
import Link from 'next/link'
import type { EnrolledProject } from '@/types/project'

type SubmissionDetails = {
  submitted_at: string
  github_repo_url: string | null
  report_file_url: string | null
}

interface ProjectDetailViewProps {
  initialProject?: EnrolledProject | null
  initialSubmissionData?: SubmissionDetails | null
}

export function ProjectDetailView({ initialProject = null, initialSubmissionData = null }: ProjectDetailViewProps) {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const project = initialProject
  const submissionData = initialSubmissionData

  if (!project) {
    return (
      <div className="space-y-4">
        <Button className="cursor-pointer" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-8">
            <p className="text-center text-muted-foreground">
              Project not found or you are not enrolled.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasSubmitted = project.submission_status === 'submitted'

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button className="cursor-pointer" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Projects
      </Button>

      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">
                {project.project_name}
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                {project.description}
              </CardDescription>
            </div>
            {hasSubmitted ? (
              <Badge variant="default" className="text-sm">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Submitted
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-sm">
                Not Submitted
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              {project.is_group_project ? (
                <Users className="h-5 w-5 text-muted-foreground" />
              ) : (
                <UserCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-muted-foreground">
                  {project.is_group_project
                    ? 'Group Project'
                    : 'Individual Project'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Deadline</p>
                <p className="text-muted-foreground">
                  {project.submission_deadline
                    ? new Date(
                        project.submission_deadline,
                      ).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'No deadline'}
                </p>
              </div>
            </div>
            {project.academic_year && (
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Academic Year</p>
                  <p className="text-muted-foreground">
                    {project.academic_year}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Group Info */}
      {project.group_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {project.group_info.group_name}
            </CardTitle>
            <CardDescription>Your group members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {project.group_info.members.map((member) => (
                <Badge key={member} variant="outline">
                  {member}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Section */}
      {hasSubmitted && submissionData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Submission Details
            </CardTitle>
            <CardDescription>
              Submitted on{' '}
              {new Date(submissionData.submitted_at).toLocaleDateString(
                'en-US',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submissionData.github_repo_url && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  GitHub Repository
                </p>
                <a
                  href={submissionData.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 text-primary hover:underline"
                >
                  <Github className="h-4 w-4" />
                  {submissionData.github_repo_url}
                </a>
              </div>
            )}
            {submissionData.report_file_url && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Project Report
                </p>
                <a
                  href={submissionData.report_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View Report
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Submit Your Work
            </CardTitle>
            <CardDescription>
              Provide your GitHub repository and project report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionForm 
              projectId={projectId} 
              onSuccess={() => router.refresh()} 
            />
          </CardContent>
        </Card>
      )}

      {/* Session Link */}
      {project.session_details && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Viva Session Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium">Date & Time</p>
                <p className="text-muted-foreground">
                  {new Date(
                    project.session_details.scheduled_start,
                  ).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(
                    project.session_details.scheduled_start,
                  ).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-muted-foreground">
                  {project.session_details.location_room || 'TBA'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant="outline" className="capitalize">
                  {project.session_details.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <Link
              href={`/dashboard/student/sessions/${project.session_details.session_id}`}
            >
              <Button className="cursor-pointer">
                Go to Session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
