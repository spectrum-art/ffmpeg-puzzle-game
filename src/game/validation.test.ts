import { describe, expect, it } from 'vitest'
import { INITIAL_STATE } from './constants'
import type { PuzzleTargets } from './types'
import { getValidationResult, nextStage, validateStage } from './validation'

const TEST_TARGETS: PuzzleTargets = {
  shapes: {
    lineRotation: 150,
    lineY: 30,
    squareRotation: 60,
    squareY: 60,
    rectangleRotation: 300,
    rectangleY: 90,
  },
  stripes: {
    stripeThickness: 6,
    stripeCount: 9,
    driftSpeed: 'medium',
  },
  color: {
    colorR: 200,
    colorG: 255,
    colorB: 144,
  },
}

describe('validateStage', () => {
  it('requires exact state matches because all controls are quantized', () => {
    const solvedShapes = { ...INITIAL_STATE, ...TEST_TARGETS.shapes }

    expect(validateStage(solvedShapes, 'shapes', TEST_TARGETS)).toBe(true)
    expect(validateStage(solvedShapes, 'stripes', TEST_TARGETS)).toBe(false)
  })
})

describe('getValidationResult', () => {
  it('marks the current stage as pending until a matching frame has rendered', () => {
    const solvedShapes = { ...INITIAL_STATE, ...TEST_TARGETS.shapes }
    const result = getValidationResult('shapes', solvedShapes, INITIAL_STATE, TEST_TARGETS)

    expect(result.matchesTarget).toBe(true)
    expect(result.pendingRenderedFrame).toBe(true)
    expect(result.stageComplete).toBe(false)
  })
})

describe('nextStage', () => {
  it('advances through the full puzzle sequence and then stops', () => {
    expect(nextStage('shapes')).toBe('stripes')
    expect(nextStage('stripes')).toBe('color')
    expect(nextStage('color')).toBe('complete')
    expect(nextStage('complete')).toBe('complete')
  })
})
