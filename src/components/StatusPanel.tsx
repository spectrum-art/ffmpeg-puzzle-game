import type { EngineStatus, PuzzleStage, ValidationResult } from '../game/types'

type StatusPanelProps = {
  currentStage: PuzzleStage
  solvedCount: number
  engineStatus: EngineStatus
  renderedTickCount: number
  validation: ValidationResult
  errorMessage: string | null
}

export function StatusPanel({
  currentStage,
  solvedCount,
  engineStatus,
  renderedTickCount,
  validation,
  errorMessage,
}: StatusPanelProps) {
  return (
    <section className="status-panel" aria-live="polite">
      <div className="status-panel__row">
        <div>
          <p className="status-panel__eyebrow">Mission progress</p>
          <strong>{solvedCount}/3 banks calibrated</strong>
          <p>{progressCopy(currentStage, validation.pendingRenderedFrame)}</p>
        </div>
        <div>
          <p className="status-panel__eyebrow">Render cadence</p>
          <strong>{renderedTickCount} frames rendered</strong>
          <p>
            {engineStatus === 'ready'
              ? 'Fixed 100 ms tick, latest-state only.'
              : 'Viewport will animate once the FFmpeg core is online.'}
          </p>
        </div>
      </div>
      {errorMessage ? <p className="status-panel__error">{errorMessage}</p> : null}
    </section>
  )
}

function progressCopy(currentStage: PuzzleStage, pendingRenderedFrame: boolean): string {
  if (currentStage === 'complete') {
    return 'Calibration complete. The alien console is now holding a stable image.'
  }

  if (pendingRenderedFrame) {
    return 'Target values reached. Waiting for the next rendered frame to confirm the lock.'
  }

  switch (currentStage) {
    case 'shapes':
      return 'Use the ghost silhouettes to position the three instruments.'
    case 'stripes':
      return 'Line count, width, and drift speed all affect the diagonal field.'
    case 'color':
      return 'Match the border swatch by dialing the stripe RGB channels.'
  }
}
