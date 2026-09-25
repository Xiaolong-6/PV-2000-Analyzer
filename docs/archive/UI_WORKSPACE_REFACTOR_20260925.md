# Analysis workspace / visualization UI refactor plan — 2026-09-25

## Purpose

This branch normalizes the dedicated-analyzer workspace without changing scientific calculations, XML parsing semantics, validation envelopes, quantity provenance, or vendor-parity logic.

Two user-facing problems are addressed together because they share one state/layout boundary:

1. the right-side visualization layer is inconsistent across measurement families (font scale, plot dimensions/aspect, controls, and metric coordination);
2. the desktop three-column layout currently mixes dataset-level information with selected-site detail.

The target is a stable scientific workspace in which the same interaction has the same meaning across dedicated analyzers.

## Desktop information architecture

Wide screens retain three columns, but each column receives one semantic role.

### Left — dataset / analysis state

The left sidebar answers: **what is being analyzed and under which settings?**

Place here, where applicable:

1. Measurement identity / recipe / substrate / pattern / geometry summary;
2. dataset/acquisition/validation status;
3. Analysis controls;
4. Valid-data filter;
5. Results summary;
6. collapsed acquisition/provenance/full metadata.

Do not place selected-site or selected-pixel detail in the left sidebar.

The left sidebar remains independently scrollable on fine-pointer desktop layouts.

### Middle — population / whole-sample overview

The middle column answers: **what does the whole measured sample look like?**

Place here, where applicable:

- wafer/raster/measurement-position map;
- Distribution;
- other whole-dataset statistical/spatial views.

Map and Distribution should use one active displayed quantity when both are quantity-driven.

### Right — point / local detail

The right column answers: **what was measured or calculated at the selected point?**

Place here, where applicable:

- Selected site / Selected pixel / Measurement point card;
- raw readings;
- acquisition/transient/profile traces;
- current-site fits;
- point-specific scientific curves;
- local X/Y line profiles when they are defined by the selected pixel.

Clicking a map site updates the right-column detail surface.

For a true one-point measurement, use **Measurement point** rather than implying a selection operation.

## Responsive contract

- Wide desktop: left dataset sidebar + middle overview + right local detail.
- Medium width (<=1200 CSS px): keep the dataset sidebar and stack middle/right analysis regions in one content column.
- Narrow/mobile: collapse to one column in semantic order: dataset state -> overview -> local detail.
- Portrait orientation alone must not force the mobile layout on fine-pointer desktop systems.

## Visualization contract

### Shared plot surfaces

Replace module-specific display sizing with a small shared set of plot surfaces:

- **standard**: primary maps, distributions, raw traces, acquisition profiles, fits and ordinary scientific plots;
- **compact**: only explicit compound/minor views such as paired X/Y mini-profiles.

A module may choose map-specific equal-physical-axis handling, but it should not invent unrelated card sizing.

### Typography

Plot text must remain readable at rendered CSS size.

Target baseline:

- axis ticks: 11-12 CSS px;
- axis titles: 12 CSS px;
- legends: 11 CSS px;
- chart metadata: 10-11 CSS px;
- no-data/status message: 12 CSS px.

Canvas rendering should become CSS-pixel-aware and devicePixelRatio-aware so responsive resizing does not shrink internally hard-coded 9-10 px text.

### Controls

Where applicable, chart headers use a consistent order:

1. title + help;
2. metric/view selector(s);
3. Axes;
4. Bins for histograms;
5. Export.

Wheel zoom, axis-only wheel zoom, double-click Auto and per-chart export remain required.

## Active quantity and Valid-data filter

Current modules commonly maintain separate displayed-metric and filter-metric state. This can make a map/distribution show one quantity while the filter panel silently operates on another.

Default interaction after this refactor:

- changing the displayed quantity updates the Filter metric to the same quantity;
- changing Filter metric updates the displayed quantity to the same quantity;
- Map / Distribution / other quantity-driven population views stay on that same active quantity.

This is a UI-state synchronization rule only. The shared selection core must continue to support cross-metric masks internally so an explicit advanced cross-metric filter can be added later without redesigning selection semantics.

Diagnostic/local plots are exempt when their scientific meaning is not an alternate site-level quantity. Examples: ISC raw readings, DIT Vcpd-Qc / Vsb-Qc / Dit-Vsb, CET current-site fit.

## Family audit matrix

The implementation/audit covers every dedicated analyzer on the branch:

| Family | Middle / overview | Right / local detail | Active metric link |
| --- | --- | --- | --- |
| DIT | Wafer map / measurement position | Selected/measurement point + Vcpd-Qc, Dit-Vsb, Vsb-Qc | Filter <-> map quantity |
| QSS-uPCD | Wafer map + Distribution | Selected site + acquisition profile | Filter <-> map/distribution/profile quantity |
| Dual QSS | global injection comparison as applicable | measurement point + injection curves/details | family-specific |
| JZero | Wafer map / measurement position + Distribution | Selected/measurement point | Filter <-> map/distribution quantity |
| ISC / VCPD | Map + Distribution | Selected site + Raw readings | Filter <-> map/distribution quantity |
| LBIC | Raster map + Distribution | Selected pixel + X/Y local profiles | Filter <-> map/distribution/profile quantity |
| CET | Map + Distribution | Current site + Vcpd-light/Qc fit | Filter <-> map/distribution quantity |
| SPV | Map + Distribution | Selected site / point details | Filter <-> map/distribution quantity |
| Leakage | measurement position/global summary if useful | Measurement point + leakage profile | family-specific |

No family receives a fake Distribution or fake heat map merely to fill a column.

## Implementation sequence

### Phase A — contract and regression inventory

- Record the new layout/visualization contract in this document.
- Update architecture/developer guidance so new analyzers use the same semantic columns.
- Add structural tests for column roles and shared visualization helpers before broad migration.

### Phase B — shared visualization foundation

- Add shared plot sizing / high-DPI canvas helper(s) in `src/core/plot.js`.
- Normalize CSS chart surfaces and readable chart typography.
- Keep SVG and Canvas output visually aligned.
- Preserve existing zoom/axes/bin/export behavior.

### Phase C — reference migration: ISC/VCPD

Use ISC/VCPD as the first implementation because it exposes all target concepts in one view:

- left dataset/filter/summary metadata;
- middle map + Distribution;
- right Selected site + Raw readings;
- bidirectional Filter metric <-> displayed metric synchronization.

Lock behavior in tests before applying the pattern elsewhere.

### Phase D — multi-site family migration

Apply the same contract to:

- QSS-uPCD;
- JZero;
- SPV;
- LBIC;
- CET;
- DIT.

Keep family-specific scientific views in the appropriate semantic column.

### Phase E — one-point/comparison audit

Audit:

- Leakage;
- Dual QSS;
- one-point branches of DIT/JZero/CET/SPV/etc.

Use **Measurement point** where there is no real selection action.

### Phase F — cross-family visual/content audit

For each dedicated analyzer verify:

- correct overview vs local-detail placement;
- expected plots are present and scientifically meaningful;
- no empty/fake plot is introduced;
- active metric drives the intended population views;
- selected-site interaction updates local detail;
- filter mask / availability semantics remain distinct;
- map geometry preserves equal physical X/Y scale;
- histogram Count-axis default, swap and bins remain consistent;
- axis/legend/unit labels are readable and consistent;
- no-data/partial-acquisition states are explicit;
- all charts keep export and shared zoom semantics;
- medium/mobile layout remains usable.

Run `npm run check`, `npm run build`, and relevant validators available in the environment.

## Non-goals

This branch does not:

- alter scientific algorithms;
- widen validated reference profiles;
- change XML parsing/result equations;
- add new calculated result quantities;
- publish or move private reference data;
- imitate the legacy PV-2000 application.

## Completion and archival

During implementation this document is the live checklist and records deviations/decisions.

After the final cross-family audit:

1. move enduring rules into `docs/ARCHITECTURE.md`, `AGENTS.md`, and user-facing documentation where needed;
2. append final audit evidence/results to this document;
3. move this detailed implementation record under `docs/archive/` so the active docs surface keeps only durable contracts.

## Final audit — 2026-09-25

Status: **complete on the feature branch**.

### Implemented contract

- Wide desktop uses three semantic columns: dataset / analysis state, whole-sample overview, and point / local detail.
- Medium layouts preserve the left dataset sidebar while overview/detail surfaces stack in the analysis column; narrow layouts collapse in semantic order.
- Selected-site / selected-pixel / measurement-point information is kept out of the dataset sidebar. DIT aggregate Results summary also no longer embeds current-site values.
- Quantity-driven Map / Distribution / line-profile views are synchronized bidirectionally with Valid-data filter metric selection. The selection core still supports independent cross-metric masks internally.
- Canvas plots use shared responsive CSS-pixel sizing with device-pixel-ratio backing; SVG families use the common 640×360 logical surface. LBIC X/Y profiles use the explicit compact surface.
- Plot labels were normalized to a readable baseline: dedicated-analyzer scientific plot text is 10 px minimum in CET/DIT SVG site labels and 11 px minimum in Canvas axes/labels.
- True one-point branches suppress population-only Distribution/profile surfaces where applicable and use Measurement point / Measurement position wording.

### Family audit result

| Family | Overview / middle | Local detail / right | Metric synchronization | Audit result |
| --- | --- | --- | --- | --- |
| DIT | Wafer map / measurement position | Selected/measurement point, Vcpd–Qc, Dit–Vsb, Vsb–Qc, flatband details | Filter ↔ map quantity | Pass |
| QSS-uPCD | Map, Distribution, acquisition-order profile | Selected/measurement point | Filter ↔ map/distribution/profile quantity | Pass |
| Dual QSS | Lifetime-vs-intensity comparison + measurement position | Selected injection point + stored transient | Not applicable | Pass |
| ISC / VCPD | Map + Distribution | Selected/measurement point + raw readings | Filter ↔ map/distribution quantity | Pass |
| JZero | Map / measurement position + Distribution when multi-site | Selected/measurement point | Filter ↔ map/distribution quantity | Pass |
| LBIC | Raster map + Distribution | Selected pixel + X/Y local profiles | Filter ↔ map/distribution/profile quantity | Pass |
| CET | Map + Distribution when multi-site | Selected/measurement point + current-site fit | Filter ↔ map/distribution quantity | Pass |
| SPV | Map + Distribution when multi-site | Selected/measurement point | Filter ↔ map/distribution quantity | Pass |
| Leakage | Measurement position | Selected/measurement point + raw leakage readings | Not applicable | Pass |

QSS acquisition profile is intentionally classified as an **overview** surface because it shows the entire acquisition-order series; it is not a selected-site trace.

### Cross-family source audit

- All nine dedicated analyzers expose explicit `plots overview` and `plots detail` regions.
- No dedicated Canvas analyzer retains fixed numeric `canvas.width = ...` / `canvas.height = ...` display sizing.
- DIT, QSS-uPCD, ISC/VCPD, JZero, LBIC, CET and SPV use the shared linked displayed/filter metric behavior. Dual QSS and Leakage do not expose an alternate site-level metric filter, so no link is required.
- Multi-site map selection updates right-hand local detail for DIT, QSS-uPCD, ISC/VCPD, JZero, LBIC, CET and SPV. Dual QSS selects injection points from the comparison curve. Leakage is currently a one-point family.
- QSS smooth interpolation no longer uses transform-agnostic `ImageData`; it is rendered in logical CSS coordinates and remains correct with high-DPI Canvas transforms.
- Dynamic DIT analysis rebuilds re-resolve the map/filter quantity together, including the case where optional Midgap Dit is disabled.

### Regression evidence

- Public CI `test-build` passed on implementation commit `c4be628b94ae36c582cf927da0d02bce0a0051b3`, including `npm run check`, documentation checks, the complete Node test suite, validator syntax smoke, and `npm run build`.
- Source-density checks pass after splitting the new point-selection and redraw logic into inspectable statements.
- Existing equal-physical-axis map, Distribution Count-axis / Swap / Bins, axes popover, export, and responsive-layout regression tests remain in place; new tests cover semantic columns, linked metrics, one-point plot suppression, responsive Canvas sizing, and QSS high-DPI smooth rendering.

### Scope boundaries

- No scientific equations or validation envelopes were intentionally changed by this UI work. The branch was rebased/merged with main `v20260925.14` and preserved its independently validated DIT result-Vsb changes.
- Cross-metric filtering remains available in the selection core but is not exposed as a separate advanced UI mode in this refactor.
- No pixel-golden or browser-screenshot baseline was added. Visual consistency is protected through the shared surface/typography implementation and structural/regression tests rather than brittle screenshot matching.

### Archival decision

The durable workspace contract is now recorded in `docs/ARCHITECTURE.md` and `AGENTS.md`. This implementation plan is archived because all planned phases A–F are complete; future analyzer work should follow the durable contract rather than extending this dated checklist.
