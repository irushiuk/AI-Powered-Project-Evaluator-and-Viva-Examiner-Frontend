'use client'

import { useEffect, useState } from 'react'

type CountdownProps = {
  targetDate: string
  targetTime: string
}

function getSessionTime(targetDate: string, targetTime: string) {
  const [year, month, day] = targetDate.split('-').map(Number)
  const match = targetTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)

  if (!year || !month || !day || !match) {
    return Number.NaN
  }

  const [, hourValue, minuteValue, periodValue] = match
  const period = periodValue.toUpperCase()
  let hours = Number(hourValue)
  const minutes = Number(minuteValue)

  if (period === 'PM' && hours !== 12) {
    hours += 12
  }

  if (period === 'AM' && hours === 12) {
    hours = 0
  }

  return new Date(year, month - 1, day, hours, minutes).getTime()
}

export function Countdown({ targetDate, targetTime }: CountdownProps) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    const calculateCountdown = () => {
      const target = getSessionTime(targetDate, targetTime)
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
