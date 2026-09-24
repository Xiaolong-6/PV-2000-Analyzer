# Cross-profile parity and geometry-decoupling audit — 2026-09-24

## Scope

This audit tests the five newly staged private SolarResults batches against the current Analyzer architecture. Private XML/CSV files remain in `PV-2000-private-reference`; no private measurement material is copied into the public Analyzer repository.

The private harness produced numeric CSV references for 34 of 47 XML files. Five calibration-only failures are intentionally ignored for Analyzer planning. This document focuses on the 30 generated pairs belonging to families that already have dedicated analyzers: DIT, QSS-µPCD, Dual QSS, JZero, ISC, VCPD and LBIC.

Two passes were used:

1. run the existing family validators unchanged, to expose where current profile gates reject the new corpus;
2. rerun the evidence with **scientific calculation parity and geometry parity evaluated separately**.

A generated harness CSV is useful regression evidence but does not outrank a genuine historical XML+CSV pair when vendor-version drift is possible.

## Executive conclusion

**Geometry and scientific algorithms should be decoupled in the validation architecture.**

The shared canonical geometry resolver already understands the relevant coordinate encodings. The main limitation is the profile layer: several current profile IDs and validators combine an algorithm path with one specific Pattern/Target combination, causing a new geometry to be reported as a new scientific profile even when the result equations remain exactly unchanged.

The second pass found:

- 25 complete non-empty geometry cases reproduce vendor X/Y to floating-point precision;
- one incomplete 5-of-49 SquareRegion case reproduces the vendor coordinates as the exact acquisition-prefix schedule;
- ISC calculations remain exact across three different geometry families;
- VCPD calculations remain exact across RoundWafer and PseudoSquareCell;
- JZero lifetime, Smax and Basore J0 remain numerically stable across four geometry families, while Implied Voc has a narrower evidence envelope;
- LBIC exposes both geometry over-coupling and genuinely new channel/result semantics.

Therefore a single atomic “reference profile = algorithm + geometry + all quantities” is too coarse.

## Architecture audit

### What is already correct

`src/core/geometry.js` is the right architectural center. It independently resolves:

- MapPattern target/pitch grids;
- SquareRegionPattern explicit physical regions;
- HighDensityPattern target-relative coefficients;
- NinePointPattern/FivePointPattern target-relative coefficients;
- center OnePointPattern;
- RoundWafer, SquareCell and PseudoSquareCell target envelopes;
- scheduled boundaries and incomplete-prefix metadata.

The resolver also preserves raw coefficients separately from physical `pointsMm`, which is essential.

JZero documentation already states the intended separation: `JZERO-CALC-001` describes the two-iteration scientific path while geometry is a separate concern. The new corpus confirms that this is the correct general architecture.

### Where coupling remains

The current shared profile system exposes one `profile` slot and `PV2000.profiles.resolve(familyId, data)` returns one match. ISC and VCPD profile matchers include Pattern/Target/coordinate-source constraints in that single scientific validation decision.

LBIC's `referenceFamily()` similarly mixes:

- measurement flags/channel semantics;
- beam count;
- unit/FluxCache requirements;
- Pattern/Target geometry.

Dual QSS final-result gating also includes OnePointPattern + RoundWafer together with algorithm-relevant settings such as Back/Back source selection.

These gates are conservative, but the new evidence shows that they create false “NEW PROFILE” classifications when only geometry changes.

### Target model

Validation should have three independent axes:

```text
measurement
├── calculation profile
│   ├── raw/result schema
│   ├── correction/model branch
│   ├── unit convention
│   └── algorithm-relevant settings
├── geometry profile
│   ├── Pattern/Target encoding
│   ├── site order
│   ├── physical coordinates
│   ├── nominal/scheduled boundary
│   └── incomplete-acquisition semantics
└── quantity validation
    ├── lifetime
    ├── Smax
    ├── Voc
    ├── J0
    └── ...
```

The normalized domain model should gain separate calculation/geometry metadata. Existing `Quantity.profileId` and validation metadata should remain the authority for quantity-specific evidence.

Do not encode every algorithm × geometry combination as a new profile ID. Resolve the two axes independently and combine them at runtime through the shared immutable site index.

## Family findings

### ISC

Three non-empty new geometries were independently checked:

| Geometry | Points | X/Y parity | Vcpd Dark / Light / Vsb parity |
|---|---:|---:|---:|
| HighDensity + RoundWafer | 145 | ~4e-14 mm max | ~4e-15 V max |
| SquareRegion + SquareCell | 25 | exact | ~7e-16 V max |
| Map + RoundWafer | 437 | exact | ~3e-16 V max |

The equations `Vcpd Dark = mean(Dark)-offset`, `Vsb = factor*(mean(Dark)-mean(Light))`, and `Vcpd Light = Vcpd Dark-Vsb` are therefore supported independently of these geometry choices.

**Action:** replace the geometry-bound `ISC-MAP-001` concept with an ISC calculation profile plus independent geometry evidence.

### VCPD

Both tested geometries reproduce `mean(Readings)` Vcpd Dark exactly:

- Map + RoundWafer, 1069 points;
- Map + PseudoSquareCell, 2905 points.

Both coordinate sets are exact.

**Action:** create a geometry-independent VCPD calculation profile and validate the two geometry profiles separately.

### JZero

Four complete geometries were tested:

- Map + PseudoSquareCell;
- HighDensity + RoundWafer;
- SquareRegion + SquareCell;
- NinePoint + SquareCell.

Across all four, both stored lifetime channels, Smax and Basore J0 reproduce to floating-point precision. This confirms that `JZERO-CALC-001` is substantially geometry-independent.

Implied Voc is different: the new historical references show about 0.35–0.56 mV error for one map and about 19–20 mV for the other three cases. This is too large to inherit the same validation claim.

**Action:** preserve calculation/geometry separation and move Implied Voc to a narrower quantity-level compatibility profile until the historical dependency is identified.

### LBIC

Four Map + SquareCell references expose three result/channel paths:

1. **current only** — Current reproduces exactly;
2. **current + scattered reflectance** — vendor Reflectivity equals ScatteredReflection alone; IQE reconstructed from Current and that reflectivity reproduces to ~1e-13;
3. **current + direct + scattered reflectance** — vendor Reflectivity remains Direct + Scattered; IQE reproduces to ~1e-13.

Coordinates are exact in all four.

This is partly a geometry issue and partly a real algorithm/channel issue. The runtime currently synthesizes Reflectivity only when both direct and scattered channels are present, so the scattered-only paired path is a concrete functionality gap.

**Action:** separate LBIC geometry from channel/result profiles, then implement current-only and scattered-only semantics under paired tests. Keep calculated diffusion length unsupported until its transformation is independently reproduced.

### QSS-µPCD

The new complete geometry cases validate:

- HighDensity + SquareCell;
- OnePoint + SquareCell;
- multiple SquareRegion + SquareCell dimensions;
- Map + RoundWafer.

Coordinates reproduce to floating-point precision. One incomplete SquareRegion acquisition has 5 acquired sites out of a 49-site schedule; its five vendor coordinates are exactly the schedule prefix.

For complete non-HighDensity cases, lifetime and Smax remain strongly consistent with vendor output. The historical Implied-Voc compatibility spread is broader than the current headline corpus, and the HighDensity case needs a sentinel-aware rerun because a naïve finite-value comparison is not meaningful there.

**Action:** promote geometry independently, add an acquisition-status gate for incomplete prefix validation, rerun HighDensity with the scientific/raw sentinel distinction, and keep Implied Voc quantity-scoped.

### DIT

OnePoint and FivePoint geometry reconstruction is independently confirmed. Regenerated historical exports show corrected-light/version drift and N-type differences that are not consistent enough to replace the stronger original historical-pair evidence.

**Action:** do not change the current doping-aware Standard COCOS Vsb convention from these generated references. Investigate the corrected-light branch and vendor-version boundary separately.

### Dual QSS

The new corpus includes SquareRegion/RoundWafer and OnePoint/SquareCell cases that are rejected by the current geometry-bound result gates. The available generated outputs are not yet sufficient to claim that the full final-result calculation profile generalizes across those cases.

**Action:** split the architecture first, then run a dedicated algorithm-only parity pass based on probe/bias, Auger, J0-request, injection placement and other genuinely calculation-relevant settings. Relax geometry gates only after that passes.

## Implementation plan

### P0 — validation architecture

1. Extend the normalized measurement/domain envelope with independent `calculationProfile` and `geometryProfile` metadata, or an equivalent `validation.calculation / validation.geometry` structure.
2. Keep per-Quantity profile/validation metadata as the final authority for individual outputs.
3. Extend the profile registry so calculation matching cannot silently depend on Pattern/Target unless geometry truly changes the formula.
4. Make private validators print separate **CALC / GEOM / QUANTITY** outcomes.
5. Add tests that a newly supported geometry cannot change site ordering or scientific values for an unchanged calculation profile.

### P1 — ISC/VCPD/JZero

Use the strongest new evidence first:

- migrate ISC to one calculation profile plus the validated geometry profiles;
- migrate VCPD the same way;
- formalize JZero's existing calc/geometry split and add the newly paired geometries;
- keep JZero Implied Voc separately constrained.

No formula change is required for ISC/VCPD. JZero formula changes are explicitly out of scope until the Voc discrepancy is understood.

### P2 — LBIC

1. separate channel/result semantics from geometry;
2. add Map + SquareCell geometry evidence;
3. add current-only output path;
4. add current + scattered-reflectance path;
5. preserve Direct + Scattered behavior when both channels are active;
6. regress Current, Reflectivity, IQE, summaries and blanking pointwise.

Calculated DL remains unsupported.

### P3 — QSS-µPCD

1. add independent geometry profiles for the newly paired coordinate encodings;
2. make incomplete SquareRegion prefix validity conditional on acquisition status;
3. run a sentinel-aware HighDensity lifetime/Smax validator;
4. keep Implied Voc as a separately version/profile-sensitive quantity;
5. retain raw/non-positive lifetime semantics exactly as currently documented.

### P4 — DIT

Compare the regenerated historical cases against original paired references and known vendor-version behavior. Resolve corrected-light/N-type drift before changing any Standard COCOS calculation. Geometry evidence may be promoted independently.

### P5 — Dual QSS

Remove Pattern/Target from the final-result calculation identity only after alternate-geometry pairs pass the full numeric result reconstruction. Algorithm-relevant settings remain legitimate calculation-profile gates.

### P6 — new measurement families

Completed on the validation-decoupling branch:

1. **LeakageMeasurement** — dedicated analyzer added. Two real XML+CSV pairs reproduce VSASS+/VSASS-/LI through the recovered natural-cubic extraction path to floating-point precision. The positive-only availability branch is covered.
2. **SPVMeasurement** — dedicated paired-map analyzer added for DL, Tau, SPV8 and SPV6. Two 1649-site 4 mm RoundWafer pairs reproduce DL/Tau at ~1e-11 absolute scale and preserve the vendor `Ud.` mask exactly.
3. **IntensityScanMeasurement** — remains deferred. The vendor class exposes raw acquisition data but no independent `CreateDataValues()` scientific-result path, and both attempted harness exports fail at that missing method.

Calculation and geometry validation remain separate for both new analyzers. Additional SPV modes and broader Leakage acquisition/geometry paths require new paired evidence before profile expansion.

Calibration measurements remain outside this roadmap unless there is a separate need to inspect them without hardware.

## P6 self-audit result

- P0–P5 calculation/geometry/quantity separation remains intact after adding the two new families.
- Leakage uses a calculation profile independent from the validated target-relative one-point geometry profile.
- SPV uses a calculation profile independent from the shared RoundWafer map geometry profile.
- SPV default filtering is based on a raw SPV channel so quantity-specific DL/Tau `Ud.` sites do not erase otherwise valid raw-channel sites.
- Parsed-signal and enhanced-mode SPV DL are deliberately unavailable rather than silently applying the standard scalar formula outside its paired evidence envelope.
- IntensityScan remains a raw/fallback case; no unsupported derived scientific output was invented.
## Acceptance criteria for the refactor

The refactor is complete when:

- a family can report a validated calculation with a separately inferred geometry, or vice versa;
- a quantity can remain inferred while sibling quantities are validated;
- no family needs a Cartesian profile ID solely because the same algorithm appears on another validated Pattern/Target;
- every supported geometry preserves one shared site index across raw values, quantities, filters, maps and exports;
- existing validated pairs remain numerically unchanged;
- new private cross-profile validators pass without treating geometry-only variation as scientific-algorithm failure.
