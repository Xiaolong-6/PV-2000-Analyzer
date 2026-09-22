# Changelog

## Unreleased

- Added GitHub Pages deployment from `main`: every successful test/build publishes the generated `dist/` site through GitHub Actions.
- Renamed the project-facing product name to **PV-2000 Analyzer** across README, HTML title, landing page, toolbar brand and documentation; package name remains `pv2000-analyzer`.
- Added selectable Optional Midgap Dit fitting methods: default **Median-binned PCHIP** with an adjustable 10 mV Vsb window, plus **PCHIP (original)** for backward-compatible raw-point fitting; LOG10/Linear remain shared scale options and Minimum Dit stays discrete/invariant.
- Added a community contribution workflow for extending PV-2000 support: data-only PRs with raw XML + matching vendor export are explicitly welcome, with PV-2000 screenshots strongly recommended.
- Added an opt-in tracked `reference_data/` area for publishable regression cases while keeping `private/` strictly local/confidential.
- Added contributor/reference-data documentation and a PR checklist covering same-measurement pairing, publication rights, validation scope and regression expectations.

- Removed the obsolete Advanced / legacy COCOS-II method and its guide-based runtime path.
- Made Optional Midgap Dit (PCHIP) always visible with a default-on checkbox; disabling it suppresses the PCHIP curve/Midgap Dit only, while Minimum Dit stays unchanged.
- Rendered the PCHIP outlier-limit input in uppercase-E scientific notation.
- Added shared wheel zoom to every scientific plot: zoom both axes inside the plot, zoom one axis when hovering that axis, and double-click to restore auto scale.
- Added LBIC Distribution `Swap axes`, matching QSS Distribution.
- Changed Dit Vcpd–Qc to a point-line plot; ordinary data markers are smaller than the initial-condition marker.
- Moved remaining LBIC/QSS long explanatory paragraphs into contextual hover help.
- Fixed the real sidebar-scroll root cause: flex children were shrinking to the fixed viewport-height sidebar, so no overflow existed. Sidebar panels now keep intrinsic height and the sidebar uses a real vertical scroll container.
- Moved long Dit/COCOS explanatory paragraphs out of the persistent UI and into contextual hover help.
- Matched PV-2000 LBIC Reflectivity saturation at 100% when DirectReflection + ScatteredReflection slightly exceeds 100%, with regression coverage.
- Added a cross-platform Python validator launcher for Windows/Linux/macOS and an explicit Generic Inspector unknown-type dispatch test.
- Reworked Dit Results summary from a fixed nowrap table into responsive result cards so Valid-site mean / Current-site values do not clip inside the sidebar.
- Hardened responsive breakpoints: fine-pointer desktop zoom keeps a dedicated sidebar column; portrait/tablet fallback now requires coarse-pointer input, while <=700 px remains the true narrow fallback.
- Added landing-page capability tags for Dit / COCOS, QSS-µPCD, LBIC and Generic XML inspector.
- Added min-width containment to grid children/sidebar panels to prevent intrinsic content width from forcing horizontal overflow.
- Replaced LBIC structural-only assumptions with four paired PV-2000 XML/CSV regressions: X/Y coordinates now use validated X-fast row-major positive-Y reconstruction; Reflectivity reproduces DirectReflection + ScatteredReflection; IQE reproduces vendor output with q=1.602e-19 C and vendor >100% blanking.
- Changed the default LBIC result view to PV-2000-style Current / Reflectivity / IQE; Direct/Scattered reflectance, EQE and unknown numeric channels are available as Advanced raw/intermediate diagnostics.
- Added a paired LBIC validator and central reference-profile registry. Validation is attached to semantic input/output algorithm families: ordinary numeric wavelength/power/FluxCache/raster-size changes stay in-family, while categorical pattern/beam/channel/result/unit/blanking changes are NEW PROFILE until matched against actual PV-2000 output.
- Integrated `LBICMeasurement` from the older `feat/lbic-support` line onto the latest Dit/COCOS-II mainline without reverting newer analysis changes.
- Added dynamic LBIC beam/channel discovery, SquareRegionPattern raster reconstruction, current/reflectance maps, inferred Total R/EQE/IQE candidates, line profiles, selected-pixel inspection and CSV exports.
- Added LBIC unit tests, paired private regression validator and provenance/validation documentation; diffusion length remains intentionally unsupported pending a matching multi-wavelength vendor reference.
- Fixed the left functional sidebar scroll container so browser zoom / the 900 px layout breakpoint no longer makes lower panels unreachable; independent scrolling is disabled only in the actual single-column/mobile layout.
- Fixed missing/empty XML numeric values being coerced to zero; COCOS-II Min/Max now correctly fall back instead of appearing as 0/0.
- COCOS-II invalid settings now show an explicit error and never silently fall back to Standard COCOS.
- Added data-derived COCOS-II suggestions (dark-accumulation EOT plus safe Vsb-window expansion), current-site accepted-interval/minimum-Vsb diagnostics, and a Use recommendation action.
- Clarified Dit semantics: **Minimum Dit (PV2000-style)** is the discrete accepted minimum; Optional Midgap Dit (PCHIP) does not alter the primary minimum.
- Made Dit parameter rows compact with label/help and input on one line; parameter edits mark **Apply analysis settings** as pending.
- Made the desktop left functional sidebar independently scrollable beneath the sticky toolbar so scrolling controls/metadata does not move the plot columns.
- Refined Dit Analysis controls into contextual method-specific sections: Follow XML setting / Standard COCOS / PV2000 COCOS-II (inferred).
- Follow XML setting now resolves `UseCocosII=true` to the inferred PV2000 COCOS-II path and shows the resolved method in the UI.
- Kept Analysis controls open across Apply/recalculation and other Dit re-renders once the user has opened the panel; renamed the action to **Apply analysis settings**.
- Added a selectable **PV2000 COCOS-II (inferred)** Dit algorithm derived from same-raw-data adjustment sweeps: EOT is interpreted in Å, synthetic-light slope uses q/Cox, Vsb is signed, and Min/Max Vsb gate the reported minimum Dit. Back Surface Shift is documented but intentionally not applied until its effect is identified.
- Added COCOS processing controls and exports that show which Dit points pass the inferred Min/Max Vsb window.
- Separated live QSS Current dataset facts from fixed 305-point Algorithm validation evidence, and clarified that imported XMLs are not compared with an export at runtime.
- Colored valid Distribution histogram bars by their metric bins using the wafer map's filtered value range and color scale; excluded counts remain gray in both axis orientations.
- Added a Distribution Swap axes button: the selected metric (lifetime by default) starts on the horizontal axis, then moves to the vertical axis while count moves horizontally. Histogram export retains the same bins and counts.
- Added units beneath every parameter in the Dit Results summary.
- Moved Dit Analysis controls directly above Results summary and made LOG10 the default PCHIP scale. LOG10 interpolates positive log10(Dit) values and restores the fitted curve and midgap Dit to the original units. Switching modes recalculates every site and the Results summary.
- Prevented QSS smooth wafer maps from coloring regions whose nearest measurement site is excluded by the valid-data filter.
- Unified Dit and QSS sidebar typography across metadata, controls, results tables, and explanatory notes.
- Removed the historical charge-derivative diagnostic from the Dit UI and chart export while retaining its calculation internally for regression checks.

## 0.2.0 — 2026-09-21

- Re-architected the Dit-only prototype into the generic PV-2000 Analyzer.
- Added XML measurement-type auto-detection and module registry.
- Added Generic Inspector fallback for unsupported XML types.
- Migrated DIT/COCOS analysis into a module.
- Added QSS-µPCD map module with lifetime, Smax and implied Voc.
- Added round-wafer MapPattern coordinate reconstruction.
- Added smooth/point map, histogram and acquisition-profile views.
- Added CSV export to QSS and Dit charts.
- Added system theme following and manual light/dark toggle.
- Added validation scripts/tests and private-data repository protections.
- Added handoff/architecture/algorithm/validation documentation.

## 0.2.1 - Dit parity restoration

- Restored the richer Dit analyzer after the 0.2.0 multi-measurement refactor had simplified it too aggressively.
- Restored 2x2 Dit visualization set: Vcpd-Qc, Vsb-Qc, log-scale Dit-Vsb with PCHIP overlay, and wafer map.
- Restored wafer-map metric selector and numeric value labels next to every site.
- Restored clickable wafer sites for current-site navigation.
- Restored initial-condition and flatband markers in the Vcpd-Qc chart.
- Restored flatband extraction details, analysis settings, and optional legacy direct-charge Dit audit overlay.
- Restored PCHIP midgap Dit rather than nearest-point approximation used temporarily in 0.2.0.
- Kept the new generic PV-2000 measurement registry and QSS-uPCD module intact.
- Added per-chart CSV export for all four Dit visualizations.

## 0.2.2 — QSS export regression, validity filtering, metadata and COCOS-II

- Added the actual PV-2000 QSS-µPCD CSV export to ignored private regression references.
- Validated all 305 QSS X/Y coordinates and lifetime values exactly; Smax matches to floating-point precision; Implied Voc now matches the export to <0.1 mV maximum pointwise error.
- Added QSS valid-data filter (metric + lower/upper limits), with filtered summary statistics and consistent valid flags in maps/exports.
- Prevented smooth QSS maps from extrapolating far beyond valid measured points, supporting quarter wafers and small coupons.
- Reworked QSS map/distribution/acquisition plots with proper axes, units, ticks, grid, colorbar and hover point/bin information.
- Expanded QSS measurement metadata and hover explanations.
- Removed the unused global legacy Settings button.
- Expanded Dit XML metadata and hover explanations.
- Added automatic `UseCocosII=true` support using a guide-derived synthetic-light COCOS-II path; retained standard COCOS behavior when false.
- Documented that COCOS-II still requires a vendor COCOS-II-on export for exact regression validation.
