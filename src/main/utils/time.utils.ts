import type { AppSettings } from '../../shared/types'

/**
 * Parse a HH:MM string into minutes since midnight.
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Returns true if the current time is within the active window defined in settings.
 * Supports overnight windows (e.g., 22:00 to 06:00).
 */
export function isWithinActiveWindow(settings: AppSettings): boolean {
  const { start, end } = settings.activeWindow
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const startMinutes = parseTimeToMinutes(start)
  const endMinutes = parseTimeToMinutes(end)

  if (startMinutes <= endMinutes) {
    // Normal window (e.g., 09:00 to 18:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  } else {
    // Overnight window (e.g., 22:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
}

/**
 * Returns the next time (as a Date) when the active window starts.
 */
export function getNextActiveWindowStart(settings: AppSettings): Date {
  const startMinutes = parseTimeToMinutes(settings.activeWindow.start)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const next = new Date(now)
  next.setSeconds(0, 0)

  if (currentMinutes < startMinutes) {
    next.setHours(Math.floor(startMinutes / 60), startMinutes % 60)
  } else {
    // Start window is tomorrow
    next.setDate(next.getDate() + 1)
    next.setHours(Math.floor(startMinutes / 60), startMinutes % 60)
  }

  return next
}
