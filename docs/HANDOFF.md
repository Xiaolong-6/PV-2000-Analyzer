# Agent handoff — 2026-09-23 — v20260923.20

## QSS analysis-control provenance cleanup

QSS now separates Analyzer interpretation controls from PV-2000/XML metadata. Analysis controls contain Lifetime handling and Implied Voc model only. Raw non-positive-lifetime count remains dataset audit information in Current dataset.

SRV moved into a collapsed Additional SRV analysis section. It is Analyzer-only, disabled by default, and defaults to Planar when enabled. Textured / black is explicit; planar-reference SRV is shown/validated only for that model. When SRV is disabled it is removed from Results summary, map metric choices and shared Valid-data filter candidates. Existing lifetime, Smax and Implied-Voc calculations and vendor-validation profiles are unchanged.

## CETMeasurement implementation branch

`feat/cet-measurement` adds a dedicated CET analyzer on the shared measurement-domain architecture.

The first paired profile is `CET-9PT-SQUARE-001`: one 9-site `NinePointPattern + SquareCell` XML/vendor CSV pair validates target-relative fixed-point geometry plus EOT, Cd and R² point-by-point and at summary-statistics level. The pair establishes `q = 1.602e-19 C` as the compatibility constant for this legacy CET arithmetic. One undefined site is represented as unavailable EOT/Cd with R² = 0.

CET reuses `PV2000.quantity`, `PV2000.selection`, `PV2000.measurement`, `PV2000.profiles` and canonical `pointsMm`. The geometry core also gains `FixedPointsPattern/PointValues` as explicit absolute-mm geometry. Other observed CET OnePoint/FixedPoints/RoundWafer/SquareRegion inputs remain inferred until paired output extends the profile envelope.

The exact private XML/CSV pair and a short case README are stored under `reference-data/paired-test-data/CETMeasurement/cet-9pt-square-20160406/` in the separate private-reference repository. Public runtime remains XML-only.

Acceptance before merge: normal `npm run check`, `npm run build`, `npm run validate:cet` against the private pair, import-smoke representative XMLs from the supplied CET corpus, and a visual check of map / Distribution / current-site fit / filter behavior.

## JZero SquareRegion / incomplete acquisition support

JZero now reads structured `SquareRegionPattern/Region + Dimension` geometry through the shared geometry resolver. A completed 1 × 1 SquareRegion can render as a single measurement position even when Pattern/Name contains stale display text. Explicitly terminated SquareRegion runs can reuse the shared partial-prefix schedule semantics and remain geometry-inferred.

Incomplete two-intensity acquisition no longer makes the whole JZero measurement unsupported. The first lifetime iteration remains usable for τeff.d, Smax and Implied Voc; missing second-iteration values and Basore J0 stay unavailable in the same site index space. Complete two-iteration JZERO-CALC-001 behavior and numerical formulas are unchanged. The two supplied AG13 XML-only cases are runtime regressions only and do not expand vendor-validation claims.


## DIT Valid-data filter rollout

DIT now uses the shared site-selection controller/UI. Existing DIT scientific validity (`site.valid`) is passed as `intrinsicMask`; user numeric filtering can only narrow it. Qtot, Minimum Dit, EOT, Cox, Qsc, Initial Qc and Max |Vsb| are filter candidates, with Midgap Dit included only while PCHIP is enabled.

The active mask drives Results summary and wafer-map population/color scaling/export. Current-site Vcpd–Qc, Vsb–Qc and Dit–Vsb curves remain inspection views of the calculated site and are intentionally not truncated by the site filter. Applying Analysis controls rebuilds the filter from the newly calculated values rather than allowing stale bounds to alter computation.

Private validation uses the paired `dit_w1.xml` + raw CSV + summary CSV NinePoint reference from `PV-2000-private-reference`; those private files/values are not copied into this public repository.


## QSS shared Valid-data filter migration

QssUpcdMeasurement now migrates its mature module-local range-filter state onto `PV2000.selection.createFilter()` plus the shared `validDataFilterMarkup()` / `bindValidDataFilter()` UI contract. This is intentionally behavior-preserving.

QSS keeps `intrinsicLifetimeMask()` as a separate scientific/support layer. The controller receives that support as `intrinsicMask`; the resulting `activeMask` is the existing user-filter population. Default `Exclude τ ≤ 0`, Raw/PV-2000 style, filter metric order, full-range defaults, inclusive bounds, `1–99%`, Reset and Apply semantics are preserved. Apply analysis rebuilds the controller with the current filter metric and resets its range to the full newly supported metric range, matching previous behavior.

Summary, map, Distribution, acquisition profile and CSV validity flags all consume the same active population. Map/profile/histogram still receive the separate support mask so UNAVAILABLE and FILTERED remain distinct. Raw XML lifetime values, QSS algorithms, Smax, Implied Voc modes, Si/Ge estimates, SRV post-processing and validation profiles are unchanged.

## LBIC Valid-data filter rollout

LBIC now reuses the shared filter controller/UI contract. Filter scope is the current iteration + beam/wavelength; visible primary quantities are candidates by default, while Advanced exposes active raw/intermediate quantities as additional candidates. One site-level active mask drives result summaries, raster map, Distribution and X/Y profiles while raw values remain intact.

Changing beam or iteration creates a fresh filter context. Changing the displayed quantity does not change the selected filter quantity. Export map/all preserve excluded rows and add filter provenance; histogram/profile exports reflect the active plotted population. The shared partial-acquisition schedule helper from v20260923.13 remains in place. No LBIC channel calculation, measurement-flag rule, geometry/profile matching or vendor-validation claim changes in this rollout.

## JZero Valid-data filter rollout

JZero's pre-existing module-local range filter has been migrated to the shared `PV2000.selection.createFilter()` and shared UI binder introduced in `v20260923.12`. Any of the seven aligned JZero result quantities can define one paired-site active mask. Each displayed quantity then applies its own finite/support mask on top of that selection. Summary, map, distribution and both map/histogram exports consume the same state; the two lifetime arrays and J0/Smax/Implied-Voc calculations are unchanged.

Pointwise exports preserve all sites and now include availability, filter-pass/display state and filter provenance. Regression coverage explicitly checks a case where a site passes a lifetime filter but the derived J0 is unavailable.

## Phase B — ISC/VCPD Valid-data filter

Phase B activates the shared site-selection architecture for the Kelvin-probe family. `PV2000.selection.createFilter()` owns metric/range/mask state, while `PV2000.ui.validDataFilterMarkup()` and `bindValidDataFilter()` provide the reusable UI contract.

For ISC, Vcpd Dark / Vcpd Light / VSB can define the filter; one site-level active mask is shared across all three result quantities. VCPD exposes Vcpd Dark only. Summary, map, distribution and map export consume the active mask plus each displayed quantity's availability. Raw XML/readings remain preserved and excluded sites can still be inspected. This is Analyzer-side filtering and does not expand any vendor-validation profile.

The project now records **Semilab PV-2000 v1.3.0.5** as the software-version validation baseline. This is an evidence boundary rather than an exact-version parser whitelist: other releases may remain schema/profile-compatible, but must stay version-unvalidated until paired vendor output from that release is regressed.

The current main includes a generic, read-only DIT paired-reference diagnostic and evidence-boundary documentation. It does not change analyzer calculations. All vendor software, XML, CSV and private research notes stayed local or on the user-specified read-only shares.

The larger private OnePoint collection contains 176 row-aligned XML/raw-CSV pairs with 11,575 exact Qc schedule points. Dark-channel parity is narrow rather than universal: 168 pairs are within 2 mV maximum error; eight diverge, while exported light/Vsb generally differs from measured-light XML. The optional strict validator gate passes an eight-pair/520-row subset and rejects a mixed collection with unmatched or divergent cases. Do not infer a vendor Ge material mode or implement the missing corrected-light path from these exports.

The inspected historical backup, software data archive and Ge/COCOS collection have no `DITMeasurement` XML with `UseCocosII=true`; COCOS-II remains inferred. A further ten exact-name XML/vendor-summary CSV candidates were located but their summary/result calculations have **not** been regressed. Next work should either obtain a real `UseCocosII=true` XML plus matching output, or examine the specific extra reprocessing state behind the corrected-light export without guessing an XML-only formula.

The staged architecture roadmap is documented in `docs/MEASUREMENT_ARCHITECTURE_REFACTOR_PLAN.md`. The first implementation branch should add shared domain primitives and migrate ISC/VCPD as the pilot without numerical, validation-label or UI changes.

Scientific Wiki source pages are tracked under `wiki/`; `docs/DOCUMENTATION_WIKI_PLAN.md` defines their role and `docs/WIKI_HANDOFF.md` documents Wiki synchronization. Wiki prose is maintained as the current scientific reference, while validation/profile evidence remains in repository docs.

## XML-only discovery / Advanced analysis

PV-2000 UI/CSV output is not treated as the ceiling of available information. During family audits, inspect and preserve useful XML-stored/unknown numeric quantities even when they are absent from vendor exports. Presentation tier is independent from provenance/validation: extra fields may be primary, advanced or diagnostic. XML presence alone never upgrades a quantity to a validated vendor result.

LBIC is the current reference implementation for this policy.

## Shared site selection and canonical geometry

Phase A now includes two cross-cutting contracts:

- `PV2000.selection`: intrinsic support, user range filter and active mask are separate. QSS remains the existing behavioral reference; broad filter UI migration waits for the post-architecture feature branch.
- `PV2000.geometry.resolveMeasurementGeometry`: Pattern/Target semantics produce canonical `pointsMm`, while raw coefficients remain separate.

DIT NinePointPattern no longer treats ±0.632 coefficients as ±0.632 mm. On the current 100 mm / 4 mm-edge family they resolve against the 46 mm scheduled radius to about ±29.09 mm. This is marked inferred until paired vendor X/Y coordinates are available.

A repository scan found coefficient-bearing runtime paths in DIT, QSS HighDensity, ISC/VCPD and Dual QSS. They now route through or preserve the shared geometry contract; LBIC/JZero do not currently contain the same direct coefficient-as-mm path.

JZero calculation and geometry are now separate. The paired two-iteration post-processing path is tracked as `JZERO-CALC-001`; the paired pseudo-square map geometry is `JZERO-GEOM-MAP-PSEUDOSQUARE-001`. Resolver-supported OnePoint + SquareCell data can load with inferred geometry instead of failing the whole measurement.

## Measurement-domain Phase A

This branch introduces the new domain core and migrates ISC/VCPD only.

New primitives:

- `src/core/validity.js`
- `src/core/quantity.js`
- `src/core/measurement.js`
- `src/core/profiles.js`
- normalized geometry envelopes in `src/core/geometry.js`
- semantic profile definitions under `src/profiles/`.

ISC/VCPD keep the existing parser-result fields, renderer and CSV behavior while also exposing domain/profile/provenance metadata. DIT/QSS/Dual QSS/JZero/LBIC are intentionally untouched by this migration.

Before merge, require normal CI plus private `validate:isc` and `validate:vcpd` when the paired files are locally available. Any numerical change is a stop condition for this branch.

## Goal

Build a general **PV-2000 Analyzer**: the user drops any PV-2000 result XML, the app reads `Measurement/@xsi:type`, and the corresponding analyzer handles parsing, calculations, plots and exports. CSV/XPS/manuals are development references only; the runtime remains XML-only.

## Current branch update

`npm run validate:dit -- --xml-dir ... --csv-dir ...` inventories exact-name DIT/raw-CSV candidates without embedding private paths in source. It compares XML-derived measured dark/light/Vsb and the charge schedule separately against vendor columns, preserves blank-Dit counts, and refuses to call duplicate CSVs the same unless their exported values agree. A strict `--max-dark-error-mv` gate requires all XMLs in the selected directory to pair and enforces the requested dark-channel bound; it does not assert parity for the unresolved light/Vsb/Dit branch.

## Current implementation

- modular source + generated single-file `dist/index.html` build; `dist/` is ignored and rebuilt by CI/Pages rather than tracked;
- automatic measurement registry and Generic Inspector fallback;
- `DITMeasurement` analyzer with restored full Dit UI/functionality;
- `QssUpcdMeasurement` analyzer with raw-lifetime preservation, sentinel-aware scientific validity, lifetime/Smax/PV-2000-compatible Implied-Voc maps, explicit Physical Si/Ge estimates, configurable lifetime→SRV analysis, filtering, distributions/profiles and CSV export;
- `DualQssMeasurement` analyzer with injection-intensity lifetime curves, per-point stored transient inspection, local LP/HP/repeat overlays and XML-value CSV export;
- `JZeroMeasurement` analyzer with two-intensity Emitter J0 maps, PseudoSquareCell geometry, Basore J0, both τeff.d/Smax/Implied-Voc channels, filtering, distributions and CSV export;
- `ISCMeasurement` analyzer with vendor-regressed Vcpd Dark / Vcpd Light / VSB maps, distributions, point inspection and raw-reading export; explicitly terminated maps can render an inferred leading schedule prefix while completed point-count mismatches remain unavailable;
- `LBICMeasurement` analyzer with dynamic beam/channel raster maps, line profiles, pixel inspection and CSV export;
- system light/dark theme + explicit theme toggle;
- global legacy Settings button removed; controls are module-specific;
- per-chart CSV exports and extensive hover explanations;
- shared `src/core/ui.js` helpers for HTML escaping, help markup, CSS-variable access and plot tooltips; measurement modules reuse the shared helpers instead of carrying duplicate copies;
- ESLint plus a source-density quality gate run in CI to prevent hand-minified executable code from returning;
- landing-page support tags for Dit / COCOS, QSS-µPCD, QSS Injection, Emitter J0, ISC, LBIC and Generic XML inspector;
- shared plot zoom on every scientific plot: wheel inside = X+Y, wheel on an axis = that axis only, double-click = auto scale; applicable numeric plots expose manual X/Y lower/upper limits from a header Axes popover placed immediately before Export. Distribution plots default to Count on X, keep Swap axes beside Auto/Apply inside that Axes action row, and expose a separate Bins header control (5–200 bins) for histogram spacing; Axes popovers are allowed to overflow chart panels so adjacent plots do not clip them, and canvas wrappers no longer force a 300 px minimum height;
- spatial maps use equal physical X/Y scale at auto/default view and follow the applicable XML target geometry: circular, rectangular or pseudo-square outlines are kept distinct from the plot frame and EdgeExclusion-adjusted scheduled boundary;
- LBIC right workspace uses Map + Distribution side-by-side with equal top-row chart sizing and X/Y profiles side-by-side below; Selected pixel and Channel provenance are in the left sidebar. Distribution retains axis swap and numeric ticks;
- long measurement-specific scientific explanations stay in hover help/documentation instead of persistent UI paragraphs;
- confidential/local user/vendor files protected under ignored `private/reference/`;
- opt-in public community regression cases supported under `reference_data/`, with data-only PRs allowed.
- GitHub Pages workflow builds and publishes `dist/` after every successful push to `main`; repository Pages must use **GitHub Actions** as its publishing source.
- landing page uses a structured product header, supported-analyzer strip, prominent XML drop card and explicit local-processing notice; compact README-style Guide / Source / Contribute / Share / Report / Download shortcuts sit below the drop area, build provenance shares the local-processing row, and `dist/PV-2000-Analyzer.html` is emitted alongside `dist/index.html` as the stable offline-download artifact. The redundant deployed-page Live badge remains removed; local builds display `local` unless `PV2000_BUILD_SHA` or `GITHUB_SHA` is supplied.
- responsive workspace behavior: wide screens use sidebar + two plot columns; <=1200 CSS px keeps the sidebar and stacks both plot columns vertically in the right pane; true narrow/mobile layouts collapse to one column.

## GitHub Pages deployment

`.github/workflows/pages.yml` runs on every push to `main` (and manual dispatch), executes `npm test`, rebuilds `dist/index.html`, uploads `dist/` as the Pages artifact, then deploys it to the `github-pages` environment. This keeps the hosted analyzer aligned with the latest successful `main` build without committing generated deployment branches.

GitHub repository settings must have Pages enabled with **Source: GitHub Actions**. On GitHub Free this also requires a public repository; paid plans can host Pages from private repositories.

## Licensing model

PV-2000 Analyzer uses **AGPL-3.0-only** as the community license. A separate commercial license may be negotiated for proprietary/closed-source use cases. External copyrightable contributions require the PR author's exact acceptance of `CLA.md`, which keeps contributor ownership while granting the Project Owner the broad sublicensing/relicensing rights needed to preserve dual licensing. A `Legal / contributor grants` workflow records that acceptance as a commit status; repository branch rules should require that status before merge. The commercial notice is informational only; an actual commercial license requires a separate written agreement.

Public reference material has a separate chain of rights under `REFERENCE_DATA_LICENSE.md`. PRs touching `reference_data/` require a second exact acceptance from the PR author; the public Share Data issue form records the same license through a required checkbox.

## Community reference contribution workflow

The repository now supports two deliberately separate reference-data paths:

- `private/reference/` remains local-only for confidential or not-yet-cleared XML/CSV/XPS/screenshots;
- `reference_data/` is the opt-in public area for contributors who explicitly intend to publish a paired PV-2000 reference case and have the right to do so.

A contributor does not need to write code. A data-only PR containing raw XML + matching numeric PV-2000 export is useful evidence for a new measurement/result combination. Minimal screenshots are optional when needed and when publication rights are clear; full XPS/vendor reports and full-interface screenshots stay private by default. The landing page and README also link to a guided **Share PV-2000 data** issue form for contributors who prefer not to prepare a PR. Developers may branch from current `main`, add implementation + regression coverage + the public case, and request merge. See `CONTRIBUTING.md` and `reference_data/README.md`.

This does not weaken the reference-profile rule: numeric parameter changes inside an established semantic path are not automatically NEW PROFILE, while genuinely new schema/algorithm/channel/result/unit/validity paths require matching vendor evidence before the validation envelope expands.

## Dit one-point / Standard COCOS update

A private 9-pair DIT reference family exercises center-only `OnePointPattern` on a nominal 100 mm circular substrate. The geometry is stored under `Substrate/SubstrateShape` (`Circle`, radius 50 mm) with measurement-level 4 mm edge exclusion. The runtime uses that nominal geometry for spatial context and labels the center-only view **Measurement position**.

Standard measured-light Vsb preserves the doping-aware signed convention. The same private exports expose a separate nearly straight corrected `Vcpd Light` export branch that is not equal to the measured XML light values even with `UseCocosII=false`; the saved XML does not uniquely identify the extra processing state, so the XML-only runtime keeps the measured branch.

The Material selector is an Analyzer model choice. Ge-sample reference files do not imply a PV-2000 Ge material mode.

## QSS-µPCD: reference export now available

`private/reference/qss_upcd_export.csv` is the exact PV-2000 export corresponding to `qss_upcd_example.xml`. Regression status:

- all 305 XML lifetime values match exactly;
- all 305 reconstructed X/Y coordinates match exactly;
- Smax matches point-by-point to floating-point precision (~5e-12 max error);
- Implied Voc matches point-by-point to <0.1 mV max error using XML chuck temperature and the compatibility ni(T) model documented in `ALGORITHMS_QSS_UPCD.md`.

The QSS UI has also been upgraded: proper axes/ticks/units, map colorbar, distribution and acquisition-profile axes, hover point information and cleaner chart headers.

### Important QSS validity behavior

The nominal map can cover more area than the physical sample. A quarter wafer/coupon can therefore contain many meaningless scheduled points. For `MapPattern + RoundWafer`, coordinate reconstruction uses the effective radius `Diameter/2 - EdgeExclusion` before the strict circular site test. `SquareRegionPattern + SquareCell` is a second vendor-regressed QSS coordinate family: Region + Dimension reconstruct the explicit rectangular raster in X-fast, ascending-Y order, and the supplied 35 × 30 / 1050-point XML+CSV pair matches all vendor X/Y coordinates to floating-point precision. `MapPattern + SquareCell` remains supported as a centered raster inferred from `Size/2 - EdgeExclusion` and `Pitch`; that centered MapPattern path remains **inferred** until a matching export/display is supplied.

The newer private RoundWafer corpus contains **96 QSS map XMLs**. Ninety-five are 100 mm / 305-site maps and one is a 125 mm / 489-site map; nine numeric CSV pairs reproduce X/Y and XML lifetime exactly, with Smax matching to export precision. The same compatibility Implied-Voc model that is <0.1 mV on the original reference reaches about **1.94 mV maximum absolute error** across the newer finite vendor points, so the tighter number is no longer treated as a family-wide guarantee.

A major validity rule is now explicit. The corpus contains **13,649 non-positive lifetime sentinel sites** (principally `-1 µs`) across 76 of 96 files. Raw XML lifetime and raw PV-2000-style Smax remain preserved for traceability/export. Default scientific analysis marks `τ<=0` as **UNAVAILABLE** before the user range filter, while an explicit **Raw / PV-2000 style** mode retains the vendor-style numeric behavior. Tooltips distinguish UNAVAILABLE from FILTERED. This prevents sentinel values from dominating map/distribution autoscaling and smooth interpolation.

QSS Analysis controls now also expose optional lifetime→**SRV** conversion with Planar / Textured-black geometry, optional bulk lifetime, planar-reference SRV and minimum-lifetime threshold. SRV is analyzer post-processing and stays distinct from Smax. Implied Voc defaults to **PV-2000 compatible**; optional **Physical Si** and **Physical Ge** estimates require explicit user selection because the XML does not encode a trustworthy material field. Material is never inferred from filenames or substrate names.

QSS wafer maps draw the XML nominal target as a solid geometry-aware outline, the EdgeExclusion-adjusted scheduled region as a dashed inner outline, and the generic plot frame separately; default autoscaling includes the full target at equal X/Y physical scale. The valid-data filter is applied after intrinsic availability and consistently affects summaries, maps, distributions and exports. Distribution Count contains valid available sites only. Swap axes is presentation-only, and smooth interpolation remains distance-limited so it does not extrapolate unsupported regions.

Do not remove this behavior during refactors.

## Dual QSS injection status

A dedicated `DualQssMeasurement` module handles the single-point injection sweep separately from the spatial `qss-upcd.js` map analyzer.

Expanded private evidence:

- **330 XML files** total;
- **273 exact-basename raw CSV pairs** with **5833 paired injection rows**;
- all 330 current XMLs use `OnePointPattern + RoundWafer`, one `QssDataItem`, aligned `Values` / `Intensity` / `Power` / `TransientInfo`, and 2000-point stored transients;
- XML `Intensity` / `Power` match vendor CSV intensity / laser-power columns exactly;
- CSV raw-data `LifeTime [μs]` matches **`TransientInfo@LifeTime` exactly** across all 5833 paired points;
- XML `Values` is a separate lifetime vector and can differ from `TransientInfo@LifeTime`; expanded-corpus max |Δ| is **0.020593307 µs**;
- the CSV raw export contains the first **1999** samples of each stored transient; **11,660,167** paired Time/Voltage samples match exactly at exported precision;
- the CSV top-table `Lifetime[us]` remains a different post-processed quantity: **4628 positive / 1205 zero** rows in the exact-pair corpus;
- given positive vendor result-table Lifetime, exported `dn` follows the documented generation relation with maximum rounded-CSV relative discrepancy about **0.509%**.

Runtime behavior is XML-only: the main curve and summary use `TransientInfo@LifeTime`, falling back to XML `Values` only when needed. The UI exposes one Lifetime curve; raw CSV comparison and XML-field diagnostics remain development-validation concerns.

Still unresolved: raw-lifetime → vendor result-table Lifetime transformation, vendor zero/blank acceptance behavior, Implied-Voc processing, Basore-Hansen J0, Kane-Swanson J0 and vendor LP/HP stitching semantics. J0-related XML fields remain metadata only until those result paths are reproduced point-by-point.

See `docs/ALGORITHMS_DUAL_QSS.md`, `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

## Emitter J0 map status

`JZeroMeasurement` is implemented as a dedicated analyzer rather than being aliased to QSS-µPCD. The supplied paired ES560 reference contains two 5017-point `UpcdIterationData` arrays at 1000/3000 mSun and a `MapPattern + PseudoSquareCell` target.

Private pointwise regression against the matching vendor CSV establishes:

- 5017 reconstructed X/Y sites, exact vendor coordinate match;
- both τeff.d arrays to floating-point precision;
- both Smax arrays to floating-point precision;
- Basore J0 to approximately 9.1e-13 fA/cm² maximum absolute error;
- Implied Voc compatibility to approximately 0.061 mV / 0.066 mV maximum absolute error for the first/second QSS channels;
- Average / Median / sample Stdev / Min / Max for all seven result quantities.

The pseudo-square schedule uses the intersection of the EdgeExclusion-adjusted rectangle and circle. The current reference is 156 × 156 mm, 205 mm diameter, 7 mm exclusion and 2 mm pitch, giving sites from (-64,-70) to (64,70) mm.

The Basore and JZero Implied-Voc compatibility constants are reverse-engineered regression values, not claims about undisclosed PV-2000 internals. Keep JZero Implied Voc separate from the general QSS-map `ni(T)` path. See `docs/ALGORITHMS_JZERO.md`, `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

## Dit status

The restored Dit analyzer retains the required 2x2 plots, numeric selectable wafer map, log Dit/PCHIP/midgap, flatband markers/details, site navigation, valid-site/current-site summary, full XML metadata and per-chart export.

Current analysis routing:

- **Follow XML setting** is the normal default.
- XML `UseCocosII=false` resolves to **Standard COCOS**.
- XML `UseCocosII=true` resolves to **PV2000 COCOS-II (inferred)**.
- the obsolete guide-based COCOS-II path has been removed from the runtime/UI.

The inferred PV2000 path comes from same-raw-data parameter sweeps. It interprets vendor EOT as Å, reconstructs signed Vsb and applies configurable Min/Max Vsb when selecting minimum Dit. It is explicitly labelled **inferred**, not vendor-exact. Back Surface Shift is recorded but intentionally not applied because the supplied True/False reprocessing produced identical outputs.

Dit Analysis controls are contextual and compact:

- **Material** is selectable as Silicon (Si) or Germanium (Ge), with Si as the default. This is an Analyzer-only semiconductor-model choice; PV-2000 itself has no Si/Ge selector. Ge uses the legacy MATLAB compatibility constants `ni = 2e13 cm^-3` and `εr = 16.2`; the selected material consistently feeds Qsc, variation/Minimum Dit, flatband/Qtot and the Midgap Dit target;
- inferred COCOS-II shows EOT / Min Vsb / Max Vsb on one-line label/input rows;
- Standard COCOS hides COCOS-II-only settings;
- shared Flatband accumulation points remain visible;
- **Minimum Dit (PV2000-style)** is the accepted discrete minimum and does not use PCHIP;
- **Optional Midgap Dit (PCHIP)** is always visible with a default-on checkbox; disabling it removes Midgap Dit / the green fit while leaving Minimum Dit unchanged;
- Midgap fitting defaults to **Median-binned PCHIP** with a 10 mV Vsb window; the window is adjustable, **PCHIP (original)** remains available for compatibility, and LOG10/Linear remain shared scale options;
- the absolute **PCHIP outlier limit** remains available as an optional manual threshold but is disabled by default (blank), so high-Dit samples are not truncated merely because they exceed the old fixed 2E13 limit;
- Midgap Dit is never extrapolated: the theoretical target must lie inside measured Vsb coverage and the retained PCHIP fit domain, otherwise the result remains unavailable and the UI states the coverage reason;
- COCOS-II and PCHIP can be combined because PCHIP runs after COCOS-II Vsb reconstruction and acceptance masking;
- data-derived COCOS-II suggestions are shown but do not silently overwrite XML/user values;
- invalid COCOS-II settings are shown as errors and no longer fall back silently to Standard COCOS;
- Follow XML displays the resolved method;
- Apply/recalculation, method changes, PCHIP changes and site re-renders preserve the Analysis controls open state once the user has opened it.

A parser fix now treats missing/empty numeric XML nodes as missing rather than as JavaScript numeric zero. This is required for COCOS-II Min/Max defaults and also improves numeric fallback behavior across modules.

In multi-column layouts, the entire left functional sidebar scrolls independently beneath the sticky toolbar; the plot columns stay in place while long metadata/control stacks are scrolled. The actual root cause of the previous "no sidebar scroll" bug was flexbox shrink: sidebar panels were shrinking to the fixed sidebar height, making `scrollHeight == clientHeight`. Sidebar children are now `flex: 0 0 auto`, so they keep intrinsic height and create real overflow. Fine-pointer desktop zoom now keeps a dedicated sidebar column instead of being mistaken for a portrait/mobile layout; the portrait/tablet fallback requires coarse-pointer input, while <=700 px remains the true narrow-width fallback. Dit Results summary is rendered as responsive result cards so Valid-site mean / Current-site values do not clip or require horizontal scrolling.

LOG10 remains the default optional PCHIP interpolation scale; Linear remains available. The Results summary labels each parameter with its unit. The historical charge-derivative diagnostic remains backend-only for regression.

Dit intrinsic-carrier concentration cleanup: the current Dit model now uses `ni = 9.65e9 cm^-3` at 300 K for both the midgap target and semiconductor Qsc. This is the legacy MATLAB midgap value. The inherited Qsc code previously used the rounded `1.00e10 cm^-3`; the original MATLAB provides no documented reason for the mismatch. The change is intentional model cleanup, not a claim about a proprietary PV-2000 constant. The historical ~2.6% W1 regression figures predate this change and should be re-run with the private reference before being quoted as post-change accuracy.

QSS Distribution defaults to Count on X and keeps Swap axes inside the Axes action row. Both axes render numeric tick values in either orientation. The displayed bar count is valid points only; excluded points do not inflate the Count axis and remain available only as diagnostic counts in histogram CSV. Yellow lines show the active filter bounds.

The QSS runtime shows only facts for the currently imported dataset. Fixed reference-validation evidence for the 305-point paired dataset remains in project documentation rather than being presented as if it belonged to a newly imported XML. The empty `Algorithm notes` disclosure has also been removed from the runtime; detailed algorithm notes stay in `docs/ALGORITHMS_QSS_UPCD.md`.

Older QSS XMLs using `HighDensityPattern` are now supported as an **inferred coordinate path**. These XMLs carry a scalar `Dimension` and a count-matched normalized `Coefficients` grid. Current observed examples cover 15×15 and 20×20 RoundWafer maps and a 35×35 SquareCell map. SquareCell coefficients scale to the EdgeExclusion-adjusted rectangle; RoundWafer keeps only the strict normalized unit-circle coefficient subset (`x²+y² < 1`) and scales it by the effective radius. Keep this labelled inferred until a matching PV-2000 X/Y export is regressed.

The main toolbar exposes `← Open XML →` navigation plus a separate compact **Folder** authorization control. Browser security does not expose arbitrary sibling files after a normal single-file selection, so folder access must be granted explicitly once. The arrows themselves never open a picker: once the current XML is matched inside the authorized folder, they directly load the previous/next XML in natural filename order. A `webkitdirectory` fallback covers browsers without the File System Access API.

## ISC status

ISC support is now a separate `ISCMeasurement` module rather than a Generic Inspector fallback. The PV-2000A manual defines ISC as dark/illuminated Kelvin-probe VCPD with VSB determined from their difference, and lists Vcpd Dark / Vcpd Light / VSB as the three data-view quantities.

One matching XML + vendor CSV establishes exact numerical behavior for the current repeated-reading `MapPattern + SquareCell` family:

- 169 sites, 24 dark + 24 light readings/site in the current reference;
- centered 13 × 13, 3 mm-pitch coordinate schedule from -18 to +18 mm matches the vendor export exactly;
- with raw means `D` / `L`, XML offset `O` and correction factor `F`, vendor values are `Vcpd Dark = D-O`, `Vsb = F(D-L)`, and `Vcpd Light = Vcpd Dark - Vsb`;
- pointwise max absolute errors are ~3.55e-15 V for Vcpd Dark, ~3.55e-15 V for Vcpd Light and ~7.49e-16 V for Vsb; vendor summary statistics match to ~3.33e-15;
- the UI exposes selectable maps, Distribution, selected-site repeated readings, CSV export and the shared zoom/manual-axis controls.

Alternate ISC pattern/target/raw-reading/result paths remain **NEW PROFILE** unless paired PV-2000 output confirms them. The runtime never reads the vendor CSV.

The same module now also dispatches the separately validated `VcpdMeasurement` family. The current VCPD reference is `MapPattern + RoundWafer`: 1649 sites, 200 mm diameter, 8 mm edge exclusion, 4 mm pitch, one direct `Readings` value/site, `LightOn=false` and iteration-level `VcpdOffset=0`. All 1649 reconstructed X/Y coordinates and Vcpd Dark values match the vendor CSV exactly; summary statistics use sample Stdev and match to floating-point precision. VCPD exposes only Vcpd Dark and does not synthesize ISC-only Vcpd Light/VSB. Non-zero VcpdOffset, illumination, multiple readings/site or another result path remain **NEW PROFILE**.

See `docs/ALGORITHMS_ISC.md`, `docs/ALGORITHMS_VCPD.md`, `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

## LBIC status

LBIC now has three vendor-regression families.

**LBIC-SINGLE-001**

- one iteration / one beam;
- `SquareRegionPattern`;
- active µA Current + DirectReflection + ScatteredReflection;
- finite positive photon FluxCache;
- vendor Current / Reflectivity / IQE result path;
- four paired 51×51 / 101×101 references with exact X/Y reconstruction.

**LBIC-MULTI-002**

- one iteration / multiple independent beams;
- `MapPattern + PseudoSquareCell`;
- the same active per-beam raw/result path;
- one paired **54,449-point**, four-beam reference (984 / 952 / 855 / 656 nm);
- target Size 125 × 125 mm, Diameter 150 mm, EdgeExclusion 3 mm, Pitch 0.5 × 0.5 mm in the supplied instance;
- scheduled geometry is the intersection of the adjusted rectangle (±59.5 mm) and adjusted circle (radius 72 mm);
- reconstructed X/Y match all 54,449 vendor rows exactly, from (-40.5, -59.5) mm to (40.5, 59.5) mm.

**LBIC-REFLECTANCE-003**

- one iteration / one beam;
- `SquareRegionPattern`;
- `MeasureCurrent=false`, Direct reflectance=true, Scattered reflectance=true;
- current corpus: **62 XML files**, spanning 656 / 855 / 984 nm;
- BeamData still contain `Current=0` at every site, but this is an inactive placeholder and must not appear as a measured result;
- **44 XML measurements** have **60 matching PV-2000 XPS Reflectivity printouts**;
- Direct + Scattered reproduces XPS Average / Median / sample Stdev / Min / Max with <0.005 %-point maximum discrepancy, i.e. vendor display rounding;
- default UI result is Reflectivity; no EQE/IQE is synthesized when current measurement is disabled.

Established result behavior:

- displayed Reflectivity is `clamp(DirectReflection + ScatteredReflection, 0, 100)`;
- current-enabled families retain Current / Reflectivity / IQE;
- reflectance-only files expose Reflectivity by default and Direct/Scattered under Advanced;
- explicitly disabled BeamData concepts are suppressed even if placeholder numeric attributes are present;
- IQE uses the **unclamped raw optical sum** in `EQE/(1-Rraw)` only for current-enabled families;
- `Rraw >= 100%`, calculated IQE >100%, and other non-computable cases are unavailable; vendor `Ud.` is represented as unavailable;
- `q = 1.602e-19 C` remains required for current-enabled vendor parity;
- sample standard deviation and finite-only summary behavior remain unchanged.

Partial acquisition handling:

- one supplied 61×61 reflectance recipe contains only **2814 / 3721** DataItems;
- the runtime now maps available points onto the leading X-fast / ascending-Y SquareRegionPattern schedule so the partial map remains visible;
- that incomplete-prefix coordinate interpretation is labelled **partial / inferred** and is excluded from validated-family matching until matching vendor coordinate evidence is available.

UI behavior added here:

- Measurement metadata shows `Reflectance only` when the XML flags select that path;
- reflectance-only scans open directly on Reflectivity rather than a meaningless all-zero Current map;
- Results summary / Selected pixel / export no longer synthesize disabled Current, EQE or IQE;
- complete reflectance-only files show `validated · LBIC-REFLECTANCE-003`;
- partial SquareRegion scans remain usable but visibly identified as inferred.

Validation remains scoped to semantic input/output families rather than exact numeric values. Ordinary wavelength/power/complete SquareRegion geometry changes remain inside `LBIC-REFLECTANCE-003` when the measurement flags and Direct+Scattered → Reflectivity result path are unchanged.

The LBIC private validator now supports both same-basename XML+CSV current-enabled references and matching Reflectivity XPS printouts for reflectance-only cases. Runtime still reads XML only.

Visual smoke against the supplied real corpus was completed before PR handoff:

- a complete 61 × 61 reflectance-only XML was reconstructed and visually compared with its embedded PV-2000 XPS Reflectivity preview; the measured/sample geometry and orientation are consistent while palette/color-scale choices remain presentation-only;
- the 2814 / 3721 partial XML was rendered with the leading acquisition-prefix schedule and produces a nonblank partial map instead of the previous geometry-unavailable state;
- the complete example's calculated Reflectivity summary reproduces the XPS values (30.82 / 8.57 / 32.30 / 0.22 / 83.00%) at the displayed precision;
- the quantity semantics were also exercised directly against the branch module: reflectance-only exposes Direct / Scattered / Reflectivity with Reflectivity as the sole primary result, while current-enabled LBIC retains Current / Reflectivity / IQE.

Diffusion length (DL) remains unsupported as a calculated quantity. The supplied multi-beam CSV contains DL, but the XML does not expose a raw DL channel and the vendor DL algorithm has not been established.

See `docs/REFERENCE_PROFILES.md`, `docs/ALGORITHMS_LBIC.md` and `docs/VALIDATION.md`.

## Required commands before handoff/commit

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run check
npm run build
npm run validate:qss
npm run validate:dual-qss
npm run validate:jzero
npm run validate:isc
npm run validate:vcpd
npm run validate:lbic
git status --short --ignored
```

Current regression inventory includes the QSS map references, Dual QSS raw-path corpus, ISC and VCPD paired references, LBIC-SINGLE-001/LBIC-MULTI-002/LBIC-REFLECTANCE-003, and JZERO-MAP-001. The JZero ES560 XML/CSV pair was independently compared point-by-point during this branch: X/Y exact, both lifetime and Smax channels at floating-point precision, Basore J0 at floating-point precision, and both Implied Voc channels within 0.07 mV. Validator launch commands use the cross-platform Node wrapper so Windows Store `python` aliases do not break `npm run validate:*`. Generic Inspector fallback retains an explicit unknown-type dispatch test.

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
   - Open at least one 51×51 / 101×101 LBIC-SINGLE-001 reference and the 54,449-point LBIC-MULTI-002 reference in the browser.
   - For LBIC-MULTI-002, verify the pseudo-square outline/exclusion boundary, 984/952/855/656 nm beam switching, Current / Reflectivity / IQE defaults, coordinate-based X/Y profiles and export.
   - Confirm ordinary numeric wavelength/power/FluxCache/raster-size changes stay inside the appropriate validated family; categorical path changes must report **NEW PROFILE**.

4. **QSS expanded-corpus smoke — completed on this branch**
   - CI quality gates / validator launcher / build are green.
   - The CI-built single-file analyzer was loaded headlessly and all **96 supplied QSS XML files** were imported one-by-one: 96/96 dispatched to the QSS analyzer, produced coordinate-complete maps, finite default filter bounds and live map/Distribution/acquisition-profile canvases with no browser/page errors.
   - Representative normal, sentinel-heavy and 125 mm / 489-site cases were visually inspected. SRV and Physical Ge controls were exercised after import.
   - CSV export was checked on a sentinel-heavy case: raw `-1 µs` values remain present; default scientific mode marks them unavailable/filter-invalid; Raw / PV-2000 style marks them available/valid under the full raw lifetime range.

5. **Landing / fallback / theme**
   - Verify the welcome tags render correctly in light and dark mode.
   - Open an unsupported XML type and confirm Generic XML Inspector fallback still works.
   - Confirm no tracked/private reference data has leaked into the build or repository.

## Next scientific validation step

Use the expanded 273-pair Dual QSS result-table corpus to establish the exact raw-lifetime → vendor `Lifetime[us]` transformation and zero/blank rule before implementing vendor Δn/Implied-Voc/J0 output. The conditional Lifetime→Δn relation is already constrained; do not promote an approximate integration/stitching model without pointwise parity. Keep this work in the dedicated `dual-qss.js` family rather than `qss-upcd.js`.

UI placement: QSS Current dataset belongs in the left sidebar. Dit Analysis controls and Results summary both start expanded; Results summary remains user-collapsible.
