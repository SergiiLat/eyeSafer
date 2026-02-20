import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { stimulationService } from '../services/stimulation.service'

const overlayWindows: Map<number, BrowserWindow> = new Map()

function createOverlayForDisplay(displayId: number): BrowserWindow {
  const display = screen.getAllDisplays().find(d => d.id === displayId)
  if (!display) throw new Error(`Display ${displayId} not found`)

  const { x, y, width, height } = display.bounds

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    type: 'toolbar',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/overlay.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
    win.setIgnoreMouseEvents(true)
  })

  win.on('closed', () => {
    overlayWindows.delete(displayId)
  })

  return win
}

export function spawnOverlays(): void {
  const displays = screen.getAllDisplays()

  for (const display of displays) {
    if (!overlayWindows.has(display.id)) {
      const win = createOverlayForDisplay(display.id)
      overlayWindows.set(display.id, win)
    }
  }

  stimulationService.setOverlayWindows(Array.from(overlayWindows.values()))

  screen.on('display-added', (_, display) => {
    const win = createOverlayForDisplay(display.id)
    overlayWindows.set(display.id, win)
    stimulationService.setOverlayWindows(Array.from(overlayWindows.values()))
  })

  screen.on('display-removed', (_, display) => {
    const win = overlayWindows.get(display.id)
    if (win && !win.isDestroyed()) {
      win.close()
    }
    overlayWindows.delete(display.id)
    stimulationService.setOverlayWindows(Array.from(overlayWindows.values()))
  })
}

export function closeOverlays(): void {
  for (const [, win] of overlayWindows) {
    if (!win.isDestroyed()) win.close()
  }
  overlayWindows.clear()
  stimulationService.setOverlayWindows([])
}

export function getOverlayWindows(): BrowserWindow[] {
  return Array.from(overlayWindows.values()).filter(w => !w.isDestroyed())
}
