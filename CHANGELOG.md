# Changelog

## v20260925.24 — 2026-09-25

- Promoted the recovered current managed-DLL DIT COCOS-II path to controlled vendor validation as `DIT-RESULT-COCOSII-DLL-003`, while keeping native instrument-recorded `UseCocosII=true` pairing as a provenance distinction rather than pretending it exists.
- Implemented the exact current-DLL ordering and reconstruction in the PV-2000 compatibility result layer: measured-light flatband first, `Cox = 3.453e-5 / EOT[Å]`, reconstructed dense/raw light-Vsb-Qsc arrays, Qit before N-type Vsb sign reversal, and segment-based `VsbMin/VsbMax` Dit validity.
- Preserved vendor clipping/unavailability details including the defined `1e100` Minimum-Dit sentinel when every COCOS-II raw Dit segment is unavailable; direct result-table VDark/VLight/Vsb/Vfb/Qsc/Qtot/Initial Qc stay separate from the reconstructed Dit/Qit path.
- Added regression tests for the exact COCOS-II formula, dedicated result profile, segment-window semantics, sentinel behavior and current XML field names (`VsbMin`, `VsbMax`, `DoBackSurfaceShift`).
- Updated validation, algorithm, reference-profile, README, measurement-family, Wiki, handoff, architecture and maintainer documentation. `DoBackSurfaceShift` and the Analyzer-only Ge/PCHIP paths remain outside the COCOS-II vendor-validation envelope.

## v20260925.23 — 2026-09-25

- Recovered the QSS-µPCD simple-map Implied-Voc current-DLL path and promoted it as `QSS-CALC-IMPLIED-VOC-002`: fixed `ni=1.22e10 cm^-3`, vendor `k/q`, and `T = ChuckTemperature + 272.15 K` with the zero-temperature fallback.
- Reproduced seven nonempty paired cross-geometry QSS exports with zero Implied-Voc availability mismatches and maximum absolute error **5.56e-16 V**.
- Preserved vendor result semantics for non-positive lifetime (`Voc=0` placeholder at positive intensity) and zero QSS intensity (`Voc=Ud.` even when lifetime is finite), including the 7000-site zero-intensity oracle.
- Upgraded the QSS validator from diagnostic Voc comparison to a strict parity gate while keeping optional Analyzer Physical Si / Physical Ge estimates separate from vendor validation.
- Updated QSS algorithm/validation/reference/Wiki documentation plus README, measurement matrices, handoff, cross-profile audit and maintainer guidance to remove the superseded 4.918 mV inferred-compatibility claim.

## v20260925.22 — 2026-09-25

- Recovered the current managed-DLL JZero Implied-Voc path and replaced the earlier fitted `NI_VOC_300 + ni(T)` reconstruction with exact PV-2000 compatibility semantics: fixed `NiForSilicon=1.22e10 cm^-3`, `ChuckTemperature + 272.15`, rounded `k=1.38066e-23` / `q=1.602e-19`, and `ln(ratio + 1)`.
- Preserved the vendor fallback behavior of 27 °C for missing/zero chuck temperature and 200 µm for non-positive wafer thickness on the JZero Voc injection path. These historical constants are deliberately compatibility-scoped and must not be silently modernized.
- Removed the false geometry gate from JZero Voc validation. `JZERO-VOC-COMPAT-001` is now tied to the validated two-iteration calculation path, while geometry remains an independent profile axis.
- Private managed-IL/harness evidence covers 12 JZero XML/vendor-CSV pairs and 15,886 finite Voc values across Map, HighDensity, NinePoint, SquareRegion and OnePoint geometries; the recovered formula reports 0.000000000 mV maximum error at exported precision.
- Added public regression oracles from real paired evidence for Map/PseudoSquare, OnePoint/RoundWafer, SquareRegion/SquareCell, NinePoint/SquareCell and HighDensity/RoundWafer, and updated the JZero validator, profile registry, Wiki, measurement matrices, cross-profile audit and handoff documentation.

## v20260925.21 — 2026-09-25

- Locked the three intentionally different circular-boundary contracts in `src/core/geometry.js`: strict inward-guard Map/Round rastering, inclusive outward-guard PseudoSquare rastering, and strict zero-epsilon HighDensity clipping.
- Added boundary-focused regressions for the epsilon direction itself plus established 305-site Map/Round, 54,449-site Map/PseudoSquare and 893-site HighDensity/Round schedule anchors.
- Kept JavaScript `-0` / `0` coordinate equivalence in the pseudo-square regression while preserving strict checks for the boundary-site set and row/column indices.
- Documented the pattern-specific rationale in the architecture and handoff docs so these predicates are not deduplicated without new paired boundary evidence.

## v20260925.20.2 — 2026-09-25 (branch)

- Restored SPV scientific-input visibility after the sidebar normalization: LED temperature, wafer thickness, back-surface velocity, Enhanced-mode state and doping type now remain visible under collapsed Acquisition / validation metadata.
- Restored Leakage Material and Physical thickness to collapsed Acquisition / validation metadata instead of leaving parsed measurement settings invisible.
- Added a layout regression guard that requires these calculation/settings inputs to remain represented in the dedicated analyzer sidebar without expanding the compact Measurement identity block.

## v20260925.20.1 — 2026-09-25 (branch)

- Audited every dedicated analyzer left sidebar against one semantic information contract instead of treating Measurement as a generic metadata bucket.
- Measurement is now a compact identity block; active point/iteration/beam/completeness information lives in Current dataset; timestamps, offsets, acquisition settings and validation/provenance remain collapsed below Results summary.
- DIT now exposes Recipe/Substrate/Status/Pattern/Target directly in Measurement, adds Current dataset counts, renames the old catch-all Measurement metadata panel to Acquisition metadata, and keeps charge-sequence recipe details in their own collapsed section.
- Applied the same separation to QSS, Dual QSS, JZero, ISC/VCPD, LBIC, CET/EOT, SPV/Diffusion Length and Leakage.
- Expanded layout regression coverage to all nine dedicated analyzer modules and added a guard that prevents lower-priority audit metadata from drifting back into Measurement.


## v20260925.20 — 2026-09-25

- Reworked SPV, Leakage, Dual QSS, LBIC and ISC/VCPD Wiki pages as measurement-science references, adding physical principles, governing equations, assumptions and interpretation instead of relying mainly on compatibility/regression notes.
- Corrected stale/contradictory documentation: Dual QSS now documents its exposed teff.SS/Voc/J0 scalar results, and SPV no longer classifies the paired Enhanced N-type path as unvalidated.
- Expanded Scientific Foundations with optical generation depth, EQE/IQE and idealized capacitance-relaxation leakage physics; aligned SPV/Leakage algorithm notes and added a durable family-page scientific-content contract.
- Updated Home/Measurement Families capability summaries and strengthened `docs:check` to require equations plus validation sections on scientific family pages, catch the known SPV/Dual-QSS stale claims and verify HANDOFF's public-main baseline against `VERSION`.


## v20260925.19 — 2026-09-25

- Reworked the wide analyzer shell so toolbar, content and project footer fit exactly inside the viewport. The footer now occupies the bottom shell row and the body no longer contributes a second vertical scrollbar.
- Kept the three desktop analyzer tracks literally equal-width and made dataset, overview and detail panes the sole vertical scroll owners for their columns.
- Restored DIT Vcpd–Qc, Dit–Vsb and Vsb–Qc to simultaneous stacked display in the right detail pane; removed the temporary point-analysis tabs/sticky wrapper, eliminating the Axes-control collision seen in DIT.
- Changed shared plot wheel interaction so ordinary wheel/trackpad motion scrolls the active pane. Plot zoom now requires Ctrl/⌘ + wheel; double-click still restores Auto and Ctrl/⌘ + wheel over an axis still performs axis-only zoom.
- Updated DIT, QSS, ISC and LBIC hover help plus workspace documentation to match the non-conflicting scroll/zoom contract.


## v20260925.18 — 2026-09-25

- Fixed LBIC Distribution rendering after plot normalization: `PV.plot.canvasFrame()` exposes `ctx`, and reading `frame.context` caused `Cannot read properties of undefined (reading 'clearRect')` during redraw.
- Added a drawing regression test that exercises the Distribution canvas frame and verifies that it clears and paints.


## v20260925.17 — 2026-09-25

- Made the wide desktop workspace a true equal-width three-pane layout with independent vertical scrolling for dataset/analysis state, whole-sample overview and point/local detail.
- DIT now uses a larger 640×500 wafer-map surface and a sticky Selected site / Measurement point header with Vcpd–Qc, Dit–Vsb, Vsb–Qc and All point-analysis tabs. Pane scroll positions survive shell rebuilds.
- Unified right-side Selected site typography with the left sidebar hierarchy.
- Replaced DIT's repeated “Valid-site mean ± stdev” cards with compact Selected-site-style summary rows; selected-site Midgap coverage text now stays in the local-detail panel.
- Audited other result summaries and compacted QSS, the other family that repeated per-metric statistic labels. Existing ISC/JZero/LBIC/CET/SPV/Leakage summaries already use one shared table header rather than repeating labels per quantity.
- Removed the redundant persistent `XML: UseCocosII = ... → ...` row; the same mapping remains in Analysis method hover help.


## v20260925.16 — 2026-09-25

- Compact large/small editable numeric values in Valid-data filter and manual-axis text boxes using scientific notation instead of long digit strings.
- Normal-scale values remain ordinary decimal text. Programmatically populated inputs retain their exact underlying numeric value until the user edits the field, so display formatting alone does not silently change filter or axis semantics.
- Added shared numeric-input formatter/set/read helpers and regression coverage for scientific display plus exact-value preservation.


## v20260925.15.2 — 2026-09-25 (branch)

- Fixed `HighDensityPattern + RoundWafer` schedule reconstruction to apply the vendor-compatible strict circle test directly to stored floating-point coefficients, without subtracting an artificial epsilon from the radius.
- This restores the 35 × 35 HighDensity schedule to **893** coordinates while preserving the validated 15 × 15 (**145**) and 20 × 20 (**276**) RoundWafer schedules.
- Added JZero geometry regression coverage for all three dimensions; no scientific JZero calculation changed.


## v20260925.15.1 — 2026-09-25 (branch)

- Compactified the LBIC sidebar View panel into a two-column stacked-label control grid, matching the visual language used by Valid-data filter instead of mixing left-label/right-control rows with stacked fields.
- Normalized sidebar select/input height, padding and label spacing between View and Valid-data filter, and changed the Advanced raw/intermediate toggle to a compact full-width inline row.


## v20260925.15 — 2026-09-25

- Recovered the current managed-DLL Standard-COCOS final-result path for DIT Vfb, Qsc, Qtot, Qit and Minimum Dit as `DIT-RESULT-STANDARD-DLL-002`.
- Reproduced the 13 paired final-result files / 43 sites with **zero availability mismatches**. Browser-runtime maximum absolute errors are about **1.03e-13 V (Vfb)**, **5.49e-4 cm^-2 (Qsc)**, **3.47e-2 cm^-2 (Qtot)**, **3.81e-1 cm^-2 eV^-1 (Minimum Dit)** and **2.93e-3 cm^-2 (Qit)**.
- Added the recovered repeated-reading rejection, natural-cubic 3× charge-grid interpolation, flatband intersection/availability rules, vendor silicon constants, Qit mapping and discrete Dit result semantics.
- Kept these PV-2000 compatibility quantities separate from the Analyzer's configurable Si/Ge Standard COCOS, optional PCHIP Midgap Dit and inferred COCOS-II paths; selected-site detail exposes both layers explicitly.
- Independent private Python-oracle and browser-runtime gates both pass the full paired DIT downstream corpus.

## v20260925.14.6 — 2026-09-25 (branch)

- Final pre-merge review aligned the durable architecture wording with QSS: whole-dataset acquisition-order profiles are overview surfaces, while selected-point traces remain local detail.
- Fixed the LBIC right-column stacked X/Y profiles to use a horizontal divider at wide widths instead of retaining the obsolete two-column left border.

## v20260925.14.5 — 2026-09-25 (branch)

- Completed the analysis-workspace UI refactor across all dedicated analyzers: semantic desktop columns, responsive plot surfaces, readable plot typography, and bidirectional displayed-quantity / Valid-data-filter synchronization.
- Completed the one-point audit: QSS-uPCD, ISC/VCPD, SPV, JZero and CET suppress population-only plots where appropriate and use Measurement point / Measurement position semantics.
- Fixed QSS high-DPI smooth-map rendering, DIT dynamic map/filter synchronization after analysis rebuilds, and moved DIT point-specific result values out of the aggregate left-sidebar summary.
- Final cross-family source/CI audit passed; archived the dated implementation plan under `docs/archive/` and kept only the durable workspace contract in architecture/developer documentation.

## v20260925.14.4 — 2026-09-25 (branch)

- Updated regression expectations for the deliberate synchronized active-quantity behavior and semantic overview/detail class names.
- Raised the remaining 8 px CET/DIT map-site labels to 10 px so no scientific SVG keeps the pre-refactor micro-label size.

## v20260925.14.3 — 2026-09-25 (branch)

- Split dense UI event/render code introduced by the workspace migration so the strengthened source-density gate can inspect it normally.
- No scientific or interaction semantics changed in this cleanup.

## v20260925.14.1 — 2026-09-25 (branch)

- Merged the latest main baseline (`v20260925.14`) into the workspace-UI branch while preserving the new DIT result-Vsb semantics alongside the UI refactor.

## v20260925.14 — 2026-09-25

- Resolved the remaining DIT N-type Vsb ambiguity by recovering the vendor result-path semantics: `CreateDataValues()` exports direct `Vsb = VDark - VLight_result`, while `StartDitCalculation()` separately applies the N-type sign transform to Standard-COCOS analysis arrays.
- Added an explicit runtime `ResultVsb` quantity and exposed **PV-2000 result Vsb** separately from **Analysis Vsb** without changing the existing doping-aware Standard COCOS calculation.
- Promoted final-result Vsb to a strict paired gate alongside VDark, corrected VLight and Initial Qc for the 13-file / 43-site DIT result corpus; maximum absolute Vsb error is **8.04e-16 V**.
- Narrowed the remaining DIT evidence wall to downstream Vfb/Qtot/Qit/Qsc/Dit historical/current parity; no flatband or Dit formula was widened.

## v20260925.13.6 — 2026-09-25 (branch)

- Migrated QSS-uPCD, Dual QSS and Leakage to the semantic workspace contract.
- QSS now links the displayed quantity to the Valid-data filter, keeps Map/Distribution/acquisition-order profile as whole-dataset views, and adds map-driven selected-site detail on the right.
- Dual QSS keeps the injection sweep and measurement-position overview together while moving Selected injection point + stored transient into local detail; its Canvas plots now use shared responsive/high-DPI sizing.
- Leakage now separates measurement position from point detail and exposes the stored positive/negative offset-corrected raw readings as a local scientific plot instead of leaving its profile capability undisplayed.

## v20260925.13.5 — 2026-09-25 (branch)

- Migrated CET and DIT to the semantic workspace. Whole-sample map/distribution content stays in the middle, while current/selected point cards and point-specific fit/COCOS curves move to the right.
- CET now starts filtering the displayed EOT quantity, synchronizes Filter metric with the map selector, and omits the one-sample Distribution.
- DIT synchronizes the Valid-data filter with the wafer-map quantity while keeping Vcpd–Qc, Dit–Vsb, Vsb–Qc and flatband details tied to the selected point.
- Normalized CET/DIT vector plots to a common 640×360 logical surface and raised vector-axis typography from 9 px to the shared readable baseline.

## v20260925.13.4 — 2026-09-25 (branch)

- Migrated JZero, SPV and LBIC to the semantic workspace: whole-sample Map/Distribution in the middle and selected point/pixel detail on the right.
- Added map-driven point selection to JZero and SPV; one-point JZero no longer renders a meaningless one-sample Distribution.
- Linked JZero/SPV/LBIC displayed quantities bidirectionally to the Valid-data filter while preserving shared selection-core cross-metric capability.
- Migrated their Canvas plots to the shared responsive/high-DPI surface; LBIC X/Y local profiles use the compact surface in the detail column.

## v20260925.13.3 — 2026-09-25 (branch)

- Added shared responsive/high-DPI Canvas sizing and resize-redraw helpers in the plot core.
- Migrated ISC/VCPD and QSS-uPCD Canvas plots away from fixed 760×300/420 display assumptions; standard plots now use the same responsive surface sizing.
- Raised Canvas axis/tick typography to the shared readable baseline and enlarged SVG chart legend/metadata text pending vector-family migration.

## v20260925.13.2 — 2026-09-25 (branch)

- Added the shared Valid-data-filter/displayed-metric linking hook and migrated ISC/VCPD as the reference implementation.
- Reorganized ISC/VCPD into semantic desktop columns: dataset/filter/summary state on the left, Map + Distribution in the overview column, and Selected site + Raw readings in the local-detail column.
- Updated architecture/agent guidance and structural tests so selected-point detail is no longer treated as sidebar content.

## v20260925.13.1 — 2026-09-25 (branch)

- Opened the analysis-workspace UI refactor and recorded the implementation/audit plan before code changes.
- Defined the desktop semantic columns as dataset/analysis state (left), whole-sample overview (middle), and selected-point/local detail (right).
- Defined the visualization normalization target: shared plot sizing/typography, bidirectional active-metric/filter synchronization, and a full dedicated-analyzer content audit.

## v20260925.13 — 2026-09-25

- Resolved the DIT final-result corrected-light semantics across **13 paired files / 43 sites**: `VLight_result = VDark - F × (VDark - VLight_measured)`, with maximum absolute error about **3.8e-15 V**.
- Reclassified the previously observed **83.1 mV** measured-vs-result VLight difference as deterministic `VsbCorrectionFactor` behavior rather than unexplained drift.
- Kept measured VLight as the Standard COCOS calculation input while exposing the separate PV-2000 final-result VLight in runtime site details and Vcpd/Qc export.
- Promoted corrected VLight to a strict gate in the DIT final-result validator alongside VDark and Initial Qc.
- Kept the stronger historical doping-aware N-type Standard COCOS Vsb convention unchanged; regenerated N-type result Vsb, Vfb/Qtot/Qit/Qsc/Dit and unresolved FixedPoints geometry remain outside the promoted result profile.

## v20260925.12 — 2026-09-25

- Implemented the recovered finite-wafer/back-surface SPV Enhanced calculation for the paired N-type branch as `SPV-CALC-ENHANCED-N-003`.
- Validated one real 69-site Enhanced N-type XML/vendor-CSV pair: **28 finite DL/Tau + 41 Ud.**, with **0 availability mismatches**.
- Enhanced DL maximum absolute error is **2.11e-7 µm** and Tau **1.46e-7 µs**; raw SPV8/SPV6 remain at floating-point parity.
- Preserved the standard signal preprocessing path, then solved the recovered vendor finite-wafer/back-surface root equation with N-type minority-carrier diffusion coefficient **12.2 cm²/s** and XML wafer-thickness / BSR parameters.
- Kept Enhanced P-type, texture correction, parsed-signal and manual-linearity branches outside the validated profile.
- Promoted the SPV validator from Enhanced diagnostic to strict paired validation and updated profile/algorithm/Wiki/handoff documentation.


## v20260925.11 — 2026-09-25

- Modernized the Dual QSS final-result validator to match the current decoupled calculation/geometry architecture; runtime scientific calculations are unchanged.
- Closed the ten-export 100-case Dual QSS matrix as **3 numeric PASS + 7 diagnostics**, replacing the stale validator result of **1 PASS + 1 FAIL + 8 NEW_PROFILE**.
- Validated three current-style non-Auger Back/Back `OnePointPattern` rows, including a `SquareCell` target resolved independently through `GEOM-ONEPOINT-CENTER-001`.
- Locked the no-J0 availability rule: when `CalculateJZeroParams=false`, vendor `teff.SS Max`, maximum-Smax and J0 outputs remain unavailable while teff.d/teff.SS/Δn/Smax/Voc may remain finite.
- Classified four zero-result acquisitions, one legacy Laser-Power/Lifetime-only export and two conflicting FixedPoints/PseudoSquare rows as non-promoting diagnostics.
- Updated validation/profile/algorithm/Wiki/handoff documentation so target geometry is no longer described as part of the Dual QSS calculation gate.


## v20260925.10 — 2026-09-25

- Refined final 100-case validator semantics without changing runtime scientific calculations.
- VCPD zero-site XML/CSV pairs now report `VCPD EMPTY` as diagnostic evidence instead of `NEW PROFILE`; no numeric calculation or geometry profile is promoted.
- SPV `UseEnhancedMode=true` pairs now automatically run the enhanced audit path. The known N-type pair remains unvalidated: raw SPV8/SPV6 agree, while the standard DL/Tau formula differs by up to **296.64 µm** and **420.23 µs**.
- Added regression tests and documentation to keep diagnostic/evidence-wall states distinct from validated PASS results.


## v20260925.9 — 2026-09-25

- Modernized the LBIC paired validator around independent calculation, geometry and quantity-availability axes; no runtime scientific calculation changed.
- Closed the 100-case LBIC matrix with **9 numeric PASS + 2 zero-site diagnostics**, replacing the previous validator-only **2 FAIL + 9 NEW_PROFILE** result.
- Added eight current+scattered numeric pairs spanning **27,376 sites** across OnePoint, Map and SquareRegion geometries. Current is exact, finite IQE differs by at most about **9.95e-14 %-point**, and X/Y differs by at most about **4.26e-14 mm**.
- Added a five-site direct+scattered FivePoint/SquareCell pair with exact Current and Reflectivity/IQE differences at floating-point scale (~**4.26e-14 %-point**).
- Ran all three 100-case DL-bearing exports through the dedicated DL validator: all seven sites remain vendor `Ud.` exactly. Finite DL evidence remains the existing 961-site current+scattered pair; finite direct+scattered DL remains unvalidated/withheld.
- Preserved `LBIC-SINGLE-001`, `LBIC-MULTI-002` and `LBIC-REFLECTANCE-003` as historical composite evidence while documenting the decoupled `LBIC-CALC-*` profiles.


## v20260925.8 — 2026-09-25

- Audited **13** paired DIT final-result XML/vendor-CSV exports covering **43 sites**; one additional DIT XML remains outside numeric closure because the vendor harness itself raises `ArgumentOutOfRangeException`.
- Fixed an Initial Qc bookkeeping off-by-one: PV-2000 final results use `(N_preprocess + 1) × PreProcess CoronaCharge`. All 43 paired sites now match exactly.
- Added narrow profile `DIT-RESULT-INITIAL-001` and a dedicated final-result validator. Initial VDark agrees to about **3.55e-15 V**; 12 resolved geometry cases agree to about **3.58e-14 mm**.
- Kept regenerated `VLight`, N-type Vsb, Vfb, Qtot, Qit, Qsc and Minimum Dit outside the promoted profile. The current doping-aware Standard COCOS Vsb convention, COCOS-II boundary and Analyzer-only Ge model are unchanged.
- Runtime remains XML-only; vendor final-result CSVs are private regression evidence only.


## v20260925.7 — 2026-09-25

- Closed the 100-case QSS-µPCD HighDensity/sentinel audit with seven nonempty XML/vendor-CSV pairs plus five zero-site acquisitions.
- Validated shared geometry across four SquareRegion/SquareCell, one Map/RoundWafer and two HighDensity/RoundWafer numeric pairs; maximum X/Y error is about **7.03e-14 mm**.
- Promoted `QSS-CALC-LIFETIME-SMAX-001` across the paired geometries: positive lifetime agrees to **5.68e-14 µs** and Smax to **5.00e-12 cm/s**.
- Corrected quantity-specific controller-sentinel semantics from paired evidence: raw XML `τ=-1 µs` remains preserved, while PV-2000 final-result rows use lifetime `Ud.`, Smax `0` and Implied Voc `0` for all **39** observed sentinel sites.
- Kept Implied Voc outside the promoted calculation profile; cross-geometry compatibility error reaches about **4.918 mV**.
- Modernized the QSS private validator to resolve geometry independently, classify empty acquisitions explicitly and validate lifetime/Smax availability without widening the Implied-Voc claim.
- Updated QSS runtime help, reference profiles, algorithm notes, Wiki, handoff and contributor rules to keep raw XML, vendor-result placeholders, scientific availability and user filtering distinct.


## v20260925.6 — 2026-09-25

- Audited all ten harness-generated Dual QSS exports in the 100-case corpus: four are empty acquisitions, one is a legacy laser-power/Lifetime-only branch, and five contain current-style final-result rows.
- Fixed the no-J0 availability branch proven by a real pair: when `CalculateJZeroParams=false`, `teff.SS Max` and maximum-Smax remain vendor `Ud.` instead of being exposed from an internally computable maximum.
- Kept the final-result geometry gate unchanged after two historical FixedPoints/PseudoSquare pairs produced conflicting parity; one is close to the current reconstruction while the other differs materially.
## v20260925.5 — 2026-09-25

- Closed the remaining high-value JZero opportunity from the 100-case private corpus: eight numeric XML/vendor CSV pairs validate the two-intensity lifetime, Smax and Basore J0 calculation independently across OnePoint, SquareRegion, HighDensity and Map geometries.
- Reworked the JZero private validator to use the shared geometry resolver and quantity-scoped outcomes. Across the eight pairs, maximum coordinate error is about 4.97e-14 mm and Basore J0 error about 4.73e-11 fA/cm²; one-site vendor Stdev remains correctly undefined.
- Kept Implied Voc on the narrower `JZERO-VOC-MAP-PSEUDOSQUARE-001` profile. Two pseudo-square map pairs remain within about 0.850 mV, while paired legacy OnePoint/SquareRegion/HighDensity cases differ by about 18.7–21.1 mV and remain inferred/diagnostic.
## v20260925.4 — 2026-09-25

- Expanded CET calculation evidence using seven new nonempty XML/vendor CSV pairs (19 sites) across six independently validated geometry combinations. Five finite EOT/Cd sites and all 19 R² results agree pointwise; an eighth zero-site pair remains empty evidence only.
- Migrated the CET private validator from a NinePoint/SquareCell gate to the shared geometry resolver while preserving quantity-specific unavailable values and summaries.
- Restricted CET runtime validation to the paired single-iteration, positive-charge path; updated algorithm notes, reference profiles, handoff and Wiki.

## v20260925.3 — 2026-09-25

- Modernized ISC and VCPD paired validators to check calculation/quantity results independently of the shared geometry resolver. Nine new ISC pairs (1860 sites) match all three outputs and coordinates, including RoundWafer maps and SquareRegion/SquareCell.
- Validated VCPD arithmetic means of one, four and sixteen readings/site across three new numeric pairs (1283 sites), with independent geometry parity for Map/RoundWafer, HighDensity/PseudoSquareCell and OnePoint/RoundWafer. A fourth empty acquisition remains outside numeric validation.
- Tightened VCPD runtime profile assignment to require dark acquisition, zero offset and the configured reading count at every site; updated reference envelopes, algorithm notes, handoff and Wiki.

## v20260925.2 — 2026-09-25

- Expanded SPV paired evidence with eight standard-mode XML/vendor CSV pairs: five extend the positive-oxide calculation, and three establish the zero-oxide/zero-reflectivity correction path. Across 3213 sites, 1542 finite DL/Tau values and every availability mask match the vendor output.
- Preserved the coordinate prefix of a terminated 59-site HighDensity/SquareCell acquisition as partial geometry; seven other new standard pairs match complete geometry profiles.
- Audited an enhanced N-type pair separately: raw channels match, while the standard calculation differs by up to 296.64 µm DL and 420.23 µs Tau on 28 finite sites. Enhanced calculations remain unvalidated.

## v20260925.1 — 2026-09-25

- Added the XML-only cross-beam LBIC diffusion-length result for the paired current-plus-scattered path. One 961-site vendor pair matches 956 finite DL values within 1.66e-11 µm and five undefined sites; three additional four-wavelength pairs confirm seven more undefined sites.
- Expanded shared geometry with paired SquareRegion/RoundWafer, NinePoint/RoundWafer, FivePoint/SquareCell and polygon-clipped HighDensity/PseudoSquareCell profiles. All four coordinate sets match real vendor CSVs to floating-point precision without changing scientific calculation profiles.
- Added independent private pointwise DL and geometry validators; private reference files remain untracked. Updated validation envelopes, algorithm notes, Wiki and handoff.

## v20260924.5 — 2026-09-24

- Decoupled calculation-profile, geometry-profile and quantity-level validation metadata across the measurement-domain architecture, preserving existing validated numerical paths while allowing geometry evidence to evolve independently.
- Added paired `LeakageMeasurement` support with `LEAKAGE-CALC-VSASS-001`; two real XML+CSV pairs reproduce natural-cubic VSASS+/VSASS-/LI extraction to floating-point precision, including the positive-only availability branch.
- Added paired `SPVMeasurement` support with `SPV-CALC-STANDARD-001`; two 1649-site 4 mm RoundWafer pairs reproduce DL/Tau to approximately 2e-11 absolute error, raw SPV8/SPV6 to floating-point precision and the vendor `Ud.` mask with zero mismatches.
- Added target-relative non-center OnePoint geometry support plus independent geometry profiles, and kept parsed-signal/enhanced SPV branches outside the validated calculation envelope.
- Aligned SPV with the shared Valid-data filter, map, Distribution, axes/bins and export UI contracts; updated landing-page analyzer inventory, README, validation docs and tracked Wiki source.
- Kept `IntensityScanMeasurement` deferred after confirming the current vendor class has raw-data export semantics but no independent scientific `CreateDataValues()` result path.
- P6 self-audit corrected the recovered SPV temperature-coefficient cross-mapping, kept manual-linearity mode outside the paired profile, and split CET runtime validation into `CET-CALC-001` plus `GEOM-NINEPOINT-SQUARE-001`.
## v20260924.4 — 2026-09-24

- Audited 30 newly harness-paired private cases across the seven already implemented measurement families, first through the existing validators and then with calculation and geometry parity separated.
- Confirmed that the canonical geometry resolver generalizes beyond the current monolithic profile gates: 25 complete coordinate sets reproduce vendor X/Y to floating-point precision, plus one exact incomplete SquareRegion acquisition prefix.
- Identified profile over-coupling in ISC/VCPD and parts of JZero/LBIC/Dual QSS, and documented the target split between calculation profile, geometry profile and quantity-level validation.
- Recorded the paired LBIC current-only and scattered-reflectance result paths, JZero quantity-specific Voc limitation, QSS HighDensity/sentinel follow-up, DIT regenerated-export drift boundary and the ordered follow-up plan.
- No runtime scientific calculation was changed in this audit branch.

## v20260924.3 — 2026-09-24

- Completed the two-pair `QSS-INJ-RESULT-001` Dual QSS final-result reconstruction from XML only for the non-Auger Back/Back path.
- Reproduced original DLL QDC internals with maximum absolute error ≈ **7.92e-11** across the paired HighPower/LowPower transients, including MinPack smoothing and contiguous QDC-range gating.
- Reconstructed the vendor steady-state path with log-log Akima densification, integration and corrected-lifetime interpolation.
- Matched all nine numeric vendor result quantities for both real XML+CSV pairs: teff.d, teff.SS, teff.SS Max, Basore J0, Δn, both Smax values, Implied Voc and K-S J0, including quantity-specific `Ud.` states.
- Added an XML-only runtime result-table export and private paired regression gate; Auger correction, alternate source selections and other categorical branches remain unavailable until separately paired.
- Updated repository docs and tracked Wiki source to the new validation envelope.

## v20260924.2 — 2026-09-24

- Re-audited all public documentation against current main after the Dual QSS result-parity update.
- Reworked the Wiki from a science-only reference into a user-facing guide plus scientific reference, with dedicated pages for every currently implemented analyzer family.
- Replaced stale branch-era documentation and future-tense Wiki planning with current source-of-truth rules, current architecture status and explicit unsupported-family gates.
- Added a version-controlled documentation index and one-way GitHub Actions synchronization from `main/wiki/` to the published GitHub Wiki so the live Wiki no longer drifts from reviewed source.
- Kept runtime calculations, validation envelopes and analyzer behavior unchanged.

## v20260924.1 — 2026-09-24

- Added the paired-evidence gate: a new scientific analyzer, derived quantity or calculation path requires at least one real PV-2000 XML plus its matching numeric PV-2000 CSV export; XML-only files may support parsing/raw inspection but not a new calculated result claim.
- Added Dual QSS numeric result profile `QSS-INJ-RESULT-001` from two real XML+CSV pairs and reproduced vendor `teff.d (1 Sun)` exactly for the observed exact-1000 mSun and below-target endpoint paths.
- Added a private-result validator for Dual QSS final-result pairs and kept vendor CSVs strictly as development regression evidence; runtime remains XML-only.
- Locked the downstream Smax and finite Δn relations against the paired result exports while keeping teff.SS / teff.SS Max, Implied Voc, Basore J0 and K-S J0 out of runtime until their XML→result transformations are pointwise reproduced.
- Updated README, measurement roadmap, validation/profile docs and tracked Wiki source to reflect the narrower validated result envelope.

## v20260923.22 — 2026-09-23

- Audited repository documentation and tracked Wiki sources against current `main` after the analyzer/sidebar cleanup.
- Removed stale architecture/refactor statements that still described ISC/VCPD as pending migration or CET as unsupported, and added CET to current shared-profile/module inventories.
- Updated HANDOFF, QSS, Wiki planning/sync and contributor guidance to current analyzer, SRV and validation state.
- Added the opt-in Analyzer SRV model to the QSS scientific Wiki page.
- Corrected two literal `\\n` formatting artifacts in the LBIC algorithm documentation.
- Historical CHANGELOG entries and evidence-boundary statements were intentionally preserved.

## v20260923.21 — 2026-09-23

- Updated the landing-page analyzer inventory to include ISC / VCPD and CET / EOT, and separated dedicated analyzers from the Generic XML Inspector fallback and the PV-2000 v1.3.0.5 validation boundary.
- Audited every dedicated measurement-family sidebar and documented one shared information hierarchy: Measurement → optional Analysis/View controls → optional Valid-data filter → Results summary → selected point/site → dataset audit → collapsed detailed metadata.
- Moved DIT site selection out of the Measurement identity block into a dedicated Selected site panel after Results summary.
- Reordered Dual QSS so comparison/view controls precede Results summary, and aligned Measurement / Results summary / Acquisition metadata naming.
- Aligned JZero and CET measurement-panel naming and collapsed LBIC Channel provenance as detailed metadata.
- Fixed stale CET/EOT roadmap text and a literal newline artifact in `docs/MEASUREMENT_TYPES.md`; added layout regressions for analyzer inventory and sidebar order.

## v20260923.20 — 2026-09-23

- Separated QSS Analyzer interpretation controls from PV-2000/XML measurement metadata.
- Renamed lifetime handling choices to Scientific — exclude τ ≤ 0 and Raw vendor values; retained PV-2000 compatible Implied Voc as the default while marking Physical Si/Ge as Analyzer estimates.
- Moved SRV into a collapsed Additional SRV analysis section, disabled it by default, and changed its enabled default geometry to Planar.
- Show planar-reference SRV only for the explicit Textured / black model and hide SRV from summaries/map/filter choices while SRV analysis is disabled.
- Kept raw τ ≤ 0 count solely as Current dataset audit information and added regression coverage for the new provenance/default semantics.

## v20260923.19 — 2026-09-23

- Added a dedicated `CETMeasurement` analyzer on the shared measurement-domain architecture with EOT, Cd and R² quantities, shared Valid-data filtering, canonical map geometry, Distribution, current-site Vcpd-light/Qc fit and CSV exports.
- Added paired profile `CET-9PT-SQUARE-001`: a 9-site `NinePointPattern + SquareCell` XML/vendor-export pair validates target-relative fixed-point coordinates plus EOT/Cd/R² point-by-point and summary statistics. The compatibility path uses `q = 1.602e-19 C`; the paired undefined fit keeps EOT/Cd unavailable and R² = 0.
- Extended canonical geometry with explicit-mm `FixedPointsPattern/PointValues`, added the private CET validator and stored the paired evidence in the separate private-reference repository.
- Defaulted the CET Valid-data filter to R² so the unfiltered summary preserves the vendor population while EOT/Cd omit only their quantity-specific unavailable site; EOT remains the default map quantity.
- Updated CET documentation and tracked Wiki source pages; other observed CET geometries remain inferred until paired vendor output extends the profile envelope.

## v20260923.18 — 2026-09-23

- Added JZero `SquareRegionPattern` geometry support from structured Region + Dimension fields, including 1 × 1 single-position rendering and inferred row-major schedules.
- Added explicit terminated/incomplete JZero degradation: available first-intensity τeff.d/Smax/Implied-Voc remain usable while missing second-intensity quantities and Basore J0 are unavailable without shifting site indices.
- Reused the shared partial-acquisition geometry prefix for terminated SquareRegion schedules; normal completed point-count mismatches remain rejected.
- Kept the established complete two-iteration JZERO-CALC-001 and pseudo-square validated paths numerically unchanged, with new SquareRegion/incomplete cases documented as inferred runtime support.
- Added regression coverage for the supplied completed 1 × 1 case and terminated 5 / 9, 1 / 2-iteration case.

## v20260923.17 — 2026-09-23

- Added the shared site-level Valid-data filter to DIT while keeping existing DIT algorithm validity as the intrinsic mask.
- Applied the active population to Results summary, wafer-map color/display state and map export without changing flatband, Qsc, Minimum Dit or Midgap/PCHIP calculations.
- Kept filtered/invalid sites inspectable and spatially visible, and added filter provenance to DIT wafer-map export.
- Added regression coverage for intrinsic-validity separation, quantity-specific availability and PCHIP-dependent filter candidates.

## v20260923.16 — 2026-09-23

- Migrated QssUpcdMeasurement from its module-local range-filter state to the shared selection controller and shared Valid-data filter UI contract.
- Preserved the independent intrinsic lifetime support/sentinel mask and the existing distinction between UNAVAILABLE and user-FILTERED sites.
- Kept the existing QSS default lifetime filter, metric choices, full-range defaults, inclusive bounds, 1–99%, Reset/Apply behavior, histogram excluded-count diagnostics and CSV layout.
- Routed the same shared active population through Results summary, map, Distribution, acquisition profile and CSV validity flags without changing QSS calculations or validation profiles.

## v20260923.15 — 2026-09-23

- Reused the shared Valid-data filter controller/UI for LBIC with filter scope tied to the current iteration and beam/wavelength.
- Applied one active site mask consistently to LBIC summaries, raster map, Distribution and X/Y line profiles while preserving raw channel/result arrays.
- Added filter-aware map/histogram/profile/all exports, selected-pixel validity state and a distinct no-active-sites map empty state.
- Added regression coverage for masked LBIC profiles and shared filter wiring without changing LBIC calculation/profile semantics.

## v20260923.14 — 2026-09-23

- Migrated JZero's older module-local valid-data filter to the shared selection controller and shared filter UI introduced in `v20260923.12`.
- Any of the seven JZero result quantities can define one paired-site active mask; displayed quantities additionally apply their own finite/support mask.
- Applied the shared selection state consistently to JZero summaries, maps, distributions and exports without changing the paired lifetime inputs or J0/Smax/Implied-Voc calculations.
- Extended JZero point/histogram exports with filter provenance and added regression coverage for cross-metric availability.

## v20260923.13 — 2026-09-23

- Added shared geometry schedule matching with explicit complete / partial-prefix / mismatch states, expected/acquired point counts and completion metadata.
- Added terminated ISC/VCPD map recovery: incomplete `MapPattern + RoundWafer` acquisitions can map saved DataItems onto the leading canonical X-fast / ascending-Y schedule prefix while completed point-count mismatches remain unavailable.
- Kept partial geometry outside validated profile parity and surfaced `partial acquisition · inferred` with acquired/scheduled site counts in the ISC/VCPD UI.
- Refactored existing LBIC SquareRegion partial-acquisition handling onto the shared geometry helper without changing its established display behavior.
- Added regression coverage for a 200 mm / 4 mm edge-exclusion / 1 mm pitch terminated ISC geometry with 10,947 acquired of 28,913 scheduled sites.

## v20260923.12 — 2026-09-23

- Added a reusable shared Valid-data filter controller and UI contract on top of the Phase A selection primitives.
- Connected ISC/VCPD to one site-level active mask: ISC can filter by Vcpd Dark, Vcpd Light or VSB; VCPD filters by Vcpd Dark.
- Applied the active mask consistently to summary statistics, maps, distributions and exports while preserving raw result/readings for excluded sites.
- Extended map/histogram exports with active filter provenance and added regression coverage for controller state, cross-metric masking and ISC/VCPD integration.

## v20260923.11 — 2026-09-23

- Added an explicit PV-2000 software-version validation boundary: the current reference baseline is Semilab PV-2000 v1.3.0.5. The landing page, README and reference-profile registry distinguish this evidence boundary from schema/profile compatibility with other versions.
- Decoupled JZero calculation semantics from spatial geometry. The established two-iteration calculation path remains available while geometry carries its own validation status; OnePointPattern + SquareCell can load as inferred geometry instead of being rejected solely for not matching the paired pseudo-square map.
- Extended the shared geometry resolver with PseudoSquareCell scheduling so the existing 5017-site JZero reference is generated through the same core geometry layer.
- Added Quantity presentation tiers (`primary`, `advanced`, `diagnostic`) and optional evidence metadata. Architecture and agent rules now require inspection of useful XML-only fields in addition to vendor CSV/UI outputs, following the LBIC Advanced-analysis precedent.
- Fixed the JZero source-density issue reported by CI.

## v20260923.10.9 — 2026-09-23 (measurement-domain refactor branch)

- Added the shared site-selection contract with separate intrinsic support, user range filtering and active masks; all site-aligned arrays are required to share one index space.
- Centralized Pattern/Target coordinate interpretation in the geometry core. Raw XML coefficients are retained separately from canonical physical `pointsMm`; unknown coefficient encodings are not assumed to be millimetres.
- Fixed DIT NinePointPattern map geometry: target-relative ±0.632455532 coefficients on a 100 mm wafer with 4 mm EdgeExclusion resolve to approximately ±29.09 mm and remain labelled inferred pending paired X/Y validation.
- Routed QSS HighDensity, ISC/VCPD generated map geometry, Dual QSS OnePoint context and DIT position/map rendering through the shared geometry contract while preserving established validated coordinate paths.

## v20260923.10.4 — 2026-09-23 (measurement-domain refactor branch)

- Added the first measurement-domain core: explicit Quantity provenance/availability, normalized measurement and geometry envelopes, semantic profile registry, and backwards-compatible registry metadata.
- Migrated ISC/VCPD internally as the pilot family. Existing result arrays, summaries, render/export contracts and reference-profile boundaries are preserved while ISC-MAP-001 / VCPD-MAP-001 metadata become explicit.
- Added domain-core, profile-resolution, build-order and ISC/VCPD provenance regressions. Validated ISC/VCPD profiles now require the established coordinate-reconstruction path so alternate coefficient encodings remain inferred. DIT/QSS/Dual QSS/JZero/LBIC remain on their existing module paths in this phase.

## v20260923.10 — 2026-09-23

- Fixed Dual QSS initial rendering: Lifetime vs QSS intensity and Stored transient now draw immediately after XML import instead of waiting for a Log/Linear or source-control change event.
- Removed the runtime lifetime-source selector and PV-2000 raw wording. Dual QSS uses the imported XML `TransientInfo@LifeTime` value, falling back to XML `Values` only when necessary; CSV/raw exports remain development-validation evidence only.

## v20260923.9 — 2026-09-23

- Merged the scientific Wiki source set and documentation/Wiki information-architecture plan into the main repository for continued maintenance.
- Wiki pages present current scientific knowledge directly; repository docs retain implementation, validation-profile and regression evidence.

## v20260923.8 — 2026-09-23

- Added `docs/MEASUREMENT_ARCHITECTURE_REFACTOR_PLAN.md`, defining a staged measurement-domain refactor around quantity provenance, availability, compatibility profiles, normalized geometry and pure scientific services.
- The planned first implementation phase is limited to shared domain primitives plus an ISC/VCPD pilot, preserving all existing numerical results, UI behavior and validation labels.

## v20260923.7 — 2026-09-23

- Added a generic, read-only DIT XML/raw-CSV diagnostic and optional strict dark-channel regression gate; private file paths and data remain outside the repository.
- Audited a larger private Standard COCOS OnePoint corpus: 176 paired row-aligned cases / 11,575 process rows reproduce the Qc schedule exactly, while eight cases exceed 2 mV dark-channel error and the exported light/Vsb branches are not generally derivable from saved measured-light XML.
- Confirmed that the inspected historical backup, installation data and Ge/COCOS measurement XML sets contain no `UseCocosII=true` DIT instance; COCOS-II and the Analyzer-only Ge model retain their existing validation boundaries. No runtime calculation changed.

## v20260923.6 — 2026-09-23

- Moved the Dual QSS **Measurement position** schematic out of the left metadata sidebar and into the right visualization column, matching the established DIT placement rule for OnePoint geometry.
- Added a layout regression that prevents the Dual QSS position visualization from being rendered inside the sidebar again.

## v20260923.5 — 2026-09-23

- Changed the landing-page **Guide** shortcut to the project Wiki and added a matching Guide/Wiki entry point to the README.
- The Wiki is the primary public reading surface for scientific background, measurement semantics and user-oriented reference material.

## v20260923.4 — 2026-09-23

- Fixed DIT `OnePointPattern` spatial rendering: nominal circular geometry now falls back to `Substrate/SubstrateShape` when no dedicated target node exists, EdgeExclusion drives the inner outline, and center-only datasets are labelled **Measurement position** instead of appearing as a fictitious tiny wafer map.
- Preserved Standard COCOS Vsb sign using the doping-aware dark/light convention rather than an unconditional absolute value, including the initial state and exported analysis columns.
- Regressed a private 9-pair one-point DIT corpus: 275 XML dark-process rows reproduce exported Vcpd Dark to about 0.310 mV MAE / 1.11 mV max error. A separate nearly straight corrected-light export branch is documented but not guessed because its activation/state is not uniquely encoded in the saved XML.
- Clarified throughout the Dit UI/docs that **Material: Si / Ge is an Analyzer model choice**; PV-2000 itself has no Si/Ge material selector, so Ge-sample exports do not establish a PV-2000 Ge mode.
- Added Dual QSS one-point geometry context: `OnePointPattern` reads the stored coefficient position, circular substrate geometry and EdgeExclusion, showing a measurement-position schematic without inventing a spatial lifetime heatmap. Six supplemental J0-requesting XMLs are documented as metadata/runtime coverage only because no matching vendor result-table export was supplied.


## v20260923.3 — 2026-09-23

- Documented the expanded QSS-INJ-001 envelope: 330 XMLs, 273 exact XML/CSV pairs, 5833 paired points and 11,660,167 exact raw Time/Voltage samples.
- Locked the three-lifetime distinction across README, validation, algorithm notes, reference profiles and handoff: TransientInfo raw LifeTime, XML Values diagnostic lifetime, and unresolved vendor result-table Lifetime.
- Recorded the expanded vendor result-table evidence (4628 positive / 1205 zero Lifetime rows) while keeping vendor Lifetime/Implied-Voc/J0 processing unsupported until pointwise parity is established.


## v20260923.2 — 2026-09-23

- Expanded `QSS-MAP-001` with a private **96-XML `QssUpcdMeasurement + MapPattern + RoundWafer` corpus**: 95 × 100 mm / 305-site maps plus one 125 mm / 489-site map. All 96 reconstruct the exact XML point count; all nine matching numeric PV-2000 CSV pairs reproduce X/Y and lifetime exactly, with Smax agreeing to CSV numeric precision.
- Established PV-2000's numeric non-positive-lifetime sentinel behavior from the corpus: **76 / 96 files** contain `τeff.d <= 0`, totaling **13,649 / 29,464 sites**. Raw lifetime and PV-2000-style raw Smax remain preserved for traceability/export, while default scientific analysis marks those sites unavailable before user filtering. An explicit **Raw / PV-2000 style** mode retains vendor-style numeric behavior.
- Added configurable lifetime→**SRV** analysis with Planar / Textured-black geometry, optional bulk lifetime, planar-reference SRV and minimum-lifetime threshold. SRV remains explicitly separate from vendor-compatible Smax.
- Split Implied Voc semantics into the default **PV-2000-compatible** path and explicit analyzer-side **Physical Si / Physical Ge** estimates. QSS material is never inferred from filenames/result names/substrate IDs. The original <0.1 mV reference remains an instance-level result; the expanded nine-pair corpus reaches approximately **1.94 mV** maximum absolute compatibility error.
- Reworked QSS Analysis controls into a sidebar-friendly two-column layout and replaced the clipped six-column summary table with compact per-metric result cards.
- Browser-smoked the CI-built single-file analyzer against **all 96 XML files** with **96/96 successful analyzer dispatch/render**, finite default filter bounds, generated map/distribution/profile canvases and zero browser/page errors. Representative normal, sentinel-heavy and 125 mm / 489-site cases were visually inspected; CSV export was checked for raw-sentinel preservation and availability/filter flags.


## v20260923.1 — 2026-09-23

- Rechecked the private LBIC reflectance corpus: 44 complete XMLs match 60 vendor XPS summaries, 17 complete XMLs have no matching XPS, and one partial acquisition remains coordinate-inferred. The mixed-corpus validator now reports these evidence states separately with `--allow-unpaired` while retaining strict paired validation by default.
- Restricted validated LBIC labels to the documented XML flag paths. Current-enabled parity requires explicit Current/Direct/Scattered flags and a known µA unit; reflectance-only parity requires zero-valued inactive Current placeholders. Unknown current units no longer trigger calculated EQE/IQE.
- Browser-imported all 62 private reflectance XMLs in the built analyzer. Every file selected Reflectivity and rendered a data-bearing raster map, distribution and X/Y profiles without an import dialog or runtime error. The one partial acquisition now states `partial acquisition · inferred` directly in Reference parity.

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
