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
      -> existing analysis objects for families not yet migrated
  -> module.render()
```

The domain layer is being introduced incrementally. ISC/VCPD are the pilot family. DIT, QSS-uPCD, Dual QSS, JZero and LBIC retain their established module interfaces until their own migration phases.

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
- help text.

Current provenance vocabulary:

- `raw`
- `stored-controller`
- `corrected`
- `derived-physical`
- `derived-compatibility`
- `analyzer-optional`

The numerical array remains separate from availability. A missing/unavailable value is not conflated with user filtering.

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

Current migrated profile metadata:

- `ISC-MAP-001`
- `VCPD-MAP-001`

Exact evidence and validation boundaries remain authoritative in `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

### Geometry envelope

`src/core/geometry.js` retains the existing grid-generation helpers and now also exposes a normalized geometry envelope containing:

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

## ISC / VCPD pilot

`src/modules/isc.js` is the first migrated family.

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

Untouched modules continue to register and resolve through the same registry API.

## Source layout

### Core

- `src/core/xml.js` — namespace-tolerant XML helpers and common result metadata.
- `src/core/stats.js` — mean, median, sample standard deviation, histogram.
- `src/core/geometry.js` — grid reconstruction plus normalized geometry envelope.
- `src/core/validity.js` — result availability/reason primitives.
- `src/core/quantity.js` — quantity/provenance/validation model.
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

Additional families should gain profile metadata only when they are migrated and their existing reference envelope is understood.

### Measurement modules

- `src/modules/dit.js` — COCOS/DIT parser, calculations and UI.
- `src/modules/qss-upcd.js` — QSS-uPCD map parser, calculations and UI.
- `src/modules/dual-qss.js` — Dual QSS injection sweep and stored-transient viewer.
- `src/modules/jzero.js` — Emitter J0 map analyzer.
- `src/modules/isc.js` — ISC/VCPD pilot on the domain core.
- `src/modules/lbic.js` — LBIC raster analyzer.
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
