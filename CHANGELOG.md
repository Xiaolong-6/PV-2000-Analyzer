# Changelog

## v20260922.4 — 2026-09-22

- Removed the empty QSS `Algorithm notes` runtime panel. Algorithm/reference explanations remain in the project documentation and hover help, where they provide actual content.

## v20260922.3 — 2026-09-22

- Fix QSS-µPCD RoundWafer coordinate reconstruction to honor XML `EdgeExclusion` before the strict circular site test, including the 100 mm / 3 mm exclusion / 2 mm pitch 1741-point case.
- Remove the fixed “Algorithm validation — reference dataset” card from the runtime UI; reference validation remains in project documentation.
- Add compact manual X/Y lower/upper limits to applicable Dit, QSS and LBIC numeric plots while retaining wheel zoom and double-click Auto reset.
- Add numeric ticks to LBIC Distribution and X/Y line profiles and remove the forced LBIC canvas minimum height that created excessive blank space.
- At medium viewport widths (<=1200 CSS px), keep the functional sidebar but stack the two right analysis columns into one vertical column so plots remain readable and the page can scroll downward.

## v20260922.2 — 2026-09-22

- Reformatted dense executable JavaScript in Dit/QSS/LBIC into reviewable multi-line statements without changing scientific formulas or runtime data paths.
- Added shared `src/core/ui.js` helpers for HTML escaping, help markup, CSS variables and plot tooltips; removed duplicated module-local implementations.
- Added ESLint 10.11.0 and a source-density regression guard to CI and GitHub Pages quality gates.
- Stopped tracking generated `dist/index.html`; `dist/` is now ignored and rebuilt by CI/Pages.
- Updated contributor/agent/handoff guidance and added regression tests for the shared helpers and hygiene rules.

## v20260922.1 — 2026-09-22 — baseline

This is the new versioning baseline for **PV-2000 Analyzer**. Earlier development used temporary 0.x semantic versions; those identifiers are retired.

Baseline capabilities include:

- XML-only PV-2000 runtime with measurement-type dispatch and Generic Inspector fallback.
- Dit / COCOS analysis, including validated/inferred boundaries, Optional Midgap Dit PCHIP controls, exports and interactive plots.
- QSS-µPCD map analysis with validity filtering, Smax/implied-Voc compatibility calculations and paired-reference validation.
- LBIC raster analysis with validated coordinate reconstruction, Current / Reflectivity / IQE paths, diagnostics and paired-reference validation.
- Shared plot zoom/reset behavior and equal physical X/Y scaling for spatial maps.
- GitHub Pages deployment from `main`, build provenance, contribution/data-sharing workflows, AGPL-3.0-only community licensing, commercial licensing path and CLA.
- Redesigned welcome page with supported-analyzer summary, prominent XML drop zone, local-processing/privacy message and concise project links.

From this baseline, canonical versions are stored in root `VERSION` and follow the date/ordinal scheme documented in `AGENTS.md` and `docs/VERSIONING.md`.
