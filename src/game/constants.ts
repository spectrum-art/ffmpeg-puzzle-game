import type { PuzzleState } from './types'

export const INTERNAL_RENDER_SIZE = 125
export const DISPLAY_SIZE = 250
export const RENDER_INTERVAL_MS = 100
export const STAGE_SEQUENCE = ['shapes', 'stripes', 'color', 'complete'] as const
export const ROTATION_VALUES = Array.from({ length: 12 }, (_, index) => index * 30)
export const Y_VALUES = Array.from({ length: 9 }, (_, index) => 20 + index * 10)
export const STRIPE_THICKNESS_VALUES = [2, 4, 6, 8, 10, 12]
export const STRIPE_COUNT_VALUES = Array.from({ length: 11 }, (_, index) => 4 + index)
// These four channel values are chosen so the rendered background colors remain
// visually distinct after the fixed background darkening pass.
export const COLOR_STEP_VALUES = [0, 144, 200, 255]
export const BACKGROUND_DARKEN_AMOUNT = 72
export const DRIFT_SPEEDS = {
  verySlow: 4,
  slow: 8,
  medium: 12,
  fast: 16,
  veryFast: 20,
} as const

export const SHAPE_GUIDES = [
  {
    key: 'line',
    centerX: 31.25,
    overlay: {
      kind: 'line',
      halfWidth: 28,
      halfHeight: 3,
      bumpDirection: 'up',
      bumpLength: 19,
    },
  },
  {
    key: 'square',
    centerX: 62.5,
    overlay: {
      kind: 'square',
      halfWidth: 20,
      halfHeight: 20,
      bumpDirection: 'up',
      bumpLength: 36,
    },
  },
  {
    key: 'rectangle',
    centerX: 93.75,
    overlay: {
      kind: 'rectangle',
      halfWidth: 28,
      halfHeight: 16,
      bumpDirection: 'right',
      bumpLength: 44,
    },
  },
] as const

export const INITIAL_STATE: PuzzleState = {
  lineRotation: 0,
  lineY: 20,
  squareRotation: 330,
  squareY: 30,
  rectangleRotation: 120,
  rectangleY: 40,
  stripeThickness: 4,
  stripeCount: 6,
  driftSpeed: 'slow',
  colorR: 144,
  colorG: 200,
  colorB: 255,
}
