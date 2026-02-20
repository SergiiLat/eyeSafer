import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { AppSettings, BlinkData, CameraDevice } from '../shared/types'

const camera = {
  sendBlinkData: (data: BlinkData): void => {
    ipcRenderer.send(IPC.BLINK.RELAY, data)
  },

  sendLowBlinkRate: (bpm: number): void => {
    ipcRenderer.send(IPC.BLINK.LOW_RATE, bpm)
  },

  sendCameraList: (devices: CameraDevice[]): void => {
    ipcRenderer.send(IPC.CAMERA.LIST_RESPONSE, devices)
  },

  onList: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC.CAMERA.LIST, handler)
    return () => ipcRenderer.removeListener(IPC.CAMERA.LIST, handler)
  },

  onStart: (callback: (cameraId: string | null) => void) => {
    const handler = (_: Electron.IpcRendererEvent, cameraId: string | null) => callback(cameraId)
    ipcRenderer.on(IPC.CAMERA.START, handler)
    return () => ipcRenderer.removeListener(IPC.CAMERA.START, handler)
  },

  onStop: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC.CAMERA.STOP, handler)
    return () => ipcRenderer.removeListener(IPC.CAMERA.STOP, handler)
  },

  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.SETTINGS.GET),

  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const handler = (_: Electron.IpcRendererEvent, s: AppSettings) => callback(s)
    ipcRenderer.on(IPC.SETTINGS.CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SETTINGS.CHANGED, handler)
  }
}

contextBridge.exposeInMainWorld('camera', camera)

export type CameraApi = typeof camera
