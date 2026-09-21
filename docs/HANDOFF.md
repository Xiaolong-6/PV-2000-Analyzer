# Agent handoff — 2026-09-21 — v0.2.2

## Goal

Build a general **Semilab PV-2000 Analyzer**: the user drops any PV-2000 result XML, the app reads `Measurement/@xsi:type`, and the corresponding analyzer handles parsing, calculations, plots and exports. CSV/XPS/manuals are development references only; the runtime remains XML-only.

## Current implementation

- modular dependency-free source + single-file `dist/index.html` build;
- automatic measurement registry and Generic Inspector fallback;
- `DITMeasurement` analyzer with restored full Dit UI/functionality;
- `QssUpcdMeasurement` analyzer with lifetime/Smax/Implied-Voc maps;
- `LBICMeasurement` analyzer with dynamic beam/channel raster maps, line profiles, pixel inspection and CSV export;
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

Dit Analysis controls are contextual and compact:

- inferred COCOS-II shows EOT / Min Vsb / Max Vsb on one-line label/input rows;
- Standard COCOS hides COCOS-II-only settings;
- shared Flatband accumulation points remain visible;
- **Minimum Dit (PV2000-style)** is the accepted discrete minimum and does not use PCHIP;
- optional PCHIP controls are nested under **Optional Midgap Dit (PCHIP)** and affect Midgap Dit / fitted curve only;
- COCOS-II and PCHIP can be combined because PCHIP runs after COCOS-II Vsb reconstruction and acceptance masking;
- data-derived COCOS-II suggestions are shown but do not silently overwrite XML/user values;
- invalid COCOS-II settings are shown as errors and no longer fall back silently to Standard COCOS;
- the legacy guide-based method is hidden under Advanced / legacy methods;
- Follow XML displays the resolved method;
- Apply/recalculation, method changes, PCHIP changes and site re-renders preserve the Analysis controls open state once the user has opened it.

A parser fix now treats missing/empty numeric XML nodes as missing rather than as JavaScript numeric zero. This is required for COCOS-II Min/Max defaults and also improves numeric fallback behavior across modules.

In multi-column layouts, the entire left functional sidebar scrolls independently beneath the sticky toolbar; the plot columns stay in place while long metadata/control stacks are scrolled. The portrait/tablet single-column fallback is now gated by coarse-pointer input so desktop browser zoom does not unexpectedly collapse the app into the mobile layout. At <=700 px the app still uses the true narrow layout. Dit Results summary was converted from a nowrap three-column table to responsive result cards to prevent clipped Valid-site mean / Current-site values.

LOG10 remains the default optional PCHIP interpolation scale; Linear remains available. The Results summary labels each parameter with its unit. The historical charge-derivative diagnostic remains backend-only for regression.

QSS Distribution has a Swap axes button beside Export. The map-selected metric (lifetime by default) starts on the horizontal axis with count vertically; swapping moves the metric to the vertical axis and count to the horizontal axis. Valid histogram bars use the same color scale and valid-point value range as the wafer map; excluded counts remain gray. The histogram CSV remains in metric bins and includes the selected metric's units in bin headers.

The QSS result view separates Current dataset facts from fixed algorithm-validation evidence for the 305-point reference. Importing another XML does not imply agreement with an unseen vendor export.

## LBIC status

The former `feat/lbic-support` work was developed from an older main commit and has now been integrated onto the latest Dit/COCOS-II mainline without replacing newer Dit, XML parser or sidebar behavior.

Implemented:

- generic raster × beam/wavelength × channel data model rather than fixed Current/Reflection fields;
- dynamic numeric `BeamData` attributes, unknown-channel retention and raw-value precedence;
- `SquareRegionPattern` Region/Dimension reconstruction with point-count guard;
- 1–N iterations and arbitrary beam keys joined to `LaserSettings` / `FluxCache`;
- current/direct/diffuse raw maps plus inferred Total R/EQE/IQE fallbacks;
- raster map, histogram, selected-pixel inspector, X/Y profiles and CSV exports;
- unit tests, structural private validator and detailed provenance/validation documentation.

Validation scope:

- SquareRegionPattern coordinate reconstruction and X-fast/downward-Y ordering are vendor-validated against paired XML+CSV references;
- Total reflectance from direct + scattered reflectance and the µA-current / FluxCache / IQE calculation chain are vendor-validated for the observed channel semantics, including IQE blanking when total reflectance reaches/exceeds 100%;
- validation is **combination-based**, not tied to one exact 984 nm / power 0.6 / FluxCache value. Different numeric wavelength, power or photon-flux values remain inside the validated domain when the same units and meanings apply;
- real multi-beam/multi-wavelength XML still needs regression for parsing/interleaving behavior;
- calculated diffusion length remains intentionally **unsupported** until a two-wavelength XML plus matching PV-2000 DL result is supplied.

See `docs/ALGORITHMS_LBIC.md`.

## Required commands before handoff/commit

```bash
npm test
npm run build
npm run validate:qss
npm run validate:lbic
git status --short --ignored
```

Current automated test count is maintained by CI. QSS private pointwise validation should PASS when its ignored references are present. LBIC numerical vendor parity is established by the paired private XML+CSV references; the tracked `validate:lbic` script remains a structural guard and is not the sole evidence for the validated formulas.

## Next scientific module

After validating the remaining LBIC vendor-parity items, add QSS-µPCD Scan/J0 as a separate module (intensity/laser-power scans, QDC, steady-state lifetime/injection, Basore-Hansen J0, Kane-Swanson J0). Do not cram scan/J0 logic into `qss-upcd.js`.
