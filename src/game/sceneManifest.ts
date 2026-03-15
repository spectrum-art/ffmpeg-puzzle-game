import type { DriftSpeedKey, PuzzleState } from './types'

export const SCENE_WIDTH = 640
export const SCENE_HEIGHT = 480

export type SceneRect = {
  x: number
  y: number
  width: number
  height: number
}

export type SceneKnobConfig = {
  id: string
  key: keyof PuzzleState
  rect: SceneRect
  center: { x: number; y: number }
  hitRadius: number
}

export type SceneSliderConfig = {
  id: string
  key: keyof PuzzleState
  rect: SceneRect
  trackStartX: number
  trackEndX: number
}

export type SceneVerticalSliderConfig = {
  id: string
  key: keyof PuzzleState
  x: number
  positionsY: readonly number[]
  rect: {
    width: number
    height: number
  }
}

export const VIEWPORT_RECT: SceneRect = {
  x: 237,
  y: 90,
  width: 250,
  height: 250,
}

export const CRT_GLASS_RECT: SceneRect = {
  x: 232,
  y: 85,
  width: 260,
  height: 260,
}

export const LED_RECT: SceneRect = {
  x: 325,
  y: 357,
  width: 96,
  height: 20,
}

export const FRAME_COUNTER_RECT: SceneRect = {
  x: 504,
  y: 13,
  width: 42,
  height: 18,
}

export const PHASE_3_CURRENT_RECT: SceneRect = {
  x: 477,
  y: 411,
  width: 22,
  height: 22,
}

export const PHASE_3_TARGET_RECT: SceneRect = {
  x: 477,
  y: 438,
  width: 22,
  height: 22,
}

export const CURSOR_HOTSPOT = { x: 2, y: 2 }

export const PHASE_1_KNOBS: SceneKnobConfig[] = [
  {
    id: 'line-rotation',
    key: 'lineRotation',
    rect: { x: 110, y: 74, width: 31, height: 31 },
    center: { x: 125.5, y: 89.5 },
    hitRadius: 15,
  },
  {
    id: 'square-rotation',
    key: 'squareRotation',
    rect: { x: 110, y: 116, width: 31, height: 31 },
    center: { x: 125.5, y: 131.5 },
    hitRadius: 15,
  },
  {
    id: 'rectangle-rotation',
    key: 'rectangleRotation',
    rect: { x: 110, y: 159, width: 31, height: 31 },
    center: { x: 125.5, y: 174.5 },
    hitRadius: 15,
  },
]

export const PHASE_3_SLIDERS: SceneVerticalSliderConfig[] = [
  {
    id: 'color-r',
    key: 'colorR',
    x: 410,
    positionsY: [455, 439, 424, 408],
    rect: { width: 12, height: 14 },
  },
  {
    id: 'color-g',
    key: 'colorG',
    x: 432,
    positionsY: [455, 439, 424, 408],
    rect: { width: 12, height: 14 },
  },
  {
    id: 'color-b',
    key: 'colorB',
    x: 454,
    positionsY: [455, 439, 424, 408],
    rect: { width: 12, height: 14 },
  },
]

export const SLIDER_HANDLES: SceneSliderConfig[] = [
  {
    id: 'line-y',
    key: 'lineY',
    rect: { x: 93, y: 408, width: 20, height: 17 },
    trackStartX: 93,
    trackEndX: 218,
  },
  {
    id: 'square-y',
    key: 'squareY',
    rect: { x: 93, y: 428, width: 20, height: 17 },
    trackStartX: 93,
    trackEndX: 218,
  },
  {
    id: 'rectangle-y',
    key: 'rectangleY',
    rect: { x: 93, y: 448, width: 20, height: 17 },
    trackStartX: 93,
    trackEndX: 218,
  },
  {
    id: 'stripe-thickness',
    key: 'stripeThickness',
    rect: { x: 250, y: 408, width: 20, height: 17 },
    trackStartX: 250,
    trackEndX: 375,
  },
  {
    id: 'stripe-count',
    key: 'stripeCount',
    rect: { x: 250, y: 428, width: 20, height: 17 },
    trackStartX: 250,
    trackEndX: 375,
  },
  {
    id: 'drift-speed',
    key: 'driftSpeed',
    rect: { x: 250, y: 448, width: 20, height: 17 },
    trackStartX: 250,
    trackEndX: 375,
  },
]

export const SPEED_OPTIONS: DriftSpeedKey[] = ['verySlow', 'slow', 'medium', 'fast', 'veryFast']
