import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type {
  AppSettings, StimulationMethod, CameraDevice, BlinkData, StimulationTrigger,
  BlinkMinute, Session, DailySummary, WeeklySummary
} from '../shared/types'

const api = {
  // Settings
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.SETTINGS.GET),

  setSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS.SET, settings),

  resetSettings: (): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS.RESET),

  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const handler = (_: Electron.IpcRendererEvent, settings: AppSettings) => callback(settings)
    ipcRenderer.on(IPC.SETTINGS.CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SETTINGS.CHANGED, handler)
  },

  // Camera
  listCameras: (): Promise<CameraDevice[]> =>
    ipcRenderer.invoke(IPC.CAMERA.LIST),

  selectCamera: (deviceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.CAMERA.SELECT, deviceId),

  // Blink data
  onBlinkData: (callback: (data: BlinkData) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: BlinkData) => callback(data)
    ipcRenderer.on(IPC.BLINK.DATA, handler)
    return () => ipcRenderer.removeListener(IPC.BLINK.DATA, handler)
  },

  onLowBlinkRate: (callback: (bpm: number) => void) => {
    const handler = (_: Electron.IpcRendererEvent, bpm: number) => callback(bpm)
    ipcRenderer.on(IPC.BLINK.LOW_RATE, handler)
    return () => ipcRenderer.removeListener(IPC.BLINK.LOW_RATE, handler)
  },

  // Stimulation
  testStimulation: (method: StimulationMethod): Promise<void> =>
    ipcRenderer.invoke(IPC.STIMULATION.TEST, method),

  onStimulationPlay: (callback: (trigger: StimulationTrigger) => void) => {
    const handler = (_: Electron.IpcRendererEvent, trigger: StimulationTrigger) => callback(trigger)
    ipcRenderer.on(IPC.STIMULATION.PLAY, handler)
    return () => ipcRenderer.removeListener(IPC.STIMULATION.PLAY, handler)
  },

  // DND
  setDnd: (enabled: boolean, until?: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DND.SET, enabled, until),

  getDnd: (): Promise<{ enabled: boolean; until: string | null }> =>
    ipcRenderer.invoke(IPC.DND.GET),

  // Scheduler
  pauseScheduler: (): Promise<void> =>
    ipcRenderer.invoke(IPC.SCHEDULER.PAUSE),

  resumeScheduler: (): Promise<void> =>
    ipcRenderer.invoke(IPC.SCHEDULER.RESUME),

  getSchedulerStatus: (): Promise<{ paused: boolean; nextTriggerMs: number | null }> =>
    ipcRenderer.invoke(IPC.SCHEDULER.STATUS),

  // Window
  minimizeWindow: (): void =>
    ipcRenderer.send(IPC.WINDOW.MINIMIZE),

  maximizeWindow: (): void =>
    ipcRenderer.send(IPC.WINDOW.MAXIMIZE),

  onMaximizeChanged: (callback: (isMaximized: boolean) => void) => {
    const handler = (_: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on(IPC.WINDOW.MAXIMIZED, handler)
    return () => ipcRenderer.removeListener(IPC.WINDOW.MAXIMIZED, handler)
  },

  closeWindow: (): void =>
    ipcRenderer.send(IPC.WINDOW.CLOSE),

  // App
  getVersion: (): Promise<string> =>
    ipcRenderer.invoke(IPC.APP.VERSION),

  getLogPath: (): Promise<string> =>
    ipcRenderer.invoke(IPC.APP.LOG_PATH),

  openLog: (): Promise<void> =>
    ipcRenderer.invoke(IPC.APP.OPEN_LOG),

  // Reports
  getReportDaily: (date: string): Promise<BlinkMinute[]> =>
    ipcRenderer.invoke(IPC.REPORTS.GET_DAILY, date),

  getReportDailySummary: (date: string): Promise<DailySummary | null> =>
    ipcRenderer.invoke(IPC.REPORTS.GET_DAILY_SUMMARY, date),

  getReportRange: (from: string, to: string): Promise<BlinkMinute[]> =>
    ipcRenderer.invoke(IPC.REPORTS.GET_RANGE, from, to),

  getReportSessions: (date: string): Promise<Session[]> =>
    ipcRenderer.invoke(IPC.REPORTS.GET_SESSIONS, date),

  getReportWeekly: (weekStart: string): Promise<WeeklySummary> =>
    ipcRenderer.invoke(IPC.REPORTS.GET_WEEKLY, weekStart),

  exportReportCsv: (from: string, to: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.REPORTS.EXPORT_CSV, from, to)
}

contextBridge.exposeInMainWorld('api', api)

export type SettingsApi = typeof api
