'use client'

import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Bell,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  LogOut,
  Settings,
  User,
  MoreVertical,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/context/AuthContext'

export function DashboardNavbar() {
  const [profileOpen, setProfileOpen] = useState(false)
  const pathname = usePathname()
  const { logout, user } = useAuthContext()

  const showStudentNavLinks = pathname.startsWith('/dashboard/student')
  const showTeacherNavLinks = pathname.startsWith('/dashboard/teacher')

  const navLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
    return `rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto max-w-full px-4 sm:px-5 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold transition hover:opacity-80"
          >
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>VivaSense</span>
          </Link>

          {showStudentNavLinks && (
            <nav className="hidden items-center gap-2 md:flex">
              <Link
                href="/dashboard/student/projects/explore"
                className={navLinkClass('/dashboard/student/projects/explore', true)}
              >
                All Projects
              </Link>
              <Link
                href="/dashboard/student/projects"
                className={navLinkClass('/dashboard/student/projects', true)}
              >
                My Projects
              </Link>
              <Link
                href="/dashboard/student/sessions"
                className={navLinkClass('/dashboard/student/sessions', true)}
              >
                My Sessions
              </Link>
            </nav>
          )}

          {showTeacherNavLinks && (
            <nav className="hidden items-center gap-2 md:flex">
              <Link
                href="/dashboard/teacher"
                className={navLinkClass('/dashboard/teacher', true)}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/teacher/projects"
                className={navLinkClass('/dashboard/teacher/projects')}
              >
                Projects
              </Link>
              <Link
                href="/dashboard/teacher/submissions"
                className={navLinkClass('/dashboard/teacher/submissions', true)}
              >
                Submissions
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  size="icon"
                  className="relative rounded-full bg-transparent text-gray-700 shadow-none hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100"
                  aria-label="Open notifications"
                >
                  <Bell className="h-7 w-7" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className="z-50 mt-2 w-80 rounded-md border border-border bg-white p-2 text-gray-900 shadow-lg"
                >
                  <div className="px-2 py-1.5 text-sm font-semibold">Notifications</div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <div className="px-2 py-4 text-center text-sm text-gray-500">
                    No New Notifications
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {user && (
              <div className="hidden flex-col items-end text-right md:flex select-none mr-1">
                <span className="text-sm font-semibold text-gray-900 leading-tight">
                  {user.full_name || 'User'}
                </span>
                <span className="text-xs text-gray-500 font-normal leading-normal">
                  {user.email}
                </span>
              </div>
            )}

            <DropdownMenu.Root open={profileOpen} onOpenChange={setProfileOpen}>
              <DropdownMenu.Trigger asChild>
                <Button
                  size="sm"
                  className="gap-2 rounded-full bg-transparent pr-2 text-gray-700 shadow-none hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100"
                  aria-label="Open profile menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </span>
                  {profileOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className="z-50 mt-2 w-56 rounded-md border border-border bg-white p-1 text-gray-900 shadow-lg"
                >
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/dashboard/profile"
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                    >
                      <Settings className="h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-destructive outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                    onSelect={() => logout()}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Mobile Menu (hidden on medium screens and up, positioned on the far-right end) */}
            <div className="flex md:hidden">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button
                    size="icon"
                    className="rounded-full bg-transparent text-gray-700 shadow-none hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    className="z-50 mt-2 w-56 rounded-md border border-border bg-white p-1 text-gray-900 shadow-lg"
                  >
                    {showStudentNavLinks && (
                      <>
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/dashboard/student/projects/explore"
                            className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                          >
                            All Projects
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/dashboard/student/projects"
                            className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                          >
                            My Projects
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/dashboard/student/sessions"
                            className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                          >
                            My Sessions
                          </Link>
                        </DropdownMenu.Item>
                      </>
                    )}

                    {showTeacherNavLinks && (
                      <>
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/dashboard/teacher"
                            className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                          >
                            Dashboard
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/dashboard/teacher/projects"
                            className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                          >
                            Projects
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/dashboard/teacher/submissions"
                            className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                          >
                            Submissions
                          </Link>
                        </DropdownMenu.Item>
                      </>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}