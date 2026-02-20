import { BrowserWindow } from 'electron'
import log from '../logger'
import { IPC } from '../../shared/ipc-channels'
import { storeService } from './store.service'

const INTERVAL_MS = 20 * 60 * 1000  // 20 minutes

class TwentyTwentyService {
  private timer: NodeJS.Timeout | null = null

  start(): void {
    this.scheduleNext()
    log.info('[20-20-20] Service started')
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => this.onTrigger(), INTERVAL_MS)
  }

  private onTrigger(): void {
    this.timer = null
    const settings = storeService.getAll()

    if (settings.twentyTwentyEnabled && !settings.dndEnabled) {
      log.info('[20-20-20] Triggering reminder')
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC.TWENTY.TRIGGER)
        }
      })
    }

    this.scheduleNext()
  }
}

export const twentyTwentyService = new TwentyTwentyService()
