
# FFmpeg Puzzle Game – MVP Design Document

## Project Overview

This project is a browser‑based puzzle game built around a core constraint:

**All visuals inside the puzzle viewport are generated exclusively with FFmpeg.**

The surrounding UI, hints, and game structure exist outside FFmpeg and interact with the generated frame.

The goal is to create puzzles where players indirectly manipulate FFmpeg rendering parameters through a stylized interface. Players are never exposed to FFmpeg itself; instead they interact with diegetic controls that map to FFmpeg parameters.

The first puzzle serves as the MVP prototype.

---

# Design Goals

## Core Concept

Players interact with a mysterious retro computer terminal aboard an alien spacecraft.

Each puzzle consists of:

- A **live FFmpeg-generated viewport**
- A **retro UI frame**
- **Physical-looking controls** (sliders, switches)
- **overlay hints** that guide the player toward the correct parameter configuration

The player adjusts controls until the generated image matches the visual hints.

---

# Aesthetic Direction

The visual style intentionally mimics late‑90s point‑and‑click adventure games such as:

- Myst
- My Teacher Is An Alien
- Putt‑Putt series

These games relied on static scenes, limited animation, and strong visual cues.

We emulate the technological constraints of that era to produce a consistent design ethos.

---

# Emulated Technical Constraints

| Property | Value |
|--------|------|
| Internal render resolution | 125 × 125 |
| Display resolution | 250 × 250 CSS upscaled |
| Frame rate | 10 fps |
| Color depth | 8‑bit (256 color palette) |
| Animation style | Low frame count procedural motion |
| Image scaling | Pixelated |
| Input lag | ~100 ms intentional delay |

These constraints produce the retro feel and reduce FFmpeg workload.

---

# Core Puzzle Structure

Puzzle 1 consists of **three visual layers**.

All layers render simultaneously in FFmpeg.

However, the UI guides the player through solving them **sequentially**.

```
Layer 3 (top)
  Shapes

Layer 2 (middle)
  Diagonal stripe pattern

Layer 1 (bottom)
  Stripe color
```

The player solves:

1. Shape alignment
2. Stripe pattern tuning
3. Stripe color tuning

---

# Rendering Resolution Strategy

FFmpeg renders:

```
125 x 125 pixels
```

CSS scales the image to:

```
250 x 250 pixels
```

with:

```
image-rendering: pixelated;
```

This doubles visual size without increasing rendering cost.

---

# Render Update Architecture

Rendering occurs on a fixed interval.

```
100 ms render cadence (10 fps)
```

No render queue is allowed to build.

Each frame renders from the **latest known state**.

---

# State Model

Three state buckets exist:

### 1. latestState

The most recent slider values.

Updated immediately by UI controls.

### 2. lastRenderedState

Snapshot of the parameters used for the most recent FFmpeg render.

### 3. simulationTime

Monotonically increasing time value used for animation.

```
simulationTime = tickIndex * 0.1 seconds
```

---

# Render Loop

Every 100ms:

1. If a render is currently running, skip this tick.
2. Capture the latest UI state.
3. Compute simulation time.
4. Render one FFmpeg frame using `(latestState, simulationTime)`.
5. Display the resulting image.

Pseudo-code:

```js
setInterval(() => {

  if(renderInFlight) return;

  renderInFlight = true;

  const state = latestState;
  const t = tickIndex * 0.1;

  tickIndex++;

  renderFrame(state, t).then(img => {
    previewCanvas.draw(img);
    lastRenderedState = state;
    renderInFlight = false;
  });

}, 100);
```

---

# Layer 1 – Shape Alignment Puzzle

Three shapes are rendered on top of the stripe pattern.

Shapes:

- Line
- Square
- Rectangle

### X Positions

Fixed positions:

```
25%
50%
75%
```

### Player Controls

Each shape has two controls:

| Parameter | Quantization |
|----------|-------------|
| Rotation | 30° steps |
| Y Position | 10 px steps |

Total sliders:

```
6 sliders
```

### Goal

Align shapes with ghost overlays.

---

# Layer 2 – Stripe Pattern Puzzle

Behind the shapes is a moving diagonal stripe field.

### Pattern Parameters

| Control | Meaning | Quantization |
|-------|-------|------|
| Line Thickness | Stripe width | 2px |
| Line Count | Number of stripes | Integers 4–18 |
| Drift Speed | Motion speed | Discrete set |

The stripes drift diagonally over time.

Pattern uses repeated stripe logic.

Conceptually:

```
(x + y + t * speed) mod spacing
```

---

# Layer 3 – Stripe Color Puzzle

Players must tune the stripe color to match the UI hint.

Shapes remain unaffected by color changes.

Color controls affect **only the stripe layer**.

### Controls

Three sliders:

```
R
G
B
```

### Quantization

Each channel uses **6 discrete steps**.

This ensures:

- color changes are perceptible
- palette remains consistent

---

# Color System

Rendering uses **8‑bit color**.

Palette size:

```
256 colors
```

Final output should be quantized to this palette.

Possible implementation approaches:

1. FFmpeg palette generation
2. LUT-based palette clamp
3. Post-process quantization

Palette should also influence UI colors.

---

# Validation Logic

Validation does **not** use image comparison.

Instead it evaluates the slider states.

### Layer 1 success condition

All six shape parameters match target values.

### Layer 2 success condition

Pattern parameters match target values.

### Layer 3 success condition

RGB parameters match target color.

Tolerance is unnecessary due to quantization.

---

# Validation Delay

Solutions are accepted **after the render frame showing the correct state appears**.

Implementation:

1. State matches target.
2. Wait one render cycle.
3. Accept solution.

This ensures the player visually sees the solved frame.

---

# UI Hints

Hints exist **outside the FFmpeg render**.

### Layer 1 hints

Ghost shapes show target alignment.

### Layer 2 hints

Horizontal guide lines show stripe pattern.

### Layer 3 hints

Frame border displays target color.

Layer 2 guide lines remain visible.

---

# Technology Stack

Frontend:

```
React
Vite
Canvas / SVG overlays
```

Rendering:

```
ffmpeg.wasm
```

Preview display:

```
HTML canvas
```

---

# Project Structure

```
/src
  Game.jsx
  Puzzle1.jsx
  Renderer.js
  Validation.js
  OverlayCanvas.js

/public
  ui_assets
```

---

# Renderer Module Responsibilities

Renderer must:

1. Construct FFmpeg command
2. Inject parameters
3. Render single frame
4. Return image buffer

Example:

```
ffmpeg -f lavfi -i "<filtergraph>" -frames:v 1 output.png
```

---

# Performance Expectations

Target hardware:

Typical laptop or desktop browser.

Expected preview performance:

```
10 FPS stable
```

Because frames are small and only single frames are rendered.

---

# MVP Completion Criteria

The MVP is considered complete when:

- puzzle renders in browser
- sliders update preview
- render cadence remains stable
- layer transitions work
- solution detection works
- UI overlays display hints
- FFmpeg generates all puzzle visuals

---

# Design Ethos

The project embraces creative constraints.

Instead of hiding technical limitations, the game celebrates them.

Key principles:

- small procedural visuals
- minimal assets
- deterministic rendering
- discoverable relationships between parameters

The result should feel like operating a mysterious machine.

---

# Future Extensions

Once the MVP is validated, future puzzles may introduce:

- blur filters
- noise fields
- audio synthesis puzzles
- compositing puzzles
- perspective manipulation

Each puzzle explores a different capability of FFmpeg.

---

# Summary

This MVP proves the core concept:

A puzzle game where players manipulate hidden FFmpeg rendering parameters through a stylized interface.

The architecture prioritizes:

- deterministic rendering
- stable preview cadence
- simple validation
- retro visual design

The result should be both technically novel and visually distinctive.
