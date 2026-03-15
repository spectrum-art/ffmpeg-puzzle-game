import {
  COLOR_STEP_VALUES,
  ROTATION_VALUES,
  STRIPE_COUNT_VALUES,
  STRIPE_THICKNESS_VALUES,
  Y_VALUES,
} from './constants'
import type { DriftSpeedKey, PuzzleState } from './types'

function snapNumber(value: number, allowed: readonly number[]): number {
  return allowed.reduce((closest, candidate) =>
    Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest,
  )
}

export function normalizePatch(
  currentState: PuzzleState,
  patch: Partial<PuzzleState>,
): PuzzleState {
  return {
    ...currentState,
    ...patch,
    lineRotation:
      patch.lineRotation === undefined
        ? currentState.lineRotation
        : snapNumber(patch.lineRotation, ROTATION_VALUES),
    lineY:
      patch.lineY === undefined ? currentState.lineY : snapNumber(patch.lineY, Y_VALUES),
    squareRotation:
      patch.squareRotation === undefined
        ? currentState.squareRotation
        : snapNumber(patch.squareRotation, ROTATION_VALUES),
    squareY:
      patch.squareY === undefined ? currentState.squareY : snapNumber(patch.squareY, Y_VALUES),
    rectangleRotation:
      patch.rectangleRotation === undefined
        ? currentState.rectangleRotation
        : snapNumber(patch.rectangleRotation, ROTATION_VALUES),
    rectangleY:
      patch.rectangleY === undefined
        ? currentState.rectangleY
        : snapNumber(patch.rectangleY, Y_VALUES),
    stripeThickness:
      patch.stripeThickness === undefined
        ? currentState.stripeThickness
        : snapNumber(patch.stripeThickness, STRIPE_THICKNESS_VALUES),
    stripeCount:
      patch.stripeCount === undefined
        ? currentState.stripeCount
        : snapNumber(patch.stripeCount, STRIPE_COUNT_VALUES),
    driftSpeed:
      patch.driftSpeed === undefined
        ? currentState.driftSpeed
        : normalizeSpeed(patch.driftSpeed),
    colorR:
      patch.colorR === undefined
        ? currentState.colorR
        : snapNumber(patch.colorR, COLOR_STEP_VALUES),
    colorG:
      patch.colorG === undefined
        ? currentState.colorG
        : snapNumber(patch.colorG, COLOR_STEP_VALUES),
    colorB:
      patch.colorB === undefined
        ? currentState.colorB
        : snapNumber(patch.colorB, COLOR_STEP_VALUES),
  }
}

function normalizeSpeed(value: DriftSpeedKey): DriftSpeedKey {
  return ['verySlow', 'slow', 'medium', 'fast', 'veryFast'].includes(value) ? value : 'slow'
}
