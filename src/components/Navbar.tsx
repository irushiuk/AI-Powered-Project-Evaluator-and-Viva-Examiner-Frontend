'use client'

import Link from 'next/link'
import { useState } from 'react'
import { GraduationCap, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const primaryLinks = [
    { href: '/', label: 'Home' },
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#contact', label: 'Contact' },
  ]

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
          <Link href="/login" className=" rounded-lg hover:bg-blue-400 px-3 py-2 text-muted-foreground transition-colors hover:text-foreground">
            Login
          </Link>
          <Button asChild>
            <Link className="rounded-lg bg-blue-700 hover:bg-blue-400  text-sm lg:text-[16px] text-white" href="/signup">Sign Up</Link>
          </Button>
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
            <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">
              Login
            </Link>
            <Button asChild className="w-full">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}