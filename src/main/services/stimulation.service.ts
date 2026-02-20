import type { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { INTENSITY_PARAMS } from '../../shared/default-settings'
import { storeService } from './store.service'
import type { StimulationMethod, StimulationTrigger } from '../../shared/types'

export class StimulationService {
  private overlayWindows: BrowserWindow[] = []

  setOverlayWindows(windows: BrowserWindow[]): void {
    this.overlayWindows = windows
  }

  triggerRandom(): void {
    const settings = storeService.getAll()
    const enabledMethods = Object.entries(settings.enabledMethods)
      .filter(([, enabled]) => enabled)
      .map(([method]) => method as StimulationMethod)

    if (enabledMethods.length === 0) return

    const method = enabledMethods[Math.floor(Math.random() * enabledMethods.length)]
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
}

export const stimulationService = new StimulationService()
