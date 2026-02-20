import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { computeEARs } from '../../worker/ear-calculator'
import {
  DEFAULT_EAR_THRESHOLD,
  DEFAULT_CONSECUTIVE_FRAMES,
  BLINK_WINDOW_MS,
  DEFAULT_LOW_BLINK_THRESHOLD,
  LOW_BLINK_ALERT_COOLDOWN_MS,
  CALIBRATION_FRAMES,
  DEFAULT_SMOOTHING_ALPHA,
  DEFAULT_MIN_BLINK_DURATION_MS,
  DEFAULT_MAX_BLINK_DURATION_MS,
  BLENDSHAPE_BLINK_THRESHOLD
} from '../../shared/constants'
import type { BlinkData, CameraDevice } from '../../shared/types'

declare global {
  interface Window {
    camera: {
      sendBlinkData: (data: BlinkData) => void
      sendLowBlinkRate: (bpm: number) => void
      sendCameraList: (devices: CameraDevice[]) => void
      onList: (callback: () => void) => () => void
      onStart: (callback: (cameraId: string | null) => void) => () => void
      onStop: (callback: () => void) => () => void
      getSettings: () => Promise<import('../../shared/types').AppSettings>
      onSettingsChanged: (callback: (s: import('../../shared/types').AppSettings) => void) => () => void
    }
  }
}

// ── Blink state machine ──────────────────────────────────────────────────────
const enum BlinkState { OPEN, CLOSING, CLOSED, OPENING }

class CameraBridge {
  private stream: MediaStream | null = null
  private faceLandmarker: FaceLandmarker | null = null
  private video: HTMLVideoElement | null = null
  private animationFrameId: number | null = null
  private _isRunning = false
  get running(): boolean { return this._isRunning }
  private readonly targetFps = 20
  private readonly frameInterval = 1000 / this.targetFps
  private lastFrameTime = 0

  // Settings
  private earThreshold = DEFAULT_EAR_THRESHOLD
  private consecutiveFrames = DEFAULT_CONSECUTIVE_FRAMES
  private lowBlinkThreshold = DEFAULT_LOW_BLINK_THRESHOLD
  private autoCalibrate = true
  private smoothingAlpha = DEFAULT_SMOOTHING_ALPHA
  private useBlendshapes = true
  private minBlinkDurationMs = DEFAULT_MIN_BLINK_DURATION_MS
  private maxBlinkDurationMs = DEFAULT_MAX_BLINK_DURATION_MS

  // Blink tracking
  private blinkTimestamps: number[] = []
  private totalBlinkCount = 0
  private lastLowBlinkAlert = 0

  // State machine
  private blinkState = BlinkState.OPEN
  private blinkStartTime = 0
  private lowEarFrameCount = 0

  // FPS counter
  private fpsHistory: number[] = []

  // EMA smoothing
  private smoothedEar = 0.3

  // Adaptive calibration
  private earHistory: number[] = []
  private calibrated = false
  private personalThreshold = DEFAULT_EAR_THRESHOLD

  configure(settings: {
    earThreshold: number
    consecutiveFrames: number
    lowBlinkThreshold: number
    autoCalibrate?: boolean
    earSmoothingFactor?: number
    useBlendshapes?: boolean
    minBlinkDurationMs?: number
    maxBlinkDurationMs?: number
  }): void {
    this.earThreshold = settings.earThreshold
    this.consecutiveFrames = settings.consecutiveFrames
    this.lowBlinkThreshold = settings.lowBlinkThreshold
    if (settings.autoCalibrate !== undefined) this.autoCalibrate = settings.autoCalibrate
    if (settings.earSmoothingFactor !== undefined) this.smoothingAlpha = settings.earSmoothingFactor
    if (settings.useBlendshapes !== undefined) this.useBlendshapes = settings.useBlendshapes
    if (settings.minBlinkDurationMs !== undefined) this.minBlinkDurationMs = settings.minBlinkDurationMs
    if (settings.maxBlinkDurationMs !== undefined) this.maxBlinkDurationMs = settings.maxBlinkDurationMs
  }

  async init(): Promise<void> {
    console.log('[camera-bridge] Initializing MediaPipe...')
    const vision = await FilesetResolver.forVisionTasks('/mediapipe')
    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/mediapipe/face_landmarker.task',
        delegate: 'CPU'
      },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: 1
    })
    console.log('[camera-bridge] MediaPipe ready')
  }

  async start(deviceId?: string): Promise<void> {
    await this.stop()

    if (!this.faceLandmarker) {
      console.error('[camera-bridge] Not initialized')
      return
    }

    const started = await this.tryStart(deviceId)
    if (!started && deviceId) {
      // Specific device failed — fall back to default camera
      console.warn('[camera-bridge] Specific deviceId failed, falling back to default camera')
      await this.tryStart(undefined)
    }
  }

  private async tryStart(deviceId?: string): Promise<boolean> {
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: 640, height: 480 }
          : { width: 640, height: 480 },
        audio: false
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.video = document.createElement('video')
      this.video.srcObject = this.stream
      this.video.playsInline = true
      this.video.muted = true
      await this.video.play()

      this._isRunning = true
      this.captureLoop()
      console.log('[camera-bridge] Camera started', deviceId ?? '(default)')
      return true
    } catch (err) {
      console.error('[camera-bridge] Start failed:', err)
      await this.stop()
      return false
    }
  }

  private captureLoop(): void {
    if (!this._isRunning) return
    const now = performance.now()
    if (now - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = now
      this.processFrame(now)
    }
    this.animationFrameId = requestAnimationFrame(() => this.captureLoop())
  }

  private processFrame(timestamp: number): void {
    const video = this.video
    if (!video || !this.faceLandmarker || video.readyState < 2) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = this.faceLandmarker.detectForVideo(video as any, timestamp)
    if (!results.faceLandmarks || results.faceLandmarks.length === 0) return

    const landmarks = results.faceLandmarks[0].map(lm => ({ x: lm.x, y: lm.y }))
    const { leftEar, rightEar, ear: rawEar } = computeEARs(landmarks)

    // EMA smoothing
    this.smoothedEar = this.smoothingAlpha * rawEar + (1 - this.smoothingAlpha) * this.smoothedEar
    const ear = this.smoothedEar

    // Adaptive calibration: collect open-eye EAR baseline
    let calibrationProgress = 100
    if (this.autoCalibrate && !this.calibrated) {
      this.earHistory.push(rawEar)
      calibrationProgress = Math.min(100, Math.round((this.earHistory.length / CALIBRATION_FRAMES) * 100))
      if (this.earHistory.length >= CALIBRATION_FRAMES) {
        const sorted = [...this.earHistory].sort((a, b) => a - b)
        const top80 = sorted.slice(Math.floor(sorted.length * 0.2))
        const baselineEar = top80[Math.floor(top80.length / 2)]
        this.personalThreshold = baselineEar * 0.75
        this.calibrated = true
        console.log(`[camera-bridge] Calibrated: baseline=${baselineEar.toFixed(3)}, threshold=${this.personalThreshold.toFixed(3)}`)
      }
    }

    // Active threshold: prefer calibrated personal threshold if ready
    const activeThreshold = (this.autoCalibrate && this.calibrated)
      ? this.personalThreshold
      : this.earThreshold

    // Try blendshapes first (more reliable when available)
    let blinkScore = 0
    let useBlendshapeDetection = false
    if (this.useBlendshapes && results.faceBlendshapes?.[0]) {
      const shapes = results.faceBlendshapes[0].categories
      const leftScore = shapes.find(s => s.categoryName === 'eyeBlinkLeft')?.score ?? 0
      const rightScore = shapes.find(s => s.categoryName === 'eyeBlinkRight')?.score ?? 0
      blinkScore = (leftScore + rightScore) / 2
      useBlendshapeDetection = true
    }

    // Determine eye-closed signal
    const eyeClosed = useBlendshapeDetection
      ? blinkScore >= BLENDSHAPE_BLINK_THRESHOLD
      : ear < activeThreshold

    // State machine: OPEN → CLOSING → CLOSED → OPENING → OPEN
    const blinkConfirmed = this.updateStateMachine(eyeClosed, timestamp)
    if (blinkConfirmed) {
      this.totalBlinkCount++
      this.blinkTimestamps.push(timestamp)
    }

    // BPM sliding window
    const windowStart = timestamp - BLINK_WINDOW_MS
    this.blinkTimestamps = this.blinkTimestamps.filter(t => t > windowStart)
    const bpm = this.blinkTimestamps.length

    // FPS counter: count frames in the last second
    this.fpsHistory.push(timestamp)
    this.fpsHistory = this.fpsHistory.filter(t => t > timestamp - 1000)
    const fps = this.fpsHistory.length

    const data: BlinkData = {
      bpm,
      ear: rawEar,
      leftEar,
      rightEar,
      blinkCount: this.totalBlinkCount,
      timestamp,
      isLowBlink: bpm < this.lowBlinkThreshold && bpm > 0,
      fps,
      smoothedEar: ear,
      calibrated: this.autoCalibrate ? this.calibrated : undefined,
      calibrationProgress: this.autoCalibrate && !this.calibrated ? calibrationProgress : undefined,
      personalThreshold: this.autoCalibrate && this.calibrated ? this.personalThreshold : undefined
    }

    window.camera.sendBlinkData(data)

    if (data.isLowBlink && timestamp - this.lastLowBlinkAlert > LOW_BLINK_ALERT_COOLDOWN_MS) {
      this.lastLowBlinkAlert = timestamp
      window.camera.sendLowBlinkRate(bpm)
    }
  }

  /**
   * State machine: returns true when a valid blink is confirmed.
   * OPEN → CLOSING (eye goes closed) → CLOSED (consecutive frames met)
   * → OPENING (eye reopens) → blink confirmed
   * Rejects blinks shorter than minBlinkDurationMs or longer than maxBlinkDurationMs.
   */
  private updateStateMachine(eyeClosed: boolean, timestamp: number): boolean {
    switch (this.blinkState) {
      case BlinkState.OPEN:
        if (eyeClosed) {
          this.lowEarFrameCount = 1
          this.blinkState = BlinkState.CLOSING
        }
        break

      case BlinkState.CLOSING:
        if (eyeClosed) {
          this.lowEarFrameCount++
          if (this.lowEarFrameCount >= this.consecutiveFrames) {
            this.blinkState = BlinkState.CLOSED
            this.blinkStartTime = timestamp
          }
        } else {
          // Reverted before threshold — noise, reset
          this.blinkState = BlinkState.OPEN
          this.lowEarFrameCount = 0
        }
        break

      case BlinkState.CLOSED: {
        const duration = timestamp - this.blinkStartTime
        if (duration > this.maxBlinkDurationMs) {
          // Held too long — not a blink (eye closure), reset
          this.blinkState = BlinkState.OPEN
          this.lowEarFrameCount = 0
        } else if (!eyeClosed) {
          // Eye reopened — confirm if duration is within valid range
          this.blinkState = BlinkState.OPENING
          if (duration >= this.minBlinkDurationMs) {
            this.blinkState = BlinkState.OPEN
            this.lowEarFrameCount = 0
            return true  // ✅ valid blink confirmed
          }
          this.blinkState = BlinkState.OPEN
          this.lowEarFrameCount = 0
        }
        break
      }

      case BlinkState.OPENING:
        this.blinkState = BlinkState.OPEN
        this.lowEarFrameCount = 0
        break
    }
    return false
  }

  async stop(): Promise<void> {
    this._isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.video = null
  }
}

const bridge = new CameraBridge()

bridge.init()
  .then(async () => {
    const settings = await window.camera.getSettings()
    bridge.configure({
      earThreshold: settings.earThreshold,
      consecutiveFrames: settings.consecutiveFrames,
      lowBlinkThreshold: settings.lowBlinkThreshold,
      autoCalibrate: settings.autoCalibrate,
      earSmoothingFactor: settings.earSmoothingFactor,
      useBlendshapes: settings.useBlendshapes,
      minBlinkDurationMs: settings.minBlinkDurationMs,
      maxBlinkDurationMs: settings.maxBlinkDurationMs
    })
    await bridge.start(settings.selectedCameraId ?? undefined)

    // If camera didn't start (driver not ready yet on Windows), retry once after 2 s
    if (!bridge.running) {
      console.warn('[camera-bridge] Camera not running after init, retrying in 2s...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      await bridge.start(settings.selectedCameraId ?? undefined)
    }
  })
  .catch(err => console.error('[camera-bridge] Init failed:', err))

window.camera.onSettingsChanged((settings) => {
  bridge.configure({
    earThreshold: settings.earThreshold,
    consecutiveFrames: settings.consecutiveFrames,
    lowBlinkThreshold: settings.lowBlinkThreshold,
    autoCalibrate: settings.autoCalibrate,
    earSmoothingFactor: settings.earSmoothingFactor,
    useBlendshapes: settings.useBlendshapes,
    minBlinkDurationMs: settings.minBlinkDurationMs,
    maxBlinkDurationMs: settings.maxBlinkDurationMs
  })
})

window.camera.onList(async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label }))
    window.camera.sendCameraList(cameras)
  } catch {
    window.camera.sendCameraList([])
  }
})

window.camera.onStart((deviceId) => {
  bridge.start(deviceId ?? undefined)
})

window.camera.onStop(() => {
  bridge.stop()
})
