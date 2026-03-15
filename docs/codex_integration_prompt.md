# Codex Integration Prompt
## FFmpeg Puzzle MVP – Art Asset Integration Pass

This document is the **authoritative implementation prompt** for Codex.

Your task is to integrate a hand-authored visual skin into the existing working FFmpeg puzzle prototype.

The existing prototype already has working:

- FFmpeg render loop
- puzzle logic
- layer progression
- validation
- knob / slider logic
- render cadence

Your job is to **preserve all working gameplay behavior** while replacing the placeholder UI with an **asset-driven, late-1990s adventure-game machine console**.

This is an **integration pass**, not a redesign pass.

---

# Primary Goal

Turn the current working UI into a **single cohesive retro adventure-game console screen** using a supplied set of art assets and a precise manifest.

The final result should feel like:

- a physical alien machine
- embedded in a spaceship wall
- a handcrafted 1990s CD-ROM puzzle interface
- a screen from a game like *Myst*, *Riven*, *My Teacher Is an Alien*, or *Putt-Putt*

It must **not** feel like:

- a web app
- a dashboard
- a modern UI kit
- a CSS-styled admin panel

Think like a **2D game scene integrator**, not a web UI designer.

---

# Core Integration Model

The implementation should treat the screen as a **single fixed-aspect scene**.

## Canonical scene size

All layout, positioning, hitboxes, and rendering logic must be defined in:

- **640 × 480 scene coordinates**

Do not position things using ad hoc CSS flow or freehand margins.

All element placement must derive from the **scene coordinate system**.

---

# Scene Scaling Rules

The whole scene must scale uniformly as one unit.

## Required rules

- preserve aspect ratio
- use nearest-neighbor / pixelated scaling
- no antialiasing
- no subpixel placement in scene coordinates
- all sprite placement and hitboxes are defined in 640×480 coordinates and then scaled uniformly

This is critical.

A 4K display should still look like it is showing a crisp, scaled-up 640×480 game screen, not a smoothed modern interface.

---

# Visual Hierarchy

The **FFmpeg viewport** is the sacred rectangle.

It is the most important visual element on screen.

Everything else exists to:

- frame it
- support it
- calibrate it

Do not let surrounding UI compete visually with it.

---

# What Stays Dynamic

The following must remain live, dynamic elements:

- FFmpeg viewport
- ghost / puzzle overlay layer
- CRT glass overlay placement
- knob rotation
- slider handle movement
- frame counter digits
- LED state switching
- hover outlines
- custom cursor
- all interaction logic

---

# What Comes From Art Assets

The following should come from supplied art assets:

- full-screen console background
- bezel / machine housing baked into background
- all static machine panels
- all non-interactive decorative hardware
- all alien label placeholder plates
- LED visual states (0–3 lit)
- CRT glass overlay
- knob face sprites
- slider handle sprite
- custom cursor sprite

---

# Asset Manifest Is Source of Truth

You will be given an asset manifest.

Use it as the geometric and layering source of truth.

The manifest defines:

- asset ids
- filenames
- scene coordinates
- dimensions
- center points
- hit radii
- travel bounds
- z-order
- interaction types
- notes

If a screenshot, mockup, or previous implementation conflicts with the manifest, **trust the manifest**.

---

# Required Render / Layer Stack

Implement the scene with this visual stack from back to front:

1. FFmpeg render
2. ghost overlay
3. CRT glass overlay
4. background plate (with transparent CRT aperture and bezel)
5. interactive controls
6. LED state overlay
7. hover outline overlay
8. custom cursor

Important:

- the background plate contains the bezel and transparent aperture
- the FFmpeg render shows through the aperture
- the CRT glass overlay sits **above the FFmpeg render and ghost overlay**
- the CRT glass overlay sits **below the background plate**
- the background plate therefore visually frames both the render and glass layer

---

# CRT Viewport Integration

The FFmpeg viewport is rendered as a normal rectangle in scene coordinates.

It is then visually shaped by the transparent aperture in the background art.

## Requirements

- no drop shadow on the FFmpeg viewport
- fit the viewport exactly to the manifest-defined viewport rect
- preserve pixelated rendering
- no anti-aliased clipping
- do not attempt fancy CSS masking unless strictly necessary

Simple model:

- render goes behind the background plate
- aperture reveals it
- CRT glass overlay adds subtle screen-surface feel

---

# CRT Glass Overlay

Use the supplied `crt_glass_overlay` asset.

It is a transparent PNG with arbitrary alpha.

Its purpose is subtle only:

- mild reflection
- slight glass feel
- maybe edge darkening if present in the art

It must remain visually subtle.

No scanlines are required for MVP.

---

# Background Plate

Use the supplied full-screen background plate.

It is the main authored image and contains:

- machine body
- bezel
- control housings
- decorative machine detail
- transparent viewport aperture
- baked inner CRT shadow
- frame counter housing

Treat it as the main static scene skin.

---

# Interactive Controls

## Knobs

Use the supplied knob sprite assets.

### Rules

- knobs are square PNGs with transparent background
- rotate around exact center point from the manifest
- use nearest-neighbor rendering
- no smoothing
- no CSS filter effects

### Interaction

Knobs use **vertical drag only**:

- drag up increases value
- drag down decreases value
- value changes in discrete quantized steps
- drag should continue even if pointer leaves the original hit region during the drag

### Quantization

Phase 1 knobs:
- 30° detents

Phase 3 knobs:
- 45° detents
- 45° dead zone at the bottom
- 6 discrete positions per color channel

The visual rotation should match the discrete logical value.  
Do not rotate smoothly between values.

## Sliders

Use the supplied slider handle sprite.

### Rules

- slider handle moves horizontally only
- clamp movement to the manifest-defined travel range
- no easing or inertia
- movement is quantized to the logical discrete values
- visual movement should reflect quantized state, not continuous interpolation

---

# Hover Outlines

Generate hover outlines in code.

Do **not** rely on browser default outline styles.

## Style rules

- color: yellow
- stroke width: 2 scene pixels
- crisp
- no antialiasing
- drawn in scene coordinates before scaling

## Shapes

- rectangular controls: square/rectangular outline
- circular controls: circular outline

The circular outline must remain stable while the knob rotates beneath it.

Do not rotate the outline with the knob.

---

# LEDs

Use the supplied LED state overlays:

- `led_state_0`
- `led_state_1`
- `led_state_2`
- `led_state_3`

Only one LED state overlay should be visible at a time.

These overlays are positioned exactly over the background plate and contain any glow treatment needed for that state.

Do not recreate the LED glow in CSS.

---

# Frame Counter

The frame counter housing is baked into the background.

Only the digits should remain dynamic.

If the existing implementation already renders the digits correctly, preserve that behavior and align it to the background housing.

Do not add English labels.

---

# Alien Text / Labels

There must be **no English text anywhere in the diegetic UI**.

Any alien label areas are represented by placeholder art already baked into the background or supplied as art.

Do not generate gibberish text in code.

Do not synthesize decorative fake glyphs in CSS.

---

# Custom Cursor

Implement a **custom in-scene cursor** using the supplied `cursor_main` sprite.

Do not rely on the browser’s native cursor rendering.

## Cursor model

- hide the system cursor over the game scene
- render `cursor_main` as a sprite following the pointer
- use the manifest-defined hotspot
- render it in scene coordinates
- scale it with the scene
- use nearest-neighbor rendering
- no antialiasing

## Cursor state

Only one cursor state is needed for now:

- `cursor_main`

Do not change the cursor shape on hover for MVP.

The hover outline provides feedback.

---

# Hit Testing Rules

Use hitboxes defined in scene coordinates.

Scale them exactly with the scene.

## Priority rule

If interactive elements overlap:

- **topmost interactive element wins**

Although overlaps should be rare, implement this rule explicitly.

---

# Do Not Break Existing Render Loop

The current FFmpeg render cadence and logic are working and must remain intact.

Important constraints:

- UI updates must not block the FFmpeg render loop
- render loop remains independent from input event cadence
- preserve current behavior where latest state renders predictably on the existing tick

This integration pass is visual, not architectural.

---

# Recommended Implementation Structure

A good implementation will likely use a root scene container with absolute-positioned layers.

Conceptual structure:

- scene root
  - FFmpeg viewport layer
  - ghost overlay layer
  - CRT overlay layer
  - background plate image
  - control sprites
  - LED state overlay
  - hover overlay
  - custom cursor layer

If you need to restructure existing UI code to achieve this cleanly, do so carefully without breaking logic.

---

# Files to Update

You will likely need to touch:

- the main puzzle scene component
- the viewport container component
- control rendering components
- cursor handling
- asset loading / imports
- scene layout / scaling logic
- the asset manifest reference module if needed

Update whatever files are necessary, but preserve functionality.

---

# Asset Manifest Handling

Read the manifest and implement from it directly.

Do not hardcode ad hoc offsets if the manifest already provides values.

If a value is missing in the manifest and a reasonable fallback is necessary, use the most conservative implementation possible and leave a clear note in code.

---

# Acceptance Criteria

The pass is successful when:

- the existing gameplay still works
- the UI uses the supplied art assets correctly
- the viewport appears embedded in the machine
- the render shows cleanly through the transparent aperture
- knobs rotate in quantized steps
- slider handles move in quantized steps
- LED states swap cleanly
- hover outlines are crisp and retro-looking
- the custom cursor renders correctly and tracks pointer position with correct hotspot
- no antialiasing or smoothing is visible
- the screen feels like a 640×480 game scene scaled up, not a modern web page

---

# Output Expectations

Return the code changes necessary to implement this integration cleanly.

Prefer code that is:

- explicit
- scene-coordinate driven
- easy to iterate on
- asset-manifest friendly

When in doubt, prioritize:

1. visual faithfulness
2. scene consistency
3. preserving existing gameplay logic

over convenience or modern UI habits.

---

# Final Reminder

The desired result should feel like:

> a mysterious alien machine from a 1990s adventure game that happens to be rendering FFmpeg output

NOT:

> a web interface skinned with some art assets
