import { BACKGROUND_DARKEN_AMOUNT, STAGE_SEQUENCE } from './constants'
import type { PuzzleStage, PuzzleState, PuzzleTargets, StageTarget, ValidationResult } from './types'

function matchesTarget(state: PuzzleState, target: StageTarget): boolean {
  return Object.entries(target).every(([key, value]) => state[key as keyof PuzzleState] === value)
}

export function validateStage(state: PuzzleState, stage: PuzzleStage, targets: PuzzleTargets): boolean {
  if (stage === 'complete') {
    return true
  }

  return matchesTarget(state, targets[stage])
}

export function nextStage(stage: PuzzleStage): PuzzleStage {
  const currentIndex = STAGE_SEQUENCE.indexOf(stage)
  return STAGE_SEQUENCE[Math.min(currentIndex + 1, STAGE_SEQUENCE.length - 1)]
}

export function getValidationResult(
  currentStage: PuzzleStage,
  latestState: PuzzleState,
  lastRenderedState: PuzzleState | null,
  targets: PuzzleTargets,
): ValidationResult {
  if (currentStage === 'complete') {
    return {
      currentStage,
      matchesTarget: true,
      pendingRenderedFrame: false,
      stageComplete: true,
    }
  }

  const matches = validateStage(latestState, currentStage, targets)
  const renderedMatches = lastRenderedState ? validateStage(lastRenderedState, currentStage, targets) : false

  return {
    currentStage,
    matchesTarget: matches,
    pendingRenderedFrame: matches && !renderedMatches,
    stageComplete: renderedMatches,
  }
}

export function getStageTitle(stage: PuzzleStage): string {
  switch (stage) {
    case 'shapes':
      return 'Align the ghost silhouettes'
    case 'stripes':
      return 'Lock the diagonal field'
    case 'color':
      return 'Match the border spectrum'
    case 'complete':
      return 'Calibration complete'
  }
}

export function getTargetBackgroundColor(target: StageTarget): [number, number, number] {
  return getBackgroundColorFromRgb(target.colorR ?? 0, target.colorG ?? 0, target.colorB ?? 0)
}

export function getBackgroundColorFromRgb(
  colorR: number,
  colorG: number,
  colorB: number,
): [number, number, number] {
  return [
    Math.max(0, colorR - BACKGROUND_DARKEN_AMOUNT),
    Math.max(0, colorG - BACKGROUND_DARKEN_AMOUNT),
    Math.max(0, colorB - BACKGROUND_DARKEN_AMOUNT),
  ]
}
