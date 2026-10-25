# PixelWeave v0.8 — Animation Workflow

**Version:** 0.8.0 · **Date:** 2026-10-25  
**Release type:** Core authoring workflow / user-approved full v0.8 plan  
**Live:** https://tera-dark.github.io/PixelWeave/#studio

## Product principle

PixelWeave is a **native text-authored pixel animator**, not an image-to-pixel converter. v0.8 keeps the approved 64×64, 11-layer, 12-frame Vermilion Nocturne as its **sole gallery asset**. No diffusion model, image cutout or copied reference artwork is used.

The objective is one end-to-end usable path: **open native project → target one layer and frame → draw → inspect motion → undo/redo → save and reload → export native pixels**.

## P0: Completed

### Native Cel time grid

- True layer × frame interactive grid in Studio, showing each Cel's filled/empty status.
- Clicking a Cel selects that exact layer and frame, freezes playback, synchronizes the layer inspector, preview and editable canvas.
- Cel clipboard: copy, paste and clear into the target frame. Validates canvas dimensions, palette and symbols.
- Whole-frame operations: duplicate existing frame (prior function), insert blank frame, delete frame, reorder a complete column of Cels while keeping every layer aligned.
- Adjustable timeline height, sticky headers and responsive overflow.
- **Compatibility:** continues serializing to `pixelweave/layered-v1` without migrating current projects.

### Editing correctness and data recovery

- Single pointer-drag stroke is one undoable event, including long movements between pointer events.
- No-op edits do not consume undo steps or destroy redo history.
- Undo and redo stacks are isolated by project during a browser session.
- Validation and rollback for invalid Cel edits; previously approved pixels are not modified outside the targeted Cel.
- Browser localStorage persistence on committed edits; valid saved assets recover when the page is reloaded.
- Storage-write failures explicitly warn the user to export JSON.
- Native-sized transparent PNG, 4-column sprite sheet, editable JSON and WebM export retained.

## P1: Completed

### Tools and gestures

- Pencil, eraser, Bresenham straight line, outlined and filled rectangles, connected-area flood fill.
- Rectangular selection on the current Cel and 1px arrow-step translation of selected content. Bounds are checked: attempting to move selected pixels off-canvas is rejected.
- Non-destructive canvas pan with **middle-button drag or Alt + left drag**, reset via the stage button. All preview/selection overlays move together.
- Integer zoom and pixel grid controls remain available.

### Animation review

- Separate prior-frame and next-frame onion-skin toggles with adjustable opacity.
- Playback modes: forward loop, backward loop and ping-pong; same native frame arrays, no new animation format.
- Interpretable diagnostic panel: adjacent-frame changed-pixel counts, first/last seam difference, explicitly selected static layers changed unexpectedly.
- Diagnostics report **no aesthetic score**. Art direction, pixel cluster quality and motion intent still require human approval.

### UI

- Working-first Studio layout, editable Cel grid below the main preview, quick links to existing diagonal exploded layer view.
- Single item gallery policy preserved. The original native potion data remains unchanged by the UI release.
- Animation Atlas stays separate and credits original artists; no external reference is silently turned into an asset.

## Quality verification

- Existing `npm test` suite plus `tests/workflow-v08.test.mjs` validate native Cel operations, frame alignment, drawing primitives, selection movement, playback modes, diagnostics, and UI wiring.
- The GitHub Actions deployment pipeline now runs an actual **Playwright/Chromium end-to-end smoke test**. It opens Studio, selects a Cel, uses pointer events to draw, verifies a single undo/redo, reloads the page to confirm saved content, exports actual JSON, copies a Cel, moves a whole frame, runs diagnostics, tests panning, and checks mobile viewport.
- Pages deployment now stages **only public web files** into `_site`, excluding the developer proxy, `.git`, test suites and installed browser dependencies.
- CI passing verifies tested behavior, **not** pixel-art aesthetic quality or every mobile/browser combination.

## Known limitations and next-version boundaries

- `layered-v1` intentionally supports **8–64 px canvases, 1–12 layers, 1–16 frames, 1–24 FPS**. Heavy professional pipelines will need a format extension with migrations.
- Current timeline stores per-Cel pixels independently. It does **not yet** support linked/reused Cels, exposure sheets, timeline tags, or per-frame durations.
- Ping-pong/reverse affects **interactive preview**; existing WebM and sprite-sheet export still use regular frame order. This must be upgraded together with per-frame timing so export fidelity is guaranteed rather than assumed.
- Undo history is per project for the current session; **the asset data persists after refresh, but past undo stacks do not**.
- Rectangle selection supports move; handles for transform/scale/rotate and clipboard selection from an arbitrary rectangle are not included.
- No subjective art score, no AI auto-refine model A/B benchmark and no additional approved artwork.
- Chromium test runs in CI, but Firefox, Safari and physical touch devices still need dedicated end-to-end verification.

## Review checklist for the project owner

1. Go to [Studio](https://tera-dark.github.io/PixelWeave/#studio), pause animation and click a colored diamond in the Cel grid.
2. Choose Pencil or Line, paint a few pixels and test Undo/Redo.
3. Use Copy Cel, switch to a different layer/frame and Paste.
4. Check prior/next onion skin and try playback forward/reverse/ping-pong.
5. Open the diagonal exploded layer view and inspect the modified Cel.
6. Refresh; verify the edit is still there. Export native JSON; reimport it if desired.
7. Confirm the only public gallery sample remains Vermilion Nocturne.

**Release acceptance is by the user after seeing the actual GitHub Pages application; automation is not an art-quality certification.**
