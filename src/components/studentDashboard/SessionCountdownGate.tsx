'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SessionCountdownGateProps = {
  sessionId: string
  /** Raw ISO scheduled start (UTC-aware) */
  startsAt?: string
  /** Server ISO timestamp at render time */
  serverTime?: string
}

export function SessionCountdownGate({ sessionId, startsAt, serverTime }: SessionCountdownGateProps) {
  const [mounted, setMounted] = useState(false)
  const target = startsAt ? new Date(startsAt).getTime() : Number.NaN

  // Calculate clock skew (client time vs server time)
  const [clockSkew] = useState(() => {
    const serverTimeMs = serverTime ? new Date(serverTime).getTime() : Date.now()
    return Date.now() - serverTimeMs
  })

  // Initialize now to the synchronized server clock time
  const [now, setNow] = useState(() => Date.now() - clockSkew)

  useEffect(() => {
    setMounted(true)
    const id = setInterval(() => {
      setNow(Date.now() - clockSkew)
    }, 1000)
    return () => clearInterval(id)
  }, [clockSkew])

  // Prevent hydration mismatches
  if (!mounted || Number.isNaN(target)) {
    return <p className="text-sm text-muted-foreground">Calculating schedule...</p>
  }

  const diff = target - now

  if (diff > 0) {
    const days = Math.floor(diff / 86_400_000)
    const hours = Math.floor((diff % 86_400_000) / 3_600_000)
    const minutes = Math.floor((diff % 3_600_000) / 60_000)
    const seconds = Math.floor((diff % 60_000) / 1000)

    return (
      <div className="space-y-2">
        <p className="text-lg font-semibold text-primary">
          {days}d {hours}h {minutes}m {seconds}s remaining
        </p>
        <p className="text-sm text-muted-foreground">
          Session not started yet. You can join once the scheduled time arrives.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground animate-pulse text-green-500 font-medium">
        Your scheduled time has arrived. Join the room to start your demo or viva.
      </p>
      <Link href={`/dashboard/student/sessions/${sessionId}/live`} className="block w-full">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 font-semibold" size="lg">
          Join Session
          <Play className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
