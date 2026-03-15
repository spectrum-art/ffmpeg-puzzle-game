import { useEffect, useRef, useState } from 'react'
import { INITIAL_STATE, RENDER_INTERVAL_MS } from './constants'
import { normalizePatch } from './quantization'
import { WasmPuzzleRenderer } from './renderer'
import type { EngineStatus, PuzzleStage, PuzzleState, PuzzleTargets, Renderer } from './types'
import { getValidationResult, nextStage, validateStage } from './validation'

const RENDER_STALL_TIMEOUT_MS = 12000
const VERBOSE_DIAGNOSTICS = readVerboseDiagnosticsFlag()

export function usePuzzleEngine(targets: PuzzleTargets) {
  const rendererRef = useRef<Renderer>(new WasmPuzzleRenderer())
  const renderInFlightRef = useRef(false)
  const sessionRef = useRef(0)
  const tickIndexRef = useRef(0)
  const stateVersionRef = useRef(0)
  const renderAttemptRef = useRef(0)
  const latestStateRef = useRef<PuzzleState>(INITIAL_STATE)
  const engineStatusRef = useRef<EngineStatus>('booting')
  const currentStageRef = useRef<PuzzleStage>('shapes')
  const renderTickRef = useRef<() => Promise<void>>(async () => {})

  const [engineStatus, setEngineStatus] = useState<EngineStatus>('booting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [frame, setFrame] = useState<ImageData | null>(null)
  const [lastRenderSimulationTime, setLastRenderSimulationTime] = useState(0)
  const [renderedTickCount, setRenderedTickCount] = useState(0)
  const [puzzleState, setPuzzleState] = useState(INITIAL_STATE)
  const [lastRenderedState, setLastRenderedState] = useState<PuzzleState | null>(null)
  const [currentStage, setCurrentStage] = useState<PuzzleStage>('shapes')
  const [solvedStages, setSolvedStages] = useState<Array<'shapes' | 'stripes' | 'color'>>([])

  function applyEngineStatus(status: EngineStatus) {
    engineStatusRef.current = status
    setEngineStatus(status)
  }

  renderTickRef.current = async () => {
    if (engineStatusRef.current !== 'ready' || renderInFlightRef.current) {
      return
    }

    renderInFlightRef.current = true

    const snapshot = latestStateRef.current
    const stageAtRender = currentStageRef.current
    const sessionAtRender = sessionRef.current
    const stateVersionAtRender = stateVersionRef.current
    const simulationTime = tickIndexRef.current * (RENDER_INTERVAL_MS / 1000)
    const renderAttempt = ++renderAttemptRef.current
    const startedAt = performance.now()
    tickIndexRef.current += 1

    logVerbose('[engine] render tick start', {
      renderAttempt,
      tickIndex: tickIndexRef.current - 1,
      sessionAtRender,
      stateVersionAtRender,
      stageAtRender,
      simulationTime,
      snapshot,
    })

    try {
      const nextFrame = await promiseWithTimeout(
        rendererRef.current.renderFrame(snapshot, simulationTime),
        RENDER_STALL_TIMEOUT_MS,
        `render attempt ${renderAttempt} exceeded ${RENDER_STALL_TIMEOUT_MS}ms`,
      )

      if (sessionAtRender !== sessionRef.current) {
        logVerbose('[engine] render discarded after session change', {
          renderAttempt,
          sessionAtRender,
          currentSession: sessionRef.current,
        })
        return
      }

      setFrame(nextFrame)
      setLastRenderSimulationTime(simulationTime)
      setLastRenderedState(snapshot)
      setRenderedTickCount((count) => count + 1)
      setErrorMessage(null)

      logVerbose('[engine] render tick success', {
        renderAttempt,
        elapsedMs: Math.round(performance.now() - startedAt),
        renderedTickCountNextEstimate: renderedTickCount + 1,
      })

      if (stageAtRender !== 'complete' && validateStage(snapshot, stageAtRender, targets)) {
        setSolvedStages((previous) => {
          if (previous.includes(stageAtRender)) {
            return previous
          }

          return [...previous, stageAtRender]
        })

        const next = nextStage(stageAtRender)
        currentStageRef.current = next
        setCurrentStage(next)
        console.log('[engine] stage advanced', {
          renderAttempt,
          from: stageAtRender,
          to: next,
        })
      }
    } catch (error) {
      console.error('FFmpeg render failed', error)
      console.warn('[engine] attempting renderer recovery', {
        renderAttempt,
        elapsedMs: Math.round(performance.now() - startedAt),
      })

      try {
        await rendererRef.current.resetRenderer()
        await rendererRef.current.initRenderer()
        applyEngineStatus('ready')
        setErrorMessage(null)
        console.warn('[engine] renderer recovery complete', {
          renderAttempt,
        })
      } catch (recoveryError) {
        console.error('FFmpeg renderer recovery failed', recoveryError)
        applyEngineStatus('error')
        setErrorMessage(
          recoveryError instanceof Error
            ? recoveryError.message
            : 'The FFmpeg render pass failed before the preview could update.',
        )
      }
    } finally {
      renderInFlightRef.current = false

      if (
        engineStatusRef.current === 'ready' &&
        sessionAtRender === sessionRef.current &&
        stateVersionAtRender !== stateVersionRef.current
      ) {
        logVerbose('[engine] scheduling catch-up render', {
          renderAttempt,
          previousStateVersion: stateVersionAtRender,
          nextStateVersion: stateVersionRef.current,
        })
        void renderTickRef.current()
      }
    }
  }

  useEffect(() => {
    let isCancelled = false

    async function boot() {
      try {
        await rendererRef.current.initRenderer()
        if (isCancelled) {
          return
        }

        applyEngineStatus('ready')
        console.log('[engine] boot complete')
      } catch (error) {
        if (isCancelled) {
          return
        }

        console.error('FFmpeg runtime load failed', error)
        applyEngineStatus('error')
        setErrorMessage(
          error instanceof Error ? error.message : 'The FFmpeg runtime could not be loaded.',
        )
      }
    }

    void boot()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (engineStatus !== 'ready') {
      return
    }

    void renderTickRef.current()
    const timer = window.setInterval(() => {
      void renderTickRef.current()
    }, RENDER_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [engineStatus])

  function updateState(patch: Partial<PuzzleState>) {
    const current = latestStateRef.current
    const next = normalizePatch(current, patch)

    if (arePuzzleStatesEqual(current, next)) {
      return
    }

    latestStateRef.current = next
    stateVersionRef.current += 1
    setPuzzleState(next)

    logVerbose('[engine] state updated', {
      patch,
      next,
      stateVersion: stateVersionRef.current,
      renderInFlight: renderInFlightRef.current,
    })

    if (engineStatusRef.current === 'ready' && !renderInFlightRef.current) {
      logVerbose('[engine] triggering immediate render from state update', {
        stateVersion: stateVersionRef.current,
      })
      void renderTickRef.current()
    }
  }

  function resetPuzzle() {
    sessionRef.current += 1
    stateVersionRef.current += 1
    latestStateRef.current = INITIAL_STATE
    currentStageRef.current = 'shapes'
    tickIndexRef.current = 0
    setPuzzleState(INITIAL_STATE)
    setLastRenderedState(null)
    setCurrentStage('shapes')
    setSolvedStages([])
    setRenderedTickCount(0)
    setErrorMessage(null)
    console.log('[engine] reset puzzle')
    if (engineStatus === 'error') {
      applyEngineStatus('booting')
      void rendererRef.current
        .initRenderer()
        .then(() => applyEngineStatus('ready'))
        .catch((error) => {
          console.error('FFmpeg runtime reload failed', error)
          applyEngineStatus('error')
          setErrorMessage(
            error instanceof Error ? error.message : 'The FFmpeg runtime could not be reloaded.',
          )
        })
      return
    }

    if (engineStatus === 'ready') {
      void renderTickRef.current()
    }
  }

  return {
    engineStatus,
    errorMessage,
    frame,
    lastRenderSimulationTime,
    currentStage,
    solvedStages,
    puzzleState,
    lastRenderedState,
    renderedTickCount,
    validation: getValidationResult(currentStage, puzzleState, lastRenderedState, targets),
    debugInfo: {
      stateVersion: stateVersionRef.current,
      renderAttemptCount: renderAttemptRef.current,
      renderInFlight: renderInFlightRef.current,
      latestState: puzzleState,
      lastRenderedState,
    },
    updateState,
    resetPuzzle,
  }
}

function arePuzzleStatesEqual(left: PuzzleState, right: PuzzleState) {
  return (
    left.lineRotation === right.lineRotation &&
    left.lineY === right.lineY &&
    left.squareRotation === right.squareRotation &&
    left.squareY === right.squareY &&
    left.rectangleRotation === right.rectangleRotation &&
    left.rectangleY === right.rectangleY &&
    left.stripeThickness === right.stripeThickness &&
    left.stripeCount === right.stripeCount &&
    left.driftSpeed === right.driftSpeed &&
    left.colorR === right.colorR &&
    left.colorG === right.colorG &&
    left.colorB === right.colorB
  )
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

function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      console.error('[engine] render timeout', { label, timeoutMs })
      reject(new Error(label))
    }, timeoutMs)

    void promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}
