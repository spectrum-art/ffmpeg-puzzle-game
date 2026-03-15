import { describe, expect, it } from 'vitest'
import { INITIAL_STATE } from './constants'
import { normalizePatch } from './quantization'

describe('normalizePatch', () => {
  it('snaps raw values to the nearest allowed control step', () => {
    const result = normalizePatch(INITIAL_STATE, {
      lineRotation: 22,
      lineY: 64,
      stripeThickness: 5,
      stripeCount: 11.6,
      colorB: 149,
    })

    expect(result.lineRotation).toBe(30)
    expect(result.lineY).toBe(60)
    expect(result.stripeThickness).toBe(4)
    expect(result.stripeCount).toBe(12)
    expect(result.colorB).toBe(144)
  })
})
