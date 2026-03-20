import { storeService } from './store.service'
import { stimulationService } from './stimulation.service'
import { isWithinActiveWindow } from '../utils/time.utils'
import { SCHEDULE_INTERVALS } from '../../shared/constants'

export class SchedulerService {
  private timer: NodeJS.Timeout | null = null
  private paused = false
  private nextTriggerTime: number | null = null
  private remainingMs: number | null = null

  start(): void {
    this.scheduleNext()
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.nextTriggerTime = null
    this.remainingMs = null
  }

  pause(): void {
    if (this.paused) return
    this.paused = true
    if (this.timer && this.nextTriggerTime !== null) {
      this.remainingMs = this.nextTriggerTime - Date.now()
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  resume(): void {
    if (!this.paused) return
    this.paused = false
    if (this.remainingMs !== null && this.remainingMs > 0) {
      this.nextTriggerTime = Date.now() + this.remainingMs
      this.timer = setTimeout(() => this.onTrigger(), this.remainingMs)
      this.remainingMs = null
    } else {
      this.scheduleNext()
    }
  }

  isPaused(): boolean {
    return this.paused
  }

  getNextTriggerMs(): number | null {
    if (this.paused) return null
    if (this.nextTriggerTime === null) return null
    return Math.max(0, this.nextTriggerTime - Date.now())
  }

  private scheduleNext(): void {
    if (this.paused) return

    const settings = storeService.getAll()
    const intervalMs = SCHEDULE_INTERVALS[settings.scheduleMode]

    this.nextTriggerTime = Date.now() + intervalMs
    this.timer = setTimeout(() => this.onTrigger(), intervalMs)
  }

  private onTrigger(): void {
    this.timer = null
    this.nextTriggerTime = null

    const settings = storeService.getAll()

    // Check DND
    if (settings.dndEnabled) {
      if (settings.dndUntil) {
        const until = new Date(settings.dndUntil).getTime()
        if (Date.now() < until) {
          this.scheduleNext()
          return
        } else {
          // DND expired
          storeService.set('dndEnabled', false)
          storeService.set('dndUntil', null)
        }
      } else {
        this.scheduleNext()
        return
      }
    }

    // Check active window
    if (!isWithinActiveWindow(settings)) {
      this.scheduleNext()
      return
    }

    // Check weekend
    const dayOfWeek = new Date().getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    if (isWeekend && !settings.weekendsEnabled) {
      this.scheduleNext()
      return
    }

    // Respect feature toggles
    if (!settings.blinkEnabled) {
      this.scheduleNext()
      return
    }

    stimulationService.triggerRandom()
    this.scheduleNext()
  }
}

export const schedulerService = new SchedulerService()
