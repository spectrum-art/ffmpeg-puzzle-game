import { decompressFrames, parseGIF } from 'gifuct-js'

type GifFramePatch = {
  dims: {
    left: number
    top: number
    width: number
    height: number
  }
  patch: Uint8ClampedArray
  disposalType?: number
}

type ParsedGif = {
  lsd: {
    width: number
    height: number
  }
}

export type DecodedGif = {
  width: number
  height: number
  frames: HTMLCanvasElement[]
}

export async function decodeGif(url: string): Promise<DecodedGif> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const parsedGif = parseGIF(buffer) as ParsedGif
  const rawFrames = decompressFrames(parsedGif as never, true) as GifFramePatch[]
  const width = parsedGif.lsd.width
  const height = parsedGif.lsd.height
  const compositeCanvas = document.createElement('canvas')
  compositeCanvas.width = width
  compositeCanvas.height = height
  const compositeContext = compositeCanvas.getContext('2d', { willReadFrequently: true })

  if (!compositeContext) {
    throw new Error('GIF composite context could not be created.')
  }

  const frames: HTMLCanvasElement[] = []
  let previousSnapshot: ImageData | null = null
  let previousDisposalType = 0
  let previousDims: GifFramePatch['dims'] | null = null

  rawFrames.forEach((frame) => {
    if (previousDisposalType === 2 && previousDims) {
      compositeContext.clearRect(
        previousDims.left,
        previousDims.top,
        previousDims.width,
        previousDims.height,
      )
    } else if (previousDisposalType === 3 && previousSnapshot) {
      compositeContext.putImageData(previousSnapshot, 0, 0)
    }

    if (frame.disposalType === 3) {
      previousSnapshot = compositeContext.getImageData(0, 0, width, height)
    } else {
      previousSnapshot = null
    }

    const patchData = new Uint8ClampedArray(frame.patch.length)
    patchData.set(frame.patch)
    const patch = new ImageData(patchData, frame.dims.width, frame.dims.height)
    compositeContext.putImageData(patch, frame.dims.left, frame.dims.top)

    const snapshotCanvas = document.createElement('canvas')
    snapshotCanvas.width = width
    snapshotCanvas.height = height
    const snapshotContext = snapshotCanvas.getContext('2d')

    if (!snapshotContext) {
      throw new Error('GIF snapshot context could not be created.')
    }

    snapshotContext.drawImage(compositeCanvas, 0, 0)
    frames.push(snapshotCanvas)

    previousDisposalType = frame.disposalType ?? 0
    previousDims = frame.dims
  })

  return {
    width,
    height,
    frames,
  }
}
