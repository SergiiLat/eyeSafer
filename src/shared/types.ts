export type StimulationMethod =
  | 'cornerMarkers' | 'blurOverlay' | 'movingObject' | 'colorShift'
  | 'figureEight' | 'nearFarFocus' | 'peripheralTriggers' | 'guidedBlink' | 'saccadeTraining'
  | 'cornerFocus' | 'pseudoBlur' | 'brightnessShift' | 'peripheralDrift'

export type Intensity = 'low' | 'medium' | 'high'

export type ScheduleMode = 'intensive' | 'normal' | 'relaxed'

export type EffectOrder = 'random' | 'sequential'

export type ExerciseId = 'chinTuck' | 'chestOpener' | 'neckMassage' | 'shoulderRolls' | 'spinalTwist'



export interface ExerciseStep {
  imagePath: string
  description: string
}

export interface ExerciseTrigger {
  exerciseId: ExerciseId
  title: string
  subtitle: string
  steps: ExerciseStep[]
  durationSeconds: number
}

export interface ExerciseEvent {
  id: number
  sessionId: number | null
  exerciseId: ExerciseId
  triggeredAt: string
  completed: boolean
}

export interface ExerciseDailySummary {
  date: string
  totalTriggered: number
  totalCompleted: number
  totalSkipped: number
  completionRate: number
}

export interface BlinkData {
  bpm: number
  ear: number
  leftEar: number
  rightEar: number
  blinkCount: number
  timestamp: number
  isLowBlink: boolean
  fps?: number                   // actual capture framerate
  // Adaptive calibration fields
  calibrated?: boolean
  calibrationProgress?: number   // 0–100
  personalThreshold?: number     // auto-calibrated EAR threshold
  smoothedEar?: number           // EMA-smoothed EAR value
}

export interface StimulationParams {
  size: number
  opacity: number
  durationMs: number
  cycles?: number
}

export interface MethodSettings {
  enabled: boolean
}

export interface TimeWindow {
  start: string  // HH:MM format
  end: string    // HH:MM format
}

export interface AppSettings {
  // General
  launchOnStartup: boolean
  scheduleMode: ScheduleMode
  dndEnabled: boolean
  dndUntil: string | null  // ISO datetime string or null

  // Active features
  blinkEnabled: boolean
  exercisesEnabled: boolean

  // Stimulation
  enabledMethods: Record<StimulationMethod, boolean>
  intensity: Intensity
  effectOrder: EffectOrder

  // Exercises
  enabledExercises: Record<ExerciseId, boolean>
  exerciseIntervalMinutes: number
  exerciseOrder: EffectOrder

  // Schedule
  activeWindow: TimeWindow
  weekendsEnabled: boolean

  // Camera
  selectedCameraId: string | null
  earThreshold: number
  consecutiveFrames: number

  // Blink detection
  lowBlinkThreshold: number         // BPM below this triggers alert
  lowBlinkAlertCooldownMs: number
  autoCalibrate: boolean            // adaptive per-user threshold calibration
  earSmoothingFactor: number        // EMA alpha (0.1–0.5)
  useBlendshapes: boolean           // prefer MediaPipe blendshape scores over EAR
  minBlinkDurationMs: number        // ignore sub-50ms "blinks" (noise)
  maxBlinkDurationMs: number        // ignore >500ms closures (not a blink)

  // 20-20-20 rule
  twentyTwentyEnabled: boolean

  // Internal
  windowPosition: { x: number; y: number } | null
  windowSize: { width: number; height: number }
}

export interface DisplayInfo {
  id: number
  bounds: { x: number; y: number; width: number; height: number }
  scaleFactor: number
  isPrimary: boolean
}

export interface CameraDevice {
  deviceId: string
  label: string
}

export type WorkerMessage =
  | { type: 'init'; wasmPath: string }
  | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }
  | { type: 'config'; earThreshold: number; consecutiveFrames: number; lowBlinkThreshold: number }
  | { type: 'destroy' }

export type WorkerResponse =
  | { type: 'blink-data'; data: BlinkData }
  | { type: 'low-blink-rate'; bpm: number }
  | { type: 'ready' }
  | { type: 'error'; message: string }

export interface StimulationTrigger {
  method: StimulationMethod
  intensity: Intensity
  params: StimulationParams
}

// ── Reports / Data Persistence ───────────────────────────────────────────────

export interface Session {
  id: number
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  avgBpm: number | null
  totalBlinks: number | null
  lowBlinkSeconds: number | null
  stimulationsTriggered: number | null
}

export interface BlinkMinute {
  id: number
  sessionId: number
  minuteTs: string      // ISO 8601, rounded to minute
  bpm: number
  avgEar: number | null
  minEar: number | null
  blinkCount: number
  isLowBlink: boolean
}

export interface StimulationEvent {
  id: number
  sessionId: number
  triggeredAt: string
  method: StimulationMethod
  bpmAtTrigger: number | null
}

export interface DailySummary {
  date: string                    // YYYY-MM-DD
  totalScreenTimeMinutes: number
  avgBpm: number | null
  totalBlinks: number | null
  lowBlinkMinutes: number | null
  stimulationsCount: number | null
  healthScore: number | null      // 0–100
}

export interface WeeklySummary {
  weekStart: string               // YYYY-MM-DD (Monday)
  days: DailySummary[]
  avgBpm: number | null
  totalBlinks: number | null
  totalScreenTimeMinutes: number
}

export interface ReportRange {
  from: string   // ISO or YYYY-MM-DD
  to: string
}
