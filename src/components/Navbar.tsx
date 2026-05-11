'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bell, ChevronDown, ChevronUp, GraduationCap, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/context/AuthContext'
import { getPostLoginRedirect } from '@/utils/routes'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { isAuthenticated, isLoading, user, logout } = useAuthContext()

  const primaryLinks = [
    { href: '/', label: 'Home' },
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#contact', label: 'Contact' },
  ]

  const dashboardHref = user ? getPostLoginRedirect(user.role) : '/dashboard'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4 md:grid md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700">
            <GraduationCap className="h-5 w-5 text-primary-foreground text-white" />
          </div>
          <span className="text-foreground text-[22px]">VivaSense</span>
        </Link>

        {/* Desktop Center Navigation */}
        <div className="hidden md:flex items-center justify-center gap-8">
          {primaryLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm lg:text-[16px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center justify-end gap-4 text-sm lg:text-[16px]">
          {!isLoading && isAuthenticated && user ? (
            <>
              {/* Notification Bell */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button
                    size="icon"
                    className="relative rounded-full bg-transparent text-gray-700 shadow-none hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100"
                    aria-label="Open notifications"
                  >
                    <Bell className="h-6 w-6" />
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

              {/* Profile Dropdown */}
              <DropdownMenu.Root open={profileOpen} onOpenChange={setProfileOpen}>
                <DropdownMenu.Trigger asChild>
                  <Button
                    size="sm"
                    className="gap-2 rounded-full bg-transparent pr-2 text-gray-700 shadow-none hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100"
                    aria-label="Open profile menu"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-white">
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
                        href={dashboardHref}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition hover:bg-gray-100 focus:bg-gray-100"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
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
            </>
          ) : !isLoading ? (
            <>
              <Link href="/login" className="rounded-lg hover:bg-blue-400 px-3 py-2 text-muted-foreground transition-colors hover:text-foreground">
                Login
              </Link>
              <Button asChild>
                <Link className="rounded-lg bg-blue-700 hover:bg-blue-400 text-sm lg:text-[16px] text-white" href="/signup">Sign Up</Link>
              </Button>
            </>
          ) : null}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 hover:bg-muted rounded-lg"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {primaryLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isLoading && isAuthenticated && user ? (
              <>
                <Link
                  href={dashboardHref}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => { setIsOpen(false); logout() }}
                  className="flex items-center gap-2 text-sm text-destructive hover:opacity-80"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : !isLoading ? (
              <>
                <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">
                  Login
                </Link>
                <Button asChild className="w-full">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </header>
  )
}