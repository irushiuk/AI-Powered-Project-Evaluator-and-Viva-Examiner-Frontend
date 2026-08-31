'use client'

import Link from 'next/link'
import { ArrowLeft, Loader2, ScanFace } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaceRegistration } from '@/hooks/useFaceRegistration'

/**
 * Holds a student out of the live viva room until they have a reference face
 * on file. The join buttons are already gated, but the room is reachable by
 * URL, so the check is repeated at the door.
 *
 * Only students are gated — examiners have their own room — and an unreadable
 * status lets the student through rather than stranding them mid-viva.
 */
export function LiveSessionFaceGuard({ children }: { children: React.ReactNode }) {
  const { loading, error, registered, isStudent } = useFaceRegistration()

  if (isStudent && loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking your face registration…
      </div>
    )
  }

  if (isStudent && !error && !registered) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md space-y-5 rounded-xl border border-amber-500/30 bg-slate-900 p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
            <ScanFace className="h-7 w-7 text-amber-400" />
          </span>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-100">
              Register your face to join
            </h1>
            <p className="text-sm leading-relaxed text-slate-400">
              This viva is recorded as a single video of everyone present, so
              your answers are matched to you by face. Upload or capture your
              photo, then come back to this session.
            </p>
          </div>
          <div className="space-y-2">
            <Link href="/dashboard/profile" className="block">
              <Button className="w-full bg-amber-600 font-semibold hover:bg-amber-700">
                <ScanFace className="mr-2 h-4 w-4" />
                Register my face
              </Button>
            </Link>
            <Link href="/dashboard/student/sessions" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Sessions
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
