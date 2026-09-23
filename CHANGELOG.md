# Changelog

## v20260922.17.1 — 2026-09-23

- Expanded Dual QSS regression to 273 exact XML/CSV pairs from a 330-XML injection corpus, covering 5833 injection points and 11,660,167 paired raw Time/Voltage samples.
- Corrected raw-lifetime semantics: PV-2000 raw CSV LifeTime maps to TransientInfo@LifeTime; XML Values remains a distinct diagnostic lifetime source.
- Dual QSS now defaults to the validated PV-2000 raw lifetime, provides an XML Values curve-source selector, and labels both lifetime fields explicitly in UI/export.
- Hardened the private validator for RoundWafer structure, Raw data/ lookup and Values↔TransientInfo drift reporting.

## v20260922.17 — 2026-09-22

- Added validated `LBIC-REFLECTANCE-003` handling for reflectance-only `LBICMeasurement` XMLs where `MeasureCurrent=false` but BeamData still carry zero-valued Current placeholders. Disabled Current is no longer exposed or used to synthesize EQE/IQE; Reflectivity becomes the default result.
- Regressed DirectReflection + ScatteredReflection against 60 PV-2000 XPS Reflectivity printouts covering 44 measurements from a 62-XML corpus; Average / Median / sample Stdev / Min / Max agree within the vendor's two-decimal display rounding (<0.005 %-point maximum discrepancy).
- Added partial SquareRegionPattern display support for incomplete acquisitions by mapping available DataItems onto the leading X-fast / ascending-Y schedule. Partial geometry is explicitly labelled inferred and is excluded from validated-profile parity.

## v20260922.16 — 2026-09-22

- Added a dedicated `JZeroMeasurement` Emitter J0 analyzer instead of aliasing the result to QSS-µPCD. It pairs the two `UpcdIterationData` lifetime maps, exposes Basore J0 plus both τeff.d/Smax/Implied-Voc channels, and provides map, Distribution, filtering, axes/bins controls and CSV export.
- Added `MapPattern + PseudoSquareCell` JZero geometry using the EdgeExclusion-adjusted rectangle∩circle schedule. The supplied 156 × 156 mm / Ø205 mm / 7 mm exclusion / 2 mm pitch reference reconstructs all 5017 coordinates exactly.
- Added JZERO-MAP-001 regression documentation and a private paired-reference validator. On the supplied ES560 XML/CSV pair, both lifetime and Smax channels match to floating-point precision, Basore J0 matches to ~9.1e-13 fA/cm² max error, and the separate JZero Implied-Voc compatibility path remains within ~0.066 mV max error.
- Changed `← Open XML →` semantics so arrow clicks never launch a file/folder picker. Folder authorization is a separate explicit action; after authorization the arrows directly load adjacent XML files in natural filename order.
- Audited README, architecture, measurement roadmap, reference profiles, validation record, handoff, contributor checks and agent instructions for the current analyzer/profile set.

## v20260922.15 — 2026-09-22

- Added `VcpdMeasurement` support to the shared ISC/Kelvin-probe analyzer while keeping VCPD and ISC as separate XML/result profiles. The supplied 1649-site `MapPattern + RoundWafer` reference validates direct Vcpd Dark readings, coordinates and vendor summary statistics point-by-point.
- Added QSS-µPCD `HighDensityPattern` runtime coordinate support from explicit normalized XML coefficients for observed RoundWafer and SquareCell cases. This coordinate path remains inferred pending matching vendor X/Y exports.
- Added initial adjacent-XML navigation infrastructure around the toolbar Open XML control.
- Added validated LBIC `MapPattern + PseudoSquareCell` support for the supplied 54,449-site four-beam reference, including geometry-aware masking, physical-coordinate profiles and independent per-beam Current / Reflectivity / IQE parity. This is recorded as `LBIC-MULTI-002`; calculated diffusion length remains unsupported.
- Added the dedicated `DualQssMeasurement` raw injection-sweep analyzer with XML lifetime curves, stored transient inspection, LP/HP/repeat overlays and CSV export. Fifty-seven paired raw CSV exports validate 1003 injection rows and the raw transient path; vendor result-table Lifetime/Δn/Implied-Voc/J0 post-processing remains unresolved.

## v20260922.14 — 2026-09-22

- Added **Material: Silicon (Si) / Germanium (Ge)** to Dit Analysis controls, defaulting to Si without inferring material from filenames or substrate names.
- Restored the legacy MATLAB Ge semiconductor constants (`ni = 2e13 cm^-3`, `εr = 16.2`) and applied the selected material consistently to Qsc, variation/Minimum Dit, flatband/Qtot and Midgap Dit targeting. Ge is explicitly unvalidated against PV-2000 Ge output.
- Added unit regressions for Ge Qsc, material-dependent midgap targeting and material-dependent variation Dit while preserving the existing Si-default path.

## v20260922.13 — 2026-09-22

- Added `REFERENCE_DATA_LICENSE.md` with explicit public-use, redistribution and Project Owner sublicensing/relicensing grants for intentionally contributed reference material, while preserving third-party-rights limits.
- Added the `Legal / contributor grants` GitHub Actions status: external PR authors must personally post the exact CLA acceptance; PRs touching `reference_data/` must also post the exact Reference Data License acceptance. Editing/deleting those comments triggers reevaluation.
- Tightened public data-submission guidance and the Share PV-2000 data issue form: XML + numeric CSV are preferred, uploads are explicitly public, and full XPS/vendor reports, binaries/debug symbols/decompiled material and full-interface screenshots are excluded by default.

## v20260922.12 — 2026-09-22

- Added QSS-µPCD `SquareRegionPattern + SquareCell` coordinate reconstruction from Region + Dimension, including effective pitch and explicit rectangular raster support. The supplied 35 × 30 / 1050-point XML+CSV pair validates all reconstructed X/Y coordinates point-by-point.
- Corrected QSS Distribution filtering semantics: plotted Count now contains valid points only; excluded points no longer inflate/stack into the histogram count. Filter bounds remain inclusive and are shown only as yellow reference lines.
- Fixed shared Axes popovers being clipped by chart panels and placed Distribution `Swap axes` in the same action row/style as Auto/Apply.
- Removed the global 300 px canvas-wrapper minimum that caused large blank regions beneath plots in narrow columns.
- Streamlined README usage/licensing/UI material and moved maintained developer/UI details into architecture/contribution documentation.

## v20260922.11 — 2026-09-22

- Refreshed the welcome page with compact Guide / Source / Contribute / Share / Report shortcuts, same-row build provenance and a stable `PV-2000-Analyzer.html` offline download artifact.
- Moved every scientific plot's `Axes` control from the lower-left plot overlay into the chart header immediately before export controls, with one shared visual style.
- Standardized QSS, LBIC and ISC Distribution orientation to **Count on X** by default; `Swap axes` now lives inside the Distribution Axes popover instead of occupying the chart header.
- Added a dedicated `Bins` header control to every Distribution. Users can set 5–200 bins to make histogram bars wider or narrower; changing bins resets only the Distribution zoom.

## v20260922.10 — 2026-09-22

- Hardened ISC validation semantics so a missing `VcpdOffset` remains missing instead of silently becoming zero; the private validator now requires both offset and VSB correction factor for the validated result path.
- Added regression coverage for missing-offset behavior.
- Added `Swap axes` to ISC Distribution, matching the existing QSS/LBIC distribution controls.
- Made ISC maps geometry-aware: solid nominal RoundWafer/SquareCell outline, dashed EdgeExclusion-adjusted scheduled boundary, equal physical X/Y scale, and clipping of map cells to the scheduled region.

## v20260922.9 — 2026-09-22

- Added a dedicated `ISCMeasurement` analyzer for Initial Surface Charge with selectable Vcpd Dark / Vcpd Light / VSB maps, statistics, distributions, selected-site repeated-reading inspection and CSV exports.
- Reconstructed the ISC result path from one matching XML + PV-2000 CSV: `Vcpd Dark = mean(Dark)-offset`, `VSB = factor×(mean(Dark)-mean(Light))`, and `Vcpd Light = Vcpd Dark-VSB`; all 169 reference sites and vendor summary statistics match to floating-point precision.
- Validated the reference `MapPattern + SquareCell` coordinate schedule exactly (13×13, X-fast row-major) and added a private paired-reference validator plus algorithm/reference-profile documentation.

## v20260922.8 — 2026-09-22

- Made the QSS-µPCD wafer-map geometry visually follow the XML target: RoundWafer uses a circular nominal outline; SquareCell uses its nominal Width × Height outline.
- Added a dashed inner outline for the EdgeExclusion-adjusted scheduled measurement region and kept the rectangular plot frame visually separate.
- Default map autoscaling now includes the full nominal target with equal X/Y physical scale and a small margin; smooth interpolation is explicitly clipped to the scheduled region.

## v20260922.7.1 — 2026-09-22

- Changed the optional Midgap Dit PCHIP outlier limit from a fixed default of 2E13 to an opt-in manual threshold: blank disables absolute-value rejection while finite positive values preserve the legacy filter behavior.
- Made Midgap Dit explicitly interpolation-only. The theoretical target must be covered by both measured Vsb and the retained PCHIP fit domain; unavailable results state whether measured or post-filter fit coverage is insufficient instead of implying an extrapolated value.
- Added PCHIP threshold/coverage metadata to Dit CSV export and explicit out-of-coverage status in the Dit result/chart UI.
- Added numeric tick values and grid guides to both axes of QSS-µPCD Distribution, including Swap axes mode.

## v20260922.7 — 2026-09-22

- Added inferred QSS-µPCD `MapPattern + SquareCell` coordinate reconstruction from target `Size`, `EdgeExclusion` and `Pitch`, fixing blank maps when the XML contains valid raster data but no `RoundWafer` target.
- SquareCell maps now use their effective rectangular bounds for default display and smoothing instead of the circular RoundWafer mask; the existing RoundWafer path remains unchanged and separately validated.
- Added regression coverage for a centered 31 × 31 SquareCell schedule while keeping the new geometry explicitly labelled inferred pending a matching PV-2000 export.

## v20260922.6 — 2026-09-22

- Unified the Dit model's 300 K silicon intrinsic-carrier concentration at `9.65e9 cm^-3`, the legacy MATLAB midgap value, so semiconductor Qsc and the midgap target no longer use different ni constants.
- Added a regression test that locks Qsc to the unified value and documented that the historical ~2.6% W1 figures predate this numerical cleanup and require re-checking before being quoted for the updated model.

## v20260922.5 — 2026-09-22

- Reworked manual plot limits into floating bottom-left Axes popovers. Apply/Auto close the popover, so controls no longer consume chart height.
- Audited Dit, QSS-µPCD and LBIC numeric plots: manual X/Y limits now cover applicable maps as well as line/distribution/profile plots; LBIC raster maps now show regular numeric X/Y ticks instead of endpoint-only labels.
- Reorganized LBIC so Selected pixel and Channel provenance live in the left sidebar; the right workspace is Map + Distribution on the top row and X/Y profiles side-by-side below on wide screens.
- Moved QSS-µPCD Current dataset into the left sidebar.
- Dit Analysis controls now start expanded; Results summary is collapsible, starts expanded, and preserves its open/closed state during in-module rerenders.

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
