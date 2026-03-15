import { DISPLAY_SIZE, DRIFT_SPEEDS, INTERNAL_RENDER_SIZE } from './constants'
import type { DriftSpeedKey } from './types'

type StripeFieldInput = {
  stripeThickness: number
  stripeCount: number
  driftSpeed: DriftSpeedKey
}

export type StripeGuideSegment = {
  lineCenter: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export function getStripeFieldMetrics(
  input: StripeFieldInput,
  simulationTime: number,
  renderSize = INTERNAL_RENDER_SIZE,
  displaySize = DISPLAY_SIZE,
) {
  const displayScale = displaySize / renderSize
  const spacing = getStripeSpacing(renderSize, input.stripeCount)
  const offset = getStripeOffset(simulationTime, input.driftSpeed)
  const thickness = input.stripeThickness

  return {
    spacing,
    offset,
    thickness,
    displaySpacing: spacing * displayScale,
    displayOffset: offset * displayScale,
    displayThickness: (thickness * displayScale) / Math.SQRT2,
  }
}

export function buildStripeGuideSegments(
  displaySize: number,
  spacing: number,
  offset: number,
  thickness: number,
): StripeGuideSegment[] {
  if (spacing <= 0 || thickness <= 0) {
    return []
  }

  return buildStripeGuideLineCenters(displaySize, spacing, offset, thickness)
    .map((lineCenter) => clipDiagonalBandCenter(lineCenter, displaySize))
    .filter((segment): segment is StripeGuideSegment => segment !== null)
}

export function selectReferenceStripeGuideSegments(
  segments: StripeGuideSegment[],
  displaySize: number,
  limit = 3,
) {
  const primary = selectNearestSegmentsInRange(segments, 0, displaySize, displaySize / 2, limit)
  const secondary = selectNearestSegmentsInRange(
    segments,
    displaySize,
    displaySize * 2,
    displaySize * 1.5,
    limit,
  )

  return { primary, secondary }
}

export function getStripeSpacing(size: number, stripeCount: number) {
  return (size * 2) / stripeCount
}

export function getStripeOffset(simulationTime: number, driftSpeed: DriftSpeedKey) {
  return simulationTime * DRIFT_SPEEDS[driftSpeed]
}

function buildStripeGuideLineCenters(
  displaySize: number,
  spacing: number,
  offset: number,
  thickness: number,
) {
  const periodStart = positiveModulo(-offset, spacing)
  const maxDiagonal = displaySize * 2
  const lineCenters: number[] = []

  for (
    let lineCenter = periodStart + thickness / 2 - spacing;
    lineCenter <= maxDiagonal + spacing;
    lineCenter += spacing
  ) {
    lineCenters.push(lineCenter)
  }

  return lineCenters
}

function clipDiagonalBandCenter(lineCenter: number, displaySize: number): StripeGuideSegment | null {
  const intersections: Array<{ x: number; y: number }> = []

  if (lineCenter >= 0 && lineCenter <= displaySize) {
    intersections.push({ x: 0, y: lineCenter })
    intersections.push({ x: lineCenter, y: 0 })
  } else if (lineCenter > displaySize && lineCenter <= displaySize * 2) {
    intersections.push({ x: lineCenter - displaySize, y: displaySize })
    intersections.push({ x: displaySize, y: lineCenter - displaySize })
  }

  if (intersections.length < 2) {
    return null
  }

  return {
    lineCenter,
    x1: intersections[0].x,
    y1: intersections[0].y,
    x2: intersections[1].x,
    y2: intersections[1].y,
  }
}

function selectNearestSegmentsInRange(
  segments: StripeGuideSegment[],
  min: number,
  max: number,
  focus: number,
  limit: number,
) {
  return segments
    .filter((segment) => segment.lineCenter >= min && segment.lineCenter <= max)
    .sort((left, right) => Math.abs(left.lineCenter - focus) - Math.abs(right.lineCenter - focus))
    .slice(0, limit)
    .sort((left, right) => left.lineCenter - right.lineCenter)
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}
