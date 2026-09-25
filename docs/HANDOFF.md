# Agent handoff — 2026-09-25

## Current baseline

- Main baseline for this branch: `v20260925.4` (CET corpus parity merged in PR #69).
- Feature branch: `feat/jzero-quantity-corpus-parity`.
- Scope: close the remaining high-value JZero evidence from the 100-case private corpus without changing scientific formulas.
- Private regression: eight successful JZero XML/vendor CSV pairs now validate calculation, geometry and Implied-Voc quantity status independently. Reference files stay private.

## Cross-profile parity / geometry-decoupling audit

A 2026-09-24 private audit added 30 newly harness-paired cases across the already implemented DIT, QSS-µPCD, Dual QSS, JZero, ISC, VCPD and LBIC families. Calibration-only failures were intentionally excluded from scientific conclusions.

The decisive architecture finding is that the **canonical geometry layer is already broadly reusable, while profile validation remains too coupled to geometry**. The decoupled audit reproduced 25 complete coordinate sets to floating-point precision and one incomplete SquareRegion prefix exactly. ISC and VCPD also preserved their scientific result equations across multiple independently validated geometries.

Next work should therefore start with validation-axis separation, not with another measurement-family feature:

1. add separate calculation- and geometry-profile metadata to the normalized domain model;
2. keep per-Quantity validation independent;
3. change validators to emit calculation / geometry / quantity outcomes separately;
4. migrate ISC/VCPD first because their new pairs prove the same calculation across different geometries;
5. **completed:** migrate JZero validation to geometry-independent lifetime/Smax/Basore parity while keeping Implied Voc on a narrower quantity envelope;
6. split LBIC channel semantics from geometry and add the paired current-only / scattered-only paths;
7. perform the sentinel-aware QSS HighDensity pass;
8. investigate DIT historical regenerated-export drift without weakening the stronger original-pair rules;
9. **completed:** re-audit Dual QSS alternate geometries; keep the result-profile gate because the paired FixedPoints/PseudoSquare evidence conflicts, while preserving the newly proven no-J0 quantity availability rule;
10. **completed:** Leakage and the paired standard SPV map path are implemented; IntensityScan remains deferred because no trustworthy scientific result export path exists.

The detailed evidence and implementation sequence are recorded in `docs/CROSS_PROFILE_PARITY_AUDIT_20260924.md`.

## Dedicated analyzers on this branch

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

Current validated families are:

- `LBIC-SINGLE-001` — current-enabled single-beam SquareRegionPattern;
- `LBIC-MULTI-002` — independent current-enabled multi-beam MapPattern + PseudoSquareCell;
- `LBIC-REFLECTANCE-003` — reflectance-only SquareRegionPattern with inactive zero Current placeholders.

Calculated DL is now implemented for the current-plus-scattered multi-wavelength path (`LBIC-CALC-DL-MULTIWAVELENGTH-005`). A 961-point pair validates 956 finite DL cells within 1.66e-11 µm and five `Ud.` cells. Three additional one/five-point pairs have seven `Ud.` DL cells; none provides finite direct-plus-scattered DL evidence. The latter optical branch remains withheld.

Four new paired geometry combinations resolve independently of calculation profiles: SquareRegion/RoundWafer (400 sites), NinePoint/RoundWafer (9), FivePoint/SquareCell (5), and HighDensity/PseudoSquareCell (176). The HighDensity path scales normalized XML coefficients, applies the circular scheduled boundary, and excludes three physical target polygons before indexing results. All four coordinate comparisons are within 2.01e-14 mm.

### QSS / DIT

QSS preserves raw lifetime and intrinsic sentinel validity separately from the user Valid-data filter. Smax and profile-specific implied-Voc compatibility behavior are documented; optional physical Si/Ge Voc and SRV are Analyzer-side interpretation paths.

DIT keeps site filtering downstream of scientific calculation. Minimum Dit remains the discrete PV-2000-style result; optional PCHIP affects Midgap Dit/fitted curve only. The Ge material option is an Analyzer model and must not be described as a PV-2000 material mode. COCOS-II remains inferred.

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

1. Measurement;
2. Current dataset / acquisition context;
3. Analysis controls;
4. Valid-data filter;
5. Results summary;
6. Selected site/pixel;
7. detailed/full metadata.

Family-specific sections may be omitted or renamed when scientifically appropriate. Generic XML Inspector is exempt.

User filtering is always separate from intrinsic support/availability. A filtered finite value is not the same state as an unavailable/undefined value.

## Runtime and reference-data rule

Runtime reads PV-2000 XML only.

Matching CSV/XPS exports are regression evidence. New scientific analyzers or calculated vendor-result paths require at least one real XML plus matching numeric PV-2000 output; XML-only cases can support raw/parsing work or explicitly inferred paths.

Never publish private reference files or proprietary vendor material merely to make a validation test convenient.

## Remaining high-priority scientific gaps

1. Dual QSS: keep the current result-profile gate; extend only when new real pairs explain the conflicting historical FixedPoints branch, or cover Auger correction, alternate source selections, different 1000-mSun placement or another categorical result branch.
2. LBIC: obtain finite direct-plus-scattered DL evidence before widening the coupled calculation profile; retain the existing four-pair private regression gate.
3. JZero: retain `JZERO-CALC-001` for the paired two-iteration lifetime/Smax/Basore path; widen Implied Voc only if a new paired categorical path explains the current ~19–21 mV legacy offsets. CET/geometry profiles still require paired categorical evidence.
4. SPV: extend beyond the standard paired map path only with matching vendor output for enhanced, texture, parsed-signal or other categorical branches.
5. Leakage: extend beyond the paired one-point acquisition path only with matching vendor output.
6. CV, Frequency Scan, Voc/Voc Mapping, Fe/LID, Surface Passivation, Junction Lifetime, Sheet Resistance/Eddy, Height and other known families remain without dedicated analyzers until the real XML + numeric-export gate is met.

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
