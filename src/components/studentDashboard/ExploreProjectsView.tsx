'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Search,
  Calendar,
  User,
  Users,
  UserCircle,
  ArrowRight,
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
import { Pagination } from '@/components/ui/pagination'

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

type ProjectFilter = 'all' | 'individual' | 'group'

type ExploreProjectsViewProps = {
  initialData: {
    count: number
    results: AvailableProject[]
  }
  currentPage: number
  initialFilter: ProjectFilter
  initialSearch: string
}

export function ExploreProjectsView({
  initialData,
  currentPage,
  initialFilter,
  initialSearch,
}: ExploreProjectsViewProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [projects, setProjects] = useState<AvailableProject[]>(initialData.results)
  const [totalCount, setTotalCount] = useState(initialData.count)
  
  const [searchVal, setSearchVal] = useState(initialSearch)
  const [filterVal, setFilterVal] = useState<ProjectFilter>(initialFilter)

  // Projects enrolled during this visit. The API drops them from the
  // available list on the next fetch, but until then the card stays on
  // screen as a shortcut into "My Projects".
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())

  const [pendingProject, setPendingProject] =
    useState<AvailableProject | null>(null)
  const [groupNumber, setGroupNumber] = useState('')
  // Teammate emails for group projects — enrolling student lists their team
  // and the whole group is enrolled in one shot.
  const [memberEmails, setMemberEmails] = useState<string[]>([''])
  const [isEnrolling, setIsEnrolling] = useState(false)

  // Sync state if props change (e.g. server-side results update)
  useEffect(() => {
    setProjects(initialData.results)
    setTotalCount(initialData.count)
  }, [initialData])

  // Debounced search router push
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      // Only navigate if search differs from URL state
      const params = new URLSearchParams(window.location.search)
      const currentSearch = params.get('search') || ''
      if (searchVal.trim() !== currentSearch) {
        if (searchVal.trim()) {
          params.set('search', searchVal.trim())
        } else {
          params.delete('search')
        }
        params.set('page', '1') // reset page
        router.push(`${pathname}?${params.toString()}`)
      }
    }, 400)

    return () => clearTimeout(delayDebounce)
  }, [searchVal])

  const handleFilterChange = (val: ProjectFilter) => {
    setFilterVal(val)
    const params = new URLSearchParams(window.location.search)
    if (val !== 'all') {
      params.set('type', val)
    } else {
      params.delete('type')
    }
    params.set('page', '1') // reset page
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleEnrollClick = (project: AvailableProject) => {
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

      toast.success('Enrolled! Open the project card to go to My Projects.')

      // Keep the card in place and flip it into an "enrolled" state so the
      // student can click straight through to it under My Projects.
      setEnrolledIds((current) => new Set(current).add(pendingProject.id))

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
     
      {/* Search & Filter */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="pt-0">
          <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr] lg:grid-cols-[2fr_0.9fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search projects, examiners..."
                className="pl-9"
              />
            </div>
            <Select
              value={filterVal}
              onValueChange={(v) => handleFilterChange(v as ProjectFilter)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Filter projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Project Cards */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No projects match your search or filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const isEnrolled = enrolledIds.has(project.id)
              const goToMyProject = () =>
                router.push(`/dashboard/student/projects/${project.id}`)

              return (
                <Card
                  key={project.id}
                  onClick={isEnrolled ? goToMyProject : undefined}
                  role={isEnrolled ? 'link' : undefined}
                  tabIndex={isEnrolled ? 0 : undefined}
                  onKeyDown={
                    isEnrolled
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            goToMyProject()
                          }
                        }
                      : undefined
                  }
                  className={`flex h-full flex-col border-border/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isEnrolled ? 'cursor-pointer border-primary/40 bg-primary/5' : ''
                  }`}
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
                      {isEnrolled ? (
                        <Badge variant="default" className="shrink-0">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Enrolled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {project.is_group_project ? 'Group' : 'Individual'}
                        </Badge>
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

                    {isEnrolled ? (
                      <Button
                        className="w-full cursor-pointer"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation()
                          goToMyProject()
                        }}
                      >
                        Go to My Projects
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        className="w-full cursor-pointer"
                        onClick={() => handleEnrollClick(project)}
                      >
                        Enroll Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / 9)}
            onPageChange={handlePageChange}
          />
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
