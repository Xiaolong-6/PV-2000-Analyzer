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

The shared domain layer is now established and used directly by ISC/VCPD and CET. QSS-uPCD, JZero, LBIC and DIT also reuse shared selection/geometry services where migrated while retaining their family-specific parser/analyzer interfaces; Dual QSS retains its dedicated injection-sweep model.

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

QSS-uPCD remains the behavioral reference for Valid-data filtering semantics. QSS, JZero, ISC/VCPD, LBIC, DIT and CET now use the shared site-selection/filter contract where applicable; family-specific intrinsic validity and quantity availability remain separate from user filtering.

### Normalized measurement

`src/core/measurement.js` creates a small common envelope:

```js
{
  schemaVersion,
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
  profile
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

Current profile metadata registered in the shared profile layer includes:

- `ISC-MAP-001`
- `VCPD-MAP-001`
- `CET-9PT-SQUARE-001`

Exact evidence and validation boundaries remain authoritative in `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

### Canonical measurement geometry

`src/core/geometry.js` owns Pattern/Target-to-physical-coordinate interpretation for migrated coordinate paths. Raw XML coefficients are preserved separately from physical millimetre coordinates. CET extends the same contract to `FixedPointsPattern/PointValues`: those explicit point values are treated as absolute millimetre coordinates, while fixed 5/9-point `Coefficients` remain target-relative and are scaled by the scheduled target extent.

The geometry resolver returns:

- `rawCoefficients` — XML coefficients exactly as parsed;
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
- center OnePointPattern.

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

`src/modules/isc.js` was the first migrated family; `src/modules/cet.js` was implemented directly on the shared domain architecture.

The parser still exposes the same fields used by the established UI and exports, and additionally attaches:

- `domain` — normalized measurement envelope;
- `geometryModel` — normalized geometry;
- `profile` — semantic reference-profile id/status.

The analyzer now constructs Quantity objects while retaining the existing `metrics.dark/light/vsb` shape expected by the renderer.

This allows provenance and validation metadata to become explicit without changing:

- numerical result arrays;
- summary statistics;
- maps;
- distributions;
- raw-reading plots;
- exports;
- UI labels/layout.

Other modules continue to register and resolve through the same registry API even when only selected shared services have been adopted.

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

- `src/profiles/isc.js` — ISC-MAP-001 semantic envelope.
- `src/profiles/vcpd.js` — VCPD-MAP-001 semantic envelope.
- `src/profiles/cet.js` — CET-9PT-SQUARE-001 semantic envelope.

Additional families should gain shared profile metadata only when their reference envelope is understood.

### Measurement modules

- `src/modules/dit.js` — COCOS/DIT parser, calculations and UI.
- `src/modules/qss-upcd.js` — QSS-uPCD map parser, calculations and UI.
- `src/modules/dual-qss.js` — Dual QSS injection sweep and stored-transient viewer.
- `src/modules/jzero.js` — Emitter J0 map analyzer.
- `src/modules/isc.js` — ISC/VCPD analyzer on the shared domain core.
- `src/modules/lbic.js` — LBIC raster analyzer.
- `src/modules/cet.js` — contactless capacitance / EOT analyzer.
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
