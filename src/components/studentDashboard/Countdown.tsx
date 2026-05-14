'use client'

import { useEffect, useState } from 'react'
import { parseColomboDateTime } from '@/utils/datetime'

type CountdownProps = {
  targetDate: string
  targetTime: string
}

export function Countdown({ targetDate, targetTime }: CountdownProps) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    const calculateCountdown = () => {
      const target = parseColomboDateTime(targetDate, targetTime)
      const now = new Date().getTime()
      const diff = target - now

      if (Number.isNaN(target)) {
        setCountdown('Schedule unavailable')
        return
      }

      if (diff <= 0) {
        setCountdown('Session is starting soon!')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      setCountdown(`${days}d ${hours}h ${minutes}m remaining`)
    }

    calculateCountdown()
    const interval = setInterval(calculateCountdown, 60000)
    return () => clearInterval(interval)
  }, [targetDate, targetTime])

  return <span className="font-semibold text-primary">{countdown}</span>
}
