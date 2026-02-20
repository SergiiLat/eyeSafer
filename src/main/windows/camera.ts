import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import log from '../logger'

let cameraWindow: BrowserWindow | null = null

export function createCameraWindow(): BrowserWindow {
  if (cameraWindow && !cameraWindow.isDestroyed()) {
    return cameraWindow
  }

  cameraWindow = new BrowserWindow({
    width: 640,
    height: 480,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/camera.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    cameraWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/camera/index.html`)
  } else {
    cameraWindow.loadFile(join(__dirname, '../renderer/camera/index.html'))
  }

  cameraWindow.webContents.on('console-message', (_, level, message) => {
    if (level >= 2) log.error(`[camera] ${message}`)
    else log.debug(`[camera] ${message}`)
  })

  if (is.dev) {
    cameraWindow.webContents.once('did-finish-load', () => {
      cameraWindow?.webContents.openDevTools({ mode: 'detach' })
    })
  }

  cameraWindow.on('closed', () => {
    cameraWindow = null
  })

  return cameraWindow
}

export function getCameraWindow(): BrowserWindow | null {
  if (cameraWindow?.isDestroyed()) return null
  return cameraWindow
}

export function closeCameraWindow(): void {
  if (cameraWindow && !cameraWindow.isDestroyed()) {
    cameraWindow.close()
  }
  cameraWindow = null
}
