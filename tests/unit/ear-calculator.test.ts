import { describe, it, expect } from 'vitest'
import { euclideanDistance, calculateEAR, computeEARs } from '../../src/worker/ear-calculator'
import { LEFT_EYE_INDICES, RIGHT_EYE_INDICES } from '../../src/shared/constants'

describe('euclideanDistance', () => {
  it('returns 0 for identical points', () => {
    expect(euclideanDistance({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(0)
  })

  it('returns correct distance for horizontal pair', () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3)
  })

  it('returns correct distance for vertical pair', () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(4)
  })

  it('returns correct 3-4-5 hypotenuse', () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5)
  })
})

describe('calculateEAR', () => {
  // Build a minimal 468-landmark array where only the 6 relevant indices are set.
  function makeLandmarks(indices: readonly number[], coords: [number, number][]): { x: number; y: number }[] {
    const landmarks: { x: number; y: number }[] = Array.from({ length: 470 }, () => ({ x: 0, y: 0 }))
    indices.forEach((idx, i) => {
      landmarks[idx] = { x: coords[i][0], y: coords[i][1] }
    })
    return landmarks
  }

  it('returns 1.0 when a landmark is missing', () => {
    const landmarks: { x: number; y: number }[] = []
    expect(calculateEAR(landmarks, LEFT_EYE_INDICES)).toBe(1.0)
  })

  it('returns 1.0 when horizontal distance is zero', () => {
    // Place all 6 left-eye landmarks at the same point → horizontal = 0
    const coords: [number, number][] = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]
    const landmarks = makeLandmarks(LEFT_EYE_INDICES, coords)
    expect(calculateEAR(landmarks, LEFT_EYE_INDICES)).toBe(1.0)
  })

  it('returns ~0 for a fully-closed eye (vertical distances near 0)', () => {
    // p1=(0,0), p4=(10,0) → horizontal=10
    // p2=p6=(5,0), p3=p5=(5,0) → both vertical distances = 0
    const coords: [number, number][] = [
      [0, 0],   // p1 (outer corner)
      [5, 0],   // p2
      [5, 0],   // p3
      [10, 0],  // p4 (inner corner)
      [5, 0],   // p5
      [5, 0],   // p6
    ]
    const landmarks = makeLandmarks(LEFT_EYE_INDICES, coords)
    expect(calculateEAR(landmarks, LEFT_EYE_INDICES)).toBeCloseTo(0)
  })

  it('returns expected value for a realistic open eye', () => {
    // EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    // |p1-p4|=10, |p2-p6|=3 (p2 upper, p6 lower), |p3-p5|=3 → EAR=(3+3)/20=0.3
    const coords: [number, number][] = [
      [0, 0],    // p1 (outer corner)
      [5, 1.5],  // p2 (upper lid)
      [5, 1.5],  // p3 (upper lid)
      [10, 0],   // p4 (inner corner)
      [5, -1.5], // p5 (lower lid)
      [5, -1.5], // p6 (lower lid)
    ]
    const landmarks = makeLandmarks(LEFT_EYE_INDICES, coords)
    expect(calculateEAR(landmarks, LEFT_EYE_INDICES)).toBeCloseTo(0.3, 5)
  })
})

describe('computeEARs', () => {
  it('averages left and right EAR correctly', () => {
    // Build symmetric open-eye landmarks for both left and right eyes
    const landmarks: { x: number; y: number }[] = Array.from({ length: 470 }, () => ({ x: 0, y: 0 }))

    // Left eye: EAR = 0.3 → |p2-p6|=|p3-p5|=1.5 (upper y=1.5, lower y=-1.5), h=10
    const leftCoords: [number, number][] = [[0,0],[5,1.5],[5,1.5],[10,0],[5,-1.5],[5,-1.5]]
    LEFT_EYE_INDICES.forEach((idx, i) => { landmarks[idx] = { x: leftCoords[i][0], y: leftCoords[i][1] } })

    // Right eye: EAR = 0.4 → |p2-p6|=|p3-p5|=2 (upper y=2, lower y=-2), h=10
    const rightCoords: [number, number][] = [[0,0],[5,2],[5,2],[10,0],[5,-2],[5,-2]]
    RIGHT_EYE_INDICES.forEach((idx, i) => { landmarks[idx] = { x: rightCoords[i][0], y: rightCoords[i][1] } })

    const { leftEar, rightEar, ear } = computeEARs(landmarks)
    expect(leftEar).toBeCloseTo(0.3, 5)
    expect(rightEar).toBeCloseTo(0.4, 5)
    expect(ear).toBeCloseTo(0.35, 5)
  })
})
