# Documentation and Wiki information-architecture plan

Status: **planning only**. This branch must not change analyzer runtime behavior, calculation code, UI behavior, validation labels, or existing reference envelopes.

## 1. Goal

Turn the project's accumulated measurement knowledge into a maintainable public developer reference without creating a second, conflicting source of truth.

The public documentation should help future contributors answer four questions quickly:

1. What does a measurement family contain?
2. Which values are raw/stored, corrected, derived, or device/controller supplied?
3. Which formulas, units, validity rules, and option semantics are implemented?
4. Which behavior is validated against matching PV-2000 output, and which remains a compatibility/reference model?

The repository documentation remains canonical. GitHub Wiki pages are a browsable developer layer that summarizes and links to the canonical files.

## 2. Public documentation language

Use neutral, implementation-focused terminology:

- **reference behavior**
- **measurement semantics**
- **compatibility model**
- **reference profile**
- **observed output behavior**
- **validated / reproduced / inferred / unsupported**

Do not publish provenance that is unnecessary for implementation or validation.

Public documentation should not contain:

- vendor binaries, debug symbols, proprietary resources, or decompiled source;
- internal build/source paths;
- method RVAs or binary offsets;
- copied implementation fragments from proprietary software;
- local-only research notebooks or raw investigative notes;
- statements that imply access to or disclosure of proprietary source code.

A public page should describe independently stated formulas, field semantics, units, validity rules, observable data flow, and regression evidence.

## 3. Source-of-truth hierarchy

### Canonical repository docs

These files own normative technical facts:

| Topic | Canonical file |
|---|---|
| Runtime/module structure | `docs/ARCHITECTURE.md` |
| Supported XML measurement families | `docs/MEASUREMENT_TYPES.md` |
| Per-family algorithms already implemented | `docs/ALGORITHMS_*.md` |
| Validation envelope / profile registry | `docs/REFERENCE_PROFILES.md` |
| Detailed regression evidence | `docs/VALIDATION.md` |
| Agent/development state | `docs/HANDOFF.md` |
| Contributor/public-reference rules | `CONTRIBUTING.md`, `REFERENCE_DATA_LICENSE.md`, `reference_data/README.md` |

### Wiki

The Wiki should not own numeric truth, validation claims, or formulas that are absent from the repository docs.

Its job is to:

- provide a readable entry point;
- explain measurement families in plain technical language;
- link to the canonical algorithm/profile/validation pages;
- guide contributors to the correct extension workflow;
- explain common concepts once: raw vs corrected vs derived, result provenance, profile scope, validity/blanking, geometry.

When a value or formula changes, update the repo document first. The Wiki should then be refreshed from that canonical source.

## 4. Proposed repository-document additions

### 4.1 `docs/MEASUREMENT_SEMANTICS.md`

Purpose: shared concepts that currently appear repeatedly across algorithm documents.

Planned sections:

- XML measurement type as the dispatch key;
- raw/stored vs corrected vs derived quantities;
- controller/device-computed values vs analyzer-computed values;
- acquisition container vs derived-result measurement;
- result provenance;
- validity/undefined/blanking behavior;
- units and unit conversion ownership;
- reference-profile scope;
- version-specific compatibility behavior.

This should become the conceptual bridge between `ARCHITECTURE.md` and the family-specific algorithm pages.

### 4.2 `docs/MEASUREMENT_FAMILY_INDEX.md`

Purpose: one compact table covering every known measurement family, including families not yet implemented.

Suggested columns:

- XML type / aliases;
- scientific purpose;
- primary raw/stored channels;
- primary derived quantities;
- result ownership: analyzer / controller-device / passthrough / acquisition-only;
- implementation status;
- validation status;
- canonical detail page.

This should replace duplicated roadmap prose, not duplicate `REFERENCE_PROFILES.md`.

### 4.3 New family-specific reference pages

Only add a page when there is enough stable, independently stated behavior to justify it.

High-value candidates currently missing dedicated public pages:

- `ALGORITHMS_CV_CET.md`
- `ALGORITHMS_SPV_DL.md`
- `ALGORITHMS_VOC.md`
- `ALGORITHMS_FREQUENCY_SCAN.md`
- `ALGORITHMS_LEAKAGE.md`
- `ALGORITHMS_FE_LID.md`
- `ALGORITHMS_PASSIVATION.md`
- `ALGORITHMS_JUNCTION_LT.md`
- `ALGORITHMS_SHEET_RESISTANCE_EDDY.md`

Each page should clearly distinguish:

- observable/stored inputs;
- derived outputs;
- equations;
- units;
- invalid/blank behavior;
- parameter/default semantics where public and useful;
- implementation status;
- validation status;
- unresolved items.

Do not add unsupported implementation claims merely because a formula is known.

### 4.4 Existing pages to keep, not replace

Keep the current family pages:

- DIT
- QSS-uPCD
- Dual QSS
- JZero
- ISC
- VCPD
- LBIC

These already contain project-specific implementation and validation history. New shared semantics pages should reduce duplicated introductory material, not rewrite them wholesale in the first pass.

## 5. Proposed Wiki page tree

### Home

Short project/developer landing page:

- what PV-2000 Analyzer does;
- XML-only runtime;
- supported measurement families;
- where validation claims live;
- links to Live Analyzer / source / contributor guide.

### Measurement Families

Overview table sourced from `docs/MEASUREMENT_FAMILY_INDEX.md`.

Subpages:

- DIT
- QSS-uPCD
- Dual QSS
- Emitter J0
- ISC
- VCPD
- LBIC
- CV / CET
- SPV / Diffusion Length
- Voc / Voc Mapping
- Frequency Scan
- Leakage
- Fe / LID
- Surface Passivation
- Junction Lifetime
- Sheet Resistance / Eddy
- Other acquisition/calibration families

Each Wiki family page should be concise and link to its canonical `docs/ALGORITHMS_*.md` page for equations and edge cases.

### Measurement Semantics

Explain once:

- raw measurement;
- stored device/controller result;
- corrected result;
- derived result;
- undefined vs zero;
- profile-specific validity;
- why similar quantities from different measurement families may use different compatibility models.

### Validation and Reference Profiles

Summarize:

- what “validated” means;
- reference instance vs validated profile family;
- when numeric changes stay within one profile;
- what creates a NEW PROFILE;
- public vs private reference-data workflow.

Canonical source remains `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

### Geometry and Coordinate Reconstruction

Developer-focused overview of:

- MapPattern;
- SquareRegionPattern;
- HighDensityPattern;
- RoundWafer / SquareCell / PseudoSquareCell;
- EdgeExclusion;
- X-fast ordering;
- nominal sample geometry vs measured support.

Only include rules already documented or validated/inferred in canonical docs.

### Adding Support for a New Measurement

Developer workflow:

1. inspect `Measurement/@xsi:type`;
2. inspect actual XML schema;
3. classify raw/stored/derived values;
4. identify geometry;
5. decide whether the path matches an existing reference profile;
6. implement isolated module;
7. add tests;
8. obtain paired output before expanding a validated label;
9. update family index, algorithm page, reference profile and Wiki summary.

### Result Provenance and Compatibility

Explain why one project may contain:

- physically motivated model;
- compatibility model;
- stored vendor/device result;
- user-facing optional analysis.

This page should explicitly warn against replacing one with another silently.

## 6. Standard family-page template

Use the same template in repo docs and a shortened version in Wiki:

```text
# <Measurement family>

## Purpose
## XML type(s)
## Raw / stored inputs
## Settings and defaults
## Derived quantities
## Reference calculation model
## Units
## Validity / blanking / undefined rules
## Geometry / acquisition order
## Version- or profile-specific behavior
## Validation coverage
## Unsupported / unresolved behavior
## Implementation mapping
```

For a passthrough/device-calculated family, the “Reference calculation model” section should explicitly say that the value is supplied by the device/controller or stored XML rather than inventing an analyzer formula.

## 7. Planned page ownership

| Wiki page | Canonical source |
|---|---|
| Home | README + MEASUREMENT_TYPES |
| Measurement Families | MEASUREMENT_FAMILY_INDEX |
| DIT | ALGORITHMS_DIT + REFERENCE_PROFILES |
| QSS-uPCD | ALGORITHMS_QSS_UPCD + REFERENCE_PROFILES |
| Dual QSS | ALGORITHMS_DUAL_QSS + REFERENCE_PROFILES |
| Emitter J0 | ALGORITHMS_JZERO + REFERENCE_PROFILES |
| ISC | ALGORITHMS_ISC + REFERENCE_PROFILES |
| VCPD | ALGORITHMS_VCPD + REFERENCE_PROFILES |
| LBIC | ALGORITHMS_LBIC + REFERENCE_PROFILES |
| CV / CET | future ALGORITHMS_CV_CET |
| SPV / DL | future ALGORITHMS_SPV_DL |
| Voc | future ALGORITHMS_VOC |
| Frequency Scan | future ALGORITHMS_FREQUENCY_SCAN |
| Leakage | future ALGORITHMS_LEAKAGE |
| Fe / LID | future ALGORITHMS_FE_LID |
| Passivation | future ALGORITHMS_PASSIVATION |
| Junction Lifetime | future ALGORITHMS_JUNCTION_LT |
| Sheet Resistance / Eddy | future ALGORITHMS_SHEET_RESISTANCE_EDDY |
| Validation and Reference Profiles | REFERENCE_PROFILES + VALIDATION |
| Geometry | ARCHITECTURE + family algorithm docs |
| Adding Support | CONTRIBUTING + AGENTS |
| Measurement Semantics | future MEASUREMENT_SEMANTICS |

## 8. Rollout plan

### Phase 1 — documentation-only, safe to do while feature agents are active

No runtime changes.

1. Add `MEASUREMENT_SEMANTICS.md`.
2. Add `MEASUREMENT_FAMILY_INDEX.md`.
3. Add missing algorithm/reference pages family by family.
4. Cross-link existing algorithm pages to the family index and reference profiles.
5. Draft Wiki Home / Measurement Families / Measurement Semantics / Validation pages.
6. Publish family Wiki pages only after their canonical repo page exists.
7. Keep all validation labels unchanged.

### Phase 2 — documentation consolidation

Still no scientific-model changes.

1. Remove duplicated roadmap text from `MEASUREMENT_TYPES.md` after the family index is established.
2. Shorten repeated validation prose in algorithm pages by linking to `REFERENCE_PROFILES.md`.
3. Add a simple documentation checklist to contribution guidance.
4. Optionally add a script/check that verifies canonical links and Wiki-page source mapping.

### Phase 3 — future architecture work

Explicitly out of scope for this branch.

Potential future topics:

- measurement definitions/registry metadata;
- result provenance model;
- compatibility-profile objects;
- unified quantity/validity schema.

Do not start these while the current feature agents are changing analyzers.

## 9. Immediate first-pass page priority

Recommended order based on developer value:

1. Measurement Semantics
2. Measurement Family Index
3. CV / CET
4. SPV / Diffusion Length
5. Voc / Voc Mapping
6. Frequency Scan
7. Leakage
8. Fe / LID
9. Surface Passivation
10. Junction Lifetime
11. Sheet Resistance / Eddy
12. Wiki navigation pages

This order documents the newly understood families first while leaving stable existing DIT/QSS/ISC/LBIC pages largely untouched.

## 10. Acceptance criteria for this documentation effort

The documentation/wiki phase is complete when:

- every known measurement family appears in one index;
- each implemented family links to one canonical algorithm page;
- every family states whether its values are analyzer-derived, device/controller-derived, passthrough, or acquisition-only;
- every scientific formula has a validation status;
- no Wiki page is the sole source of a formula or validation claim;
- no public page contains vendor binaries, source fragments, debug metadata, internal build paths, or local research notes;
- a new contributor can identify the correct file to edit without reading `HANDOFF.md`;
- documentation can evolve independently from any future analyzer architecture refactor.
