# Measurement architecture refactor plan

Status: **Phase A merged in `v20260923.11`; Phase B in progress** on `feat/isc-vcpd-valid-data-filter`.

Phase A introduced domain/quantity/selection/profile/geometry primitives without broad UI behavior changes. Phase B activates the shared selection lifecycle in ISC/VCPD and adds a reusable Valid-data filter controller/UI contract while preserving reconstructed result values and raw XML readings.

## 1. Goal

Restructure PV-2000 Analyzer so measurement parsing, physical models, compatibility behavior, validation state and visualization are explicit layers.

The refactor should make it easier to add newly understood measurement families without duplicating formulas or mixing raw instrument data with analyzer-derived quantities.

The first implementation branch must preserve:

- current numerical outputs;
- current validation labels;
- XML-only runtime behavior;
- current UI behavior;
- current export semantics;
- existing profile boundaries.

No scientific result should change merely because its code moved.

## 2. Why the current module shape is becoming limiting

The current registry contract is intentionally small:

```js
{
  types,
  parse(),
  analyze(),
  render()
}
```

That worked well for early expansion, but the supported families now contain several different kinds of result ownership.

### Raw or stored measurement

Examples:

- Kelvin-probe readings;
- LBIC beam channels;
- XML `Values`;
- stored transient samples.

### Controller/device result

Examples:

- general uPCD lifetime evaluation;
- several sheet-resistance / eddy quantities.

### Corrected measurement

Examples:

- ISC Vcpd offset correction;
- ISC Vsb correction factor;
- signed DIT Vsb construction.

### Analyzer-derived physical result

Examples:

- QSS Smax;
- analyzer SRV;
- physical implied Voc;
- diffusion-length/lifetime conversions.

### Compatibility result

Examples:

- PV-2000-compatible QSS implied Voc;
- DIT compatibility paths;
- JZero compatibility output;
- profile-specific clipping, interpolation and validity rules.

### Analyzer-only optional result

Examples:

- optional DIT PCHIP/midgap analysis;
- Physical Si / Ge QSS estimates.

These distinctions should become explicit metadata instead of being inferred from module-local code and labels.

## 3. Architecture invariants

The refactor must preserve these rules.

1. Runtime remains XML-only.
2. Dispatch still begins from `Measurement/@xsi:type`.
3. Unknown types still fall back to Generic Inspector.
4. Raw XML values are retained exactly where currently retained.
5. Controller sentinels stay distinguishable from missing data and user filtering.
6. Validation stays attached to explicit profile families.
7. Numeric parameter changes do not automatically create new profiles.
8. Filenames, sample names and substrate IDs never determine measurement type, material or compatibility profile.
9. Material selection remains explicit when the XML does not encode it reliably.
10. Private reference material stays outside tracked source.
11. The scientific workspace layout contract remains unchanged.
12. Position/geometry visualizations belong in the right visualization area; controls, metadata, summaries and selected-point details belong in the left sidebar.

## 4. Target data flow

```text
PV-2000 XML
    │
    ▼
XML acquisition parser
    │
    ▼
Normalized measurement
    │
    ├─ identity / environment
    ├─ acquisition settings
    ├─ raw and stored channels
    ├─ geometry
    └─ source metadata
    │
    ▼
Measurement definition
    │
    ├─ family semantics
    ├─ profile resolver
    ├─ available calculations
    └─ result provenance
    │
    ▼
Pure scientific / compatibility calculations
    │
    ▼
Quantity set
    │
    ├─ values
    ├─ unit
    ├─ availability
    ├─ validity reason
    ├─ provenance
    ├─ model/profile identity
    └─ validation status
    │
    ▼
Presentation
    ├─ summary
    ├─ map
    ├─ measurement-position schematic
    ├─ distribution
    ├─ profiles
    ├─ family-specific curves
    └─ CSV export
```

## 5. Normalized measurement envelope

Do not force every family into one giant schema.

Use a small common envelope plus family-specific data.

Conceptually:

```js
{
  type,
  familyId,
  identity: {
    name,
    resultName,
    substrateId
  },
  environment: {
    temperature,
    waferThickness
  },
  geometry,
  acquisition,
  channels,
  settings,
  familyData
}
```

Parsing should extract and normalize structure only.

Scientific calculations should not happen inside XML parsing.

## 5A. XML discovery / Advanced analysis

For every measurement family, inspect the XML beyond the fields reproduced in PV-2000 CSV/UI. Preserve useful stored quantities and unknown numeric channels instead of designing the analyzer only around vendor-visible outputs.

The quantity model distinguishes presentation tier from evidence:

- primary;
- advanced;
- diagnostic.

This allows XML-only information to be useful without implying vendor parity. LBIC already demonstrates the intended behavior.

## 6. First-class quantity model

Introduce a shared quantity object.

Conceptually:

```js
{
  id,
  label,
  unit,
  values,
  provenance,
  availability,
  modelId,
  profileId,
  validation,
  tier,
  evidence
}
```

Recommended provenance vocabulary:

- `raw`
- `stored-controller`
- `corrected`
- `derived-physical`
- `derived-compatibility`
- `analyzer-optional`

This directly represents cases already present in the project.

Examples:

- Dual QSS `TransientInfo@LifeTime` → `raw`
- general uPCD evaluated lifetime → `stored-controller`
- ISC Vcpd Dark → `corrected`
- QSS SRV → `derived-physical`
- QSS PV-2000-compatible Implied Voc → `derived-compatibility`
- DIT Midgap PCHIP → `analyzer-optional`

## 7. Availability and validity

Availability should be separate from user filtering.

Conceptual result state:

```js
{
  available,
  reason,
  rawValue,
  value
}
```

Suggested reason codes:

- `missing-input`
- `controller-sentinel`
- `inactive-channel`
- `non-finite`
- `not-computable`
- `outside-measured-domain`
- `profile-rejected`
- `unsupported-path`

User range filtering should remain a separate mask.

This is important for QSS, where `-1 µs` means unavailable, and for LBIC, where an inactive Current placeholder must not be presented as a measured current.

## 8. Scientific services

Reusable physics and mathematics should live in pure, DOM-free services.

Candidate files:

```text
src/science/
  semiconductor.js
  lifetime.js
  j0.js
  optics.js
  capacitance.js
  diffusion.js
  fitting.js
```

Candidate responsibilities:

### semiconductor.js

- thermal voltage;
- semiconductor space charge;
- material parameter handling;
- physically motivated implied Voc helpers.

### lifetime.js

- Smax;
- SRV;
- steady-state carrier-density relations.

### j0.js

- Kane-Swanson relations;
- Basore-style helpers.

### optics.js

- photon-energy/current conversions;
- reflectivity/EQE/IQE helpers.

### capacitance.js

- dielectric capacitance;
- EOT conversion.

### diffusion.js

- `L = sqrt(D τ)`;
- `τ = L² / D`.

### fitting.js

- linear regression;
- first-order frequency-response fit;
- reusable interpolation primitives.

Every function should take explicit constants/parameters.

Avoid hidden global semiconductor constants.

Example:

```js
qsc({
  vsb,
  doping,
  temperatureK,
  ni,
  epsilonR,
  dopingType
})
```

## 9. Compatibility profiles

Physical models and compatibility profiles should be separate concepts.

A compatibility profile can define:

- constants;
- sign conventions;
- temperature convention;
- discrete point selection;
- clipping;
- blanking;
- interpolation rules;
- accepted Vsb window;
- historical output semantics.

Suggested structure:

```text
src/profiles/
  dit.js
  qss.js
  dual-qss.js
  jzero.js
  isc.js
  vcpd.js
  lbic.js
```

Profile resolution should use categorical semantics only:

- measurement type;
- algorithm mode;
- pattern/geometry type;
- active channel combination;
- result path;
- unit convention;
- schema/data layout.

Do not resolve profiles from sample identity or arbitrary numeric changes.

## 10. Measurement definitions

Extend the registry gradually from a type lookup into a family-definition registry.

Conceptually:

```js
{
  types,
  familyId,
  capabilities,
  rawChannels,
  outputQuantities,
  resolveProfile,
  parse,
  analyze,
  render
}
```

The renderer should be able to discover what quantities are available without knowing their formulas.

## 11. Geometry domain service

Current `src/core/geometry.js` contains useful grid helpers. Extend the concept into a normalized geometry result.

Recommended geometry object:

```js
{
  patternType,
  nominalShape,
  scheduledShape,
  points,
  acquiredMask,
  edgeExclusion,
  acquisitionOrder,
  provenance,
  validationStatus
}
```

Keep these concepts separate:

- nominal sample boundary;
- scheduled measurement boundary;
- actual acquired sites;
- interpolation support.

This prevents errors such as treating a `OnePointPattern` as a spatial heatmap.

Supported families already require:

- OnePointPattern;
- MapPattern;
- SquareRegionPattern;
- HighDensityPattern;
- RoundWafer;
- SquareCell;
- PseudoSquareCell.

## 12. Presentation boundary

Shared plot components should consume quantities and geometry rather than family-specific parser fields.

Target APIs can evolve toward:

```js
renderMap({geometry, quantity, filter})
renderDistribution({quantity, filter})
renderProfiles({geometry, quantity, filter})
renderMeasurementPosition({geometry})
```

Keep family-specific renderers for genuinely unique scientific views:

- DIT Vcpd-Qc;
- DIT Vsb-Qc;
- DIT Dit-Vsb;
- Dual QSS stored transient;
- LBIC selected-pixel channel detail.

### Layout ownership rule

Left sidebar:

- controls;
- metadata;
- summaries;
- selected-point details;
- acquisition settings.

Right visualization area:

- maps;
- measurement-position schematics;
- distributions;
- line profiles;
- scientific curves;
- stored transients.

This rule should become testable.

## 13. Validation metadata

Validation metadata should be available to the analyzer without embedding reference-instance statistics into ordinary runtime output.

Conceptually:

```js
{
  profileId,
  status,
  validatedQuantities,
  geometryStatus
}
```

Allowed status vocabulary remains:

- validated;
- reproduced at shown precision;
- inferred;
- unsupported.

Exact evidence stays in:

- `docs/REFERENCE_PROFILES.md`
- `docs/VALIDATION.md`

## 14. How the accumulated measurement knowledge maps to the new architecture

### DIT

Needs explicit separation of:

- measured dark/light CPD;
- corrected/signed Vsb;
- semiconductor Qsc;
- Standard COCOS compatibility behavior;
- inferred COCOS-II compatibility behavior;
- discrete Minimum Dit;
- optional PCHIP/midgap analysis;
- material model.

This should migrate late because it has the most coupled calculations and UI.

### ISC / VCPD

Best first migration candidate.

ISC naturally demonstrates:

- raw repeated readings;
- offset-corrected Vcpd;
- correction-factor Vsb;
- derived Vcpd Light;
- availability rules;
- map geometry.

VCPD demonstrates a simpler stored/averaged quantity on the same infrastructure.

### QSS-uPCD

Demonstrates result provenance particularly well:

- stored/controller lifetime;
- raw sentinel;
- compatibility Smax;
- compatibility Implied Voc;
- analyzer physical Si/Ge estimate;
- analyzer SRV;
- user validity filter.

### Dual QSS

Needs three clearly different lifetime concepts:

- XML `Values`;
- `TransientInfo@LifeTime`;
- unresolved vendor result-table Lifetime.

The architecture must prevent one from silently replacing another.

### JZero

Should reuse shared lifetime/J0/geometry services after QSS migration.

### LBIC

Needs dynamic channel definitions plus provenance:

- measured Current;
- Direct/Scattered reflection;
- derived Reflectivity;
- calculated EQE/IQE;
- inactive placeholders;
- partial-acquisition geometry.

### CV / CET

The base CV family is primarily acquisition/process state.

CET is a derived-result path that adds:

- linear charge/CPD fit;
- effective capacitance;
- EOT;
- R².

The new architecture should allow a derived family to reuse an acquisition model without duplicating parsing.

### SPV / Diffusion Length

Future support should use shared optical/fitting/diffusion services.

The documented processing chain contains:

- linearity correction;
- penetration-depth correction;
- texture correction;
- reflectivity/oxide correction;
- LED-temperature correction;
- diffusion-length extraction;
- lifetime from diffusion length.

### Fe / LID, Surface Passivation, Junction Lifetime

These should enter as dedicated derived-result definitions using shared lifetime/recombination services.

### Frequency Scan

Should use a reusable first-order response fit:

```text
V(f) = V0 / sqrt(1 + (2πfτ)^2)
```

with interpolation/reporting of selected frequencies and fit quality.

### Voc / Voc Mapping

Voc Mapping is a corrected dark/light mapping path.

Voc itself reconstructs a pseudo-I-V relation and derived Voc/Vmp/FF.

### Leakage

Needs a transient-derived quantity pipeline:

- smoothed CPD;
- corrected-time interpolation;
- VSASS+ / VSASS−;
- LI difference;
- dielectric dV/dt → current-density transform.

### Sheet Resistance / Eddy

These are strong examples of `stored-controller` / passthrough results.

The analyzer should not invent a viewer-side formula when the device result is already stored.

### Height

A simple calibrated transformation is suitable for the shared quantity/provenance model.

## 15. Migration order

Do not migrate all modules in one branch.

### Next implementation branch — Phase A

Branch:

`refactor/measurement-domain-core`

Scope:

1. Add quantity/provenance/availability primitives.
2. Add normalized geometry envelope helpers.
3. Add profile metadata registry without changing profile decisions.
4. Add pure semiconductor/lifetime helpers only where needed by the pilot.
5. Migrate ISC/VCPD internally to the new domain model.
6. Keep the existing ISC/VCPD UI visually unchanged.
7. Preserve every current paired-reference result.
8. Add adapter helpers so untouched modules continue using the current registry contract.

Out of scope for this first branch:

- DIT migration;
- QSS migration;
- LBIC migration;
- new measurement-family support;
- UI redesign;
- formula changes;
- validation-envelope expansion.

### Geometry correction included in Phase A

A DIT NinePointPattern family exposed a coordinate-space bug: XML coefficients near ±0.632 were being displayed as ±0.632 mm on a 100 mm wafer. The shared resolver now treats this pattern as target-relative.

For a 100 mm RoundWafer with 4 mm EdgeExclusion:

```text
scheduled radius = 50 - 4 = 46 mm
x_mm = x_coefficient * 46
```

Thus ±0.632455532 maps to approximately ±29.09 mm. This coordinate interpretation is **inferred** until paired PV-2000 X/Y output is available.

The resolver preserves raw coefficients and forbids unknown coefficient encodings from becoming physical millimetres implicitly.

### Phase A implementation status

Implemented on the current refactor branch:

- quantity/provenance model;
- availability/reason primitives;
- shared site-selection contract (`supportMask / filterMask / activeMask`) with one site index space;
- canonical Pattern/Target geometry resolver with raw coefficients separated from `pointsMm`;
- normalized measurement envelope;
- semantic profile registry;
- normalized geometry envelope;
- backwards-compatible registry metadata;
- ISC-MAP-001 and VCPD-MAP-001 profile definitions;
- ISC/VCPD pilot migration with unchanged renderer/export interfaces;
- domain/profile/provenance regression tests.

Private ISC/VCPD paired validators remain the numerical acceptance gate before merge.

### Phase B

Migrate the established QSS-uPCD Valid-data filter onto the shared selection layer **without changing behavior**. QSS is the reference implementation for filter metric selection, Reset, 1–99%, map masking, Distribution counts, summary statistics, profile masking and export flags.

Then migrate JZero to the same selection layer and remove its duplicate local `validMask / summaryMasked` implementation.

Do not add filter UI to every family in this phase.

After QSS/JZero parity is locked, use a dedicated feature branch to connect suitable families such as ISC/VCPD, LBIC, Dual QSS and site-level DIT to the shared filter capability.

This validates:

- stored-controller provenance;
- sentinel availability;
- physical vs compatibility calculations;
- user filter separation.

### Phase C

Migrate Dual QSS and JZero.

### Phase D

Migrate LBIC.

### Phase E

Migrate DIT last.

### Phase F

Implement currently unsupported families directly on the new architecture.

Recommended order:

1. CV/CET;
2. SPV/Diffusion Length;
3. Frequency Scan;
4. Voc/Voc Mapping;
5. Leakage;
6. Fe/LID;
7. Surface Passivation;
8. Junction Lifetime;
9. Sheet Resistance/Eddy;
10. Height.

## 16. Characterization and regression strategy

Before moving a family, lock its current behavior.

For each migrated family:

1. parse the same XML through old and new paths;
2. compare normalized values;
3. compare all exported quantities;
4. compare availability masks;
5. compare validation/profile labels;
6. run paired private validators where available;
7. run existing browser/layout tests;
8. inspect at least one real representative XML visually.

During migration, a temporary dual-path comparison helper is acceptable in tests.

Do not ship two user-selectable calculation paths merely for the refactor.

## 17. Suggested first-branch file structure

```text
src/core/
  measurement.js
  quantity.js
  validity.js
  geometry.js
  registry.js

src/science/
  semiconductor.js
  lifetime.js

src/profiles/
  isc.js
  vcpd.js

src/modules/
  isc.js
```

Keep the global `PV2000` IIFE/build model for now.

A module-system/bundler migration would add unrelated risk and is not part of this scientific architecture refactor.

## 18. First-branch acceptance criteria

The first implementation branch is complete only when:

- all current tests pass;
- `npm run build` passes;
- private ISC and VCPD validators still pass pointwise;
- ISC/VCPD numerical exports are unchanged;
- existing UI labels and layouts are unchanged;
- Generic Inspector fallback is unchanged;
- registry remains backward-compatible with untouched modules;
- provenance and availability can be inspected in tests;
- no profile status changes;
- no new scientific formula is introduced;
- no private reference file is committed.

## 19. Stop conditions

Stop the refactor and investigate if any migration causes:

- changed numerical output without an explicit scientific reason;
- changed invalid/blank behavior;
- a validated profile becoming inferred;
- a user filter being confused with availability;
- a raw channel being replaced by a derived value;
- a controller result being recomputed without evidence;
- geometry point order changing;
- new filename/sample-name inference;
- UI regressions caused by domain-layer changes.

## 20. Documentation synchronization

During each migration:

- Wiki explains the physics and mathematics;
- `docs/REFERENCE_PROFILES.md` owns validation profile scope;
- `docs/VALIDATION.md` owns numerical evidence;
- `docs/ARCHITECTURE.md` documents the implemented architecture;
- this plan remains the migration roadmap until all current families are moved.

The architecture should support scientific growth without forcing the Wiki to mirror implementation details.
