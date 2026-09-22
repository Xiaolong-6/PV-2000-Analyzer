# Changelog

## v20260922.1.5 — 2026-09-22 — branch

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
