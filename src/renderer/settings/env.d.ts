/// <reference types="svelte" />
/// <reference types="vite/client" />

import type {
  AppSettings,
  BlinkData,
  CameraDevice,
  StimulationMethod,
  StimulationTrigger
} from '../../shared/types'

declare global {
  interface Window {
    api: {
      getSettings(): Promise<AppSettings>
      setSettings(settings: Partial<AppSettings>): Promise<void>
      resetSettings(): Promise<void>
      onSettingsChanged(callback: (settings: AppSettings) => void): () => void

      listCameras(): Promise<CameraDevice[]>
      selectCamera(deviceId: string): Promise<void>

      onBlinkData(callback: (data: BlinkData) => void): () => void
      onLowBlinkRate(callback: (bpm: number) => void): () => void

      testStimulation(method: StimulationMethod): Promise<void>
      onStimulationPlay(callback: (trigger: StimulationTrigger) => void): () => void

      setDnd(enabled: boolean, until?: string): Promise<void>
      getDnd(): Promise<{ enabled: boolean; until: string | null }>

      pauseScheduler(): Promise<void>
      resumeScheduler(): Promise<void>
      getSchedulerStatus(): Promise<{ paused: boolean; nextTriggerMs: number | null }>

      minimizeWindow(): void
      maximizeWindow(): void
      onMaximizeChanged(callback: (isMaximized: boolean) => void): () => void
      closeWindow(): void

      getVersion(): Promise<string>
      getLogPath(): Promise<string>
      openLog(): Promise<void>
    }
  }
}
