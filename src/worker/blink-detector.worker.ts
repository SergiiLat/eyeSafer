import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { computeEARs } from './ear-calculator'
import {
  DEFAULT_EAR_THRESHOLD,
  DEFAULT_CONSECUTIVE_FRAMES,
  BLINK_WINDOW_MS,
  DEFAULT_LOW_BLINK_THRESHOLD,
  LOW_BLINK_ALERT_COOLDOWN_MS
} from '../shared/constants'
import type { BlinkData, WorkerMessage, WorkerResponse } from '../shared/types'

class BlinkDetector {
  private faceLandmarker: FaceLandmarker | null = null
  private earThreshold = DEFAULT_EAR_THRESHOLD
  private consecutiveFrames = DEFAULT_CONSECUTIVE_FRAMES
  private lowBlinkThreshold = DEFAULT_LOW_BLINK_THRESHOLD

  private lowEarFrameCount = 0
  private blinkTimestamps: number[] = []
  private totalBlinkCount = 0
  private lastLowBlinkAlert = 0
  private isBlinking = false

  async init(wasmPath: string): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmPath)
    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${wasmPath}/face_landmarker.task`,
        delegate: 'CPU'
      },
      outputFaceBlendshapes: false,
      runningMode: 'VIDEO',
      numFaces: 1
    })
  }

  configure(earThreshold: number, consecutiveFrames: number, lowBlinkThreshold: number): void {
    this.earThreshold = earThreshold
    this.consecutiveFrames = consecutiveFrames
    this.lowBlinkThreshold = lowBlinkThreshold
  }

  processFrame(bitmap: ImageBitmap, timestamp: number): WorkerResponse | null {
    if (!this.faceLandmarker) return null

    const results = this.faceLandmarker.detectForVideo(bitmap as unknown as HTMLVideoElement, timestamp)

    if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
      return null
    }

    const landmarks = results.faceLandmarks[0].map(lm => ({ x: lm.x, y: lm.y }))
    const { leftEar, rightEar, ear } = computeEARs(landmarks)

    // Blink detection: consecutive frames below threshold
    if (ear < this.earThreshold) {
      this.lowEarFrameCount++
    } else {
      if (this.lowEarFrameCount >= this.consecutiveFrames && this.isBlinking) {
        this.registerBlink(timestamp)
        this.isBlinking = false
      } else if (this.lowEarFrameCount >= this.consecutiveFrames) {
        this.isBlinking = true
      }
      this.lowEarFrameCount = 0
    }

    // When ear goes below threshold for consecutive frames, mark blink start
    if (this.lowEarFrameCount >= this.consecutiveFrames && !this.isBlinking) {
      this.isBlinking = true
    }

    // Sliding window BPM
    const windowStart = timestamp - BLINK_WINDOW_MS
    this.blinkTimestamps = this.blinkTimestamps.filter(t => t > windowStart)
    const bpm = this.blinkTimestamps.length

    const data: BlinkData = {
      bpm,
      ear,
      leftEar,
      rightEar,
      blinkCount: this.totalBlinkCount,
      timestamp,
      isLowBlink: bpm < this.lowBlinkThreshold && bpm > 0
    }

    // Check for low blink rate alert (with cooldown)
    if (
      data.isLowBlink &&
      timestamp - this.lastLowBlinkAlert > LOW_BLINK_ALERT_COOLDOWN_MS
    ) {
      this.lastLowBlinkAlert = timestamp
      postMessage({ type: 'low-blink-rate', bpm } as WorkerResponse)
    }

    return { type: 'blink-data', data }
  }

  private registerBlink(timestamp: number): void {
    this.totalBlinkCount++
    this.blinkTimestamps.push(timestamp)
  }

  destroy(): void {
    this.faceLandmarker?.close()
    this.faceLandmarker = null
  }
}

const detector = new BlinkDetector()

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data

  switch (msg.type) {
    case 'init':
      try {
        await detector.init(msg.wasmPath)
        postMessage({ type: 'ready' } as WorkerResponse)
      } catch (err) {
        postMessage({ type: 'error', message: String(err) } as WorkerResponse)
      }
      break

    case 'frame': {
      const response = detector.processFrame(msg.bitmap, msg.timestamp)
      if (response) {
        postMessage(response, { transfer: [msg.bitmap] })
      } else {
        msg.bitmap.close()
      }
      break
    }

    case 'config':
      detector.configure(msg.earThreshold, msg.consecutiveFrames, msg.lowBlinkThreshold)
      break

    case 'destroy':
      detector.destroy()
      break
  }
}
