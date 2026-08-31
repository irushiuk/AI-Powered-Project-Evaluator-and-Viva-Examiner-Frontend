'use client'

import Link from 'next/link'
import { Loader2, Play, ScanFace } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaceRegistration } from '@/hooks/useFaceRegistration'

type JoinSessionGateProps = {
  sessionId: string
  label?: string
  className?: string
}

/**
 * The join button for a live session, gated on face registration.
 *
 * The viva is recorded as a single video of everyone present, so a student
 * with no reference photo cannot be attributed in the report. Rather than let
 * them join and be unidentifiable, the button is held back until they have
 * registered — with a link straight to where they can do it.
 *
 * If the status cannot be read at all the button stays enabled: a transient
 * API failure should not lock a student out of their own viva.
 */
export function JoinSessionGate({
  sessionId,
  label = 'Join Session',
  className = 'w-full bg-blue-600 hover:bg-blue-700 font-semibold',
}: JoinSessionGateProps) {
  const { loading, error, registered, isStudent } = useFaceRegistration()

  if (isStudent && loading) {
    return (
      <Button className={className} size="lg" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking face registration…
      </Button>
    )
  }

  if (isStudent && !error && !registered) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ScanFace className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900">
              Register your face before joining
            </p>
            <p className="text-sm text-amber-800">
              The viva is recorded as one video of everyone at once, so your
              answers are matched to you by face. Upload or capture your photo
              to unlock this session.
            </p>
          </div>
        </div>
        <Link href="/dashboard/profile" className="block">
          <Button className="w-full bg-amber-600 font-semibold hover:bg-amber-700">
            <ScanFace className="mr-2 h-4 w-4" />
            Register my face
          </Button>
        </Link>
        <Button className={className} size="lg" disabled>
          {label}
          <Play className="ml-2 h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Link href={`/dashboard/student/sessions/${sessionId}/live`} className="block w-full">
      <Button className={className} size="lg">
        {label}
        <Play className="ml-2 h-4 w-4" />
      </Button>
    </Link>
  )
}
