# Agent handoff — 2026-09-25

## Cross-platform validation hardening (v20260925.28)

The private Windows replay of public `npm run check` exposed two source-structure tests that assumed LF line endings. The runtime was correct and all FixedPoints forensic parity checks had already passed; only the test regexes failed after Windows checkout produced CRLF boundaries. The Dual QSS redraw-order assertion and DIT filter/map synchronization assertion now accept either LF or CRLF.

This keeps the public test suite portable across the Ubuntu public CI runner and Windows private vendor-oracle workflows without weakening the asserted code ordering.

## Audit hardening (v20260925.27)

The post-v26 full-project audit found and closed two engineering-level failure modes without changing scientific formulas. `roundGrid()` now rejects invalid/non-positive pitch before any loop bound is derived, and MapPattern resolution requires a positive finite X/Y pitch before assigning a generated-grid interpretation. XML loading is now transaction-like at the shell boundary: render must succeed before the new dataset becomes `current`; on failure the previous dataset, labels and folder context are restored. Adjacent navigation advances only after a successful load.

The public repository now tracks `package-lock.json` (lockfile v3) and CI installs with `npm ci` under Node 22. This also removes the cross-repository false failure where private validation checked out the public analyzer and `npm ci` failed solely because no lockfile existed.

## Current dataset adaptive summary layout (v20260925.25)

Dedicated analyzer **Current dataset** panels now use one compact count-adaptive presentation. Wide sidebars divide the row evenly across the analyzer's actual metric count (currently 3 in Dual QSS, 4 in most analyzers and 5 in JZero), so there is no empty fourth slot or orphan fifth item. At the medium two-column workspace, the panel becomes compact label/value rows rather than a forced card grid. The inner metric cards were removed only for Current dataset; other validation/status components keep their existing treatment. ISC/VCPD displays the completed acquisition schedule as **Complete**.

## Geometry boundary-contract hardening (v20260925.21)

The canonical geometry core deliberately keeps three different circular predicates. `roundGrid()` is strict with an inward `1e-9` guard; `pseudoSquareGrid()` is inclusive with an outward `1e-9` guard; HighDensity circular clipping is strict with no epsilon. The HighDensity rule is directly parity-sensitive: the 35 × 35 RoundWafer coefficient template resolves to 893 sites only when the stored floating-point coefficients are tested directly without subtracting an artificial epsilon. Dedicated regression tests now lock all three edge semantics, and architecture documentation warns against merging them into one helper without new paired boundary evidence.

## Documentation scientific-content audit (v20260925.20)

The Wiki science layer was audited against current runtime and validation documents. SPV, Leakage, Dual QSS, LBIC and ISC/VCPD now explain measurement physics, governing equations, assumptions and interpretation in addition to compatibility/validation boundaries. Stale Dual-QSS output wording and contradictory SPV Enhanced-N validation wording were removed. `docs:check` now guards the scientific-page equation/validation baseline and selected known stale contradictions.


## DIT current-DLL COCOS-II closure (v20260925.24)

The public compatibility layer implements the recovered current managed-DLL COCOS-II result path as `DIT-RESULT-COCOSII-DLL-003`. Private controlled-vendor evidence uses unchanged real P/N measured arrays with COCOS-II routing/EOT/Vsb-window perturbations; all 12 control/probe cases export successfully and the independent XML-only oracle reproduces Vfb/Qsc/Qtot/Dit/Qit at floating-point scale. This is controlled vendor validation, not a claim that a native instrument-recorded `UseCocosII=true` pair exists.

Maintenance-critical ordering is measured-light flatband -> COCOS-II internal light/Vsb/Qsc reconstruction -> Qit -> N-type analysis-axis sign reversal -> raw Dit. `VsbMin/VsbMax` gate Dit segments, and the all-unavailable COCOS-II Minimum-Dit scalar remains the vendor `1e100` sentinel. `DoBackSurfaceShift`, Analyzer Ge and optional PCHIP remain outside this vendor-validation envelope.

## LBIC Distribution regression fix (v20260925.18)

LBIC Distribution now reads the shared canvas frame through `frame.ctx`, matching `PV.plot.canvasFrame()`. The previous `frame.context` access caused a `clearRect` TypeError on LBIC redraw. A drawing regression test covers the shared canvas-frame path.


## Current baseline

- Public main: `v20260925.28`.
- Current hardening branch: `fix/cross-platform-source-tests-20260925`.
- Updated 100-case classifier outcome after the FixedPoints closure: **73 scoped PASS + 14 intentional diagnostics + 0 FAIL + 0 NEW_PROFILE** across all 87 successful vendor exports.
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
7. **completed:** sentinel-aware QSS closure validates seven numeric pairs across SquareRegion/Map/HighDensity, including 39 `-1` controller sentinels with vendor `Ud./0/0` lifetime/Smax/Voc result semantics; `QSS-CALC-IMPLIED-VOC-002` now reproduces current-DLL finite/placeholder Implied Voc with zero availability mismatches and 5.56e-16 V maximum error;
8. **completed:** DIT final-result closure covers initial VDark, corrected final-result VLight, direct result-table Vsb, Initial Qc and the current managed-DLL Standard-COCOS downstream Vfb/Qsc/Qtot/Qit/Minimum-Dit path across 13 pairs / 43 sites. `DIT-RESULT-STANDARD-DLL-002` has zero availability mismatches. Controlled real-acquisition vendor-DLL probes close current-DLL COCOS-II as `DIT-RESULT-COCOSII-DLL-003`; historical releases and active Back Surface Shift remain version/profile-scoped;
9. **completed:** re-audit Dual QSS final-result branches; three current-style OnePoint rows pass independently of target geometry, the no-J0 maximum-quantity availability rule is preserved, and managed-IL tracing closes both one-site FixedPoints rows via the `DoPointAveraging` saved-vector rule. Four empty + one legacy cases remain diagnostics;
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

`QSS-INJ-RESULT-001` reconstructs the complete nine-scalar vendor result path for the established non-Auger Back/Back pairs. The 100-case audit adds three compatible nonempty OnePoint rows and two one-site FixedPoints/PseudoSquare rows. The former FixedPoints conflict is closed: `DoPointAveraging=false` uses the first saved `Values` lifetime vector, while `DoPointAveraging=true` uses the pointwise arithmetic mean across all saved lifetime vectors. The existing downstream QSS/J0 calculation then matches both rows at floating-point scale. The no-J0 maximum-quantity availability rule remains unchanged. Multi-site FixedPoints is still outside the evidence envelope. Runtime remains XML-only.

### JZero

Eight successful 100-case numeric pairs validate the two-intensity lifetime channels, Smax and Basore J0 across OnePoint, SquareRegion, HighDensity and Map geometries. Maximum X/Y error is about 4.97e-14 mm and Basore J0 error about 4.73e-11 fA/cm². JZero Implied Voc is now closed separately as `JZERO-VOC-COMPAT-001`: managed-IL tracing recovered fixed `ni=1.22e10 cm^-3`, `T_C+272.15`, rounded `k/q` and the vendor `+1` logarithm term. Across 12 harness-generated pairs / 15,886 finite Voc values spanning Map, HighDensity, NinePoint, SquareRegion and OnePoint geometries, the recovered current-DLL equation is pointwise exact at exported precision. The earlier 18.7–21.1 mV split was a temperature/corpus confounder caused by the old physical `ni(T)` reconstruction.

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

QSS preserves raw lifetime and intrinsic sentinel validity separately from the user Valid-data filter. Smax and current-DLL simple-map Implied Voc are vendor-validated independently of geometry; `QSS-CALC-IMPLIED-VOC-002` reproduces seven nonempty cross-geometry pairs with zero availability mismatches and 5.56e-16 V maximum error. Optional Physical Si/Ge Voc and SRV remain Analyzer-side interpretation paths.

DIT keeps site filtering downstream of scientific calculation. Minimum Dit remains the discrete PV-2000-style result; optional PCHIP affects Midgap Dit/fitted curve only. `DIT-RESULT-INITIAL-001` validates initial VDark, corrected final-result VLight, direct result-table Vsb and Initial Qc on 13 final-result pairs / 43 sites. `DIT-RESULT-STANDARD-DLL-002` separately validates current managed-DLL Standard-COCOS Vfb/Qsc/Qtot/Qit/Minimum-Dit on the same corpus. `DIT-RESULT-COCOSII-DLL-003` separately validates the current-DLL COCOS-II reconstruction/order/window/sentinel path through controlled vendor probes. N-type result Vsb and signed analysis Vsb intentionally use different semantics; historical releases remain version-scoped. The Ge material option and optional PCHIP remain Analyzer-side science.

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

The **current-DLL DIT Standard-COCOS and COCOS-II result paths are closed** through `DIT-RESULT-STANDARD-DLL-002` and `DIT-RESULT-COCOSII-DLL-003`. Historical PV-2000 DIT behavior and active Back Surface Shift remain version/profile-scoped evidence.

1. **LBIC finite direct-plus-scattered DL:** obtain at least one finite paired vendor oracle before widening the current DL calculation envelope.
2. **Dual QSS remaining categorical branches:** obtain paired evidence for multi-site FixedPoints, Auger correction, alternate source selections, different 1000-mSun placement, non-steady-state/laser-power output or another result branch.
3. **SPV remaining categorical branches:** Enhanced N-type is validated; Enhanced P-type, texture correction, parsed-signal and manual-linearity paths still require their own paired evidence.
4. **IntensityScan:** scientific result support remains blocked by the vendor result API/invocation path; XML structure alone is not sufficient.
5. **Unsupported families:** CV, Frequency Scan, Voc/Voc Mapping, Fe/LID, Surface Passivation, Junction Lifetime, Sheet Resistance/Eddy, Height and other known families still require real XML + matching numeric vendor output before a dedicated scientific analyzer is added.

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
