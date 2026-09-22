# Agent handoff — 2026-09-22 — v20260922.3

## Goal

Build a general **PV-2000 Analyzer**: the user drops any PV-2000 result XML, the app reads `Measurement/@xsi:type`, and the corresponding analyzer handles parsing, calculations, plots and exports. CSV/XPS/manuals are development references only; the runtime remains XML-only.

## Current implementation

- modular source + generated single-file `dist/index.html` build; `dist/` is ignored and rebuilt by CI/Pages rather than tracked;
- automatic measurement registry and Generic Inspector fallback;
- `DITMeasurement` analyzer with restored full Dit UI/functionality;
- `QssUpcdMeasurement` analyzer with lifetime/Smax/Implied-Voc maps;
- `LBICMeasurement` analyzer with dynamic beam/channel raster maps, line profiles, pixel inspection and CSV export;
- system light/dark theme + explicit theme toggle;
- global legacy Settings button removed; controls are module-specific;
- per-chart CSV exports and extensive hover explanations;
- shared `src/core/ui.js` helpers for HTML escaping, help markup, CSS-variable access and plot tooltips; Dit/QSS/LBIC/Generic no longer carry duplicate copies;
- ESLint plus a source-density quality gate run in CI to prevent hand-minified executable code from returning;
- landing-page support tags for Dit / COCOS, QSS-µPCD, LBIC and Generic XML inspector;
- shared plot zoom on every scientific plot: wheel inside = X+Y, wheel on an axis = that axis only, double-click = auto scale; applicable numeric plots also expose manual X/Y lower/upper limits;
- spatial maps use equal physical X/Y scale at auto/default view: Dit and QSS wafer outlines remain circular, and LBIC rectangular rasters preserve their measured aspect ratio instead of filling the chart box anisotropically;
- LBIC Distribution axis swap, numeric Distribution/profile ticks, and compact canvas sizing, matching the existing QSS interaction model;
- long Dit/QSS/LBIC scientific explanations moved to hover help instead of persistent UI paragraphs;
- confidential/local user/vendor files protected under ignored `private/reference/`;
- opt-in public community regression cases supported under `reference_data/`, with data-only PRs allowed.
- GitHub Pages workflow builds and publishes `dist/` after every successful push to `main`; repository Pages must use **GitHub Actions** as its publishing source.
- landing page uses a structured product header, supported-analyzer strip, prominent XML drop card and explicit local-processing notice; GitHub is available from the header, Contribute / Share data / Report issue remain in the landing footer, the redundant deployed-page Live badge is removed, and the exact short build commit remains visible; local builds display `local` unless `PV2000_BUILD_SHA` or `GITHUB_SHA` is supplied.
- responsive workspace behavior: wide screens use sidebar + two plot columns; <=1200 CSS px keeps the sidebar and stacks both plot columns vertically in the right pane; true narrow/mobile layouts collapse to one column.

## GitHub Pages deployment

`.github/workflows/pages.yml` runs on every push to `main` (and manual dispatch), executes `npm test`, rebuilds `dist/index.html`, uploads `dist/` as the Pages artifact, then deploys it to the `github-pages` environment. This keeps the hosted analyzer aligned with the latest successful `main` build without committing generated deployment branches.

GitHub repository settings must have Pages enabled with **Source: GitHub Actions**. On GitHub Free this also requires a public repository; paid plans can host Pages from private repositories.

## Licensing model

PV-2000 Analyzer uses **AGPL-3.0-only** as the community license. A separate commercial license may be negotiated for proprietary/closed-source use cases. External copyrightable contributions require acceptance of `CLA.md`, which keeps contributor ownership while granting the Project Owner the broad sublicensing/relicensing rights needed to preserve dual licensing. The commercial notice is informational only; an actual commercial license requires a separate written agreement.

## Community reference contribution workflow

The repository now supports two deliberately separate reference-data paths:

- `private/reference/` remains local-only for confidential or not-yet-cleared XML/CSV/XPS/screenshots;
- `reference_data/` is the opt-in public area for contributors who explicitly intend to publish a paired PV-2000 reference case and have the right to do so.

A contributor does not need to write code. A data-only PR containing raw XML + matching PV-2000 export and preferably a screenshot is useful evidence for a new measurement/result combination. The landing page and README also link to a guided **Share PV-2000 data** issue form for contributors who prefer not to prepare a PR. Developers may branch from current `main`, add implementation + regression coverage + the public case, and request merge. See `CONTRIBUTING.md` and `reference_data/README.md`.

This does not weaken the reference-profile rule: numeric parameter changes inside an established semantic path are not automatically NEW PROFILE, while genuinely new schema/algorithm/channel/result/unit/validity paths require matching vendor evidence before the validation envelope expands.

## QSS-µPCD: reference export now available

`private/reference/qss_upcd_export.csv` is the exact PV-2000 export corresponding to `qss_upcd_example.xml`. Regression status:

- all 305 XML lifetime values match exactly;
- all 305 reconstructed X/Y coordinates match exactly;
- Smax matches point-by-point to floating-point precision (~5e-12 max error);
- Implied Voc matches point-by-point to <0.1 mV max error using XML chuck temperature and the compatibility ni(T) model documented in `ALGORITHMS_QSS_UPCD.md`.

The QSS UI has also been upgraded: proper axes/ticks/units, map colorbar, distribution and acquisition-profile axes, hover point information and cleaner chart headers.

### Important QSS validity behavior

The nominal map can cover more area than the physical sample. A quarter wafer/coupon can therefore contain many meaningless scheduled points. For `MapPattern + RoundWafer`, coordinate reconstruction now uses the effective radius `Diameter/2 - EdgeExclusion` before the strict circular site test. The QSS module exposes a user-controlled valid-data filter (metric + lower/upper limits). The resulting mask is applied consistently to every summary statistic and derived metric. Excluded points are visually retained for diagnosis, and smooth interpolation is distance-limited so it does not extrapolate a small sample across the whole nominal wafer.

Do not remove this behavior during refactors.

## Dit status

The restored Dit analyzer retains the required 2x2 plots, numeric selectable wafer map, log Dit/PCHIP/midgap, flatband markers/details, site navigation, valid-site/current-site summary, full XML metadata and per-chart export.

Current analysis routing:

- **Follow XML setting** is the normal default.
- XML `UseCocosII=false` resolves to **Standard COCOS**.
- XML `UseCocosII=true` resolves to **PV2000 COCOS-II (inferred)**.
- the obsolete guide-based COCOS-II path has been removed from the runtime/UI.

The inferred PV2000 path comes from same-raw-data parameter sweeps. It interprets vendor EOT as Å, reconstructs signed Vsb and applies configurable Min/Max Vsb when selecting minimum Dit. It is explicitly labelled **inferred**, not vendor-exact. Back Surface Shift is recorded but intentionally not applied because the supplied True/False reprocessing produced identical outputs.

Dit Analysis controls are contextual and compact:

- inferred COCOS-II shows EOT / Min Vsb / Max Vsb on one-line label/input rows;
- Standard COCOS hides COCOS-II-only settings;
- shared Flatband accumulation points remain visible;
- **Minimum Dit (PV2000-style)** is the accepted discrete minimum and does not use PCHIP;
- **Optional Midgap Dit (PCHIP)** is always visible with a default-on checkbox; disabling it removes Midgap Dit / the green fit while leaving Minimum Dit unchanged;
- Midgap fitting defaults to **Median-binned PCHIP** with a 10 mV Vsb window; the window is adjustable, **PCHIP (original)** remains available for compatibility, and LOG10/Linear remain shared scale options;
- COCOS-II and PCHIP can be combined because PCHIP runs after COCOS-II Vsb reconstruction and acceptance masking;
- data-derived COCOS-II suggestions are shown but do not silently overwrite XML/user values;
- invalid COCOS-II settings are shown as errors and no longer fall back silently to Standard COCOS;
- Follow XML displays the resolved method;
- Apply/recalculation, method changes, PCHIP changes and site re-renders preserve the Analysis controls open state once the user has opened it.

A parser fix now treats missing/empty numeric XML nodes as missing rather than as JavaScript numeric zero. This is required for COCOS-II Min/Max defaults and also improves numeric fallback behavior across modules.

In multi-column layouts, the entire left functional sidebar scrolls independently beneath the sticky toolbar; the plot columns stay in place while long metadata/control stacks are scrolled. The actual root cause of the previous "no sidebar scroll" bug was flexbox shrink: sidebar panels were shrinking to the fixed sidebar height, making `scrollHeight == clientHeight`. Sidebar children are now `flex: 0 0 auto`, so they keep intrinsic height and create real overflow. Fine-pointer desktop zoom now keeps a dedicated sidebar column instead of being mistaken for a portrait/mobile layout; the portrait/tablet fallback requires coarse-pointer input, while <=700 px remains the true narrow-width fallback. Dit Results summary is rendered as responsive result cards so Valid-site mean / Current-site values do not clip or require horizontal scrolling.

LOG10 remains the default optional PCHIP interpolation scale; Linear remains available. The Results summary labels each parameter with its unit. The historical charge-derivative diagnostic remains backend-only for regression.

QSS Distribution has a Swap axes button beside Export. The map-selected metric (lifetime by default) starts on the horizontal axis with count vertically; swapping moves the metric to the vertical axis and count to the horizontal axis. Valid histogram bars use the same color scale and valid-point value range as the wafer map; excluded counts remain gray. The histogram CSV remains in metric bins and includes the selected metric's units in bin headers.

The QSS runtime shows only facts for the currently imported dataset. Fixed reference-validation evidence for the 305-point paired dataset remains in project documentation rather than being presented as if it belonged to a newly imported XML.

## LBIC status

LBIC now has a paired vendor-regression baseline rather than structural-only validation.

Validated algorithm family, established by four matching PV-2000 XML + CSV reference instances:

- single iteration / single beam;
- SquareRegionPattern;
- µA current;
- finite positive photon FluxCache;
- raw Current + DirectReflection + ScatteredReflection;
- vendor Current / Reflectivity / IQE result path.

The current four instances all use beam key 0, 984 nm, power 0.6 and FluxCache 1708439235302983. Those concrete values are evidence, not runtime validation gates.

Established behavior:

- SquareRegionPattern coordinates are X-fast row-major with `y = Region.Y + row*dy`; all reference X/Y values match exactly;
- PV-2000 Reflectivity is `min(100%, DirectReflection + ScatteredReflection)`; one 51×51 reference contains a 100.0179668% raw sum that the vendor export caps at 100%;
- PV-2000-compatible IQE requires `q = 1.602e-19 C`, not the exact modern SI value;
- IQE uses `EQE/(1-Reflectivity)`;
- calculated IQE >100% and non-computable cases are blank in the vendor export and excluded from summaries;
- sample standard deviation is used;
- default LBIC result selection mirrors vendor exports: Current / Reflectivity / IQE;
- Direct/Scattered reflection, EQE and unknown numeric channels live under Advanced raw/intermediate channels;
- raw XML Total R/EQE/IQE still override calculated candidates.

Validation is scoped to the **input/output algorithm family**, not exact numeric settings. Different wavelength, power, finite photon FluxCache, Region origin/size, pitch, or grid dimensions (including a 4×4 versus 5×5 raster) remain in the family if the same single-beam channel/result path is used.

The private validator requires same-basename XML/CSV pairs and reports NEW PROFILE only for categorical path changes such as another pattern/coordinate encoding, multiple-beam or iteration semantics, another unit convention, a different raw channel set, or a different vendor output/blanking path. Such cases must be redesigned from the actual XML + matching PV-2000 export where needed.

Real multi-wavelength regression and diffusion-length calculation remain pending. Diffusion length stays unsupported until a matching multi-wavelength vendor result is available.

See `docs/REFERENCE_PROFILES.md`, `docs/ALGORITHMS_LBIC.md` and `docs/VALIDATION.md`.

## Required commands before handoff/commit

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run check
npm run build
npm run validate:qss
npm run validate:lbic
git status --short --ignored
```

Automated/local regression status before the final browser smoke: unit tests, build, the 305-point QSS private regression, and all four paired LBIC XML/CSV regressions have passed; private references were confirmed absent from tracked/build outputs. The validator launch commands now go through a cross-platform Node wrapper so Windows Store `python` aliases do not break `npm run validate:*`. Generic Inspector fallback also has an explicit unknown-type dispatch test.

## Browser self-test completed

The sidebar fix was exercised in headless Chromium against the built single-file dist using a deliberately overflowing synthetic LBIC-style sidebar. This test is important because the previous CSS-only assertions missed the real flex-shrink failure.

Test matrix:

- 1440×900 CSS px;
- 1152×576 CSS px with device scale factor 1.5 (representative of a high-zoom desktop viewport);
- 900×700;
- 850×650;
- 720×650.

In every case the sidebar had real overflow (`scrollHeight > clientHeight`), every sidebar child reported `flex-shrink: 0`, a mouse-wheel event moved sidebar `scrollTop` from 0 to 500, document `scrollTop` stayed 0, and no page-level horizontal overflow was created.

## Remaining handoff tests

Automated/private numerical regressions and the synthetic Chromium sidebar test are complete. The remaining release-gating work is manual browser/UI smoke with real PV-2000 files plus COCOS-II manual testing when a real `UseCocosII=true` XML becomes available:

1. **Responsive / zoom smoke test**
   - Desktop fine-pointer browser at approximately 100%, 125%, 150% and 175% zoom.
   - Verify the left sidebar can scroll to its last panel while plot columns remain stationary.
   - Check representative viewport widths around 1440, 1000, 900, 850, 720 and 500 CSS px.
   - Verify Dit Results summary never clips Valid-site mean / Current-site values and never creates page-level horizontal overflow.
   - On a real touch/coarse-pointer phone/tablet, verify the single-column fallback is still usable.

2. **Dit / COCOS-II functional smoke**
   - Import one Standard COCOS XML.
   - A real `UseCocosII=true` reference XML is still missing locally; the COCOS-II-specific manual smoke must remain pending until one is available.
   - Change EOT / Min Vsb / Max Vsb, Apply, and verify Vsb/Dit actually change where expected.
   - Confirm invalid `Max Vsb <= Min Vsb` shows an error with no silent Standard-Cocos fallback.
   - Confirm Analysis controls stays open after Apply/re-render.
   - Verify Optional Midgap Dit is enabled by default; uncheck it and confirm Midgap Dit / green PCHIP fit disappear while **Minimum Dit (PV2000-style)** stays unchanged. Re-enable it, then change PCHIP scale/outlier limit and verify only the optional PCHIP result changes.
   - Exercise all four Dit plots: wheel zoom, X-only/Y-only axis zoom and double-click auto-scale. Confirm Vcpd–Qc is point-line and ordinary data markers are smaller than the initial-condition marker.

3. **LBIC paired-reference regression**
   - Run `npm run validate:lbic` with all same-basename private XML+CSV pairs present.
   - Open at least one 51×51 and one 101×101 reference XML in the browser and visually compare map orientation, Current / Reflectivity / IQE defaults, blank IQE pixels and Advanced raw/intermediate channels.
   - Confirm ordinary numeric wavelength/power/FluxCache/raster-size changes remain in the validated profile family; categorical path changes must report **NEW PROFILE**.
   - A real multi-beam/multi-wavelength paired file is still required before multi-beam semantics can be marked validated.

4. **QSS regression smoke**
   - Run `npm run validate:qss` with private references present.
   - Import the reference XML and verify valid-range filtering, smooth-map masking, Distribution axis swap and CSV export still behave correctly after layout changes.
   - Exercise map / Distribution / acquisition-profile wheel zoom, axis-only zoom and double-click auto-scale.

5. **Landing / fallback / theme**
   - Verify the welcome tags render correctly in light and dark mode.
   - Open an unsupported XML type and confirm Generic XML Inspector fallback still works.
   - Confirm no tracked/private reference data has leaked into the build or repository.

## Next scientific module

After validating the remaining LBIC vendor-parity items, add QSS-µPCD Scan/J0 as a separate module (intensity/laser-power scans, QDC, steady-state lifetime/injection, Basore-Hansen J0, Kane-Swanson J0). Do not cram scan/J0 logic into `qss-upcd.js`.
