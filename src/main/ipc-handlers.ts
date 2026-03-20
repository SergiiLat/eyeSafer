import { ipcMain, BrowserWindow, app, shell, dialog, Notification } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import log, { getLogPath } from './logger'
import { IPC } from '../shared/ipc-channels'
import { storeService } from './services/store.service'
import { schedulerService } from './services/scheduler.service'
import { stimulationService } from './services/stimulation.service'
import { exerciseService } from './services/exercise.service'
import { databaseService } from './services/database.service'
import { getCameraWindow } from './windows/camera'
import type { StimulationMethod, BlinkData, ExerciseId } from '../shared/types'
import { trayManager } from './tray'

// Cache of windows that need blink data
const blinkDataListeners: BrowserWindow[] = []

// Desktop notification cooldown for low-blink alerts (5 minutes)
let lastLowBlinkNotification = 0
const LOW_BLINK_NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000

export function registerIpcHandlers(): void {
  // Settings
  ipcMain.handle(IPC.SETTINGS.GET, () => {
    return storeService.getAll()
  })

  ipcMain.handle(IPC.SETTINGS.SET, (_, settings: Record<string, unknown>) => {
    storeService.setMany(settings as Parameters<typeof storeService.setMany>[0])
    // Broadcast changed settings to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.SETTINGS.CHANGED, storeService.getAll())
      }
    })
  })

  ipcMain.handle(IPC.SETTINGS.RESET, () => {
    storeService.reset()
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.SETTINGS.CHANGED, storeService.getAll())
      }
    })
  })

  // Camera
  ipcMain.handle(IPC.CAMERA.LIST, async () => {
    const cameraWin = getCameraWindow()
    if (!cameraWin || cameraWin.isDestroyed()) return []

    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve([]), 3000)
      ipcMain.once(IPC.CAMERA.LIST_RESPONSE, (_, devices) => {
        clearTimeout(timeout)
        resolve(devices)
      })
      cameraWin.webContents.send(IPC.CAMERA.LIST)
    })
  })

  ipcMain.handle(IPC.CAMERA.SELECT, (_, deviceId: string) => {
    storeService.set('selectedCameraId', deviceId)
    const cameraWin = getCameraWindow()
    if (cameraWin && !cameraWin.isDestroyed()) {
      cameraWin.webContents.send(IPC.CAMERA.START, deviceId)
    }
  })

  // Blink data relay + DB accumulation + tray BPM update
  ipcMain.on(IPC.BLINK.RELAY, (_, data: BlinkData) => {
    databaseService.accumulateBlinkData(data)
    trayManager.updateBpm(data.bpm)
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.BLINK.DATA, data)
      }
    })
  })

  ipcMain.on(IPC.BLINK.LOW_RATE, (_, bpm: number) => {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.BLINK.LOW_RATE, bpm)
      }
    })
    // Desktop notification (throttled to once per 5 minutes)
    const now = Date.now()
    if (Notification.isSupported() && now - lastLowBlinkNotification > LOW_BLINK_NOTIFICATION_COOLDOWN_MS) {
      lastLowBlinkNotification = now
      new Notification({
        title: 'HealthSafer — Low Blink Rate',
        body: `You've been blinking only ${bpm} times/min. Remember to blink more often!`,
        silent: true
      }).show()
    }
  })

  // Stimulation
  ipcMain.handle(IPC.STIMULATION.TEST, (_, method: StimulationMethod) => {
    stimulationService.trigger(method)
  })

  ipcMain.handle(IPC.STIMULATION.TEST_LOOP, (_, method: StimulationMethod, seconds: number) => {
    stimulationService.startTestLoop(method, seconds)
  })

  ipcMain.handle(IPC.STIMULATION.TEST_LOOP_STOP, () => {
    stimulationService.stopTestLoop()
  })

  ipcMain.on(IPC.STIMULATION.COMPLETE, () => {
    // Overlay finished animation
  })

  // DND
  ipcMain.handle(IPC.DND.SET, (_, enabled: boolean, until?: string) => {
    storeService.set('dndEnabled', enabled)
    storeService.set('dndUntil', until ?? null)
    if (enabled) {
      schedulerService.pause()
    } else {
      schedulerService.resume()
    }
    trayManager.buildMenu()
  })

  ipcMain.handle(IPC.DND.GET, () => ({
    enabled: storeService.get('dndEnabled'),
    until: storeService.get('dndUntil')
  }))

  // Scheduler
  ipcMain.handle(IPC.SCHEDULER.PAUSE, () => {
    schedulerService.pause()
    trayManager.buildMenu()
  })

  ipcMain.handle(IPC.SCHEDULER.RESUME, () => {
    schedulerService.resume()
    trayManager.buildMenu()
  })

  ipcMain.handle(IPC.SCHEDULER.STATUS, () => ({
    paused: schedulerService.isPaused(),
    nextTriggerMs: schedulerService.getNextTriggerMs()
  }))

  // App
  ipcMain.handle(IPC.APP.VERSION, () => app.getVersion())

  ipcMain.handle(IPC.APP.LOG_PATH, () => getLogPath())

  ipcMain.handle(IPC.APP.OPEN_LOG, async () => {
    const logPath = getLogPath()
    log.info(`Opening log file: ${logPath}`)
    await shell.openPath(logPath)
  })

  // Reports
  ipcMain.handle(IPC.REPORTS.GET_DAILY, (_, date: string) => {
    return databaseService.getBlinkMinutes(date)
  })

  ipcMain.handle(IPC.REPORTS.GET_DAILY_SUMMARY, (_, date: string) => {
    return databaseService.getDailySummary(date)
  })

  ipcMain.handle(IPC.REPORTS.GET_RANGE, (_, from: string, to: string) => {
    return databaseService.getBlinkRange(from, to)
  })

  ipcMain.handle(IPC.REPORTS.GET_SESSIONS, (_, date: string) => {
    return databaseService.getSessions(date)
  })

  ipcMain.handle(IPC.REPORTS.GET_WEEKLY, (_, weekStart: string) => {
    return databaseService.getWeeklySummary(weekStart)
  })

  ipcMain.handle(IPC.REPORTS.EXPORT_CSV, async (_, from: string, to: string) => {
    const csv = databaseService.exportCsv(from, to)
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: join(app.getPath('downloads'), `healthsafer-${from}-to-${to}.csv`),
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (filePath) {
      writeFileSync(filePath, csv)
      return filePath
    }
    return null
  })

  // Exercise
  ipcMain.handle(IPC.EXERCISE.TEST, (_, exerciseId: ExerciseId) => {
    exerciseService.trigger(exerciseId)
  })

  ipcMain.on(IPC.EXERCISE.DONE, (_, exerciseId: ExerciseId) => {
    databaseService.logExerciseEvent(exerciseId, true)
    exerciseService.broadcastDismiss()
    exerciseService.setWindowsInteractive(false)
    log.info(`[exercise] Completed: ${exerciseId}`)
  })

  ipcMain.on(IPC.EXERCISE.SKIP, (_, exerciseId: ExerciseId) => {
    databaseService.logExerciseEvent(exerciseId, false)
    exerciseService.broadcastDismiss()
    exerciseService.setWindowsInteractive(false)
    log.info(`[exercise] Skipped: ${exerciseId}`)
  })

  ipcMain.handle(IPC.EXERCISE.GET_EVENTS, (_, date: string) => {
    return databaseService.getExerciseEvents(date)
  })

  ipcMain.handle(IPC.EXERCISE.GET_SUMMARY, (_, date: string) => {
    return databaseService.getExerciseDailySummary(date)
  })
}

export { blinkDataListeners }
