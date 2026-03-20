import type { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { storeService } from './store.service'
import { buildExerciseTrigger } from '../../shared/exercises'
import type { ExerciseId } from '../../shared/types'

export class ExerciseService {
  private overlayWindows: BrowserWindow[] = []
  private sequentialIndex = 0

  setOverlayWindows(windows: BrowserWindow[]): void {
    this.overlayWindows = windows
  }

  triggerNext(): void {
    const settings = storeService.getAll()
    const enabledIds = (Object.entries(settings.enabledExercises) as [ExerciseId, boolean][])
      .filter(([, enabled]) => enabled)
      .map(([id]) => id)

    if (enabledIds.length === 0) return

    let exerciseId: ExerciseId
    if (settings.exerciseOrder === 'sequential') {
      this.sequentialIndex = this.sequentialIndex % enabledIds.length
      exerciseId = enabledIds[this.sequentialIndex]
      this.sequentialIndex = (this.sequentialIndex + 1) % enabledIds.length
    } else {
      exerciseId = enabledIds[Math.floor(Math.random() * enabledIds.length)]
    }

    this.trigger(exerciseId)
  }

  trigger(exerciseId: ExerciseId): void {
    const payload = buildExerciseTrigger(exerciseId)
    this.setWindowsInteractive(true)
    for (const win of this.overlayWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.EXERCISE.PLAY, payload)
      }
    }
  }

  broadcastDismiss(): void {
    for (const win of this.overlayWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.EXERCISE.DISMISS)
      }
    }
  }

  setWindowsInteractive(interactive: boolean): void {
    for (const win of this.overlayWindows) {
      if (!win.isDestroyed()) {
        if (interactive) {
          win.setIgnoreMouseEvents(false)
          win.setFocusable(true)
        } else {
          win.setIgnoreMouseEvents(true)
          win.setFocusable(false)
        }
      }
    }
  }
}

export const exerciseService = new ExerciseService()
