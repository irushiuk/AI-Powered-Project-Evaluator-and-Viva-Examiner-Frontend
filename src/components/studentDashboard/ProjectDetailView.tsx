'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
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

// ── Types ─────────────────────────────────────────────────────────────────
type SessionDetails = {
  session_id: string
  scheduled_start: string
  scheduled_end: string
  location_room: string
  status: 'scheduled' | 'in_progress' | 'completed'
}

type GroupInfo = {
  group_id: string
  group_name: string
  members: string[]
}

type ProjectDetail = {
  id: string
  project_name: string
  description: string | null
  is_group_project: boolean
  submission_deadline: string | null
  status: string
  academic_year: string | null
  submission_status: 'submitted' | 'not_submitted'
  session_details: SessionDetails | null
  group_info: GroupInfo | null
  submission?: {
    github_repo_url: string | null
    report_file_url: string | null
    submitted_at: string
  }
}

// ── Mock data ─────────────────────────────────────────────────────────────
const MOCK_PROJECTS: Record<string, ProjectDetail> = {
  '105': {
    id: '105',
    project_name: 'Industrial Robot Arm Control Platform',
    description:
      'Build a control interface for industrial robot arm operations with real-time feedback.',
    is_group_project: true,
    submission_deadline: null,
    status: 'active',
    academic_year: '2025/2026',
    submission_status: 'not_submitted',
    session_details: null,
    group_info: {
      group_id: 'g1',
      group_name: 'Team Alpha',
      members: ['John Doe', 'Jane Smith', 'You'],
    },
    submission: undefined,
  },
  '201': {
    id: '201',
    project_name: 'E-Commerce Platform',
    description:
      'Design and implement a full-stack e-commerce platform with payment integration.',
    is_group_project: false,
    submission_deadline: '2026-05-20T23:59:00Z',
    status: 'active',
    academic_year: '2025/2026',
    submission_status: 'submitted',
    session_details: {
      session_id: '3',
      scheduled_start: '2026-05-25T10:00:00Z',
      scheduled_end: '2026-05-25T10:30:00Z',
      location_room: 'Room 301',
      status: 'scheduled',
    },
    group_info: null,
    submission: {
      github_repo_url: 'https://github.com/username/ecommerce-platform',
      report_file_url: 'https://drive.google.com/some-report',
      submitted_at: '2026-05-15T14:30:00Z',
    },
  },
  '202': {
    id: '202',
    project_name: 'Machine Learning Model',
    description:
      'Train and evaluate a machine learning model for sentiment analysis.',
    is_group_project: false,
    submission_deadline: '2025-05-08T23:59:00Z',
    status: 'completed',
    academic_year: '2024/2025',
    submission_status: 'submitted',
    session_details: {
      session_id: '5',
      scheduled_start: '2025-05-10T11:00:00Z',
      scheduled_end: '2025-05-10T11:30:00Z',
      location_room: 'Room 201',
      status: 'completed',
    },
    group_info: null,
    submission: {
      github_repo_url: 'https://github.com/username/ml-model',
      report_file_url: 'https://drive.google.com/ml-report',
      submitted_at: '2025-05-07T09:15:00Z',
    },
  },
}

export function ProjectDetailView() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  // TODO: Replace with real API call
  const project = MOCK_PROJECTS[projectId]

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
              Project not found.
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
      {hasSubmitted && project.submission ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Submission Details
            </CardTitle>
            <CardDescription>
              Submitted on{' '}
              {new Date(project.submission.submitted_at).toLocaleDateString(
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
            {project.submission.github_repo_url && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  GitHub Repository
                </p>
                <a
                  href={project.submission.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 text-primary hover:underline"
                >
                  <Github className="h-4 w-4" />
                  {project.submission.github_repo_url}
                </a>
              </div>
            )}
            {project.submission.report_file_url && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Project Report
                </p>
                <a
                  href={project.submission.report_file_url}
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
            <SubmissionForm />
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
