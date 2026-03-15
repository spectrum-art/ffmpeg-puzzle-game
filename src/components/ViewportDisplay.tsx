import { useEffect, useRef } from 'react'
import {
  DISPLAY_SIZE,
  INTERNAL_RENDER_SIZE,
  SHAPE_GUIDES,
} from '../game/constants'
import { buildStripeGuideSegments, getStripeFieldMetrics } from '../game/stripeField'
import { FALLBACK_PUZZLE_TARGETS } from '../game/targets'
import type { PuzzleStage, PuzzleState, PuzzleTargets } from '../game/types'

type ViewportDisplayProps = {
  frame: ImageData | null
  currentStage: PuzzleStage
  puzzleState: PuzzleState
  targets?: PuzzleTargets
  simulationTime: number
  isReady: boolean
}

export function ViewportDisplay({
  frame,
  currentStage,
  puzzleState,
  targets,
  simulationTime,
  isReady,
}: ViewportDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeTargets = targets ?? FALLBACK_PUZZLE_TARGETS

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.imageSmoothingEnabled = false
    context.clearRect(0, 0, INTERNAL_RENDER_SIZE, INTERNAL_RENDER_SIZE)

    if (frame) {
      context.putImageData(frame, 0, 0)
    }
  }, [frame])

  const showShapeGuides = currentStage === 'shapes'
  const showStripeGuides =
    currentStage === 'stripes' || currentStage === 'color' || currentStage === 'complete'
  const stripeGuideMetrics = getStripeFieldMetrics(
    {
      stripeThickness: activeTargets.stripes.stripeThickness ?? 6,
      stripeCount: activeTargets.stripes.stripeCount ?? 9,
      driftSpeed: activeTargets.stripes.driftSpeed ?? 'medium',
    },
    simulationTime,
  )
  const stripeGuideSegments = buildStripeGuideSegments(
    DISPLAY_SIZE,
    stripeGuideMetrics.displaySpacing,
    stripeGuideMetrics.displayOffset,
    stripeGuideMetrics.displayThickness,
  )
  const stripeGuideMatchCount = getStripeGuideMatchCount(puzzleState, activeTargets)
  const stripeGuideStroke = getStripeGuideStroke(stripeGuideMatchCount)

  return (
    <div className={isReady ? 'scene-viewport is-ready' : 'scene-viewport'}>
      <canvas
        ref={canvasRef}
        width={INTERNAL_RENDER_SIZE}
        height={INTERNAL_RENDER_SIZE}
        className="scene-viewport__canvas"
        aria-label="Puzzle viewport"
      />
      <svg
        className="scene-viewport__overlay"
        viewBox={`0 0 ${DISPLAY_SIZE} ${DISPLAY_SIZE}`}
        aria-hidden="true"
      >
        {showShapeGuides
          ? SHAPE_GUIDES.map((shape) => (
                <g
                  key={shape.key}
                  transform={`translate(${shape.centerX * 2} ${getShapeTargetY(shape.key, activeTargets) * 2}) rotate(${getShapeTargetRotation(shape.key, activeTargets)})`}
                >
                  {shape.overlay.kind === 'line' ? (
                    <>
                      <line
                        x1={-shape.overlay.halfWidth}
                        y1={0}
                        x2={shape.overlay.halfWidth}
                        y2={0}
                        stroke="rgba(81, 211, 192, 0.9)"
                        strokeWidth="3"
                        strokeLinecap="square"
                      />
                      <line
                        x1={0}
                        y1={0}
                        x2={0}
                        y2={-shape.overlay.bumpLength}
                        stroke="rgba(81, 211, 192, 0.9)"
                        strokeWidth="3"
                        strokeLinecap="square"
                      />
                    </>
                  ) : null}
                  {shape.overlay.kind === 'square' ? (
                    <>
                      <rect
                        x={-shape.overlay.halfWidth}
                        y={-shape.overlay.halfHeight}
                        width={shape.overlay.halfWidth * 2}
                        height={shape.overlay.halfHeight * 2}
                        fill="none"
                        stroke="rgba(81, 211, 192, 0.9)"
                        strokeWidth="3"
                        strokeLinejoin="miter"
                      />
                      <line
                        x1={0}
                        y1={0}
                        x2={0}
                        y2={-shape.overlay.bumpLength}
                        stroke="rgba(81, 211, 192, 0.9)"
                        strokeWidth="3"
                        strokeLinecap="square"
                      />
                    </>
                  ) : null}
                  {shape.overlay.kind === 'rectangle' ? (
                    <>
                      <rect
                        x={-shape.overlay.halfWidth}
                        y={-shape.overlay.halfHeight}
                        width={shape.overlay.halfWidth * 2}
                        height={shape.overlay.halfHeight * 2}
                        fill="none"
                        stroke="rgba(81, 211, 192, 0.9)"
                        strokeWidth="3"
                        strokeLinejoin="miter"
                      />
                      <line
                        x1={0}
                        y1={0}
                        x2={shape.overlay.bumpLength}
                        y2={0}
                        stroke="rgba(81, 211, 192, 0.9)"
                        strokeWidth="3"
                        strokeLinecap="square"
                      />
                    </>
                  ) : null}
                </g>
              ))
          : null}

        {showStripeGuides
          ? (
              <g className="scene-viewport__stripe-guides">
                {stripeGuideSegments.map((segment, index) => (
                  <line
                    key={`${segment.lineCenter}-${index}`}
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    stroke={stripeGuideStroke}
                    strokeWidth={stripeGuideMetrics.displayThickness}
                    strokeLinecap="square"
                  />
                ))}
              </g>
            )
          : null}
      </svg>
      {!isReady ? (
        <div className="scene-viewport__loading">
          <div className="scene-viewport__loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="sr-only">Loading FFmpeg renderer</span>
        </div>
      ) : null}
    </div>
  )
}

function getStripeGuideMatchCount(puzzleState: PuzzleState, targets: PuzzleTargets) {
  let matchCount = 0

  if (puzzleState.stripeThickness === targets.stripes.stripeThickness) {
    matchCount += 1
  }

  if (puzzleState.stripeCount === targets.stripes.stripeCount) {
    matchCount += 1
  }

  if (puzzleState.driftSpeed === targets.stripes.driftSpeed) {
    matchCount += 1
  }

  return matchCount
}

function getShapeTargetRotation(shapeKey: (typeof SHAPE_GUIDES)[number]['key'], targets: PuzzleTargets) {
  switch (shapeKey) {
    case 'line':
      return targets.shapes.lineRotation ?? 0
    case 'square':
      return targets.shapes.squareRotation ?? 0
    case 'rectangle':
      return targets.shapes.rectangleRotation ?? 0
  }
}

function getShapeTargetY(shapeKey: (typeof SHAPE_GUIDES)[number]['key'], targets: PuzzleTargets) {
  switch (shapeKey) {
    case 'line':
      return targets.shapes.lineY ?? 20
    case 'square':
      return targets.shapes.squareY ?? 20
    case 'rectangle':
      return targets.shapes.rectangleY ?? 20
  }
}

function getStripeGuideStroke(matchCount: number) {
  switch (matchCount) {
    case 0:
      return 'rgba(216, 106, 92, 0.32)'
    case 1:
      return 'rgba(225, 198, 102, 0.32)'
    case 2:
      return 'rgba(98, 156, 222, 0.32)'
    default:
      return 'rgba(111, 209, 153, 0.32)'
  }
}
