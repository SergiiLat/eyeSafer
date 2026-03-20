import { app, BrowserWindow, globalShortcut } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createSettingsWindow, showSettingsWindow } from './windows/settings'
import { createCameraWindow } from './windows/camera'
import { spawnOverlays, closeOverlays } from './windows/overlay'
import { registerIpcHandlers } from './ipc-handlers'
import { storeService } from './services/store.service'
import { schedulerService } from './services/scheduler.service'
import { stimulationService } from './services/stimulation.service'
import { exerciseSchedulerService } from './services/exercise-scheduler.service'
import { twentyTwentyService } from './services/twenty.service'
import { databaseService } from './services/database.service'
import { trayManager } from './tray'
import log, { getLogPath } from './logger'

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on('second-instance', () => {
  showSettingsWindow()
})

app.whenReady().then(async () => {
  log.info('HealthSafer starting up')
  log.info(`Log file: ${getLogPath()}`)

  // Initialize database
  try {
    await databaseService.init()
    databaseService.startSession()
  } catch (err) {
    log.error(`[db] Init failed: ${err}`)
    log.error(err instanceof Error ? err.stack ?? '' : String(err))
  }

  electronApp.setAppUserModelId('com.healthsafer.app')

  // Disable default keyboard shortcuts in production
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register all IPC handlers
  registerIpcHandlers()

  // Create tray icon
  trayManager.create()
  log.info('Tray created')

  // Create camera window (hidden, always running)
  createCameraWindow()
  log.info('Camera window created')

  // Spawn overlay windows for all monitors
  spawnOverlays()
  log.info('Overlay windows spawned')

  // Start the blink scheduler
  schedulerService.start()
  log.info('Scheduler started')

  // Start exercise scheduler
  exerciseSchedulerService.start()
  log.info('Exercise scheduler started')

  // Start 20-20-20 rule timer
  twentyTwentyService.start()
  log.info('20-20-20 service started')

  // Register global keyboard shortcuts
  globalShortcut.register('CommandOrControl+Shift+E', () => {
    log.info('[shortcut] Ctrl+Shift+E: triggering eye exercise')
    stimulationService.triggerRandom()
  })
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    log.info('[shortcut] Ctrl+Shift+D: toggling DND')
    const settings = storeService.getAll()
    const newDnd = !settings.dndEnabled
    storeService.set('dndEnabled', newDnd)
    storeService.set('dndUntil', null)
    if (newDnd) schedulerService.pause()
    else schedulerService.resume()
    trayManager.buildMenu()
  })
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    log.info('[shortcut] Ctrl+Shift+R: opening settings')
    showSettingsWindow()
  })
  log.info('Global shortcuts registered')

  // Open settings on first launch or in dev mode
  if (process.env.NODE_ENV === 'development') {
    createSettingsWindow()
    log.info('Settings window opened (dev mode)')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSettingsWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit — we're a tray app
  // On macOS, app lives in Dock even without windows
})

app.on('before-quit', () => {
  log.info('HealthSafer shutting down')
  globalShortcut.unregisterAll()
  exerciseSchedulerService.stop()
  twentyTwentyService.stop()
  databaseService.close()
  closeOverlays()
  trayManager.destroy()
})
