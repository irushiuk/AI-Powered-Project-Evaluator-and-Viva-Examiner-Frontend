const DISPLAY_TIME_ZONE = 'Asia/Colombo'
const DISPLAY_LOCALE = 'en-US'

function formatWithOptions(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    ...options,
  }).format(new Date(value))
}

export function formatColomboDate(value: string) {
  return formatWithOptions(value, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatColomboFullDate(value: string) {
  return formatWithOptions(value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatColomboTime(value: string) {
  return formatWithOptions(value, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatColomboDateTime(value: string) {
  return formatWithOptions(value, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getColomboTimezoneLabel() {
  return 'Asia/Colombo (Sri Lanka Time)'
}

export function parseColomboDateTime(targetDate: string, targetTime: string) {
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

  // Interpret the supplied date/time as Asia/Colombo local time.
  // Sri Lanka is UTC+05:30 and does not observe DST.
  const colomboOffsetMinutes = 5 * 60 + 30
  return Date.UTC(year, month - 1, day, hours, minutes) - colomboOffsetMinutes * 60 * 1000
}