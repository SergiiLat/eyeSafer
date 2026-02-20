import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { storeService } from '../services/store.service'
import { IPC } from '../../shared/ipc-channels'

let settingsWindow: BrowserWindow | null = null

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  const savedPos = storeService.get('windowPosition')
  const savedSize = storeService.get('windowSize')

  settingsWindow = new BrowserWindow({
    width: savedSize.width,
    height: savedSize.height,
    x: savedPos?.x,
    y: savedPos?.y,
    frame: false,
    transparent: false,
    resizable: true,
    minWidth: 700,
    minHeight: 500,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/settings.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings/index.html`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })

  settingsWindow.on('moved', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      const [x, y] = settingsWindow.getPosition()
      storeService.set('windowPosition', { x, y })
    }
  })

  settingsWindow.on('resize', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      const [width, height] = settingsWindow.getSize()
      storeService.set('windowSize', { width, height })
    }
  })

  settingsWindow.on('maximize', () => {
    settingsWindow?.webContents.send(IPC.WINDOW.MAXIMIZED, true)
  })

  settingsWindow.on('unmaximize', () => {
    settingsWindow?.webContents.send(IPC.WINDOW.MAXIMIZED, false)
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  ipcMain.on(IPC.WINDOW.MINIMIZE, () => {
    settingsWindow?.minimize()
  })

  ipcMain.on(IPC.WINDOW.MAXIMIZE, () => {
    if (settingsWindow?.isMaximized()) {
      settingsWindow.unmaximize()
    } else {
      settingsWindow?.maximize()
    }
  })

  ipcMain.on(IPC.WINDOW.CLOSE, () => {
    settingsWindow?.hide()
  })

  return settingsWindow
}

export function showSettingsWindow(): void {
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    createSettingsWindow()
  } else {
    settingsWindow.show()
    settingsWindow.focus()
  }
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}
