# Agent handoff — 2026-09-25

## LBIC Distribution regression fix (v20260925.18)

LBIC Distribution now reads the shared canvas frame through `frame.ctx`, matching `PV.plot.canvasFrame()`. The previous `frame.context` access caused a `clearRect` TypeError on LBIC redraw. A drawing regression test covers the shared canvas-frame path.


## Current baseline

- Public main: `v20260925.19`.
- No active feature branch is required to complete the 100-case closure.
- Final private 100-case matrix against this baseline: **71 scoped PASS + 16 intentional diagnostics + 0 FAIL + 0 NEW_PROFILE** across all 87 successful vendor exports.
- `SPV-CALC-ENHANCED-N-003` is merged and paired-validated on 69 sites: 28 finite DL/Tau, zero availability mismatches, max errors 2.11e-7 µm DL and 1.46e-7 µs Tau.

## Cross-profile parity / geometry-decoupling audit

A 2026-09-24 private audit added 30 newly harness-paired cases across the already implemented DIT, QSS-µPCD, Dual QSS, JZero, ISC, VCPD and LBIC families. Calibration-only failures were intentionally excluded from scientific conclusions.

The decisive architecture finding was that the **canonical geometry layer is broadly reusable and validation must be split by calculation, geometry and quantity availability**. The decoupled audit reproduced 25 complete coordinate sets to floating-point precision and one incomplete SquareRegion prefix exactly. ISC and VCPD also preserved their scientific result equations across multiple independently validated geometries.

That validation-axis separation is now established. The completed sequence was:

1. **completed:** add separate calculation- and geometry-profile metadata to the normalized domain model;
2. **completed:** keep per-Quantity validation independent;
3. **completed:** change validators to emit calculation / geometry / quantity outcomes separately;
4. **completed:** migrate ISC/VCPD first because their new pairs prove the same calculation across different geometries;
5. **completed:** migrate JZero validation to geometry-independent lifetime/Smax/Basore parity while keeping Implied Voc on a narrower quantity envelope;
6. **completed:** split LBIC calculation semantics from geometry; the 100-case closure validates eight current+scattered numeric pairs / 27,376 sites plus one five-site direct+scattered pair, while two zero-site exports remain diagnostic and finite direct+scattered DL remains withheld;
7. **completed:** sentinel-aware QSS closure validates seven numeric pairs across SquareRegion/Map/HighDensity, including 39 `-1` controller sentinels with vendor `Ud./0/0` lifetime/Smax/Voc result semantics; Implied Voc remains inferred;
8. **completed:** DIT final-result closure now covers initial VDark, corrected final-result VLight, direct result-table Vsb, Initial Qc and the current managed-DLL Standard-COCOS downstream Vfb/Qsc/Qtot/Qit/Minimum-Dit path across 13 pairs / 43 sites. `DIT-RESULT-STANDARD-DLL-002` has zero availability mismatches; historical PV-2000 releases remain version-scoped evidence rather than an active blocker;
9. **completed:** re-audit Dual QSS final-result branches; three current-style OnePoint rows pass independently of target geometry, the no-J0 maximum-quantity availability rule is preserved, and four empty + one legacy + two conflicting FixedPoints cases are explicit diagnostics;
10. **completed:** Leakage and the paired standard SPV map paths are implemented; `SPV-CALC-ENHANCED-N-003` now reproduces the paired N-type Enhanced finite-wafer/back-surface result, while Enhanced P-type and other categorical branches remain gated; IntensityScan remains deferred because no trustworthy scientific result export path exists.

The detailed evidence and implementation sequence are recorded in `docs/CROSS_PROFILE_PARITY_AUDIT_20260924.md`.

## Dedicated analyzers on current main

- `DITMeasurement` — Dit / COCOS.
- `QssUpcdMeasurement` — QSS-µPCD map.
- `DualQssMeasurement` — QSS injection sweep.
- `JZeroMeasurement` — Emitter J0 map.
- `ISCMeasurement` — Initial Surface Charge.
- `VcpdMeasurement` — VCPD, dispatched by the shared Kelvin-probe module.
- `CETMeasurement` — contactless EOT / capacitance.
- `LBICMeasurement` — LBIC raster.
- `SPVMeasurement` — SPV / Diffusion Length.
- `LeakageMeasurement` — VSASS / leakage indicator.
- Unknown types — Generic XML Inspector fallback only.

The landing page intentionally separates dedicated analyzers, the Generic Inspector fallback and the project-level PV-2000 v1.3.0.5 validation boundary.

## Current result/evidence highlights

### Dual QSS

The canonical raw lifetime remains `TransientInfo@LifeTime`, with XML `Values` kept as a distinct stored vector/fallback. The expanded private raw corpus contains 273 exact XML/CSV pairs and 5833 injection points.

`QSS-INJ-RESULT-001` reconstructs the complete nine-scalar vendor result path for the established non-Auger Back/Back pairs. The 100-case audit adds three compatible nonempty OnePoint rows and confirms a quantity-level no-J0 rule: when `CalculateJZeroParams=false`, vendor `teff.SS Max` and maximum-Smax remain `Ud.` even though other scalar results are finite. Two historical FixedPoints/PseudoSquare rows conflict numerically, so the final-result geometry gate is intentionally not widened. Runtime remains XML-only.

### JZero

Eight successful 100-case numeric pairs validate the two-intensity lifetime channels, Smax and Basore J0 across OnePoint, SquareRegion, HighDensity and Map geometries. Maximum X/Y error is about 4.97e-14 mm and Basore J0 error about 4.73e-11 fA/cm². Implied Voc is quantity-scoped: two Map/PseudoSquare pairs support `JZERO-VOC-MAP-PSEUDOSQUARE-001` to at most about 0.850 mV, while older OnePoint/SquareRegion/HighDensity paths remain inferred with roughly 18.7–21.1 mV differences.

### ISC / VCPD

ISC validates repeated dark/light reading reconstruction to Vcpd Dark, Vcpd Light and VSB on its paired map profile. VCPD is a separate validated result profile with direct Vcpd Dark. Explicitly terminated prefix geometry can render as inferred without widening the complete-map vendor profile.

### CET

The historical `CET-9PT-SQUARE-001` pair now feeds two runtime validation axes: `CET-CALC-001` validates EOT/Cd/R² semantics, while `GEOM-NINEPOINT-SQUARE-001` validates NinePointPattern + SquareCell coordinates. The undefined EOT/Cd + R²=0 behavior remains regressed.

### LBIC

Historical composite evidence remains `LBIC-SINGLE-001`, `LBIC-MULTI-002` and `LBIC-REFLECTANCE-003`. The runtime/validator now tracks decoupled calculation profiles `LBIC-CALC-CURRENT-DIRECT-SCATTERED-001`, `LBIC-CALC-CURRENT-SCATTERED-002`, `LBIC-CALC-CURRENT-ONLY-003` and `LBIC-CALC-REFLECTANCE-ONLY-004` independently of shared geometry profiles.

The 100-case closure adds eight numeric current+scattered pairs (27,376 sites), one five-site direct+scattered pair and two zero-site diagnostics. Current / Reflectivity / IQE and their availability rules pass pointwise; geometry is resolved separately.

Calculated DL is now implemented for the current-plus-scattered multi-wavelength path (`LBIC-CALC-DL-MULTIWAVELENGTH-005`). A 961-point pair validates 956 finite DL cells within 1.66e-11 µm and five `Ud.` cells. Three additional one/five-point pairs have seven `Ud.` DL cells; none provides finite direct-plus-scattered DL evidence. The latter optical branch remains withheld.

Four new paired geometry combinations resolve independently of calculation profiles: SquareRegion/RoundWafer (400 sites), NinePoint/RoundWafer (9), FivePoint/SquareCell (5), and HighDensity/PseudoSquareCell (176). The HighDensity path scales normalized XML coefficients, applies the circular scheduled boundary, and excludes three physical target polygons before indexing results. All four coordinate comparisons are within 2.01e-14 mm.

### QSS / DIT

QSS preserves raw lifetime and intrinsic sentinel validity separately from the user Valid-data filter. Smax and profile-specific implied-Voc compatibility behavior are documented; optional physical Si/Ge Voc and SRV are Analyzer-side interpretation paths.

DIT keeps site filtering downstream of scientific calculation. Minimum Dit remains the discrete PV-2000-style result; optional PCHIP affects Midgap Dit/fitted curve only. `DIT-RESULT-INITIAL-001` validates initial VDark, corrected final-result VLight, direct result-table Vsb and Initial Qc on 13 final-result pairs / 43 sites. `DIT-RESULT-STANDARD-DLL-002` separately validates current managed-DLL Vfb, Qsc, Qtot, Qit and Minimum Dit on the same 43 sites with zero availability mismatches. N-type result Vsb and signed Standard-COCOS analysis Vsb intentionally use different semantics; historical releases remain version-scoped. The Ge material option is an Analyzer model and COCOS-II remains inferred.

## Architecture state

The shared domain layer is established:

- measurement envelope/provenance;
- quantities and availability;
- semantic profiles;
- canonical geometry;
- shared selection/filter state;
- shared plot/UI helpers.

ISC/VCPD were the pilot direct users of the domain model. CET was implemented directly on it. QSS, JZero, LBIC and DIT reuse the shared selection/geometry services where applicable while retaining family-specific parser/analyzer interfaces. Dual QSS keeps its dedicated injection-sweep model.

Do not infer that every module has been fully rewritten into an identical internal shape. The migration goal is semantic consistency, not forced uniformity.

## UI contract

For dedicated analyzers, the left side should use the common information priority where applicable:

1. **Measurement** — compact identity only: result, recipe, substrate/status, pattern/target and essential sample descriptors;
2. **Current dataset / acquisition context** — active iteration/beam plus point counts, completeness, coordinate availability and current valid population;
3. **Analysis / View controls**;
4. **Valid-data filter**;
5. **Results summary**;
6. collapsed **Acquisition / Full metadata / Validation / provenance**.

Selected site/pixel/measurement-point detail belongs in the right column, not the left sidebar.

Do not use **Measurement** as a catch-all for timestamps, offsets, calibration constants, instrument modes, profile IDs or validation diagnostics. Family-specific sections may be omitted or renamed when scientifically appropriate. Generic XML Inspector is exempt.

User filtering is always separate from intrinsic support/availability. A filtered finite value is not the same state as an unavailable/undefined value.

## Runtime and reference-data rule

Runtime reads PV-2000 XML only.

Matching CSV/XPS exports are regression evidence. New scientific analyzers or calculated vendor-result paths require at least one real XML plus matching numeric PV-2000 output; XML-only cases can support raw/parsing work or explicitly inferred paths.

Never publish private reference files or proprietary vendor material merely to make a validation test convenient.

## Remaining high-priority scientific gaps

The **current-DLL DIT Standard-COCOS final-result path is closed** through `DIT-RESULT-STANDARD-DLL-002`. Historical PV-2000 DIT behavior remains version-scoped evidence, not an active blocker for the current validated profile.

1. **LBIC finite direct-plus-scattered DL:** obtain at least one finite paired vendor oracle before widening the current DL calculation envelope.
2. **Dual QSS categorical branches:** explain the conflicting FixedPoints/PseudoSquare result branch, or obtain paired evidence for Auger correction, alternate source selections, different 1000-mSun placement or another result branch.
3. **QSS exact Implied Voc compatibility:** lifetime/Smax are closed; further work is optional unless exact historical Voc parity beyond the current compatibility envelope is required.
4. **SPV remaining categorical branches:** Enhanced N-type is validated; Enhanced P-type, texture correction, parsed-signal and manual-linearity paths still require their own paired evidence.
5. **IntensityScan:** scientific result support remains blocked by the vendor result API/invocation path; XML structure alone is not sufficient.
6. **Unsupported families:** CV, Frequency Scan, Voc/Voc Mapping, Fe/LID, Surface Passivation, Junction Lifetime, Sheet Resistance/Eddy, Height and other known families still require real XML + matching numeric vendor output before a dedicated scientific analyzer is added.

## Validation commands

Normal public checks:

```bash
npm run check
npm run build
```

Reference validators:

```bash
npm run validate:dit
npm run validate:qss
npm run validate:dual-qss
npm run validate:dual-qss-results
npm run validate:dual-qss-runtime-results
npm run validate:jzero
npm run validate:isc
npm run validate:vcpd
npm run validate:lbic
npm run validate:cet
npm run validate:leakage
npm run validate:spv
```

Private validators may skip or require explicit local paths when their reference material is not present in the public checkout. A skip is not a validation pass.

## Documentation authority

- user guidance/science: `main/wiki/`;
- supported analyzer index: `docs/MEASUREMENT_TYPES.md`;
- runtime/UI architecture: `docs/ARCHITECTURE.md`;
- exact semantic profiles: `docs/REFERENCE_PROFILES.md`;
- numerical evidence: `docs/VALIDATION.md`;
- current developer state: this file;
- history: `CHANGELOG.md` and Git.

The live GitHub Wiki is a published mirror of `main/wiki/`, not an independent source of truth.
