import {
  COLOR_STEP_VALUES,
  INITIAL_STATE,
  ROTATION_VALUES,
  STRIPE_COUNT_VALUES,
  STRIPE_THICKNESS_VALUES,
  Y_VALUES,
} from './constants'
import type { DriftSpeedKey, PuzzleTargets } from './types'

const DRIFT_SPEED_KEYS: DriftSpeedKey[] = ['verySlow', 'slow', 'medium', 'fast', 'veryFast']
export const FALLBACK_PUZZLE_TARGETS = createPuzzleTargets()

export function createPuzzleTargets(): PuzzleTargets {
  return {
    shapes: {
      lineRotation: pickRandomExcluding(ROTATION_VALUES, INITIAL_STATE.lineRotation),
      lineY: pickRandomExcluding(Y_VALUES, INITIAL_STATE.lineY),
      squareRotation: pickRandomExcluding(ROTATION_VALUES, INITIAL_STATE.squareRotation),
      squareY: pickRandomExcluding(Y_VALUES, INITIAL_STATE.squareY),
      rectangleRotation: pickRandomExcluding(ROTATION_VALUES, INITIAL_STATE.rectangleRotation),
      rectangleY: pickRandomExcluding(Y_VALUES, INITIAL_STATE.rectangleY),
    },
    stripes: {
      stripeThickness: pickRandomExcluding(STRIPE_THICKNESS_VALUES, INITIAL_STATE.stripeThickness),
      stripeCount: pickRandomExcluding(STRIPE_COUNT_VALUES, INITIAL_STATE.stripeCount),
      driftSpeed: pickRandomExcluding(DRIFT_SPEED_KEYS, INITIAL_STATE.driftSpeed),
    },
    color: {
      colorR: pickRandomExcluding(COLOR_STEP_VALUES, INITIAL_STATE.colorR),
      colorG: pickRandomExcluding(COLOR_STEP_VALUES, INITIAL_STATE.colorG),
      colorB: pickRandomExcluding(COLOR_STEP_VALUES, INITIAL_STATE.colorB),
    },
  }
}

function pickRandomExcluding<T>(values: readonly T[], excluded: T) {
  const candidates = values.filter((value) => value !== excluded)
  const pool = candidates.length > 0 ? candidates : [...values]
  const index = Math.floor(Math.random() * pool.length)
  return pool[index]
}
