import { storeService } from './store.service'
import { exerciseService } from './exercise.service'
import { isWithinActiveWindow } from '../utils/time.utils'

export class ExerciseSchedulerService {
  private timer: NodeJS.Timeout | null = null
  private paused = false

  start(): void {
    this.scheduleNext()
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  pause(): void {
    if (this.paused) return
    this.paused = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  resume(): void {
    if (!this.paused) return
    this.paused = false
    this.scheduleNext()
  }

  isPaused(): boolean {
    return this.paused
  }

  private scheduleNext(): void {
    if (this.paused) return
    const settings = storeService.getAll()
    const intervalMs = settings.exerciseIntervalMinutes * 60 * 1000
    this.timer = setTimeout(() => this.onTrigger(), intervalMs)
  }

  private onTrigger(): void {
    this.timer = null

    const settings = storeService.getAll()

    // Respect DND
    if (settings.dndEnabled) {
      if (settings.dndUntil) {
        const until = new Date(settings.dndUntil).getTime()
        if (Date.now() < until) {
          this.scheduleNext()
          return
        } else {
          storeService.set('dndEnabled', false)
          storeService.set('dndUntil', null)
        }
      } else {
        this.scheduleNext()
        return
      }
    }

    // Respect active time window
    if (!isWithinActiveWindow(settings)) {
      this.scheduleNext()
      return
    }

    // Respect weekends
    const dayOfWeek = new Date().getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    if (isWeekend && !settings.weekendsEnabled) {
      this.scheduleNext()
      return
    }

    // Respect feature toggles
    if (!settings.exercisesEnabled) {
      this.scheduleNext()
      return
    }

    exerciseService.triggerNext()
    this.scheduleNext()
  }
}

export const exerciseSchedulerService = new ExerciseSchedulerService()
