# PixelWeave v0.9 — 引导式文本 LLM 美术工作站 / Implementation plan

> Status: implementation in `feat/semantic-llm-workstation`; does **not** imply visual-art quality approval or production release.
> Non-negotiable: text LLM + deterministic raster compiler only. No diffusion, image editing service, image-to-pixel pipeline, or unlabeled copied sprites.

## Goal and definition of done

Given a creative brief, an operator can **review and approve a director plan, generate exactly one meaningful layer, inspect the actual pixels, accept or retry only that stage with actionable feedback, recover the draft after refreshing, then publish an editable `layered-v1` project**. The exported asset's approved static components do not change at later stages.

A passing JSON validator is *necessary but insufficient*: the final human evaluation decides whether the design is aesthetically usable.

## Implementation sequence

### P0/A · Protocol and stage-state gate
- [x] Introduce `semantic-v1` shape/cluster/animated-layer compiler and stage-local generator (prototype).
- [x] Make explicit draft states: director proposal → plan accepted → layer proposal → layer accepted → next layer → complete. Stop before every irreversible approval.
- [x] Revalidate every draft and pending proposal on each request; never allow a model to rewrite previously accepted layers.
- [x] Validate user feedback length, stage IDs and allowed transitions. No silent default art plan.
- **Acceptance:** malformed/unauthorized transitions fail; retry affects only the pending proposal; previous approved layer pixel bytes are identical.

### P0/B · Visible, guided UI and recoverable draft
- [x] Show the director's subject, palette and layer responsibilities before drawing.
- [x] Show **actual rendered pending pixels** at 1× and magnified scale before accepting each generated layer.
- [x] Provide Accept / Retry-with-feedback / Next layer / Publish as separate actions, with an explicit progress indicator.
- [x] Save the entire small validated draft to browser localStorage on successful steps, re-check it on server; interrupted sessions can be resumed without another model call.
- [x] Allow JSON draft export/import, with explicit errors on untrusted or oversized drafts.
- **Acceptance:** browser refresh during review preserves pending proposal; rejection does not alter approved art; published asset is editable in Studio.

### P0/C · Objective evaluation and repeatability
- [x] Add deterministic fixtures and tests for stage guardrails, retry, restoration and drawn-pixel parity.
- [x] Record model identity, per-stage attempts and validation error summaries without storing API keys.
- [x] Create an opt-in benchmark runner; never bill external models in ordinary CI.
- **Acceptance:** old 103 tests + new regression cases pass; no unverified claim of visual improvement.

### P1 · Model-driven visual quality iteration
- [ ] Add controlled multi-model evaluation with same briefs, retries, token budget, seeds where available.
- [ ] Human blind review: 1× readability, structure, cluster quality, material, lighting, motion expression, loop.
- [ ] Target organic shape regions, masks, joint/pose graphs and frame timing based on failure taxonomy.
- **Acceptance:** 5 subjects × 3 attempts/model; report both median and failure distribution; improvement judged by human raters, not schema pass alone.

### P2 · Professional delivery
- [ ] Per-frame timing and exact preview/export parity; linked Cels; GIF/APNG where justified.
- [ ] Multi-project drafts, revision diffs, downloadable build receipts and cross-browser/mobile stability tests.

## Product constraints and safeguards

- All network-based model generation is **explicitly user-initiated** through the localhost proxy. GitHub Pages remains entirely static and retains copy-prompt/import fallback.
- Model output is untrusted structured data, never evaluated as JavaScript; geometry, palette, bounds and memory budgets are deterministic.
- A failed step must preserve the last accepted snapshot.
- "Accept" is the human decision; avoid claiming heuristic passes certify aesthetic quality.
- Stage previews use rendered native pixels, not external generated illustrations or symbolic placeholders.
- Keep gallery curated; generated drafts do not become public artworks until the user explicitly accepts and publishes.

## Implementation record (v0.9 development branch)

- Protocol: `src/guided-workflow.mjs`; text-driven accepted plan and accepted layers validated and replay-compiled on every transition.
- Backend: `POST /api/workflow` with `start / inspect / accept / next / retry` and localhost request guard. No model call for `inspect` or `accept`.
- Browser: `src/guided-ui.mjs` loaded **only when the composer drawer is opened**. The candidate preview and accepted baseline render actual `layered-v1` pixels for selectable frames. Portability: `pixelweave/guided-v1` JSON backups and localStorage recovery.
- Regression: `tests/guided-workflow.test.mjs` covers error/review boundaries and frozen work; `tests/e2e/guided-workflow.mjs` replays actual Chromium UI (using simulated text-model outputs) including browser reload without an extra model call and final editable Cels.
- CLI: `node tools/benchmark-guided.mjs` prints the **no-cost dry run**. Real API usage only with `--run --max-calls=N`, and stops at the cap. A real run has **not** been carried out without selecting an actual model and usage budget.
- Evidence classification: Passing unit/E2E tests validates workflow correctness, not that current language models produce good-looking art. Reviewers must still score rendered examples blindly.

**Remaining critical limitations:** Human can accept or request revision but cannot yet edit the director plan field-by-field; the pending frame shows raw native pixels without automated artistic understanding; no live art-feedback model, organic bone/pose solver, per-frame duration or proven multi-model quality. Those are explicit future phases, not retroactively counted as completed.
