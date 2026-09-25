# Measurement architecture roadmap

## Current status

The measurement-domain architecture is in production on main.

Completed foundations:

- normalized measurement/provenance envelope;
- quantity/availability primitives;
- semantic validation-profile registry;
- canonical geometry service;
- shared site-selection / Valid-data filter controller;
- shared UI/plot/export helpers where applicable.

Current family integration:

| Family | Architecture state |
|---|---|
| ISC / VCPD | domain-model pilot; shared geometry/selection/profile contracts |
| CET | implemented directly on the domain architecture |
| QSS-µPCD | shared selection and geometry integrated; family-specific parser/analyzer retained |
| JZero | shared selection and geometry integrated; family-specific calculation retained |
| LBIC | shared selection/geometry helpers integrated where applicable; dynamic channel model retained |
| DIT | shared selection/geometry integrated; tightly coupled COCOS calculation remains family-specific |
| Dual QSS | dedicated injection-sweep model; shared geometry context where applicable |
| Generic Inspector | fallback; intentionally exempt from scientific-analyzer uniformity |

The roadmap is no longer a sequence of old branch phases. Remaining work should be driven by concrete duplication or a new validated measurement family.

## Architecture invariants

### Provenance

Every displayed quantity should be identifiable as one of:

- raw/stored measurement;
- controller/device result;
- corrected measurement;
- analyzer-derived physical result;
- compatibility result;
- Analyzer-only optional result.

Do not silently replace a stored/controller result with a new viewer calculation.

### Availability and filtering

Intrinsic scientific/support validity and user filtering are separate masks.

A user filter may narrow supported sites. It must not make an intrinsically unavailable value valid, and it must not feed back into the scientific calculation unless a family explicitly defines such behavior.

### Geometry

Keep distinct:

- nominal target boundary;
- scheduled measurement boundary;
- canonical point coordinates/acquisition order;
- actual acquired sites;
- interpolation support.

Raw pattern coefficients are not physical millimetres unless their encoding is established.

### Profiles

Validation profiles are semantic input→output paths, resolved from categorical behavior such as:

- XML measurement type/schema;
- algorithm mode;
- geometry encoding;
- active channel combination;
- result path;
- unit convention;
- blanking/availability rule.

Do not create profile logic from filenames, sample identities or arbitrary numeric settings.

## Family definition direction

The registry already exposes `familyId`, `capabilities` and `types`. Future work may continue toward richer declarative family metadata when it removes real duplication:

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

This is a direction, not a requirement to rewrite stable family-specific renderers.

Unique views such as DIT Vcpd/Vsb/Dit curves, Dual QSS transients and LBIC pixel/channel detail should remain family-specific.

## Shared scientific services

Extract a shared pure scientific helper only when at least two real analyzer paths need the same definition and the constants/provenance can remain explicit.

Candidate domains include:

- semiconductor charge/material parameters;
- lifetime/Smax/SRV;
- J0;
- optical photon/current conversions;
- capacitance/EOT;
- diffusion-length/lifetime;
- reusable fitting/interpolation primitives.

Avoid hidden global scientific constants.

## Remaining migration opportunities

### QSS / JZero

Share additional lifetime/J0 helpers only if regression proves no change to current compatibility paths. JZero-specific implied-Voc compatibility must not be collapsed into the general QSS model merely for code reuse.

### DIT

DIT has the most coupled calculation and UI path. Further extraction should be incremental and regression-led. Standard COCOS, the current-DLL COCOS-II compatibility result path, Analyzer material models, Minimum Dit and optional Midgap PCHIP must remain separable concepts.

### LBIC

Dynamic channel definitions and measurement flags are essential. Shared optics helpers are useful only if they preserve active/inactive channel semantics, raw versus derived reflectivity and profile-specific IQE availability.

### Dual QSS

The architecture must preserve three distinct lifetime concepts: XML `Values`, `TransientInfo@LifeTime`, and vendor result-table lifetime/steady-state results. Do not unify them under one generic lifetime field.

## New measurement families

Unsupported families should be implemented directly on the current domain architecture instead of adding new one-off global state.

However, architecture readiness is not the gate for scientific support. The gate is evidence: at least one real XML plus matching numeric PV-2000 output for the new calculated result path.

SPV and Leakage are now implemented on the current domain/profile architecture with paired calculation evidence. Their additional categorical branches remain profile-scoped.

Current candidates remain:

- Frequency Scan;
- Voc / Voc Mapping;
- Fe / LID;
- Surface Passivation;
- Junction Lifetime;
- Sheet Resistance / Eddy;
- Height;
- dedicated CV analysis if a real paired result path is established.

Priority should follow available paired evidence, not this list order.

## Regression strategy

For any migration:

1. parse the same real XML before/after;
2. compare normalized raw/stored values;
3. compare every exported quantity;
4. compare availability masks;
5. compare profile/validation labels;
6. run paired private validators when references exist;
7. run public unit/layout tests and build;
8. visually inspect at least one representative real XML.

## Stop conditions

Investigate before merge if architecture work causes:

- unexplained numerical drift;
- changed undefined/blank behavior;
- a validated path becoming inferred or vice versa without new evidence;
- user filtering being confused with scientific availability;
- raw/controller results being replaced by derived values;
- geometry point order changing;
- filename/sample-name inference;
- UI regressions unrelated to the migration.

## Documentation synchronization

When architecture or support changes, update:

- `docs/ARCHITECTURE.md` for implemented runtime contracts;
- `docs/MEASUREMENT_TYPES.md` for support status;
- `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md` for evidence;
- the family algorithm note;
- the corresponding `main/wiki/` page;
- `docs/HANDOFF.md` when the current developer state materially changes.
