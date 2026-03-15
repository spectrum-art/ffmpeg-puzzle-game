import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { BACKGROUND_DARKEN_AMOUNT, INTERNAL_RENDER_SIZE } from './constants'
import { getStripeFieldMetrics } from './stripeField'
import type { PuzzleState, Renderer } from './types'

const CORE_VERSION = '0.12.10'
const CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`
const RENDERER_RECYCLE_INTERVAL = 120
const OUTPUT_PATH = 'frame.rgba'
const VERBOSE_DIAGNOSTICS = readVerboseDiagnosticsFlag()

type Rgb = {
  r: number
  g: number
  b: number
}

export class WasmPuzzleRenderer implements Renderer {
  private ffmpeg: FFmpeg | null = null
  private initialized = false
  private renderIndex = 0
  private recentLogs: string[] = []
  private rendererInstanceId = 0
  private coreURL: string | null = null
  private wasmURL: string | null = null
  private initPromise: Promise<void> | null = null

  constructor() {
    this.createFFmpegInstance()
  }

  async initRenderer(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      logVerbose('[renderer] init start', {
        rendererInstanceId: this.rendererInstanceId,
        renderIndex: this.renderIndex,
      })

      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      ])

      this.coreURL = coreURL
      this.wasmURL = wasmURL

      if (!this.ffmpeg) {
        this.createFFmpegInstance()
      }

      const ffmpeg = this.ffmpeg
      if (!ffmpeg) {
        throw new Error('Renderer instance could not be created during initialization.')
      }

      await ffmpeg.load({
        coreURL,
        wasmURL,
      })

      this.initialized = true
      logVerbose('[renderer] init complete', {
        rendererInstanceId: this.rendererInstanceId,
      })
    })().finally(() => {
      this.initPromise = null
    })

    return this.initPromise
  }

  async resetRenderer(): Promise<void> {
    console.warn('[renderer] reset start', {
      rendererInstanceId: this.rendererInstanceId,
      renderIndex: this.renderIndex,
    })

    this.ffmpeg?.terminate()
    this.ffmpeg = null
    this.initialized = false
    this.initPromise = null
    this.recentLogs = []

    if (this.coreURL) {
      URL.revokeObjectURL(this.coreURL)
      this.coreURL = null
    }

    if (this.wasmURL) {
      URL.revokeObjectURL(this.wasmURL)
      this.wasmURL = null
    }

    this.createFFmpegInstance()

    console.warn('[renderer] reset complete', {
      rendererInstanceId: this.rendererInstanceId,
    })
  }

  async renderFrame(state: PuzzleState, simulationTime: number): Promise<ImageData> {
    if (this.renderIndex > 0 && this.renderIndex % RENDERER_RECYCLE_INTERVAL === 0) {
      console.warn('[renderer] recycling before render', {
        rendererInstanceId: this.rendererInstanceId,
        renderIndex: this.renderIndex,
      })
      await this.resetRenderer()
    }

    await this.initRenderer()
    this.recentLogs = []

    const renderNumber = this.renderIndex
    this.renderIndex += 1
    const renderStartedAt = performance.now()

    logVerbose('[renderer] render start', {
      rendererInstanceId: this.rendererInstanceId,
      renderNumber,
      simulationTime,
      outputPath: OUTPUT_PATH,
      state,
    })

    if (!this.ffmpeg) {
      throw new Error('Renderer instance missing before render execution.')
    }

    const args = [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      buildFiltergraph(state, simulationTime),
      '-frames:v',
      '1',
      '-pix_fmt',
      'rgba',
      '-f',
      'rawvideo',
      '-y',
      OUTPUT_PATH,
    ]

    const exitCode = await this.execFrame(args)

    logVerbose('[renderer] exec complete', {
      rendererInstanceId: this.rendererInstanceId,
      renderNumber,
      exitCode,
      elapsedMs: Math.round(performance.now() - renderStartedAt),
    })

    if (exitCode !== 0) {
      throw new Error(buildRenderError(exitCode, this.recentLogs))
    }

    const frame = await this.readOutputFile(renderNumber)
    const bytes =
      typeof frame === 'string' ? new TextEncoder().encode(frame) : Uint8Array.from(frame)

    const expectedLength = INTERNAL_RENDER_SIZE * INTERNAL_RENDER_SIZE * 4
    if (bytes.length !== expectedLength) {
      throw new Error(
        `FFmpeg produced ${bytes.length} bytes, expected ${expectedLength} for a raw RGBA frame.`,
      )
    }

    logVerbose('[renderer] render ready', {
      rendererInstanceId: this.rendererInstanceId,
      renderNumber,
      byteLength: bytes.length,
      totalElapsedMs: Math.round(performance.now() - renderStartedAt),
    })

    return new ImageData(
      new Uint8ClampedArray(bytes.buffer.slice(0, expectedLength)),
      INTERNAL_RENDER_SIZE,
      INTERNAL_RENDER_SIZE,
    )
  }

  private async execFrame(args: string[]) {
    if (!this.ffmpeg) {
      throw new Error('Renderer instance missing before frame execution.')
    }

    try {
      return await this.ffmpeg.exec(args, 4_000)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/already\s+running/i.test(message)) {
        throw error
      }

      console.warn('[renderer] ffmpeg exec reported an overlapping run, recycling instance', {
        rendererInstanceId: this.rendererInstanceId,
        renderIndex: this.renderIndex,
        message,
      })

      await this.resetRenderer()
      await this.initRenderer()

      if (!this.ffmpeg) {
        throw new Error('Renderer instance missing after exec recovery.')
      }

      return this.ffmpeg.exec(args, 4_000)
    }
  }

  private createFFmpegInstance() {
    this.rendererInstanceId += 1
    this.ffmpeg = new FFmpeg()
    this.ffmpeg.on('log', ({ message }: { message: string }) => {
      const next = message.trim()
      if (!next) {
        return
      }

      this.recentLogs = [...this.recentLogs.slice(-11), next]
    })
  }

  private async readOutputFile(renderNumber: number) {
    if (!this.ffmpeg) {
      throw new Error('Renderer instance missing during output read.')
    }

    try {
      const frame = await this.ffmpeg.readFile(OUTPUT_PATH)
      logVerbose('[renderer] readFile complete', {
        rendererInstanceId: this.rendererInstanceId,
        renderNumber,
        outputPath: OUTPUT_PATH,
      })
      return frame
    } catch (error) {
      let directoryListing: unknown = 'unavailable'

      try {
        directoryListing = await this.ffmpeg.listDir('/')
      } catch (listError) {
        directoryListing =
          listError instanceof Error ? listError.message : 'listDir failed unexpectedly'
      }

      console.error('[renderer] readFile failed', {
        rendererInstanceId: this.rendererInstanceId,
        renderNumber,
        outputPath: OUTPUT_PATH,
        directoryListing,
        recentLogs: this.recentLogs,
        error,
      })

      throw error
    }
  }
}

function logVerbose(message: string, details: Record<string, unknown>) {
  if (!VERBOSE_DIAGNOSTICS) {
    return
  }

  console.log(message, details)
}

function readVerboseDiagnosticsFlag() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const search = new URLSearchParams(window.location.search)
    return search.has('debug') || window.localStorage.getItem('ffmpeg-puzzle-debug') === '1'
  } catch {
    return false
  }
}

export function buildFiltergraph(state: PuzzleState, simulationTime: number): string {
  const stripeColor = {
    r: state.colorR,
    g: state.colorG,
    b: state.colorB,
  }

  const backgroundColor = darken(stripeColor, BACKGROUND_DARKEN_AMOUNT)
  const { spacing, offset } = getStripeFieldMetrics(state, simulationTime, INTERNAL_RENDER_SIZE)
  const size = `${INTERNAL_RENDER_SIZE}x${INTERNAL_RENDER_SIZE}`
  const stripeMask = `lt(mod(X+Y+${offset.toFixed(2)},${spacing.toFixed(2)}),${state.stripeThickness})`
  const lineMask = buildLineShapeMask(31.25, state.lineY, state.lineRotation)
  const squareMask = buildSquareShapeMask(62.5, state.squareY, state.squareRotation)
  const rectangleMask = buildRectangleShapeMask(93.75, state.rectangleY, state.rectangleRotation)
  const shapeMask = `gt(${lineMask}+${squareMask}+${rectangleMask},0)`

  return `nullsrc=s=${size},format=rgba,geq=r='if(${shapeMask},241,if(${stripeMask},${stripeColor.r},${backgroundColor.r}))':g='if(${shapeMask},212,if(${stripeMask},${stripeColor.g},${backgroundColor.g}))':b='if(${shapeMask},138,if(${stripeMask},${stripeColor.b},${backgroundColor.b}))':a='255'`
}

function darken(color: Rgb, amount: number): Rgb {
  return {
    r: Math.max(0, color.r - amount),
    g: Math.max(0, color.g - amount),
    b: Math.max(0, color.b - amount),
  }
}

function buildRenderError(exitCode: number, recentLogs: string[]): string {
  const tail = recentLogs.at(-1)
  return tail
    ? `FFmpeg exited with code ${exitCode}: ${tail}`
    : `FFmpeg exited with code ${exitCode} before producing a frame.`
}

function buildLineShapeMask(centerX: number, centerY: number, rotationDegrees: number): string {
  const rotated = buildRotatedCoordinates(centerX, centerY, rotationDegrees)
  const bar = buildLocalRectMask(rotated, -14, 14, -1.5, 1.5)
  const bump = buildLocalRectMask(rotated, -1.5, 1.5, -9.5, 0)
  return `(${bar})+(${bump})`
}

function buildSquareShapeMask(centerX: number, centerY: number, rotationDegrees: number): string {
  const rotated = buildRotatedCoordinates(centerX, centerY, rotationDegrees)
  const box = buildLocalRectMask(rotated, -10, 10, -10, 10)
  const bump = buildLocalRectMask(rotated, -1.5, 1.5, -18, 0)
  return `(${box})+(${bump})`
}

function buildRectangleShapeMask(centerX: number, centerY: number, rotationDegrees: number): string {
  const rotated = buildRotatedCoordinates(centerX, centerY, rotationDegrees)
  const box = buildLocalRectMask(rotated, -14, 14, -8, 8)
  const bump = buildLocalRectMask(rotated, 0, 22, -1.5, 1.5)
  return `(${box})+(${bump})`
}

function buildLocalRectMask(
  rotated: { x: string; y: string },
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
) {
  return `gte(${rotated.x},${minX})*lte(${rotated.x},${maxX})*gte(${rotated.y},${minY})*lte(${rotated.y},${maxY})`
}

function buildRotatedCoordinates(centerX: number, centerY: number, rotationDegrees: number) {
  const radians = (rotationDegrees * Math.PI) / 180
  const cos = Math.cos(radians).toFixed(4)
  const sin = Math.sin(radians).toFixed(4)
  const deltaX = `(X-${centerX.toFixed(2)})`
  const deltaY = `(Y-${centerY.toFixed(2)})`

  return {
    x: `((${deltaX}*${cos})+(${deltaY}*${sin}))`,
    y: `((-${deltaX}*${sin})+(${deltaY}*${cos}))`,
  }
}
