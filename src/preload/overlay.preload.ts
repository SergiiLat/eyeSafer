import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { StimulationTrigger } from '../shared/types'

const overlay = {
  onTrigger: (callback: (trigger: StimulationTrigger) => void) => {
    const handler = (_: Electron.IpcRendererEvent, trigger: StimulationTrigger) => callback(trigger)
    ipcRenderer.on(IPC.STIMULATION.PLAY, handler)
    return () => ipcRenderer.removeListener(IPC.STIMULATION.PLAY, handler)
  },

  complete: (): void => {
    ipcRenderer.send(IPC.STIMULATION.COMPLETE)
  },

  onTwentyTrigger: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC.TWENTY.TRIGGER, handler)
    return () => ipcRenderer.removeListener(IPC.TWENTY.TRIGGER, handler)
  },

  twentyDone: (): void => {
    ipcRenderer.send(IPC.TWENTY.DONE)
  }
}

contextBridge.exposeInMainWorld('overlay', overlay)

export type OverlayApi = typeof overlay
