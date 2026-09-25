# Changelog

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
