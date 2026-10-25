# PixelWeave · LLM-native workstation methods audit (2026-10-25)

**Goal:** A text-only LLM should create actual editable pixel assets and coherent animation through bounded instructions, without diffusion, image-to-pixel conversion, tracing, or a manually hand-drawn seed image.

**Engineering status:** the semantic drawing-program compiler, staged text-model generator and offline import pathway are implemented on the feature branch. This is an architecture change, **not evidence that current models reliably draw beautiful images**. Artistic quality remains unbenchmarked.

## Root-cause audit

| Earlier assumption | Failure mode | New strategy | Still missing |
| --- | --- | --- | --- |
| "Any sprite = silhouette/fill/highlights/effects" | Character, water, architecture and armor need different layer semantics | Director proposes 2–6 subject-specific static/animated layers | Need human approval and direct editing of plan |
| "Make every layer as four 16×16 ASCII frames" | 4×4×256 = **4096 cell positions**, a large brittle text output before JSON overhead | LLM emits a bounded palette, raster shapes, and short motion commands; deterministic compiler creates every pixel | Organic silhouettes need stronger region/cluster DSL and localized hand-tuned patches |
| "Use the first frame of previous layers as the only reference" | Alignment drifts; moving details inherit no frame-relative context | Reuse the director's palette, planned layer identities, and compiled frame-0 ASCII viewport; clip-to-previous-layer per frame where chosen | Add a full frame-by-frame structure visualization |
| "All layers redraw at every frame" | Unintended motion, identity drift and random flicker | Static layers are compiled once and copied bit-for-bit; animated layers derive from base pose via per-frame integer offset + overdrawing | Proper skeletal joint constraints, nonrigid deformation, authored timing and anchor IDs |
| "Invalid director output can silently fall back to a default bottle" | Model appears successful while ignoring original request | Director's plan must pass hard validation; fail with a specific error rather than silently changing subject | More user-readable inline stage correction |
| "On repair, regenerate the whole layer with all of its long history" | Token waste, loss of approved work | Retry only failing plan/layer, up to two attempts, with exact compiler feedback; earlier layers remain immutable | Expose accept/reject checkpoint after each stage |
| "A schema-valid animation is artistically excellent" | Mechanical checker misses silhouette quality, poor materials and no storytelling | Keep technical warnings separate; no automatic aesthetic scores or fabricated model-quality claims | Human/vision-informed evaluation and calibrated model A/B experiments |

## Actual staged generation contract

1. **Brief / director:** choose a recognizable subject, shape hierarchy, restrained palette, stable anchors, ordered layer responsibilities, and distinguish *static* from *animated* elements. The stage outputs JSON, never the image.
2. **One layer at a time:** write a small whitelist of primitive operations (pixel, rect, line, ellipse, polygon). Each has bounded integer coordinates and named palette symbols.
3. **Static frame lock:** the compiler renders a static base exactly once and duplicates it across the timeline. The LLM is not invited to redraw rigid components four times.
4. **Motion as change, not recreation:** animated layers specify four transforms against the same base and optional correction strokes/erasures. The model focuses on pose/phase differences.
5. **Reference alignment:** the model receives the director plan and a real 24×24 symbol snapshot of the already-compiled visual structure before drawing the next layer. Optional clipTo references a previously approved layer.
6. **Compile and verify:** the engine rejects unknown ops, out-of-bounds shapes, missing palette colors, invalid masks, duplicate IDs, completely empty layers and animation layers that never move. Failed stages can retry, but earlier accepted layers are not regenerated.
7. **Studio output:** the compiled result remains a normal `pixelweave/layered-v1` project: edit its Cels, inspect layers, export PNG/spritesheet/JSON/WebM. Quality remains a review decision, not a schema field.

Data format `pixelweave/semantic-v1` is a **generative authoring program**, not a replacement for editable `pixelweave/layered-v1`. No arbitrary JavaScript, SVG, HTTP requests or model-submitted executable expression is evaluated.

## Example minimal program (illustration of protocol, not a claimed LLM success)

```json
{
  "format":"pixelweave/semantic-v1",
  "name":"Crimson Torch",
  "width":24,"height":24,"fps":8,"frames":4,
  "palette":{".":"transparent","K":"#231d31","R":"#c64d64"},
  "layers":[
    {"id":"torch","name":"Torch handle","kind":"static",
     "base":[{"op":"rect","x":11,"y":12,"w":3,"h":10,"color":"K"}]},
    {"id":"flame","name":"Moving fire","kind":"animated",
     "base":[{"op":"polygon","points":[[8,13],[11,5],[16,13]],"color":"R"}],
     "motion":[
       {"dx":0,"dy":0,"ops":[]},{"dx":1,"dy":0,"ops":[]},
       {"dx":0,"dy":-1,"ops":[]},{"dx":-1,"dy":0,"ops":[]}
     ]}
  ]
}
```

The program above can be pasted into Studio's JSON importer on **GitHub Pages**, with no local model service. It deterministically compiles to individually editable cels. It is only a simple syntax example, not a curated artwork.

## Use with local models

```powershell
$env:PIXELWEAVE_API_BASE="http://127.0.0.1:11434/v1"
$env:PIXELWEAVE_MODEL="your-installed-text-model"
$env:PIXELWEAVE_API_KEY="ollama"
npm run dev
```

`/api/generate` now uses **semantic-v1 by default**. For comparison:

- `$env:PIXELWEAVE_PIPELINE="progressive"` runs the original four-layer, 16×16 grid strategy.
- `$env:PIXELWEAVE_PIPELINE="oneshot"` runs the older complete-grid strategy.

An actual model needs to be evaluated for its ability to emit valid geometry, choose meaningful layers and follow frame constraints. The server keeps the model key locally; public Pages only offers copy-prompt/import.

## Acceptance gates before calling this production-grade

**Gate A · Structural reliability:** Same set of at least 5 briefs (key, bottle, flame, 4-frame character idle, environment detail), at least 3 repetitions/model, same token budget. Record plan acceptance, layer acceptance, retry count, empty/motion errors, time, tokens and cost. No silently skipped failed runs.

**Gate B · Visible art:** Evaluate anonymous native-resolution sprites by real reviewers: identity at 1×, silhouette, clustered forms, plausible material, consistent light direction. Review both best and median examples. Shape-only tests cannot certify this.

**Gate C · Motion:** Static layers must be identical across frames; dynamic layer changes must express a meaningful event. Evaluate pose clarity, silhouette/volume stability, contact anchors, path/spacing and loop seam. A nonzero pixel delta **does not** prove good animation.

**Gate D · Production:** Frame timing / ping-pong / reverse export must match the preview; stage approve/reject and undo should be exposed in the UI; save source program plus revisions. Firefox/Safari/mobile touch and long sessions still require tests.

**Gate E · Scaling:** A 24×24, 4-frame test is deliberately small. Only after quality is shown should the protocol expand to 32–64 px with *region-level clusters, tile regions, reusable shapes, constrained local patches, pose graphs, and exposure timing*. Scaling raw grids directly is the regression to avoid.

## Priorities for the next iteration

1. **P0:** Human-in-the-loop step inspection: editable director plan, approve/reject key silhouette before filling, visual before/after, stage-specific retry without losing prior acceptance.
2. **P0:** Organic cluster/region drawing: scanline fill masks, union/subtract, silhouettes as named masks, controlled region brush, and joint-based motion for character sprites. Keep all operations deterministic.
3. **P0:** Real model benchmark and blind human quality assessment; establish expected success by model and complexity tier rather than promising high-quality outputs universally.
4. **P1:** Save and diff the original semantic program, model/temperature/token settings, stage outputs, compiler errors and human revisions alongside the editable project.
5. **P1:** Per-frame duration, linked/exposed Cels, animation preview/export parity; benchmark frame-to-frame consistency.
6. **P2:** Optional vision critique *only if a vision-capable model is deliberately configured*. The baseline remains pure text LLM and deterministic compilation; never require images or diffusion to draw.

## Useful primary references

- [Aseprite animation fundamentals](https://www.aseprite.org/docs/animation): time, reusable Cels and frame semantics.
- [Aseprite linked Cels](https://www.aseprite.org/docs/linked-cels/): preserve truly static imagery rather than independently regenerating it.
- [Pixel-DSL](https://pixel-dsl.com/): a separate example of shape commands being a compact, deterministic, LLM-friendly pixel-art representation.

The references inform PixelWeave's method; no external repository code was copied.
