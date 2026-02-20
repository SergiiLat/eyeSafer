// MediaPipe Face Mesh landmark indices for eye blink detection (EAR calculation)
// Based on 468-point Face Mesh model

// Left eye landmarks: [p1, p2, p3, p4, p5, p6]
// p1=outer corner, p4=inner corner, p2/p6=upper lids, p3/p5=lower lids
export const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144] as const

// Right eye landmarks: [p1, p2, p3, p4, p5, p6]
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380] as const

// EAR (Eye Aspect Ratio) threshold below which a blink is detected
export const DEFAULT_EAR_THRESHOLD = 0.25

// Minimum consecutive frames with low EAR to count as blink
export const DEFAULT_CONSECUTIVE_FRAMES = 1

// BPM sliding window duration in milliseconds
export const BLINK_WINDOW_MS = 60_000

// Default BPM alert threshold (below this = low blink rate)
export const DEFAULT_LOW_BLINK_THRESHOLD = 12

// Cooldown between low-blink-rate alerts in milliseconds
export const LOW_BLINK_ALERT_COOLDOWN_MS = 60_000

// Adaptive calibration: number of EAR frames to collect (60s × 20fps)
export const CALIBRATION_FRAMES = 1200

// EMA smoothing factor (lower = smoother, range 0.1–0.5)
export const DEFAULT_SMOOTHING_ALPHA = 0.3

// Blink duration gates (milliseconds)
export const DEFAULT_MIN_BLINK_DURATION_MS = 50
export const DEFAULT_MAX_BLINK_DURATION_MS = 500

// Blendshape score threshold (0 = open, 1 = closed)
export const BLENDSHAPE_BLINK_THRESHOLD = 0.35

// Scheduler intervals in milliseconds
export const SCHEDULE_INTERVALS = {
  intensive: 10 * 60_000,   // 10 minutes
  normal: 20 * 60_000,      // 20 minutes
  relaxed: 30 * 60_000      // 30 minutes
} as const

// MediaPipe WASM files location (relative to app root in production)
export const MEDIAPIPE_WASM_PATH = 'mediapipe'
