import Store from 'electron-store'
import { DEFAULT_SETTINGS } from '../../shared/default-settings'
import type { AppSettings } from '../../shared/types'

const schema: Record<keyof AppSettings, { type: string | string[] }> = {
  launchOnStartup: { type: 'boolean' },
  scheduleMode: { type: 'string' },
  dndEnabled: { type: 'boolean' },
  dndUntil: { type: ['string', 'null'] },
  blinkEnabled: { type: 'boolean' },
  exercisesEnabled: { type: 'boolean' },
  enabledMethods: { type: 'object' },
  intensity: { type: 'string' },
  effectOrder: { type: 'string' },
  enabledExercises: { type: 'object' },
  exerciseIntervalMinutes: { type: 'number' },
  exerciseOrder: { type: 'string' },
  activeWindow: { type: 'object' },
  weekendsEnabled: { type: 'boolean' },
  selectedCameraId: { type: ['string', 'null'] },
  earThreshold: { type: 'number' },
  consecutiveFrames: { type: 'number' },
  lowBlinkThreshold: { type: 'number' },
  lowBlinkAlertCooldownMs: { type: 'number' },
  autoCalibrate: { type: 'boolean' },
  earSmoothingFactor: { type: 'number' },
  useBlendshapes: { type: 'boolean' },
  minBlinkDurationMs: { type: 'number' },
  maxBlinkDurationMs: { type: 'number' },
  twentyTwentyEnabled: { type: 'boolean' },
  windowPosition: { type: ['object', 'null'] },
  windowSize: { type: 'object' }
}

const store = new Store<AppSettings>({
  name: 'healthsafer-settings',
  defaults: DEFAULT_SETTINGS,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: schema as any
})

export const storeService = {
  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return store.get(key)
  },

  getAll(): AppSettings {
    return store.store
  },

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    store.set(key, value)
  },

  setMany(settings: Partial<AppSettings>): void {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof AppSettings, value)
    }
  },

  reset(): void {
    store.clear()
    store.store = { ...DEFAULT_SETTINGS }
  }
}
