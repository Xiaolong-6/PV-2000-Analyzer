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

The restored Dit analyzer retains the required 2x2 plots, numeric selectable wafer map, log Dit/PCHIP/midgap, flatband markers/details, site navigation, valid-site/current-site summary, full XML metadata and per-chart export.

Current analysis routing:

- **Follow XML setting** is the normal default.
- XML `UseCocosII=false` resolves to **Standard COCOS**.
- XML `UseCocosII=true` resolves to **PV2000 COCOS-II (inferred)**.
- **Legacy COCOS-II (guide-based)** remains only under Advanced / legacy methods for development comparison.

The inferred PV2000 path comes from same-raw-data parameter sweeps. It interprets vendor EOT as Å, reconstructs signed Vsb and applies configurable Min/Max Vsb when selecting minimum Dit. It is explicitly labelled **inferred**, not vendor-exact. Back Surface Shift is recorded but intentionally not applied because the supplied True/False reprocessing produced identical outputs.

Dit Analysis controls are contextual rather than flat:

- inferred COCOS-II shows EOT / Min Vsb / Max Vsb;
- Standard COCOS hides COCOS-II-only settings;
- shared flatband and Dit-extraction settings remain visible;
- the legacy guide-based method is hidden under Advanced / legacy methods;
- Follow XML displays the resolved method;
- Apply/recalculation, method changes, PCHIP changes and site re-renders preserve the Analysis controls open state once the user has opened it.

LOG10 remains the default PCHIP scale; Linear remains available. The Results summary labels each parameter with its unit. The historical charge-derivative diagnostic remains backend-only for regression.

QSS Distribution has a Swap axes button beside Export. The map-selected metric (lifetime by default) starts on the horizontal axis with count vertically; swapping moves the metric to the vertical axis and count to the horizontal axis. Valid histogram bars use the same color scale and valid-point value range as the wafer map; excluded counts remain gray. The histogram CSV remains in metric bins and includes the selected metric's units in bin headers.

The QSS result view separates Current dataset facts from fixed algorithm-validation evidence for the 305-point reference. Importing another XML does not imply agreement with an unseen vendor export.

## Required commands before handoff/commit

```bash
npm test
npm run build
npm run validate:qss
git status --short --ignored
```

Current expected automated tests: 15/15 PASS after the Dit controls update. QSS private pointwise validator should also PASS when the ignored private reference files are present.

## Next scientific module

After stabilizing these two analyzers, add QSS-µPCD Scan/J0 as a separate module (intensity/laser-power scans, QDC, steady-state lifetime/injection, Basore-Hansen J0, Kane-Swanson J0). Do not cram scan/J0 logic into `qss-upcd.js`.
