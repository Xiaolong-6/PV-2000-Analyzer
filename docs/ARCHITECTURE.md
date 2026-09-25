# Architecture

## Runtime pipeline

The analyzer remains XML-only at runtime.

```text
Open XML
  -> DOM parse
  -> read Measurement/@xsi:type
  -> measurement registry
      -> measurement module
      -> unknown -> Generic Inspector
  -> module.parse()
      -> family parser
      -> normalized measurement envelope when the family has migrated
      -> semantic reference-profile resolution
  -> module.analyze()
      -> Quantity objects for migrated families
      -> family-specific analysis objects where a normalized Quantity layer is not used
  -> module.render()
```

The shared domain layer is established across the dedicated analyzers. ISC/VCPD, CET, SPV and Leakage attach normalized measurement envelopes directly; QSS-uPCD, JZero, LBIC, DIT and Dual QSS also use the shared calculation/geometry profile and/or selection/geometry services while retaining family-specific parser/analyzer interfaces.

A PV-2000 CSV/XPS export is never a runtime input.

## Domain core

### Quantity

`src/core/quantity.js` represents a scientific/result quantity independently from its visualization.

A Quantity includes:

- stable id and presentation key;
- label and unit;
- values;
- provenance;
- per-value availability state;
- model id;
- profile id;
- validation status;
- presentation tier (`primary` / `advanced` / `diagnostic`);
- optional evidence metadata;
- help text.

Current provenance vocabulary:

- `raw`
- `stored-controller`
- `corrected`
- `derived-physical`
- `derived-compatibility`
- `analyzer-optional`

The numerical array remains separate from availability. A missing/unavailable value is not conflated with user filtering.

### XML discovery and Advanced analysis

PV-2000 UI panels and CSV/XPS exports are evidence surfaces, not the complete information model. Runtime parsing should inventory useful XML-stored quantities even when the legacy UI/export does not expose them.

Each quantity can carry a presentation tier independent of provenance and validation:

- `primary` — normal user-facing result;
- `advanced` — useful stored/intermediate/derived information that should not dominate the default view;
- `diagnostic` — audit/development information with limited user-facing interpretation.

A quantity may therefore be, for example, `raw + advanced + inferred`.

Rules:

1. preserve semantically meaningful XML-stored fields even when absent from vendor CSV/UI;
2. unknown numeric XML channels should remain discoverable under their XML names rather than being silently discarded;
3. absence from vendor export does not make a stored XML quantity invalid;
4. absence from vendor export also does not make that quantity a vendor result;
5. advanced derived quantities require explicit formula/provenance and an evidence status;
6. default UI remains concise; Advanced analysis is the opt-in surface for additional XML/stored/intermediate results.

LBIC is the current reference implementation: active raw Direct/Scattered channels and inferred EQE can live under Advanced while Reflectivity/Current/IQE remain primary according to the validated family.

### Availability

`src/core/validity.js` defines reusable availability state and reason codes.

Current reason codes include:

- missing input;
- controller sentinel;
- inactive channel;
- non-finite;
- not computable;
- outside measured domain;
- profile rejected;
- unsupported path.

User-selected valid-data filtering is a separate concern and is not encoded as intrinsic availability.

### Site selection

`src/core/selection.js` defines the shared site-selection lifecycle for map-like measurements.

```js
selection = {
  siteCount,
  intrinsicMask,
  supportMask,
  filterMask,
  activeMask,
  filter: {
    metricKey,
    lower,
    upper
  }
}
```

The masks have distinct meanings:

- `intrinsicMask` — family/site support independent of the selected metric;
- `supportMask` — intrinsic support plus the selected filter metric's Quantity availability;
- `filterMask` — only the user's lower/upper numeric range;
- `activeMask` — `supportMask && filterMask`.

When a different quantity is rendered, `maskForMetric(selection, quantity)` also applies that quantity's own availability. This prevents a filter metric from making an unrelated unavailable derived result appear valid.

All site-aligned arrays share one immutable site index space. Coordinates, Quantity values, availability states and masks must have equal length and refer to the same site index. A renderer must not independently reorder or filter one array.

The selection layer also owns reset-range and percentile helpers. Valid-data UI controls consume this model; they do not define intrinsic validity themselves.

QSS-uPCD remains the behavioral reference for Valid-data filtering semantics. QSS, JZero, ISC/VCPD, LBIC, DIT, CET and SPV use the shared site-selection/filter contract where applicable; family-specific intrinsic validity and quantity availability remain separate from user filtering.

### Normalized measurement

`src/core/measurement.js` creates a small common envelope:

```js
{
  schemaVersion,          // currently 2
  source,
  type,
  familyId,
  identity,
  environment,
  geometry,
  acquisition,
  channels,
  settings,
  familyData,
  profile,                // compatibility alias of calculationProfile
  calculationProfile,
  geometryProfile,
  validation: {
    calculation,
    geometry
  }
}
```

Family-specific parsed data remains available beside this envelope. The common model is intentionally small and does not force unrelated measurements into one giant schema.

### Reference profiles

`src/core/profiles.js` stores semantic compatibility/validation profile metadata.

Profile matching uses categorical measurement semantics such as:

- measurement type/family;
- pattern and target type;
- iteration/raw-data structure;
- active result path;
- correction/unit convention.

It must not use filenames, sample names or arbitrary numeric identity values.

The shared registry now stores profiles on explicit axes. Current examples include calculation profiles such as `ISC-CALC-001`, `VCPD-CALC-001`, `CET-CALC-001`, `SPV-CALC-STANDARD-001`, `SPV-CALC-ENHANCED-N-003` and `LEAKAGE-CALC-VSASS-001`, plus independent geometry profiles in `src/profiles/geometry.js`.

Exact IDs, matching semantics and evidence boundaries remain authoritative in `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

### Validation-axis separation

A cross-profile audit of the private 2026-09-24 corpus established that scientific calculation semantics and spatial geometry must be validated as independent axes. This is now implemented in the shared domain/profile layer.

A normalized measurement can carry:

- a **calculation profile** — parser/result semantics, correction rules, unit conventions and algorithm branches that determine scientific values;
- a **geometry profile** — Pattern/Target coordinate encoding, site ordering, nominal/scheduled boundaries and incomplete-acquisition mapping;
- **quantity-level validation** — evidence status carried by each Quantity when sibling outputs have different evidence envelopes.

`src/core/profiles.js` resolves profiles by axis through `resolveCalculation()` and `resolveGeometry()`. The legacy `profile` field remains only as a compatibility alias for the calculation profile; new code should use the explicit fields.

The practical rule is:

1. resolve raw/result semantics without using geometry as a surrogate for algorithm identity;
2. resolve canonical physical geometry independently;
3. verify that both share the same immutable site index space;
4. attach quantity validation independently when one output has a narrower evidence envelope;
5. render supported data even when a particular calculated quantity remains inferred or unavailable.

Profile gates must describe **categorical semantic branches**, not filenames, sample identities or ordinary numeric parameter values. For example, changing SPV wavelength or oxide-thickness magnitude inside the same standard oxide-correction formula does not create a new calculation profile; switching between standard and Enhanced SPV, enabling texture correction, parsed-signal processing, an unpaired doping branch, or changing the reflectivity-vs-oxide categorical path can.

### Canonical measurement geometry

`src/core/geometry.js` owns Pattern/Target-to-physical-coordinate interpretation for migrated coordinate paths. Raw XML coefficients are preserved separately from physical millimetre coordinates. CET extends the same contract to `FixedPointsPattern/PointValues`: those explicit point values are treated as absolute millimetre coordinates, while fixed 5/9-point `Coefficients` remain target-relative and are scaled by the scheduled target extent. HighDensity/PseudoSquare coordinates are first scaled to the scheduled target and circularly clipped, then physical-mm target exclusion polygons are applied in XML order.

The geometry resolver returns:

- `rawCoefficients` — XML coefficients exactly as parsed;
- `exclusionPolygons` — stored target polygons in physical millimetres when present;
- `pointsMm` — canonical physical site coordinates in millimetres when the coordinate strategy is known;
- nominal sample boundary;
- scheduled measurement boundary after EdgeExclusion;
- source coordinate space;
- interpretation strategy;
- acquisition order;
- evidence/validation status.

Known target-relative coefficient paths are converted centrally. Unknown coefficient encodings remain unresolved rather than being silently treated as millimetres.

Current shared strategies include:

- MapPattern target/pitch grids;
- SquareRegionPattern explicit physical regions;
- HighDensityPattern normalized target coefficients;
- NinePointPattern / FivePointPattern normalized target coefficients;
- center OnePointPattern;
- target-relative non-center OnePointPattern coefficients when a scheduled target extent is available.

For RoundWafer target-relative patterns, normalized coefficients scale by the scheduled radius `Diameter/2 - EdgeExclusion`. For SquareCell they scale by the EdgeExclusion-adjusted half-width and half-height.

The existing grid helpers remain available, and the normalized geometry envelope contains:

- pattern type;
- target type;
- nominal shape/boundary;
- scheduled boundary;
- point coordinates;
- EdgeExclusion;
- acquisition-order description;
- geometry provenance;
- validation status.

Nominal sample shape, scheduled measurement boundary and actual acquired points stay distinct.

## Migrated domain families

The normalized domain/profile architecture is now the common evidence model across the dedicated analyzers. Families do not need identical internal renderers, but calculation, geometry and quantity evidence must be expressible independently.

SPV and Leakage were added directly on this architecture:

- SPV keeps raw SPV8/SPV6 available independently of DL/Tau availability and uses the shared Valid-data filter/map/distribution contract;
- Leakage separates the paired VSASS/LI calculation profile from the independently validated target-relative OnePoint geometry path.

Existing families retain their family-specific scientific views while using the shared evidence/geometry/selection services where applicable. The migration goal is semantic consistency, not forced source-code uniformity.

## Source layout

### Core

- `src/core/xml.js` — namespace-tolerant XML helpers and common result metadata.
- `src/core/stats.js` — mean, median, sample standard deviation, histogram.
- `src/core/geometry.js` — grid reconstruction plus normalized geometry envelope.
- `src/core/validity.js` — result availability/reason primitives.
- `src/core/quantity.js` — quantity/provenance/validation model.
- `src/core/selection.js` — intrinsic support, user range selection and active-mask lifecycle.
- `src/core/measurement.js` — normalized measurement envelope.
- `src/core/profiles.js` — semantic reference-profile registry.
- `src/core/export.js` — CSV download.
- `src/core/theme.js` — theme handling.
- `src/core/ui.js` — shared UI helpers.
- `src/core/plot.js` — shared plot interactions.
- `src/core/registry.js` — measurement-module registry and module metadata.

### Profiles

- `src/profiles/isc.js` — ISC-CALC-001 calculation envelope, independent of shared geometry profiles.
- `src/profiles/vcpd.js` — VCPD-CALC-001 calculation envelope, independent of shared geometry profiles.
- `src/profiles/cet.js` — CET-9PT-SQUARE-001 semantic envelope.
- `src/profiles/geometry.js` — shared geometry-profile registry for validated coordinate encodings.
- `src/profiles/leakage.js` — paired Leakage VSASS/LI calculation profile.
- `src/profiles/spv.js` — paired standard P-type and Enhanced N-type SPV calculation profiles.

Additional families should gain shared profile metadata only when their reference envelope is understood. Ordinary numeric parameter variation inside an established formula is not a reason to mint a new profile.

### Measurement modules

- `src/modules/dit.js` — COCOS/DIT parser, calculations and UI.
- `src/modules/qss-upcd.js` — QSS-uPCD map parser, calculations and UI.
- `src/modules/dual-qss.js` — Dual QSS injection sweep and stored-transient viewer.
- `src/modules/jzero.js` — Emitter J0 map analyzer.
- `src/modules/isc.js` — ISC/VCPD analyzer on the shared domain core.
- `src/modules/lbic.js` — LBIC raster analyzer.
- `src/modules/cet.js` — contactless capacitance / EOT analyzer.
- `src/modules/leakage.js` — Leakage VSASS / LI analyzer.
- `src/modules/spv.js` — two-wavelength SPV / diffusion-length analyzer with standard and finite-wafer/back-surface Enhanced calculation paths.
- `src/modules/generic.js` — unknown-type fallback.
- `src/app.js` — file opening, dispatch and shared shell.

## Registry contract

Existing modules remain valid:

```js
{
  types: ['SomeMeasurementType'],
  parse(parsedXml) {},
  analyze(data) {},
  render(host, data, analysis, appContext) {}
}
```

Migrated modules may also expose metadata:

```js
{
  familyId,
  capabilities,
  types,
  parse,
  analyze,
  render
}
```

`PV2000.registry.describe(type)` exposes this metadata without changing `resolve(type)`.

## Build model

Source remains modular. `scripts/build.js` concatenates the explicit source list into the single-file browser release.

Domain-core files load before profile definitions, and profile definitions load before the family modules that consume them.

No npm runtime dependency is introduced by the refactor.

## UI layout contract

The domain refactor does not redesign the scientific workspace.

Left sidebar follows one information hierarchy across dedicated analyzers:

1. **Measurement** — result identity, recipe/substrate/status and the minimum geometry/context needed to understand the dataset;
2. **Analysis controls / View** — only when the analyzer has user-controlled interpretation or channel/view state;
3. **Valid-data filter** — when the family supports site-level filtering;
4. **Results summary** — aggregate calculated/measured quantities;
5. **Selected site / pixel / injection point** — only when point selection is meaningful;
6. **Current dataset / audit** — compact completeness/support counts when they add information beyond the summary;
7. **Detailed acquisition / validation / provenance metadata** — collapsed by default unless it is essential to operate the analyzer.

A family may omit inapplicable layers, but should not reorder the remaining layers without a measurement-specific reason. Scientific controls must not be mixed into XML metadata. Generic XML Inspector is a fallback, not a dedicated analyzer, and is exempt from this sidebar hierarchy.

Right visualization area:

- maps;
- measurement-position schematics;
- distributions;
- line profiles;
- scientific curves;
- stored transients.

In multi-column layouts the sidebar remains independently scrollable beneath the toolbar. Plot axis controls remain compact header popovers immediately before Export. Shared wheel zoom and double-click Auto behavior remain unchanged.

## Migration rule

Move one family at a time and preserve its current outputs before reusing the new domain services elsewhere.

For every migrated family:

1. preserve raw/stored inputs;
2. preserve numerical outputs;
3. preserve availability/blanking behavior;
4. preserve geometry point order;
5. attach explicit provenance/profile metadata;
6. run existing unit/build tests;
7. run paired private validators where available;
8. keep the established UI contract.

Scientific formula changes belong in separate, evidence-backed work. Architectural movement alone must not change a result.


## Scientific workspace UI contract

Dedicated analyzers use semantic workspace columns rather than module-specific placement.

On wide desktop layouts:

- **left — dataset / analysis state:** Measurement identity, current dataset/acquisition context, Analysis controls, Valid-data filter, Results summary and collapsed provenance/full metadata;
- **middle — population / whole-sample overview:** Map or measurement-position overview, Distribution and other dataset-level spatial/statistical views;
- **right — point / local detail:** Selected site, Selected pixel or Measurement point plus raw readings, transients, acquisition profiles, point-specific fits/curves and local line profiles.

Selected-site/pixel detail does not belong in the left sidebar. A true one-point family should use **Measurement point** instead of implying a selection action.

At medium widths (<=1200 CSS px), the left dataset sidebar remains dedicated while the overview/detail regions stack into the second column. Narrow/mobile layouts collapse to one column in semantic order. Fine-pointer portrait desktop layouts must not be forced into the mobile layout solely by orientation.

Where Map, Distribution and local profiles are alternate views of one site-level Quantity, they share one active displayed quantity with the Valid-data filter by default. Changing either the chart quantity selector or Filter metric updates the other. Diagnostic plots whose scientific meaning is fixed (for example raw acquisition readings or a current-site fit) are not relabelled as alternate result quantities. The selection core retains independent cross-metric masking capability for a future explicit advanced mode.

Family-specific sections may be omitted or renamed when scientifically appropriate. A family must not invent a fake Distribution or heat map merely to fill a column. Generic XML Inspector is exempt.

User filtering is always separate from intrinsic support/availability. A filtered finite value is not the same state as an unavailable/undefined value.
