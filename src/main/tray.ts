import { Tray, Menu, app, nativeImage } from 'electron'
import { join } from 'path'
import { showSettingsWindow } from './windows/settings'
import { schedulerService } from './services/scheduler.service'

export class TrayManager {
  private tray: Tray | null = null

  create(): void {
    const iconPath = join(__dirname, '../../resources/icons/tray-icon.png')
    const icon = nativeImage.createFromPath(iconPath)

    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
    this.tray.setToolTip('HealthSafer — Eye Care Protection')
    this.buildMenu()

    this.tray.on('double-click', () => {
      showSettingsWindow()
    })
  }

  buildMenu(): void {
    if (!this.tray) return

    const isPaused = schedulerService.isPaused()

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Settings',
        click: () => showSettingsWindow()
      },
      { type: 'separator' },
      {
        label: isPaused ? 'Resume' : 'Pause',
        click: () => {
          if (schedulerService.isPaused()) {
            schedulerService.resume()
          } else {
            schedulerService.pause()
          }
          this.buildMenu()
          this.updateIcon()
        }
      },
      {
        label: 'Pause for...',
        submenu: [
          {
            label: '30 minutes',
            click: () => this.pauseFor(30)
          },
          {
            label: '1 hour',
            click: () => this.pauseFor(60)
          },
          {
            label: '2 hours',
            click: () => this.pauseFor(120)
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Quit HealthSafer',
        click: () => app.quit()
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  private pauseFor(minutes: number): void {
    schedulerService.pause()
    setTimeout(() => {
      schedulerService.resume()
      this.buildMenu()
      this.updateIcon()
    }, minutes * 60_000)
    this.buildMenu()
    this.updateIcon()
  }

  private updateIcon(): void {
    if (!this.tray) return
    const isPaused = schedulerService.isPaused()
    const iconName = isPaused ? 'tray-icon-paused.png' : 'tray-icon.png'
    const iconPath = join(__dirname, '../../resources/icons', iconName)
    const icon = nativeImage.createFromPath(iconPath)
    this.tray.setImage(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  }

  updateBpm(bpm: number): void {
    if (!this.tray) return
    const status = bpm < 8 ? ' ⚠' : ''
    this.tray.setToolTip(`HealthSafer — ${bpm} BPM${status}`)
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}

export const trayManager = new TrayManager()
