'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SessionCountdownGateProps = {
  sessionId: string
  /** Raw ISO scheduled start (UTC-aware). Time math is done directly off this. */
  startsAt?: string
}

/**
 * Shows a live countdown until the scheduled start, then swaps to a "Join
 * Session" button once the time arrives — the student enters the live room and
 * starts their demo/viva there (the session is button-driven, not clock-driven).
 *
 * Computes the target from the ISO timestamp directly (via Date.getTime), which
 * is timezone-correct regardless of where the server or client runs.
 */
export function SessionCountdownGate({ sessionId, startsAt }: SessionCountdownGateProps) {
  const target = startsAt ? new Date(startsAt).getTime() : Number.NaN
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (Number.isNaN(target)) {
    return <p className="text-sm text-muted-foreground">Schedule unavailable.</p>
  }

  const diff = target - now

  if (diff > 0) {
    const days = Math.floor(diff / 86_400_000)
    const hours = Math.floor((diff % 86_400_000) / 3_600_000)
    const minutes = Math.floor((diff % 3_600_000) / 60_000)

    return (
      <div className="space-y-2">
        <p className="text-lg font-semibold text-primary">
          {days}d {hours}h {minutes}m remaining
        </p>
        <p className="text-sm text-muted-foreground">
          Session not started yet. You can join once the scheduled time arrives.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Your scheduled time has arrived. Join the room to start your demo or viva.
      </p>
      <Link href={`/dashboard/student/sessions/${sessionId}/live`} className="block w-full">
        <Button className="w-full" size="lg">
          Join Session
          <Play className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
