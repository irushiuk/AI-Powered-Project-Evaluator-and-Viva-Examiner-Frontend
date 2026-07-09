'use client'

import { useMemo, useState } from 'react'
import {
  Search,
  Calendar,
  User,
  Users,
  UserCircle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import { toast } from 'sonner'
import type { AvailableProject } from '@/types/project'
import { enrollInProjectAction } from '@/actions/projectActions'

function getDeadlineText(deadline: string | null) {
  if (!deadline) return 'No deadline'
  const d = new Date(deadline)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  const formatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (days < 0) return `Closed (${formatted})`
  if (days <= 7) return `${days}d left — ${formatted}`
  return formatted
}

type ProjectFilter = 'all' | 'open' | 'enrolled'

export function ExploreProjectsView({ initialProjects = [] }: { initialProjects?: AvailableProject[] }) {
  const [projects, setProjects] = useState<AvailableProject[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const [pendingProject, setPendingProject] =
    useState<AvailableProject | null>(null)
  const [groupNumber, setGroupNumber] = useState('')
  // Teammate emails for group projects — enrolling student lists their team
  // and the whole group is enrolled in one shot.
  const [memberEmails, setMemberEmails] = useState<string[]>([''])
  const [isEnrolling, setIsEnrolling] = useState(false)

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase()

    return projects.filter((p) => {
      const matchesSearch =
        !term ||
        p.project_name.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        (p.lead_examiner_name ?? '').toLowerCase().includes(term)

      const matchesFilter =
        filter === 'all' ||
        (filter === 'open' && !p.enrolled) ||
        (filter === 'enrolled' && p.enrolled)

      return matchesSearch && matchesFilter
    })
  }, [filter, search, projects])

  const handleEnrollClick = (project: AvailableProject) => {
    if (project.enrolled) return
    setPendingProject(project)
    setGroupNumber('')
    setMemberEmails([''])
  }

  const confirmEnroll = async () => {
    if (!pendingProject) return
    if (pendingProject.is_group_project && !groupNumber.trim()) return

    const cleanedEmails = memberEmails
      .map((e) => e.trim())
      .filter((e) => e.length > 0)

    setIsEnrolling(true)
    try {
      const result = await enrollInProjectAction(
        pendingProject.id,
        pendingProject.is_group_project ? groupNumber.trim() : undefined,
        pendingProject.is_group_project ? cleanedEmails : undefined
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('Successfully enrolled in project!')
      
      // Update local state to reflect enrollment
      setProjects((current) =>
        current.map((p) =>
          p.id === pendingProject.id ? { ...p, enrolled: true } : p,
        ),
      )
      setPendingProject(null)
      setGroupNumber('')
      setMemberEmails([''])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enroll')
    } finally {
      setIsEnrolling(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Explore Projects
        </h1>
        <p className="text-muted-foreground">
          Browse available projects, and enroll in the ones you want to work on.
        </p>
      </div>

      {/* Search & Filter */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr] lg:grid-cols-[2fr_0.9fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, examiners..."
                className="pl-9"
              />
            </div>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as ProjectFilter)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Filter projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="open">Open Projects</SelectItem>
                <SelectItem value="enrolled">My Enrolled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Project Cards */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No projects match your search or filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
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
                  {project.enrolled ? (
                    <Badge variant="default">Enrolled</Badge>
                  ) : (
                    <Badge variant="secondary">Open</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col justify-between gap-5">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{project.lead_examiner_name ?? 'TBA'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.is_group_project ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <UserCircle className="h-4 w-4" />
                    )}
                    <span>
                      {project.is_group_project
                        ? 'Group Project'
                        : 'Individual Project'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Deadline:{' '}
                      {getDeadlineText(project.submission_deadline)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full cursor-pointer"
                  disabled={project.enrolled}
                  onClick={() => handleEnrollClick(project)}
                >
                  {project.enrolled ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Enrolled
                    </span>
                  ) : (
                    'Enroll Now'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enrollment Confirmation Dialog */}
      <AlertDialog
        open={Boolean(pendingProject)}
        onOpenChange={(open) => !open && setPendingProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Enrollment</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingProject ? (
                <>
                  Do you want to enroll in{' '}
                  <span className="font-semibold text-foreground">
                    &quot;{pendingProject.project_name}&quot;
                  </span>{' '}
                  with {pendingProject.lead_examiner_name}?
                </>
              ) : (
                'Do you want to enroll in this project?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Group number input for group projects */}
          {pendingProject?.is_group_project && (
            <div className="space-y-2 py-2">
              <Label htmlFor="group-number">Group Number</Label>
              <Input
                id="group-number"
                placeholder="e.g. Group A, Team 1"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter your group name/number.
              </p>

              <Label className="pt-2">Teammates&apos; emails</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Add your group members&apos; university emails — they&apos;ll be
                enrolled automatically. Don&apos;t include your own.
              </p>
              {memberEmails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="teammate@university.edu"
                    value={email}
                    onChange={(e) => {
                      const next = [...memberEmails]
                      next[idx] = e.target.value
                      setMemberEmails(next)
                    }}
                  />
                  {memberEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMemberEmails(memberEmails.filter((_, i) => i !== idx))
                      }
                      className="shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
                      aria-label="Remove teammate"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMemberEmails([...memberEmails, ''])}
                className="text-sm text-primary hover:underline"
              >
                + Add another teammate
              </button>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEnroll}
              disabled={
                isEnrolling || (pendingProject?.is_group_project && !groupNumber.trim())
              }
            >
              {isEnrolling ? 'Enrolling...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
