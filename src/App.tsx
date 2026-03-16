import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './App.css'
import bgConsole from '../assets/console/bg_console_640x480.png'
import crtGlassOverlay from '../assets/console/crt_glass_overlay.png'
import cursorMain from '../assets/console/cursor_main.png'
import knobPhase1Sprite from '../assets/console/knob_phase_1.png'
import consoleAnimation from '../assets/videos/consoleanim.gif'
import shipAnimation from '../assets/videos/shipanim.gif'
import ledState0 from '../assets/console/led_state_0.png'
import ledState1 from '../assets/console/led_state_1.png'
import ledState2 from '../assets/console/led_state_2.png'
import ledState3 from '../assets/console/led_state_3.png'
import sliderHandleSprite from '../assets/console/slider_handle.png'
import sliderHandlePhase3Sprite from '../assets/console/slider_handle_phase_3.png'
import { ViewportDisplay } from './components/ViewportDisplay'
import {
  COLOR_STEP_VALUES,
  INITIAL_STATE,
  STAGE_SEQUENCE,
  STRIPE_COUNT_VALUES,
  STRIPE_THICKNESS_VALUES,
  Y_VALUES,
} from './game/constants'
import {
  CRT_GLASS_RECT,
  CURSOR_HOTSPOT,
  FRAME_COUNTER_RECT,
  LED_RECT,
  PHASE_1_KNOBS,
  PHASE_3_CURRENT_RECT,
  PHASE_3_SLIDERS,
  PHASE_3_TARGET_RECT,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  SLIDER_HANDLES,
  SPEED_OPTIONS,
  VIEWPORT_RECT,
  type SceneKnobConfig,
  type SceneRect,
  type SceneSliderConfig,
  type SceneVerticalSliderConfig,
} from './game/sceneManifest'
import type { DriftSpeedKey, PuzzleStage } from './game/types'
import { decodeGif, type DecodedGif } from './game/gif'
import { createPuzzleTargets } from './game/targets'
import { getBackgroundColorFromRgb, getTargetBackgroundColor } from './game/validation'
import { usePuzzleEngine } from './game/usePuzzleEngine'

type StageCard = {
  id: Exclude<PuzzleStage, 'complete'>
}

type HoverTarget =
  | {
      shape: 'circle'
      cx: number
      cy: number
      r: number
    }
  | {
      shape: 'rect'
      x: number
      y: number
      width: number
      height: number
    }

type ScenePointer = {
  x: number
  y: number
}

type PointerTarget = HTMLButtonElement
type OverlaySource = 'console' | 'ship'
type OverlayPlayback = {
  source: OverlaySource
  direction: 'forward' | 'reverse'
  fadeMode: 'intro' | 'outro-console' | 'ship'
}

const KNOB_STEP_PIXELS = 18
const GIF_FRAME_DURATION_MS = 100
// The manifest does not currently define the reset switch hitbox, so this fallback rect is
// conservatively aligned to the visible switch slot in the supplied background art.
const RESET_SWITCH_RECT: SceneRect = { x: 577, y: 398, width: 33, height: 57 }
const LED_STATE_SPRITES = [ledState0, ledState1, ledState2, ledState3] as const

function stageStatus(
  stage: StageCard['id'],
  currentStage: PuzzleStage,
  solvedStages: StageCard['id'][],
): 'locked' | 'active' | 'solved' {
  if (solvedStages.includes(stage)) {
    return 'solved'
  }

  if (currentStage === stage) {
    return 'active'
  }

  return STAGE_SEQUENCE.indexOf(stage) > STAGE_SEQUENCE.indexOf(currentStage)
    ? 'locked'
    : 'solved'
}

function useSceneScale() {
  const [sceneScale, setSceneScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      const maxWidth = window.innerWidth - 24
      const maxHeight = window.innerHeight - 24
      const nextScale = Math.min(maxWidth / SCENE_WIDTH, maxHeight / SCENE_HEIGHT)
      setSceneScale(Math.max(0.65, Number(nextScale.toFixed(4))))
    }

    updateScale()
    window.addEventListener('resize', updateScale)

    return () => {
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  return sceneScale
}

function sceneRectStyle(rect: SceneRect): CSSProperties {
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
}

function App() {
  const [targets] = useState(createPuzzleTargets)
  const {
    engineStatus,
    errorMessage,
    frame,
    lastRenderSimulationTime,
    currentStage,
    solvedStages,
    puzzleState,
    renderedTickCount,
    updateState,
    resetPuzzle,
  } = usePuzzleEngine(targets)

  const sceneScale = useSceneScale()
  const sceneWidth = SCENE_WIDTH * sceneScale
  const sceneHeight = SCENE_HEIGHT * sceneScale
  const sceneFrameRef = useRef<HTMLDivElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cursorRef = useRef<HTMLImageElement | null>(null)
  const introStartedRef = useRef(false)
  const introCanFadeRef = useRef(false)
  const introFlashShownRef = useRef(false)
  const outroStartedRef = useRef(false)
  const previousStageRef = useRef<PuzzleStage>(currentStage)
  const playbackVersionRef = useRef(0)
  const playbackResolveRef = useRef<(() => void) | null>(null)
  const phaseFlashTimersRef = useRef<number[]>([])
  const [hoveredControlId, setHoveredControlId] = useState<string | null>(null)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [consoleGif, setConsoleGif] = useState<DecodedGif | null>(null)
  const [shipGif, setShipGif] = useState<DecodedGif | null>(null)
  const [overlayPlayback, setOverlayPlayback] = useState<OverlayPlayback | null>(null)
  const [overlayFrameIndex, setOverlayFrameIndex] = useState(0)
  const [overlayOpacity, setOverlayOpacity] = useState(1)
  const [introComplete, setIntroComplete] = useState(false)
  const [phaseFlashControlIds, setPhaseFlashControlIds] = useState<string[]>([])
  const [phaseFlashVisible, setPhaseFlashVisible] = useState(false)

  const targetColor = getTargetBackgroundColor(targets.color)
  const targetColorText = `rgb(${targetColor.join(', ')})`
  const currentColor = getBackgroundColorFromRgb(
    puzzleState.colorR,
    puzzleState.colorG,
    puzzleState.colorB,
  )
  const currentColorText = `rgb(${currentColor.join(', ')})`
  const solvedCount = solvedStages.length

  const shapesStatus = stageStatus('shapes', currentStage, solvedStages)
  const stripesStatus = stageStatus('stripes', currentStage, solvedStages)
  const colorStatus = stageStatus('color', currentStage, solvedStages)
  const showAnimationCurtain = !introComplete || overlayPlayback !== null

  function clientToScenePoint(clientX: number, clientY: number): ScenePointer {
    const sceneFrame = sceneFrameRef.current
    if (!sceneFrame) {
      return { x: 0, y: 0 }
    }

    const rect = sceneFrame.getBoundingClientRect()
    const sceneX = ((clientX - rect.left) / rect.width) * SCENE_WIDTH
    const sceneY = ((clientY - rect.top) / rect.height) * SCENE_HEIGHT

    return {
      x: Math.max(0, Math.min(SCENE_WIDTH, sceneX)),
      y: Math.max(0, Math.min(SCENE_HEIGHT, sceneY)),
    }
  }

  function updateCursorPosition(clientX: number, clientY: number) {
    const cursor = cursorRef.current
    if (!cursor) {
      return
    }

    const scenePoint = clientToScenePoint(clientX, clientY)
    cursor.style.left = `${scenePoint.x - CURSOR_HOTSPOT.x}px`
    cursor.style.top = `${scenePoint.y - CURSOR_HOTSPOT.y}px`
  }

  const hoverTarget = getHoverTarget(hoveredControlId, puzzleState)
  const phaseFlashTargets =
    phaseFlashVisible
      ? phaseFlashControlIds
          .map((controlId) => getHoverTarget(controlId, puzzleState))
          .filter((target): target is HoverTarget => target !== null)
      : []

  useEffect(() => {
    introCanFadeRef.current = engineStatus === 'ready' && frame !== null
  }, [engineStatus, frame])

  const clearPhaseFlashTimers = useCallback(() => {
    phaseFlashTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer)
    })
    phaseFlashTimersRef.current = []
  }, [])

  const triggerPhaseFlash = useCallback(
    (stage: PuzzleStage) => {
      const controlIds = getPhaseControlIds(stage)
      if (controlIds.length === 0) {
        return
      }

      clearPhaseFlashTimers()
      setPhaseFlashControlIds(controlIds)
      setPhaseFlashVisible(true)

      phaseFlashTimersRef.current = [
        window.setTimeout(() => {
          setPhaseFlashVisible(false)
        }, 250),
        window.setTimeout(() => {
          setPhaseFlashVisible(true)
        }, 500),
        window.setTimeout(() => {
          setPhaseFlashVisible(false)
          setPhaseFlashControlIds([])
        }, 750),
      ]
    },
    [clearPhaseFlashTimers],
  )

  const playOverlaySequence = useCallback(async (
    source: OverlaySource,
    direction: OverlayPlayback['direction'],
    fadeMode: OverlayPlayback['fadeMode'],
  ) => {
    playbackVersionRef.current += 1
    setOverlayFrameIndex(0)
    setOverlayOpacity(1)

    await new Promise<void>((resolve) => {
      playbackResolveRef.current = resolve
      setOverlayPlayback({
        source,
        direction,
        fadeMode,
      })
    })
  }, [])

  const startOutroSequence = useCallback(async () => {
    if (outroStartedRef.current) {
      return
    }

    outroStartedRef.current = true
    playbackVersionRef.current += 1
    setOverlayPlayback(null)
    setCursorVisible(false)

    await wait(500)
    await playOverlaySequence('console', 'reverse', 'outro-console')
    await playOverlaySequence('ship', 'forward', 'ship')
    window.location.reload()
  }, [playOverlaySequence])

  useEffect(() => {
    const bootCurtain = document.getElementById('boot-curtain')
    bootCurtain?.remove()
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function loadAnimations() {
      try {
        const [decodedConsole, decodedShip] = await Promise.all([
          decodeGif(consoleAnimation),
          decodeGif(shipAnimation),
        ])

        if (isCancelled) {
          return
        }

        setConsoleGif(decodedConsole)
        setShipGif(decodedShip)
      } catch (error) {
        console.error('[ui] animation asset load failed', error)
      }
    }

    void loadAnimations()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!consoleGif || introStartedRef.current) {
      return
    }

    introStartedRef.current = true
    const timer = window.setTimeout(() => {
      void playOverlaySequence('console', 'forward', 'intro')
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [consoleGif, playOverlaySequence])

  useEffect(() => {
    if (currentStage !== 'complete') {
      return
    }

    const timer = window.setTimeout(() => {
      void startOutroSequence()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [currentStage, startOutroSequence])

  useEffect(() => {
    if (!introComplete) {
      previousStageRef.current = currentStage
      return
    }

    let flashTimer = 0

    if (!introFlashShownRef.current) {
      introFlashShownRef.current = true
      flashTimer = window.setTimeout(() => {
        triggerPhaseFlash(currentStage)
      }, 0)
      previousStageRef.current = currentStage
      return () => {
        window.clearTimeout(flashTimer)
      }
    }

    if (previousStageRef.current !== currentStage) {
      flashTimer = window.setTimeout(() => {
        triggerPhaseFlash(currentStage)
      }, 0)
    }

    previousStageRef.current = currentStage

    return () => {
      window.clearTimeout(flashTimer)
    }
  }, [currentStage, introComplete, triggerPhaseFlash])

  useEffect(() => {
    return () => {
      clearPhaseFlashTimers()
    }
  }, [clearPhaseFlashTimers])

  useEffect(() => {
    if (!overlayPlayback) {
      const overlayCanvas = overlayCanvasRef.current
      const overlayContext = overlayCanvas?.getContext('2d')
      if (overlayCanvas && overlayContext) {
        overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
        if (!introComplete) {
          overlayContext.fillStyle = '#000'
          overlayContext.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height)
        }
      }
      return
    }

    const decodedGif = overlayPlayback.source === 'console' ? consoleGif : shipGif
    if (!decodedGif) {
      return
    }

    const activePlayback = overlayPlayback
    const playbackVersion = playbackVersionRef.current
    const totalFrames = decodedGif.frames.length
    let frameIndex = 0
    let timeoutId = 0

    function step() {
      if (playbackVersionRef.current !== playbackVersion) {
        return
      }

      setOverlayFrameIndex(frameIndex)
      setOverlayOpacity(getOverlayOpacity(activePlayback, frameIndex, totalFrames))

      if (
        activePlayback.fadeMode === 'intro' &&
        activePlayback.direction === 'forward' &&
        frameIndex === totalFrames - 11 &&
        !introCanFadeRef.current
      ) {
        timeoutId = window.setTimeout(step, GIF_FRAME_DURATION_MS)
        return
      }

      if (frameIndex >= totalFrames - 1) {
        timeoutId = window.setTimeout(() => {
          if (playbackVersionRef.current !== playbackVersion) {
            return
          }

          setOverlayPlayback(null)
          setOverlayFrameIndex(0)
          setOverlayOpacity(1)
          if (activePlayback.fadeMode === 'intro') {
            setIntroComplete(true)
          }
          playbackResolveRef.current?.()
          playbackResolveRef.current = null
        }, GIF_FRAME_DURATION_MS)
        return
      }

      frameIndex += 1
      timeoutId = window.setTimeout(step, GIF_FRAME_DURATION_MS)
    }

    step()

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [consoleGif, introComplete, overlayPlayback, shipGif])

  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) {
      return
    }

    const overlayContext = overlayCanvas.getContext('2d')
    if (!overlayContext) {
      return
    }

    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

    if (!overlayPlayback) {
      if (!introComplete) {
        overlayContext.fillStyle = '#000'
        overlayContext.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height)
      }
      return
    }

    const decodedGif = overlayPlayback.source === 'console' ? consoleGif : shipGif
    if (!decodedGif) {
      overlayContext.fillStyle = '#000'
      overlayContext.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height)
      return
    }

    const frame =
      overlayPlayback.direction === 'reverse'
        ? decodedGif.frames[decodedGif.frames.length - 1 - overlayFrameIndex]
        : decodedGif.frames[overlayFrameIndex]

    if (!frame) {
      return
    }

    overlayContext.save()
    overlayContext.imageSmoothingEnabled = false
    overlayContext.globalAlpha = overlayOpacity

    if (overlayPlayback.source === 'ship') {
      overlayContext.fillStyle = '#000'
      overlayContext.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height)
      overlayContext.drawImage(
        frame,
        Math.round((SCENE_WIDTH - decodedGif.width) / 2),
        Math.round((SCENE_HEIGHT - decodedGif.height) / 2),
      )
    } else {
      overlayContext.drawImage(frame, 0, 0)
    }

    overlayContext.restore()
  }, [consoleGif, introComplete, overlayFrameIndex, overlayOpacity, overlayPlayback, shipGif])

  return (
    <div className="app-shell">
      <div
        ref={sceneFrameRef}
        className="scene-frame"
        style={{ width: `${sceneWidth}px`, height: `${sceneHeight}px` }}
        onPointerEnter={(event) => {
          setCursorVisible(true)
          updateCursorPosition(event.clientX, event.clientY)
        }}
        onPointerMove={(event) => {
          updateCursorPosition(event.clientX, event.clientY)
        }}
        onPointerLeave={() => {
          setCursorVisible(false)
          setHoveredControlId(null)
        }}
      >
        <main
          className="scene-root"
          style={{ transform: `scale(${sceneScale})` }}
          aria-label="FFmpeg puzzle console"
        >
          <div className="scene-layer scene-layer--viewport" style={sceneRectStyle(VIEWPORT_RECT)}>
            <ViewportDisplay
              frame={frame}
              currentStage={currentStage}
              puzzleState={puzzleState}
              targets={targets}
              simulationTime={lastRenderSimulationTime}
              isReady={engineStatus === 'ready' || currentStage === 'complete'}
            />
          </div>

          <img
            src={crtGlassOverlay}
            alt=""
            className="scene-layer scene-layer--crt scene-sprite"
            style={sceneRectStyle(CRT_GLASS_RECT)}
            draggable="false"
          />

          <img
            src={bgConsole}
            alt=""
            className="scene-layer scene-layer--background scene-sprite"
            style={sceneRectStyle({ x: 0, y: 0, width: SCENE_WIDTH, height: SCENE_HEIGHT })}
            draggable="false"
          />

          <canvas
            ref={overlayCanvasRef}
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            className={
              showAnimationCurtain
                ? 'scene-layer scene-layer--animation-overlay is-active'
                : 'scene-layer scene-layer--animation-overlay'
            }
            aria-hidden="true"
          />

          <FrameCounter value={renderedTickCount} />

          <img
            src={LED_STATE_SPRITES[Math.min(solvedCount, 3)]}
            alt=""
            className="scene-layer scene-layer--led scene-sprite"
            style={sceneRectStyle(LED_RECT)}
            draggable="false"
          />

          {colorStatus !== 'locked' ? (
            <div
              className="scene-layer scene-layer--color-chip"
              style={
                {
                  ...sceneRectStyle(PHASE_3_CURRENT_RECT),
                  '--color-chip-color': currentColorText,
                } as CSSProperties
              }
              aria-hidden="true"
            />
          ) : null}

          {colorStatus !== 'locked' ? (
            <div
              className="scene-layer scene-layer--color-chip"
              style={
                {
                  ...sceneRectStyle(PHASE_3_TARGET_RECT),
                  '--color-chip-color': targetColorText,
                } as CSSProperties
              }
              aria-hidden="true"
            />
          ) : null}

          {PHASE_1_KNOBS.map((config) => (
            <SceneKnob
              key={config.id}
              config={config}
              ariaLabel={getKnobLabel(config.id)}
              spriteSrc={knobPhase1Sprite}
              rotationDegrees={puzzleState[config.key] as number}
              disabled={shapesStatus !== 'active'}
              hoverId={hoveredControlId}
              onHoverChange={setHoveredControlId}
              onChange={(value) => updateState({ [config.key]: value } as Partial<typeof puzzleState>)}
              min={0}
              max={330}
              step={30}
              wrapAround
            />
          ))}

          {SLIDER_HANDLES.map((config) => (
            <SceneSliderHandle
              key={config.id}
              config={config}
              ariaLabel={getSliderLabel(config.id)}
              spriteSrc={sliderHandleSprite}
              disabled={stripesStatus !== 'active' && shapesStatus !== 'active'}
              isActive={
                config.key === 'lineY' ||
                config.key === 'squareY' ||
                config.key === 'rectangleY'
                  ? shapesStatus === 'active'
                  : stripesStatus === 'active'
              }
              hoverId={hoveredControlId}
              onHoverChange={setHoveredControlId}
              clientToScenePoint={clientToScenePoint}
              options={getSliderOptions(config.key)}
              value={puzzleState[config.key]}
              onChange={(value) => updateState({ [config.key]: value } as Partial<typeof puzzleState>)}
            />
          ))}

          {PHASE_3_SLIDERS.map((config) => (
            <SceneVerticalSliderHandle
              key={config.id}
              config={config}
              ariaLabel={getColorSliderLabel(config.id)}
              spriteSrc={sliderHandlePhase3Sprite}
              disabled={colorStatus !== 'active'}
              hoverId={hoveredControlId}
              onHoverChange={setHoveredControlId}
              clientToScenePoint={clientToScenePoint}
              options={COLOR_STEP_VALUES}
              value={puzzleState[config.key] as number}
              onChange={(value) =>
                updateState({ [config.key]: value } as Partial<typeof puzzleState>)
              }
            />
          ))}

          <button
            type="button"
            className="scene-reset-switch"
            style={sceneRectStyle(RESET_SWITCH_RECT)}
            aria-label="Reset calibration console"
            onClick={resetPuzzle}
            onPointerEnter={() => setHoveredControlId('reset')}
            onPointerLeave={() => setHoveredControlId((current) => (current === 'reset' ? null : current))}
          />

          <svg
            className="scene-layer scene-layer--hover"
            viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
            aria-hidden="true"
          >
            {hoverTarget?.shape === 'circle' ? (
              <circle
                cx={hoverTarget.cx}
                cy={hoverTarget.cy}
                r={hoverTarget.r}
                className="hover-outline"
              />
            ) : null}
            {hoverTarget?.shape === 'rect' ? (
              <rect
                x={hoverTarget.x}
                y={hoverTarget.y}
                width={hoverTarget.width}
                height={hoverTarget.height}
                className="hover-outline"
              />
            ) : null}
            {phaseFlashTargets.map((target, index) =>
              target.shape === 'circle' ? (
                <circle
                  key={`phase-circle-${index}`}
                  cx={target.cx}
                  cy={target.cy}
                  r={target.r}
                  className="hover-outline"
                />
              ) : (
                <rect
                  key={`phase-rect-${index}`}
                  x={target.x}
                  y={target.y}
                  width={target.width}
                  height={target.height}
                  className="hover-outline"
                />
              ),
            )}
          </svg>

          <img
            ref={cursorRef}
            src={cursorMain}
            alt=""
            className={
              cursorVisible
                ? 'scene-layer scene-layer--cursor scene-sprite scene-cursor is-visible'
                : 'scene-layer scene-layer--cursor scene-sprite scene-cursor'
            }
            style={
              {
                left: `${-CURSOR_HOTSPOT.x}px`,
                top: `${-CURSOR_HOTSPOT.y}px`,
                width: '32px',
                height: '32px',
              } as CSSProperties
            }
            draggable="false"
          />
        </main>
      </div>

      {errorMessage ? (
        <div className="scene-status" role="status" aria-live="polite">
          <span className="sr-only">{errorMessage}</span>
        </div>
      ) : null}
    </div>
  )
}

function FrameCounter({ value }: { value: number }) {
  const digits = value.toString().padStart(4, '0').slice(-4)

  return (
    <div
      className="scene-layer scene-layer--frame-count frame-counter"
      style={sceneRectStyle(FRAME_COUNTER_RECT)}
      aria-label={`Frame count ${value}`}
    >
      {digits.split('').map((digit, index) => (
        <SevenSegmentDigit key={`${digit}-${index}`} digit={digit} />
      ))}
    </div>
  )
}

function SevenSegmentDigit({ digit }: { digit: string }) {
  const activeSegments = SEGMENT_MAP[digit] ?? []

  return (
    <span className="frame-counter__digit" aria-hidden="true">
      {SEGMENTS.map((segment) => (
        <span
          key={segment}
          className={
            activeSegments.includes(segment)
              ? `frame-counter__segment frame-counter__segment--${segment} is-on`
              : `frame-counter__segment frame-counter__segment--${segment}`
          }
        />
      ))}
    </span>
  )
}

function SceneKnob({
  config,
  ariaLabel,
  spriteSrc,
  rotationDegrees,
  disabled,
  hoverId,
  onHoverChange,
  onChange,
  dragValue,
  min,
  max,
  step,
  wrapAround = false,
}: {
  config: SceneKnobConfig
  ariaLabel: string
  spriteSrc: string
  rotationDegrees: number
  disabled: boolean
  hoverId: string | null
  onHoverChange: (id: string | null) => void
  onChange: (value: number) => void
  dragValue?: number
  min: number
  max: number
  step: number
  wrapAround?: boolean
}) {
  const dragState = useRef<{ pointerId: number; startY: number; startValue: number } | null>(null)

  return (
    <button
      type="button"
      className="scene-knob"
      style={sceneRectStyle(config.rect)}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerEnter={() => onHoverChange(config.id)}
      onPointerLeave={() => {
        if (!dragState.current && hoverId === config.id) {
          onHoverChange(null)
        }
      }}
      onPointerDown={(event) => {
        if (disabled) {
          return
        }

        dragState.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startValue: dragValue ?? rotationDegrees,
        }
        onHoverChange(config.id)
        trySetPointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
      onPointerMove={(event) => {
        const currentDrag = dragState.current
        if (!currentDrag || disabled || currentDrag.pointerId !== event.pointerId) {
          return
        }

        const stepDelta = Math.round((currentDrag.startY - event.clientY) / KNOB_STEP_PIXELS)
        const nextValue = wrapAround
          ? wrapDiscreteValue(currentDrag.startValue, stepDelta, min, max, step)
          : clamp(currentDrag.startValue + stepDelta * step, min, max)
        onChange(nextValue)
      }}
      onPointerUp={(event) => {
        if (dragState.current?.pointerId !== event.pointerId) {
          return
        }

        dragState.current = null
        tryReleasePointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
      onPointerCancel={(event) => {
        if (dragState.current?.pointerId !== event.pointerId) {
          return
        }

        dragState.current = null
        tryReleasePointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
    >
      <img
        src={spriteSrc}
        alt=""
        className="scene-sprite"
        style={{ transform: `rotate(${rotationDegrees}deg)` }}
        draggable="false"
      />
    </button>
  )
}

function SceneSliderHandle({
  config,
  ariaLabel,
  spriteSrc,
  disabled,
  isActive,
  hoverId,
  onHoverChange,
  clientToScenePoint,
  options,
  value,
  onChange,
}: {
  config: SceneSliderConfig
  ariaLabel: string
  spriteSrc: string
  disabled: boolean
  isActive: boolean
  hoverId: string | null
  onHoverChange: (id: string | null) => void
  clientToScenePoint: (clientX: number, clientY: number) => ScenePointer
  options: ReadonlyArray<number | DriftSpeedKey>
  value: number | DriftSpeedKey
  onChange: (value: number | DriftSpeedKey) => void
}) {
  const rect = getSliderRect(config, options, value)
  const dragPointerIdRef = useRef<number | null>(null)

  return (
    <button
      type="button"
      className="scene-slider-handle"
      style={sceneRectStyle(rect)}
      aria-label={ariaLabel}
      disabled={disabled || !isActive}
      onPointerEnter={() => onHoverChange(config.id)}
      onPointerLeave={() => {
        if (hoverId === config.id) {
          onHoverChange(null)
        }
      }}
      onPointerDown={(event) => {
        if (disabled || !isActive) {
          return
        }

        onHoverChange(config.id)
        dragPointerIdRef.current = event.pointerId
        trySetPointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
      onPointerMove={(event) => {
        if (disabled || !isActive || dragPointerIdRef.current !== event.pointerId) {
          return
        }

        const scenePoint = clientToScenePoint(event.clientX, event.clientY)
        const nextValue = getNearestSliderValue(config, options, scenePoint.x)
        if (nextValue === value) {
          return
        }
        onChange(nextValue)
      }}
      onPointerUp={(event) => {
        if (dragPointerIdRef.current !== event.pointerId) {
          return
        }

        dragPointerIdRef.current = null
        tryReleasePointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
      onPointerCancel={(event) => {
        if (dragPointerIdRef.current !== event.pointerId) {
          return
        }

        dragPointerIdRef.current = null
        tryReleasePointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
    >
      <img src={spriteSrc} alt="" className="scene-sprite" draggable="false" />
    </button>
  )
}

function SceneVerticalSliderHandle({
  config,
  ariaLabel,
  spriteSrc,
  disabled,
  hoverId,
  onHoverChange,
  clientToScenePoint,
  options,
  value,
  onChange,
}: {
  config: SceneVerticalSliderConfig
  ariaLabel: string
  spriteSrc: string
  disabled: boolean
  hoverId: string | null
  onHoverChange: (id: string | null) => void
  clientToScenePoint: (clientX: number, clientY: number) => ScenePointer
  options: ReadonlyArray<number>
  value: number
  onChange: (value: number) => void
}) {
  const rect = getVerticalSliderRect(config, options, value)
  const dragPointerIdRef = useRef<number | null>(null)

  return (
    <button
      type="button"
      className="scene-slider-handle scene-slider-handle--vertical"
      style={sceneRectStyle(rect)}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerEnter={() => onHoverChange(config.id)}
      onPointerLeave={() => {
        if (hoverId === config.id) {
          onHoverChange(null)
        }
      }}
      onPointerDown={(event) => {
        if (disabled) {
          return
        }

        onHoverChange(config.id)
        dragPointerIdRef.current = event.pointerId
        trySetPointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
      onPointerMove={(event) => {
        if (disabled || dragPointerIdRef.current !== event.pointerId) {
          return
        }

        const scenePoint = clientToScenePoint(event.clientX, event.clientY)
        const nextValue = getNearestVerticalSliderValue(config, options, scenePoint.y)
        if (nextValue === value) {
          return
        }

        onChange(nextValue)
      }}
      onPointerUp={(event) => {
        if (dragPointerIdRef.current !== event.pointerId) {
          return
        }

        dragPointerIdRef.current = null
        tryReleasePointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
      onPointerCancel={(event) => {
        if (dragPointerIdRef.current !== event.pointerId) {
          return
        }

        dragPointerIdRef.current = null
        tryReleasePointerCapture(event.currentTarget, event.pointerId, config.id)
      }}
    >
      <img src={spriteSrc} alt="" className="scene-sprite" draggable="false" />
    </button>
  )
}

function getHoverTarget(controlId: string | null, puzzleState: typeof INITIAL_STATE): HoverTarget | null {
  if (!controlId) {
    return null
  }

  const knobConfig = PHASE_1_KNOBS.find((item) => item.id === controlId)
  if (knobConfig) {
    return {
      shape: 'circle',
      cx: knobConfig.center.x,
      cy: knobConfig.center.y,
      r: knobConfig.hitRadius + 2,
    }
  }

  const phase3SliderConfig = PHASE_3_SLIDERS.find((item) => item.id === controlId)
  if (phase3SliderConfig) {
    const sliderRect = getVerticalSliderRect(
      phase3SliderConfig,
      COLOR_STEP_VALUES,
      puzzleState[phase3SliderConfig.key] as number,
    )
    return {
      shape: 'rect',
      x: sliderRect.x - 2,
      y: sliderRect.y - 2,
      width: sliderRect.width + 4,
      height: sliderRect.height + 4,
    }
  }

  const sliderConfig = SLIDER_HANDLES.find((item) => item.id === controlId)
  if (sliderConfig) {
    const sliderRect = getSliderRect(
      sliderConfig,
      getSliderOptions(sliderConfig.key),
      puzzleState[sliderConfig.key],
    )
    return {
      shape: 'rect',
      x: sliderRect.x - 2,
      y: sliderRect.y - 2,
      width: sliderRect.width + 4,
      height: sliderRect.height + 4,
    }
  }

  if (controlId === 'reset') {
    return {
      shape: 'rect',
      x: RESET_SWITCH_RECT.x - 2,
      y: RESET_SWITCH_RECT.y - 2,
      width: RESET_SWITCH_RECT.width + 4,
      height: RESET_SWITCH_RECT.height + 4,
    }
  }

  return null
}

function getPhaseControlIds(stage: PuzzleStage): string[] {
  switch (stage) {
    case 'shapes':
      return [...PHASE_1_KNOBS.map((config) => config.id), 'line-y', 'square-y', 'rectangle-y']
    case 'stripes':
      return ['stripe-thickness', 'stripe-count', 'drift-speed']
    case 'color':
      return PHASE_3_SLIDERS.map((config) => config.id)
    default:
      return []
  }
}

function getSliderOptions(key: SceneSliderConfig['key']) {
  switch (key) {
    case 'lineY':
    case 'squareY':
    case 'rectangleY':
      return Y_VALUES
    case 'stripeThickness':
      return STRIPE_THICKNESS_VALUES
    case 'stripeCount':
      return STRIPE_COUNT_VALUES
    case 'driftSpeed':
      return SPEED_OPTIONS
    default:
      return []
  }
}

function getSliderRect(
  config: SceneSliderConfig,
  options: ReadonlyArray<number | DriftSpeedKey>,
  value: number | DriftSpeedKey,
): SceneRect {
  const index = Math.max(0, options.indexOf(value))
  const ratio = options.length > 1 ? index / (options.length - 1) : 0
  const x = config.trackStartX + ratio * (config.trackEndX - config.trackStartX)

  return {
    x,
    y: config.rect.y,
    width: config.rect.width,
    height: config.rect.height,
  }
}

function getVerticalSliderRect(
  config: SceneVerticalSliderConfig,
  options: ReadonlyArray<number>,
  value: number,
): SceneRect {
  const index = Math.max(0, options.indexOf(value))

  return {
    x: config.x,
    y: config.positionsY[index] ?? config.positionsY[0] ?? 0,
    width: config.rect.width,
    height: config.rect.height,
  }
}

function getNearestSliderValue(
  config: SceneSliderConfig,
  options: ReadonlyArray<number | DriftSpeedKey>,
  sceneX: number,
) {
  const clampedX = clamp(sceneX, config.trackStartX, config.trackEndX)
  const ratio = (clampedX - config.trackStartX) / (config.trackEndX - config.trackStartX || 1)
  const index = Math.round(ratio * (options.length - 1))

  return options[index] ?? options[0]
}

function getNearestVerticalSliderValue(
  config: SceneVerticalSliderConfig,
  options: ReadonlyArray<number>,
  sceneY: number,
) {
  const nearestIndex = config.positionsY.reduce((closestIndex, candidateY, index, positions) => {
    const currentBestY = positions[closestIndex] ?? positions[0] ?? candidateY
    return Math.abs(candidateY - sceneY) < Math.abs(currentBestY - sceneY) ? index : closestIndex
  }, 0)

  return options[nearestIndex] ?? options[0]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function trySetPointerCapture(target: PointerTarget, pointerId: number, controlId: string) {
  try {
    target.setPointerCapture(pointerId)
  } catch (error) {
    console.warn('[ui] setPointerCapture failed', {
      controlId,
      pointerId,
      error,
    })
  }
}

function tryReleasePointerCapture(target: PointerTarget, pointerId: number, controlId: string) {
  try {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
  } catch (error) {
    console.warn('[ui] releasePointerCapture failed', {
      controlId,
      pointerId,
      error,
    })
  }
}

function wrapDiscreteValue(currentValue: number, stepDelta: number, min: number, max: number, step: number) {
  const steps = Math.round((max - min) / step) + 1
  const currentIndex = Math.round((currentValue - min) / step)
  const wrappedIndex = (((currentIndex + stepDelta) % steps) + steps) % steps
  return min + wrappedIndex * step
}

function getKnobLabel(id: string) {
  switch (id) {
    case 'line-rotation':
      return 'Line rotation'
    case 'square-rotation':
      return 'Square rotation'
    case 'rectangle-rotation':
      return 'Rectangle rotation'
    default:
      return 'Scene knob'
  }
}

function getColorSliderLabel(id: string) {
  switch (id) {
    case 'color-r':
      return 'Red channel'
    case 'color-g':
      return 'Green channel'
    case 'color-b':
      return 'Blue channel'
    default:
      return 'Color channel'
  }
}

function getSliderLabel(id: string) {
  switch (id) {
    case 'line-y':
      return 'Line vertical position'
    case 'square-y':
      return 'Square vertical position'
    case 'rectangle-y':
      return 'Rectangle vertical position'
    case 'stripe-thickness':
      return 'Stripe thickness'
    case 'stripe-count':
      return 'Stripe spacing'
    case 'drift-speed':
      return 'Stripe drift speed'
    default:
      return 'Scene slider'
  }
}

function getOverlayOpacity(playback: OverlayPlayback, frameIndex: number, totalFrames: number) {
  if (playback.fadeMode === 'ship') {
    return 1
  }

  if (playback.direction === 'forward') {
    return frameIndex >= totalFrames - 10 ? (totalFrames - 1 - frameIndex) / 10 : 1
  }

  return frameIndex < 10 ? frameIndex / 10 : 1
}

function wait(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const
const SEGMENT_MAP: Record<string, ReadonlyArray<(typeof SEGMENTS)[number]>> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'd', 'e', 'g'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['b', 'c', 'f', 'g'],
  '5': ['a', 'c', 'd', 'f', 'g'],
  '6': ['a', 'c', 'd', 'e', 'f', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
}

export default App
