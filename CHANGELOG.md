# Changelog

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
