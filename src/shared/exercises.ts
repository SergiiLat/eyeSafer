import type { ExerciseId, ExerciseTrigger } from './types'

export const EXERCISE_CATALOG: Record<ExerciseId, Omit<ExerciseTrigger, 'exerciseId'>> = {
  chinTuck: {
    title: 'Chin Tuck',
    subtitle: 'Relieve neck tension and correct forward head posture',
    durationSeconds: 30,
    steps: [
      { imagePath: '/exercises/chin-tuck-1.png', description: 'Sit tall, eyes forward, spine straight' },
      { imagePath: '/exercises/chin-tuck-2.png', description: 'Push chin straight back with two fingers' },
      { imagePath: '/exercises/chin-tuck-3.png', description: 'Hold 5 seconds, release — repeat 5×' }
    ]
  },
  chestOpener: {
    title: 'Chest Opener',
    subtitle: 'Counteract rounded shoulders and open the chest',
    durationSeconds: 30,
    steps: [
      { imagePath: '/exercises/chest-opener-1.png', description: 'Clasp hands behind your back' },
      { imagePath: '/exercises/chest-opener-2.png', description: 'Straighten arms, squeeze shoulder blades together' },
      { imagePath: '/exercises/chest-opener-3.png', description: 'Lift chin slightly, hold 15 seconds' }
    ]
  },
  neckMassage: {
    title: 'Suboccipital Massage',
    subtitle: 'Release tension at the base of the skull',
    durationSeconds: 45,
    steps: [
      { imagePath: '/exercises/neck-massage-1.png', description: 'Place fingertips at base of skull (occipital ridge)' },
      { imagePath: '/exercises/neck-massage-2.png', description: 'Apply gentle circular pressure at the indentations on each side' }
    ]
  },
  shoulderRolls: {
    title: 'Shoulder Rolls',
    subtitle: 'Release shoulder and upper back tension',
    durationSeconds: 30,
    steps: [
      { imagePath: '/exercises/shoulder-rolls-1.png', description: 'Sit upright, arms relaxed at sides' },
      { imagePath: '/exercises/shoulder-rolls-2.png', description: 'Slowly roll shoulders backward in large circles' },
      { imagePath: '/exercises/shoulder-rolls-3.png', description: '5 rolls backward, then 5 rolls forward' }
    ]
  },
  spinalTwist: {
    title: 'Seated Spinal Twist',
    subtitle: 'Improve spinal mobility and reduce lower back tension',
    durationSeconds: 45,
    steps: [
      { imagePath: '/exercises/spinal-twist-1.png', description: 'Sit upright, feet flat on floor' },
      { imagePath: '/exercises/spinal-twist-2.png', description: 'Place right hand on left knee' },
      { imagePath: '/exercises/spinal-twist-3.png', description: 'Twist left, look over left shoulder' },
      { imagePath: '/exercises/spinal-twist-4.png', description: 'Hold 15 sec — repeat on other side' }
    ]
  }
}

/**
 * Image file names the user must provide in public/exercises/:
 *
 * Chin Tuck         (search: "chin tuck exercise neck"):
 *   chin-tuck-1.png, chin-tuck-2.png, chin-tuck-3.png
 *
 * Chest Opener      (search: "chest opener stretch seated behind back"):
 *   chest-opener-1.png, chest-opener-2.png, chest-opener-3.png
 *
 * Suboccipital Massage  (search: "suboccipital release self massage neck"):
 *   neck-massage-1.png, neck-massage-2.png
 *
 * Shoulder Rolls    (search: "shoulder rolls exercise seated office"):
 *   shoulder-rolls-1.png, shoulder-rolls-2.png, shoulder-rolls-3.png
 *
 * Seated Spinal Twist  (search: "seated spinal twist stretch office chair"):
 *   spinal-twist-1.png, spinal-twist-2.png, spinal-twist-3.png, spinal-twist-4.png
 */

export function buildExerciseTrigger(exerciseId: ExerciseId): ExerciseTrigger {
  return { exerciseId, ...EXERCISE_CATALOG[exerciseId] }
}
