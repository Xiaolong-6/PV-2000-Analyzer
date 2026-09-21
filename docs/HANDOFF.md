# Agent handoff — 2026-09-21 — v0.2.2

## Goal

Build a general **Semilab PV-2000 Analyzer**: the user drops any PV-2000 result XML, the app reads `Measurement/@xsi:type`, and the corresponding analyzer handles parsing, calculations, plots and exports. CSV/XPS/manuals are development references only; the runtime remains XML-only.

## Current implementation

- modular dependency-free source + single-file `dist/index.html` build;
- automatic measurement registry and Generic Inspector fallback;
- `DITMeasurement` analyzer with restored full Dit UI/functionality;
- `QssUpcdMeasurement` analyzer with lifetime/Smax/Implied-Voc maps;
- system light/dark theme + explicit theme toggle;
- global legacy Settings button removed; controls are module-specific;
- per-chart CSV exports and extensive hover explanations;
- real user/vendor files protected under ignored `private/reference/`.

## QSS-µPCD: reference export now available

`private/reference/qss_upcd_export.csv` is the exact PV-2000 export corresponding to `qss_upcd_example.xml`. Regression status:

- all 305 XML lifetime values match exactly;
- all 305 reconstructed X/Y coordinates match exactly;
- Smax matches point-by-point to floating-point precision (~5e-12 max error);
- Implied Voc matches point-by-point to <0.1 mV max error using XML chuck temperature and the compatibility ni(T) model documented in `ALGORITHMS_QSS_UPCD.md`.

The QSS UI has also been upgraded: proper axes/ticks/units, map colorbar, distribution and acquisition-profile axes, hover point information and cleaner chart headers.

### Important QSS validity behavior

The nominal map can cover more area than the physical sample. A quarter wafer/coupon can therefore contain many meaningless scheduled points. The QSS module now exposes a user-controlled valid-data filter (metric + lower/upper limits). The resulting mask is applied consistently to every summary statistic and derived metric. Excluded points are visually retained for diagnosis, and smooth interpolation is distance-limited so it does not extrapolate a small sample across the whole nominal wafer.

Do not remove this behavior during refactors.

## Dit status

The v0.2.1 parity restoration is retained: 2x2 plots, numeric selectable wafer map, log Dit/PCHIP/midgap, flatband markers/details, site navigation, valid-site/current-site summary and per-chart export.

v0.2.2 adds:

- much fuller XML measurement metadata;
- hover explanations for results/controls/plots;
- automatic support for XML `UseCocosII=true` with synthetic-light reconstruction based on the supplied Aalto COCOS-II guide;
- COCOS-II source/diagnostics in the UI and exports.

**COCOS-II caution:** the available Dit reference has `UseCocosII=false`. The COCOS-II implementation is therefore guide-derived but not yet validated against a vendor COCOS-II-on export. Do not label it vendor-exact until such a fixture is supplied.

Post-baseline local updates: Dit Analysis controls now offers Linear (default) and LOG10 PCHIP fits. Changing mode recalculates all sites and the Results summary immediately. LOG10 fits positive `log10(Dit)` samples and transforms the fitted curve and midgap result back to Dit units. Raw minimum Dit is unchanged; this option has no vendor-export regression yet. The historical charge-derivative diagnostic remains in backend results for regression, but its UI toggle, plot overlay and CSV column have been removed. QSS smooth maps now leave regions nearest to filtered-out sites uncolored while retaining their diagnostic markers. Dit and QSS sidebar metadata, controls, results, and notes share a consistent reading size.

## Required commands before handoff/commit

```bash
npm test
npm run build
npm run validate:qss
git status --short --ignored
```

Current expected tests: 10/10 PASS; QSS private pointwise validator PASS.

## Next scientific module

After stabilizing these two analyzers, add QSS-µPCD Scan/J0 as a separate module (intensity/laser-power scans, QDC, steady-state lifetime/injection, Basore-Hansen J0, Kane-Swanson J0). Do not cram scan/J0 logic into `qss-upcd.js`.
