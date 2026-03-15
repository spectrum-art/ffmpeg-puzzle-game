export type PuzzleStage = 'shapes' | 'stripes' | 'color' | 'complete'
export type EngineStatus = 'booting' | 'ready' | 'error'
export type DriftSpeedKey = 'verySlow' | 'slow' | 'medium' | 'fast' | 'veryFast'

export type PuzzleState = {
  lineRotation: number
  lineY: number
  squareRotation: number
  squareY: number
  rectangleRotation: number
  rectangleY: number
  stripeThickness: number
  stripeCount: number
  driftSpeed: DriftSpeedKey
  colorR: number
  colorG: number
  colorB: number
}

export type StageTarget = Partial<PuzzleState>
export type PuzzleTargets = Record<'shapes' | 'stripes' | 'color', StageTarget>

export type ValidationResult = {
  currentStage: PuzzleStage
  matchesTarget: boolean
  pendingRenderedFrame: boolean
  stageComplete: boolean
}

export type Renderer = {
  initRenderer: () => Promise<void>
  renderFrame: (state: PuzzleState, simulationTime: number) => Promise<ImageData>
  resetRenderer: () => Promise<void>
}
