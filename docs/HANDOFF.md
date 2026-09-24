# Agent handoff — 2026-09-24

## Current baseline

- Main before this documentation audit: `v20260924.1`.
- Documentation/Wiki audit branch: `docs/main-wiki-audit-20260924`.
- Audit target version: `v20260924.2`.
- Runtime behavior and scientific calculations are intentionally unchanged by this audit.

## Dedicated analyzers on main

- `DITMeasurement` — Dit / COCOS.
- `QssUpcdMeasurement` — QSS-µPCD map.
- `DualQssMeasurement` — QSS injection sweep.
- `JZeroMeasurement` — Emitter J0 map.
- `ISCMeasurement` — Initial Surface Charge.
- `VcpdMeasurement` — VCPD, dispatched by the shared Kelvin-probe module.
- `CETMeasurement` — contactless EOT / capacitance.
- `LBICMeasurement` — LBIC raster.
- Unknown types — Generic XML Inspector fallback only.

The landing page intentionally separates dedicated analyzers, the Generic Inspector fallback and the project-level PV-2000 v1.3.0.5 validation boundary.

## Current result/evidence highlights

### Dual QSS

The canonical raw lifetime remains `TransientInfo@LifeTime`, with XML `Values` kept as a distinct stored vector/fallback. The expanded private raw corpus contains 273 exact XML/CSV pairs and 5833 injection points.

`QSS-INJ-RESULT-001` adds a narrow paired numeric result path: vendor `teff.d (1 Sun)` is reproduced exactly from XML `Values` for the observed exact-1000 mSun case and the observed below-target endpoint case. Browser runtime still does not expose teff.SS / teff.SS Max, implied Voc or J0 as vendor-compatible derived results.

### JZero

The complete two-intensity pseudo-square reference validates paired lifetime channels, Smax, Basore J0 and geometry; JZero implied Voc uses its documented compatibility calibration. Resolver-supported SquareRegion and explicitly incomplete acquisitions are runtime-supported with profile-scoped/inferred geometry where vendor coordinate evidence is absent.

### ISC / VCPD

ISC validates repeated dark/light reading reconstruction to Vcpd Dark, Vcpd Light and VSB on its paired map profile. VCPD is a separate validated result profile with direct Vcpd Dark. Explicitly terminated prefix geometry can render as inferred without widening the complete-map vendor profile.

### CET

`CET-9PT-SQUARE-001` validates NinePointPattern + SquareCell coordinates, EOT, Cd, R², summary statistics and the historical undefined EOT/Cd + R²=0 behavior.

### LBIC

Current validated families are:

- `LBIC-SINGLE-001` — current-enabled single-beam SquareRegionPattern;
- `LBIC-MULTI-002` — independent current-enabled multi-beam MapPattern + PseudoSquareCell;
- `LBIC-REFLECTANCE-003` — reflectance-only SquareRegionPattern with inactive zero Current placeholders.

Calculated diffusion length remains unsupported.

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

1. Dual QSS: reproduce teff.SS / teff.SS Max from XML on additional paired result cases before exposing the dependent vendor-compatible Δn/Voc/J0 paths.
2. LBIC: establish calculated diffusion-length behavior from matching real output before implementing DL.
3. Expand JZero/CET/geometry profiles only when a categorical new path is exercised by paired vendor output.
4. CV and the other known families remain without dedicated analyzers until real XML + numeric reference pairs support implementation.

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
npm run validate:jzero
npm run validate:isc
npm run validate:vcpd
npm run validate:lbic
npm run validate:cet
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
