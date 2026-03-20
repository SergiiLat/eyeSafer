import type { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { INTENSITY_PARAMS } from '../../shared/default-settings'
import { storeService } from './store.service'
import type { StimulationMethod, StimulationTrigger } from '../../shared/types'

export class StimulationService {
  private overlayWindows: BrowserWindow[] = []
  private testLoopTimer: ReturnType<typeof setTimeout> | null = null
  private testLoopInterval: ReturnType<typeof setInterval> | null = null
  private sequentialIndex = 0

  setOverlayWindows(windows: BrowserWindow[]): void {
    this.overlayWindows = windows
  }

  triggerRandom(): void {
    const settings = storeService.getAll()
    const enabledMethods = Object.entries(settings.enabledMethods)
      .filter(([, enabled]) => enabled)
      .map(([method]) => method as StimulationMethod)

    if (enabledMethods.length === 0) return

    let method: StimulationMethod
    if (settings.effectOrder === 'sequential') {
      // Keep index within bounds in case enabled set shrank
      this.sequentialIndex = this.sequentialIndex % enabledMethods.length
      method = enabledMethods[this.sequentialIndex]
      this.sequentialIndex = (this.sequentialIndex + 1) % enabledMethods.length
    } else {
      method = enabledMethods[Math.floor(Math.random() * enabledMethods.length)]
    }

    this.trigger(method)
  }

  trigger(method: StimulationMethod): void {
    const settings = storeService.getAll()
    const params = INTENSITY_PARAMS[method][settings.intensity]

    const triggerPayload: StimulationTrigger = { method, intensity: settings.intensity, params }

    for (const win of this.overlayWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.STIMULATION.PLAY, triggerPayload)
      }
    }
  }

  startTestLoop(method: StimulationMethod, seconds: number): void {
    this.stopTestLoop()

    const settings = storeService.getAll()
    const params = INTENSITY_PARAMS[method][settings.intensity]
    // Repeat slightly faster than the effect duration so it loops continuously
    const repeatMs = Math.max(500, params.durationMs - 200)

    this.trigger(method)
    this.testLoopInterval = setInterval(() => this.trigger(method), repeatMs)
    this.testLoopTimer = setTimeout(() => this.stopTestLoop(), seconds * 1000)
  }

  stopTestLoop(): void {
    if (this.testLoopInterval !== null) {
      clearInterval(this.testLoopInterval)
      this.testLoopInterval = null
    }
    if (this.testLoopTimer !== null) {
      clearTimeout(this.testLoopTimer)
      this.testLoopTimer = null
    }
  }
}

export const stimulationService = new StimulationService()
