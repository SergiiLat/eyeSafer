import type { AppSettings, StimulationMethod, Intensity, StimulationParams, EffectOrder, ExerciseId } from './types'
import {
  DEFAULT_EAR_THRESHOLD,
  DEFAULT_CONSECUTIVE_FRAMES,
  DEFAULT_LOW_BLINK_THRESHOLD,
  LOW_BLINK_ALERT_COOLDOWN_MS,
  DEFAULT_SMOOTHING_ALPHA,
  DEFAULT_MIN_BLINK_DURATION_MS,
  DEFAULT_MAX_BLINK_DURATION_MS
} from './constants'

export const DEFAULT_SETTINGS: AppSettings = {
  launchOnStartup: false,
  scheduleMode: 'normal',
  dndEnabled: false,
  dndUntil: null,

  blinkEnabled: true,
  exercisesEnabled: true,

  enabledMethods: {
    cornerMarkers: true,
    blurOverlay: true,
    movingObject: true,
    colorShift: true,
    figureEight: false,
    nearFarFocus: false,
    peripheralTriggers: false,
    guidedBlink: false,
    saccadeTraining: false,
    cornerFocus: true,
    pseudoBlur: false,
    brightnessShift: false,
    peripheralDrift: false
  },
  intensity: 'medium',
  effectOrder: 'random' as EffectOrder,

  enabledExercises: {
    chinTuck: true,
    chestOpener: true,
    neckMassage: true,
    shoulderRolls: true,
    spinalTwist: true
  } as Record<ExerciseId, boolean>,
  exerciseIntervalMinutes: 45,
  exerciseOrder: 'sequential' as EffectOrder,

  activeWindow: {
    start: '09:00',
    end: '18:00'
  },
  weekendsEnabled: false,

  selectedCameraId: null,
  earThreshold: DEFAULT_EAR_THRESHOLD,
  consecutiveFrames: DEFAULT_CONSECUTIVE_FRAMES,

  lowBlinkThreshold: DEFAULT_LOW_BLINK_THRESHOLD,
  lowBlinkAlertCooldownMs: LOW_BLINK_ALERT_COOLDOWN_MS,
  autoCalibrate: true,
  earSmoothingFactor: DEFAULT_SMOOTHING_ALPHA,
  useBlendshapes: true,
  minBlinkDurationMs: DEFAULT_MIN_BLINK_DURATION_MS,
  maxBlinkDurationMs: DEFAULT_MAX_BLINK_DURATION_MS,

  twentyTwentyEnabled: true,

  windowPosition: null,
  windowSize: { width: 800, height: 600 }
}

type IntensityParams = Record<Intensity, StimulationParams>
type MethodIntensityParams = Record<StimulationMethod, IntensityParams>

export const INTENSITY_PARAMS: MethodIntensityParams = {
  cornerMarkers: {
    low: { size: 8, opacity: 0.6, durationMs: 4000 },
    medium: { size: 12, opacity: 0.8, durationMs: 5000 },
    high: { size: 16, opacity: 1.0, durationMs: 6000 }
  },
  blurOverlay: {
    low: { size: 0, opacity: 0.15, durationMs: 200 },
    medium: { size: 0, opacity: 0.25, durationMs: 300 },
    high: { size: 0, opacity: 0.40, durationMs: 400 }
  },
  movingObject: {
    low: { size: 10, opacity: 0.7, durationMs: 3000 },
    medium: { size: 14, opacity: 0.85, durationMs: 4000 },
    high: { size: 18, opacity: 1.0, durationMs: 5000 }
  },
  colorShift: {
    low: { size: 0, opacity: 0.08, durationMs: 4000, cycles: 2 },
    medium: { size: 0, opacity: 0.12, durationMs: 5000, cycles: 2 },
    high: { size: 0, opacity: 0.18, durationMs: 6000, cycles: 3 }
  },
  figureEight: {
    low: { size: 10, opacity: 0.70, durationMs: 6000 },
    medium: { size: 14, opacity: 0.85, durationMs: 7000 },
    high: { size: 18, opacity: 1.00, durationMs: 8000 }
  },
  nearFarFocus: {
    low: { size: 20, opacity: 0.60, durationMs: 6000 },
    medium: { size: 24, opacity: 0.75, durationMs: 7000 },
    high: { size: 28, opacity: 0.90, durationMs: 8000 }
  },
  peripheralTriggers: {
    low: { size: 8, opacity: 0.60, durationMs: 6000 },
    medium: { size: 12, opacity: 0.80, durationMs: 7000 },
    high: { size: 16, opacity: 1.00, durationMs: 8000 }
  },
  guidedBlink: {
    low: { size: 16, opacity: 0.70, durationMs: 4500 },
    medium: { size: 20, opacity: 0.85, durationMs: 6000 },
    high: { size: 24, opacity: 1.00, durationMs: 7500 }
  },
  saccadeTraining: {
    low: { size: 12, opacity: 0.70, durationMs: 4400 },
    medium: { size: 16, opacity: 0.85, durationMs: 5500 },
    high: { size: 20, opacity: 1.00, durationMs: 6600 }
  },
  // Animated rotating focus target that hops between screen corners
  cornerFocus: {
    low:    { size: 24, opacity: 0.75, durationMs:  8000 },
    medium: { size: 32, opacity: 0.90, durationMs: 10000 },
    high:   { size: 40, opacity: 1.00, durationMs: 12000 }
  },
  // Brief frosted-glass style blur pulse over the screen
  pseudoBlur: {
    low:    { size: 0, opacity: 0.20, durationMs: 600  },
    medium: { size: 0, opacity: 0.35, durationMs: 800  },
    high:   { size: 0, opacity: 0.50, durationMs: 1000 }
  },
  // Subtle screen brightness/contrast flash
  brightnessShift: {
    low:    { size: 0, opacity: 0.12, durationMs: 500 },
    medium: { size: 0, opacity: 0.20, durationMs: 700 },
    high:   { size: 0, opacity: 0.30, durationMs: 900 }
  },
  // Glowing dot drifting slowly around the screen perimeter
  peripheralDrift: {
    low:    { size: 14, opacity: 0.65, durationMs:  8000 },
    medium: { size: 20, opacity: 0.80, durationMs: 10000 },
    high:   { size: 26, opacity: 1.00, durationMs: 12000 }
  }
}
