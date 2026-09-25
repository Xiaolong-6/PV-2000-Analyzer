# Documentation and Wiki architecture

> Historical filename retained for link stability. This document now describes the current documentation architecture rather than a future migration plan.

## Purpose

PV-2000 Analyzer has two public documentation surfaces with different jobs:

- **GitHub Wiki** — user guide and scientific reference;
- **repository docs** — implementation contracts, validation profiles, numerical evidence and developer workflow.

The same factual boundary must be consistent across both surfaces, but long technical derivations and regression ledgers should not be duplicated everywhere.

## Ownership by surface

### Wiki

The Wiki should answer:

- how to open and navigate XML files;
- what each supported analyzer does;
- what the displayed quantities mean;
- which values are raw/stored, corrected, derived or compatibility results;
- what filters, maps, distributions and exports mean;
- governing scientific equations and assumptions;
- validation vocabulary and major limitations.

Every currently implemented dedicated analyzer must have a user-facing Wiki entry.

### Repository docs

Repository documentation owns:

- exact XML-field → implementation mapping;
- architecture and UI contracts;
- semantic profile IDs;
- pointwise validation evidence and tolerances;
- contributor and test requirements;
- current development handoff;
- unsupported/new-profile boundaries.

`docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md` are authoritative for profile scope and numerical evidence.

## Current canonical pages

| Topic | Primary page |
|---|---|
| User onboarding | Wiki: Getting Started |
| Common analyzer UI | Wiki: Using the Analyzer |
| Supported analyzer index | Wiki: Measurement Families + `docs/MEASUREMENT_TYPES.md` |
| Shared semiconductor/measurement concepts | Wiki: Scientific Foundations |
| DIT | Wiki: DIT + `docs/ALGORITHMS_DIT.md` |
| QSS-µPCD | Wiki: QSS-uPCD + `docs/ALGORITHMS_QSS_UPCD.md` |
| Dual QSS | Wiki: Dual QSS + `docs/ALGORITHMS_DUAL_QSS.md` |
| Emitter J0 | Wiki: Emitter J0 + `docs/ALGORITHMS_JZERO.md` |
| ISC / VCPD | Wiki: ISC and VCPD + ISC/VCPD algorithm docs |
| CET / CV semantics | Wiki: CV and CET + `docs/ALGORITHMS_CET.md` |
| LBIC | Wiki: LBIC + `docs/ALGORITHMS_LBIC.md` |
| Validation method | Wiki: Validation and Reference Profiles |
| Exact validation envelope | `docs/REFERENCE_PROFILES.md` |
| Numerical regression evidence | `docs/VALIDATION.md` |
| Runtime/UI architecture | `docs/ARCHITECTURE.md` |

## Source-of-truth rules

When prose disagrees with implementation:

1. code and tests determine what the current analyzer actually does;
2. `REFERENCE_PROFILES.md` and `VALIDATION.md` determine what evidence supports a compatibility claim;
3. Wiki and explanatory docs are corrected to match those facts.

Physical plausibility alone never upgrades a result to “validated”. A parser that successfully reads a new XML type is not a dedicated scientific analyzer.

## Writing rules

- Write current state, not a chronological patch history.
- Put release history in `CHANGELOG.md` and Git history.
- State units, assumptions, availability rules and provenance near the quantity they govern.
- Separate scientific models from PV-2000 compatibility models.
- Distinguish **validated**, **reproduced at shown precision**, **inferred** and **unsupported**.
- Do not imply knowledge of undisclosed proprietary implementation details. Observed compatibility behavior can be documented without presenting fitted/recovered behavior as vendor source truth.
- Do not publish vendor binaries, decompiled/proprietary source, private reference data or confidential sample-identifying material.
- Keep exact corpus counts/tolerances in validation docs when they would distract from ordinary user guidance.

## Family-page scientific contract

A dedicated-analyzer Wiki page should read as a measurement-science reference, not only as a compatibility/regression ledger. Where applicable, it should cover:

1. **physical measurement principle** — excitation, sensor/detector and what signal changes;
2. **measurement/acquisition sequence** — what is varied in time, space, wavelength, charge or injection;
3. **raw observables and provenance** — stored/measured versus corrected/derived quantities;
4. **governing equations** — the model connecting observables to displayed results;
5. **assumptions and boundary conditions** — material, geometry, steady-state, finite-thickness and optical/electrical corrections;
6. **PV-2000 compatibility path** — profile-specific constants, interpolation, clipping, blanking and legacy behavior;
7. **outputs and interpretation** — what each result means physically and what it does not establish by itself;
8. **availability/failure cases** — why a quantity can be undefined;
9. **validation status** — supported envelope in prose, with exact pair counts/tolerances delegated to `REFERENCE_PROFILES.md` and `VALIDATION.md`.

Not every page needs nine literal headings, but the scientific narrative must be complete enough to understand both the measurement physics and the implemented calculation without reading source code.

## Wiki coverage requirement

The reviewed Wiki source under `main/wiki/` must contain:

- Home;
- Getting Started;
- Using the Analyzer;
- Measurement Families;
- Scientific Foundations;
- Validation and Reference Profiles;
- one page for each current dedicated analyzer family (closely related ISC/VCPD and CV/CET may share a page).

Unsupported families may be listed in the measurement index but should not look like implemented analyzers.

## Feature/documentation synchronization

For any analyzer or scientific-result change:

1. update code/tests;
2. update or add the semantic reference profile;
3. update numerical validation evidence;
4. update the family implementation note;
5. update `MEASUREMENT_TYPES.md` if support status changes;
6. update the corresponding Wiki page;
7. update `HANDOFF.md` only if the current developer state changes materially;
8. add a concise `CHANGELOG.md` entry.

A new scientific result still requires a real XML plus matching numeric PV-2000 output before it can enter runtime as a reproduced/validated path.

## Publication

`main/wiki/` is the reviewed source of truth. The GitHub Wiki is a published mirror and is synchronized by the repository workflow described in `WIKI_HANDOFF.md`.

Direct live-Wiki edits are disposable unless they are brought back into `main/wiki/` through normal review.
