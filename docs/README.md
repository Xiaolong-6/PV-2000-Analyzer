# Repository documentation index

This directory contains the engineering and validation documentation for PV-2000 Analyzer. The public Wiki is the primary user-facing guide and scientific reference; repository docs record implementation contracts, validation envelopes and development evidence.

## Source-of-truth map

| Question | Authoritative source |
|---|---|
| How do I use the analyzer? | `wiki/Getting-Started.md`, `wiki/Using-the-Analyzer.md` |
| What XML measurement types have dedicated analyzers? | `docs/MEASUREMENT_TYPES.md` |
| What does each measurement mean scientifically? | `wiki/` family pages and `wiki/Scientific-Foundations.md` |
| How is the runtime/UI structured? | `docs/ARCHITECTURE.md` |
| What input→output profiles are validated? | `docs/REFERENCE_PROFILES.md` |
| What numerical evidence supports those profiles? | `docs/VALIDATION.md` |
| What is the current developer handoff? | `docs/HANDOFF.md` |
| What remains in the measurement-architecture migration? | `docs/MEASUREMENT_ARCHITECTURE_REFACTOR_PLAN.md` |
| How is the GitHub Wiki published? | `docs/WIKI_HANDOFF.md` |
| How should data/code be contributed? | `CONTRIBUTING.md` |
| What changed by version? | `CHANGELOG.md` |

## Measurement implementation notes

- `ALGORITHMS_DIT.md` — DIT / COCOS.
- `ALGORITHMS_QSS_UPCD.md` — QSS-µPCD maps.
- `ALGORITHMS_DUAL_QSS.md` — QSS injection sweep.
- `ALGORITHMS_JZERO.md` — Emitter J0.
- `ALGORITHMS_ISC.md` — ISC.
- `ALGORITHMS_VCPD.md` — VCPD.
- `ALGORITHMS_CET.md` — CET / EOT.
- `ALGORITHMS_LBIC.md` — LBIC.

These files document XML mapping, compatibility arithmetic and family-specific implementation boundaries. They should not become chronological development diaries.

## Validation vocabulary

- **validated** — numerically compared with matching PV-2000 output for the stated semantic profile;
- **reproduced at shown precision** — agreement is limited by rounded/display-only reference output;
- **inferred** — supported by structure, physics or observed behavior but not established by a matching numeric reference for that path;
- **unsupported** — the analyzer does not provide the corresponding scientific result.

A family can contain paths with different statuses. Importability does not imply vendor-result parity.

## Maintenance rules

1. Describe the current state in README, Wiki, architecture and family docs. Put historical narratives in Git history and `CHANGELOG.md`.
2. Code/tests define current runtime behavior. `REFERENCE_PROFILES.md` and `VALIDATION.md` define the evidence boundary.
3. Do not upgrade an inferred path to validated because it looks physically plausible or because one XML parses successfully.
4. A new scientific analyzer or calculated result path requires at least one real XML plus its matching numeric PV-2000 export. XML-only cases may support parsing, raw inspection or explicitly inferred behavior.
5. Runtime remains XML-only. Reference CSV/XPS material is development evidence, never a runtime dependency.
6. Public docs must not contain proprietary binaries/source fragments, private reference data, sample-identifying confidential material or reverse-engineering logs that are not cleared for publication.
7. `main/wiki/` is the reviewed source of the published GitHub Wiki. Do not treat direct edits to the live Wiki as the source of truth.
