import { LEFT_EYE_INDICES, RIGHT_EYE_INDICES } from '../shared/constants'

export interface Point2D {
  x: number
  y: number
}

/**
 * Euclidean distance between two 2D points.
 */
export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Eye Aspect Ratio (EAR) using 6 landmarks:
 * [p1, p2, p3, p4, p5, p6] where:
 *   p1 = outer corner
 *   p4 = inner corner
 *   p2, p3 = upper lid points
 *   p5, p6 = lower lid points (ordered to match p3, p2)
 *
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 */
export function calculateEAR(landmarks: Point2D[], eyeIndices: readonly number[]): number {
  const [i1, i2, i3, i4, i5, i6] = eyeIndices

  const p1 = landmarks[i1]
  const p2 = landmarks[i2]
  const p3 = landmarks[i3]
  const p4 = landmarks[i4]
  const p5 = landmarks[i5]
  const p6 = landmarks[i6]

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 1.0

  const vertical1 = euclideanDistance(p2, p6)
  const vertical2 = euclideanDistance(p3, p5)
  const horizontal = euclideanDistance(p1, p4)

  if (horizontal === 0) return 1.0

  return (vertical1 + vertical2) / (2 * horizontal)
}

/**
 * Compute left and right EAR from face landmark array.
 */
export function computeEARs(landmarks: Point2D[]): { leftEar: number; rightEar: number; ear: number } {
  const leftEar = calculateEAR(landmarks, LEFT_EYE_INDICES)
  const rightEar = calculateEAR(landmarks, RIGHT_EYE_INDICES)
  const ear = (leftEar + rightEar) / 2
  return { leftEar, rightEar, ear }
}
