# Changelog

## Unreleased

- Refined Dit Analysis controls into contextual method-specific sections: Follow XML setting / Standard COCOS / PV2000 COCOS-II (inferred), with the older guide-based implementation moved under Advanced / legacy methods.
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

- Re-architected the Dit-only prototype into the generic Semilab PV-2000 Analyzer.
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
