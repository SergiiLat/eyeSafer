import { describe, it, expect, vi, afterEach } from 'vitest'
import { isWithinActiveWindow, getNextActiveWindowStart } from '../../src/main/utils/time.utils'
import type { AppSettings } from '../../src/shared/types'

// Minimal settings stub with just the fields time.utils needs
function makeSettings(start: string, end: string, weekendsEnabled = false): AppSettings {
  return {
    launchOnStartup: false,
    scheduleMode: 'normal',
    dndEnabled: false,
    dndUntil: null,
    enabledMethods: {
      cornerMarkers: true, blurOverlay: true, movingObject: true, colorShift: true,
      figureEight: false, nearFarFocus: false, peripheralTriggers: false, guidedBlink: false, saccadeTraining: false
    },
    intensity: 'medium',
    activeWindow: { start, end },
    weekendsEnabled,
    selectedCameraId: null,
    earThreshold: 0.25,
    consecutiveFrames: 1,
    lowBlinkThreshold: 12,
    lowBlinkAlertCooldownMs: 60000,
    autoCalibrate: true,
    earSmoothingFactor: 0.3,
    useBlendshapes: true,
    minBlinkDurationMs: 50,
    maxBlinkDurationMs: 500,
    windowPosition: null,
    windowSize: { width: 800, height: 600 }
  }
}

function mockTime(hour: number, minute: number) {
  const date = new Date(2024, 0, 15, hour, minute, 0, 0) // Monday Jan 15, 2024
  vi.setSystemTime(date)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('isWithinActiveWindow – normal windows', () => {
  it('returns true when current time is inside window', () => {
    vi.useFakeTimers()
    mockTime(10, 30)
    expect(isWithinActiveWindow(makeSettings('09:00', '18:00'))).toBe(true)
  })

  it('returns false before window starts', () => {
    vi.useFakeTimers()
    mockTime(8, 59)
    expect(isWithinActiveWindow(makeSettings('09:00', '18:00'))).toBe(false)
  })

  it('returns false after window ends', () => {
    vi.useFakeTimers()
    mockTime(18, 0)
    expect(isWithinActiveWindow(makeSettings('09:00', '18:00'))).toBe(false)
  })

  it('returns true exactly at window start', () => {
    vi.useFakeTimers()
    mockTime(9, 0)
    expect(isWithinActiveWindow(makeSettings('09:00', '18:00'))).toBe(true)
  })
})

describe('isWithinActiveWindow – overnight windows', () => {
  it('returns true when time is past midnight within overnight window', () => {
    vi.useFakeTimers()
    mockTime(2, 0)
    expect(isWithinActiveWindow(makeSettings('22:00', '06:00'))).toBe(true)
  })

  it('returns true when time is in the evening portion of overnight window', () => {
    vi.useFakeTimers()
    mockTime(23, 0)
    expect(isWithinActiveWindow(makeSettings('22:00', '06:00'))).toBe(true)
  })

  it('returns false when outside overnight window', () => {
    vi.useFakeTimers()
    mockTime(12, 0)
    expect(isWithinActiveWindow(makeSettings('22:00', '06:00'))).toBe(false)
  })
})

describe('getNextActiveWindowStart', () => {
  it('returns a future start time when window has not started yet today', () => {
    vi.useFakeTimers()
    mockTime(7, 0) // before 09:00
    const next = getNextActiveWindowStart(makeSettings('09:00', '18:00'))
    expect(next.getHours()).toBe(9)
    expect(next.getMinutes()).toBe(0)
    // Should be today (Jan 15)
    expect(next.getDate()).toBe(15)
  })

  it('returns tomorrow when window start has already passed today', () => {
    vi.useFakeTimers()
    mockTime(10, 0) // after 09:00
    const next = getNextActiveWindowStart(makeSettings('09:00', '18:00'))
    expect(next.getHours()).toBe(9)
    // Should be tomorrow (Jan 16)
    expect(next.getDate()).toBe(16)
  })
})
