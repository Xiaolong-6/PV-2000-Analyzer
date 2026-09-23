# Documentation and Wiki information-architecture plan

Status: **planning only**. This branch must not change analyzer runtime behavior, calculation code, UI behavior, validation labels, or existing reference envelopes.

## 1. Goal

Turn the project's accumulated measurement knowledge into a maintainable public scientific and developer reference without mixing scientific explanation with project bookkeeping.

The documentation should let a future reader answer two different classes of questions:

### Scientific questions

- What physical quantity is being measured?
- What is the governing physical or mathematical model?
- What do the parameters mean physically?
- What are the equations, units, assumptions and boundary conditions?
- What is raw, corrected, derived, or device/controller supplied?
- When does the model become invalid or undefined?
- How do related measurement families differ scientifically?

### Project questions

- Which XML type and fields feed the analyzer?
- Which calculation path is implemented?
- Which profile is validated?
- Which reference datasets support that claim?
- Which tests and modules enforce the behavior?
- What remains inferred or unsupported?

The **GitHub Wiki should be the primary public reading surface for scientific knowledge**. Repository docs should remain the authoritative record for implementation mapping, validation envelopes, regression evidence, contributor rules and architecture constraints.

## 2. Public documentation language and boundary

Use neutral, implementation-independent terminology:

- **reference behavior**
- **measurement semantics**
- **physical model**
- **mathematical model**
- **compatibility model**
- **reference profile**
- **observed output behavior**
- **validated / reproduced / inferred / unsupported**

Public pages may freely explain independently stated scientific knowledge, including:

- physical principles;
- equations and derivations;
- units and dimensional analysis;
- parameter meaning;
- assumptions and approximations;
- validity ranges and failure conditions;
- observable input/output relationships;
- measurement workflow semantics;
- comparison with standard semiconductor/device-physics relationships;
- regression evidence and uncertainty labels.

Public documentation should not contain:

- vendor binaries, debug symbols, proprietary resources, or decompiled source;
- internal build/source paths;
- method RVAs or binary offsets;
- copied implementation fragments from proprietary software;
- local-only research notebooks or raw investigative notes;
- statements that imply disclosure of proprietary source code.

The public scientific explanation should stand on its own. It should describe **what the model means and how it behaves**, not how that knowledge was obtained.

## 3. Two-layer information model

### 3.1 Wiki — primary scientific reference

The Wiki is the main human-readable home for:

- semiconductor/device physics;
- measurement principles;
- mathematical equations and derivations;
- parameter definitions;
- units;
- assumptions and approximations;
- correction factors and their physical meaning;
- validity/blanking logic where it is part of the scientific result;
- relationships between measurement families;
- worked conceptual examples;
- version/profile-specific scientific behavior when that distinction matters.

A Wiki family page may therefore contain the full equations. It should not be reduced to a navigation stub.

### 3.2 Repository docs — project truth and traceability

Repository docs own:

| Topic | Canonical repository location |
|---|---|
| Runtime/module structure | `docs/ARCHITECTURE.md` |
| Supported XML measurement families | `docs/MEASUREMENT_TYPES.md` / future family index |
| XML-field → implementation mapping | family implementation notes / current `ALGORITHMS_*.md` |
| Validation envelope / profile IDs | `docs/REFERENCE_PROFILES.md` |
| Detailed regression evidence | `docs/VALIDATION.md` |
| Agent/development state | `docs/HANDOFF.md` |
| Contributor/public-reference rules | `CONTRIBUTING.md`, `REFERENCE_DATA_LICENSE.md`, `reference_data/README.md` |

The repository should not need to duplicate every scientific derivation verbatim. Instead it should point to the relevant Wiki scientific section and state:

- which formula/model is implemented;
- any project-specific compatibility deviation;
- validation/profile status;
- tests and reference evidence;
- unresolved implementation boundaries.

### 3.3 Conflict rule

If Wiki scientific prose and repository implementation facts appear inconsistent:

1. `REFERENCE_PROFILES.md` and `VALIDATION.md` decide what may be called validated.
2. Code/tests decide what the current analyzer actually does.
3. The Wiki should then be corrected to describe the current scientific/reference model accurately.

The Wiki may be the **primary explanatory source for equations**, but it must never silently upgrade an inferred model to validated status.

## 4. Proposed repository-document changes

### 4.1 `docs/MEASUREMENT_SEMANTICS.md`

Purpose: define project-wide data/provenance concepts without reproducing all physics.

Planned sections:

- XML measurement type as dispatch key;
- raw/stored vs corrected vs derived quantities;
- controller/device-computed values vs analyzer-computed values;
- acquisition container vs derived-result measurement;
- result provenance;
- validity/undefined/blanking semantics;
- unit conversion ownership;
- compatibility model vs physical model;
- reference-profile scope;
- link to the Wiki scientific reference.

### 4.2 `docs/MEASUREMENT_FAMILY_INDEX.md`

Purpose: one compact engineering index covering every known measurement family.

Suggested columns:

- XML type / aliases;
- scientific purpose;
- raw/stored channels;
- derived quantities;
- result ownership: analyzer / controller-device / passthrough / acquisition-only;
- implementation status;
- validation status;
- Wiki scientific page;
- repository implementation/validation page.

This should replace duplicated roadmap prose, not duplicate the detailed physics.

### 4.3 Existing `ALGORITHMS_*.md` pages

Do not delete or rewrite them wholesale while active feature agents are working.

Long term, split their responsibilities:

**Keep in repo:**
- XML mappings;
- implementation-specific conventions;
- profile identifiers;
- exact validation status;
- test references;
- compatibility deviations;
- unresolved implementation items.

**Move or summarize into Wiki:**
- physical background;
- equations;
- derivation narrative;
- interpretation of parameters;
- scientific assumptions;
- comparisons between methods.

Existing DIT/QSS/ISC/LBIC pages can be migrated gradually after the Wiki structure is stable.

### 4.4 Missing scientific families

For families that currently have no dedicated page, create the **Wiki scientific page first** and add only the engineering mapping needed in the repo index/implementation notes.

Priority families:

- CV / CET
- SPV / Diffusion Length
- Voc / Voc Mapping
- Frequency Scan
- Leakage
- Fe / LID
- Surface Passivation
- Junction Lifetime
- Sheet Resistance / Eddy

This avoids creating a second large set of repo algorithm documents merely to hold scientific exposition.

## 5. Proposed Wiki page tree

### Home

Scientific/developer landing page:

- what PV-2000 Analyzer is;
- measurement families;
- XML-only runtime;
- scientific-reference philosophy;
- validation-status legend;
- links to analyzer/source/contribution docs.

### Scientific Foundations

Cross-family physics pages:

#### Semiconductor quantities and conventions
- carrier density;
- intrinsic carrier concentration;
- doping type/sign conventions;
- thermal voltage;
- excess carrier density;
- surface band bending;
- charge density;
- lifetime;
- recombination;
- surface recombination velocity;
- implied Voc.

#### Measurement-data provenance
- raw signal;
- averaged/stored result;
- corrected result;
- derived result;
- device/controller result;
- analyzer compatibility result.

#### Units and sign conventions
- V, mV;
- q/cm²;
- cm⁻² eV⁻¹;
- µs;
- cm/s;
- A/cm² / mA/cm² / fA/cm²;
- µm / nm / Å;
- percentage quantities;
- sign conventions for P/N material and charge.

### Measurement Families

Each family page is a **full scientific reference**, not a short stub.

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
- Height
- Other acquisition/calibration families

### Validation and Reference Profiles

Explain the methodology:

- validated vs reproduced vs inferred vs unsupported;
- reference instance vs profile family;
- ordinary numeric variation vs categorical profile change;
- why paired vendor output matters;
- why scientific plausibility alone does not establish compatibility;
- public vs private reference-data workflow.

The exact profile registry remains in `docs/REFERENCE_PROFILES.md`.

### Geometry and Coordinate Reconstruction

Scientific/developer overview of:

- MapPattern;
- SquareRegionPattern;
- HighDensityPattern;
- RoundWafer;
- SquareCell;
- PseudoSquareCell;
- EdgeExclusion;
- raster pitch;
- acquisition order;
- nominal sample boundary vs measured support.

### Result Provenance and Compatibility

Explain clearly:

- physical model;
- compatibility model;
- stored device/controller result;
- optional analyzer-only analysis;
- why two measurement families can use different compatibility constants;
- why a compatibility model should not silently replace a general physical model.

### Adding Support for a New Measurement

Developer workflow:

1. identify `Measurement/@xsi:type`;
2. inspect actual XML schema;
3. classify each quantity by provenance;
4. identify geometry;
5. map the scientific model;
6. decide whether an existing profile applies;
7. implement isolated module;
8. add tests;
9. obtain paired output before expanding validated status;
10. update repo family index/profile and Wiki science page.

## 6. Standard Wiki scientific-family template

```text
# <Measurement family>

## What the measurement represents physically
## Measured / stored observables
## Derived physical quantities
## Governing equations
## Derivation / rationale
## Parameter definitions
## Units and dimensional checks
## Sign conventions
## Assumptions and approximations
## Validity / undefined / blanking conditions
## Geometry or acquisition-order semantics
## Relationship to other measurement families
## Compatibility / profile-specific behavior
## Validation status
## Known unresolved questions
## Project implementation links
```

### Example: what belongs in Wiki

For a DIT page, the Wiki should explain:

- what Vsb means physically;
- semiconductor surface charge;
- why a derivative of charge with respect to surface potential gives an interface-state density term;
- P/N sign handling;
- flat-band concept;
- COCOS vs COCOS-II reference behavior;
- Qit versus Dit;
- units and validity windows.

The repo DIT document then records exactly which branch/profile/formula variant the analyzer implements and how it is tested.

## 7. Page ownership map

| Scientific topic | Primary public explanation | Repository authority |
|---|---|---|
| DIT physics and equations | Wiki: DIT | ALGORITHMS_DIT + REFERENCE_PROFILES |
| QSS-uPCD physics/equations | Wiki: QSS-uPCD | ALGORITHMS_QSS_UPCD + REFERENCE_PROFILES |
| Dual QSS physics/equations | Wiki: Dual QSS | ALGORITHMS_DUAL_QSS + REFERENCE_PROFILES |
| Emitter J0 physics/equations | Wiki: Emitter J0 | ALGORITHMS_JZERO + REFERENCE_PROFILES |
| ISC / VCPD semantics | Wiki: ISC / VCPD | ALGORITHMS_ISC / ALGORITHMS_VCPD + profiles |
| LBIC optics/electrical formulas | Wiki: LBIC | ALGORITHMS_LBIC + profiles |
| CV / CET | Wiki: CV / CET | family index + future implementation notes |
| SPV / diffusion length | Wiki: SPV / Diffusion Length | family index + validation notes |
| Voc / pseudo-IV | Wiki: Voc | family index + validation notes |
| Frequency response / lifetime fit | Wiki: Frequency Scan | family index + validation notes |
| Leakage / VSASS / I-V transform | Wiki: Leakage | family index + validation notes |
| Fe / LID | Wiki: Fe / LID | family index + validation notes |
| Passivation | Wiki: Surface Passivation | family index + validation notes |
| Junction lifetime | Wiki: Junction Lifetime | family index + validation notes |
| Sheet resistance / Eddy | Wiki: Sheet Resistance / Eddy | family index + validation notes |
| Validation status | Wiki explanation | REFERENCE_PROFILES + VALIDATION are authoritative |
| XML/runtime architecture | Wiki summary only | ARCHITECTURE is authoritative |

## 8. How to publish formulas safely and usefully

A Wiki formula should include enough context to be scientifically useful:

1. define every symbol;
2. state units;
3. state whether the formula is a physical model, compatibility relation, or observed result relationship;
4. state assumptions;
5. state validity/blanking conditions;
6. state validation status separately from physical plausibility;
7. avoid implementation provenance that is unnecessary to the science.

Preferred language:

> The reference compatibility model evaluates …

> For the validated profile, the exported quantity is reproduced by …

> Under the stated assumptions, the physical relation is …

> This path is reconstructed as a reference model and is not yet paired-output validated.

Avoid claims about undisclosed vendor internals.

## 9. Rollout plan

### Phase 1 — documentation/Wiki only, safe while feature agents are active

No runtime changes.

1. Add `MEASUREMENT_SEMANTICS.md`.
2. Add `MEASUREMENT_FAMILY_INDEX.md`.
3. Draft Wiki **Scientific Foundations** pages.
4. Draft full scientific Wiki pages for newly documented families.
5. Add concise repo implementation/validation links for those pages.
6. Migrate existing DIT/QSS/ISC/LBIC scientific explanations only when doing so will not disrupt active development.
7. Keep all validation labels unchanged.

### Phase 2 — scientific Wiki consolidation

Still no analyzer architecture changes.

1. Move duplicated physics explanations out of repo implementation docs where practical.
2. Keep concise formulas in repo only where needed for tests/implementation clarity.
3. Add reciprocal links: Wiki scientific page ↔ repo implementation/profile page.
4. Add a documentation review checklist:
   - symbols defined;
   - units stated;
   - assumptions stated;
   - validity rules stated;
   - validation status stated;
   - no unsupported vendor-internal claim.
5. Optionally add a link checker/source-map check.

### Phase 3 — future architecture work

Explicitly out of scope for this branch.

Potential future topics:

- measurement-definition metadata;
- result provenance schema;
- compatibility-profile objects;
- unified quantity/validity model.

Do not start these while the current feature agents are changing analyzers.

## 10. Immediate first-pass Wiki priority

Recommended order:

1. Scientific Foundations — quantities, units and provenance
2. Measurement Families index
3. DIT scientific page cleanup/expansion
4. QSS-uPCD / J0 shared lifetime and recombination foundations
5. CV / CET
6. SPV / Diffusion Length
7. Voc / Voc Mapping
8. Frequency Scan
9. Leakage
10. Fe / LID
11. Surface Passivation
12. Junction Lifetime
13. Sheet Resistance / Eddy
14. Geometry and coordinate reconstruction
15. Validation / reference-profile explanation

The newly understood families should be documented before any code architecture refactor.

## 11. Acceptance criteria

The documentation/Wiki phase is complete when:

- every known measurement family appears in one engineering index;
- every scientifically meaningful family has a Wiki page explaining the physics and mathematics;
- symbols, units, assumptions and validity conditions are explicit;
- each quantity states its provenance: raw/stored, corrected, derived, device/controller, or analyzer-only;
- every compatibility formula has a validation-status statement;
- repo docs link to the Wiki scientific explanation instead of duplicating long derivations;
- `REFERENCE_PROFILES.md` and `VALIDATION.md` remain authoritative for validation claims;
- no public page contains vendor binaries, source fragments, debug metadata, internal build paths, or local research notes;
- no page claims knowledge of undisclosed vendor internals;
- a contributor can understand the scientific meaning of a measurement without reading `HANDOFF.md`;
- the documentation can evolve independently from any future analyzer architecture refactor.
