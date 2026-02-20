import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing SchedulerService
vi.mock('../../src/main/services/store.service', () => ({
  storeService: {
    getAll: vi.fn(() => ({
      scheduleMode: 'normal',
      dndEnabled: false,
      dndUntil: null,
      activeWindow: { start: '00:00', end: '23:59' },
      weekendsEnabled: true
    })),
    set: vi.fn()
  }
}))

vi.mock('../../src/main/services/stimulation.service', () => ({
  stimulationService: {
    triggerRandom: vi.fn()
  }
}))

vi.mock('../../src/main/utils/time.utils', () => ({
  isWithinActiveWindow: vi.fn(() => true)
}))

import { SchedulerService } from '../../src/main/services/scheduler.service'
import { stimulationService } from '../../src/main/services/stimulation.service'

describe('SchedulerService', () => {
  let scheduler: SchedulerService

  beforeEach(() => {
    vi.useFakeTimers()
    scheduler = new SchedulerService()
  })

  afterEach(() => {
    scheduler.stop()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('is not paused initially', () => {
    expect(scheduler.isPaused()).toBe(false)
  })

  it('getNextTriggerMs returns null before start()', () => {
    expect(scheduler.getNextTriggerMs()).toBeNull()
  })

  it('getNextTriggerMs returns a positive value after start()', () => {
    scheduler.start()
    const ms = scheduler.getNextTriggerMs()
    expect(ms).not.toBeNull()
    expect(ms!).toBeGreaterThan(0)
  })

  it('pause() sets isPaused to true', () => {
    scheduler.start()
    scheduler.pause()
    expect(scheduler.isPaused()).toBe(true)
  })

  it('pause() is idempotent (double-pause is safe)', () => {
    scheduler.start()
    scheduler.pause()
    scheduler.pause()
    expect(scheduler.isPaused()).toBe(true)
  })

  it('resume() clears paused state', () => {
    scheduler.start()
    scheduler.pause()
    scheduler.resume()
    expect(scheduler.isPaused()).toBe(false)
  })

  it('resume() is idempotent when not paused', () => {
    scheduler.start()
    scheduler.resume()
    expect(scheduler.isPaused()).toBe(false)
  })

  it('getNextTriggerMs returns null when paused', () => {
    scheduler.start()
    scheduler.pause()
    expect(scheduler.getNextTriggerMs()).toBeNull()
  })

  it('stop() clears the timer and resets trigger time', () => {
    scheduler.start()
    scheduler.stop()
    expect(scheduler.getNextTriggerMs()).toBeNull()
  })

  it('triggers stimulation when interval elapses (normal mode = 20 min)', () => {
    scheduler.start()
    vi.advanceTimersByTime(20 * 60 * 1000 + 100)
    expect(stimulationService.triggerRandom).toHaveBeenCalledTimes(1)
  })

  it('does not trigger while paused', () => {
    scheduler.start()
    scheduler.pause()
    vi.advanceTimersByTime(30 * 60 * 1000)
    expect(stimulationService.triggerRandom).not.toHaveBeenCalled()
  })

  it('triggers after resume when remaining time elapses', () => {
    scheduler.start()
    // Advance 10 min (half of 20-min interval), then pause
    vi.advanceTimersByTime(10 * 60 * 1000)
    scheduler.pause()
    // Advance another 10 min while paused — should NOT fire
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(stimulationService.triggerRandom).not.toHaveBeenCalled()
    // Resume, then advance remaining ~10 min
    scheduler.resume()
    vi.advanceTimersByTime(10 * 60 * 1000 + 100)
    expect(stimulationService.triggerRandom).toHaveBeenCalledTimes(1)
  })
})
