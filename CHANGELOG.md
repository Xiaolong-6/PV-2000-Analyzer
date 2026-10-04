# Changelog

## v20261004.1 — 2026-10-04

- Made all nine supported-analyzer tags on the landing page clickable, with one built-in example per analyzer family.
- Added sanitized demonstration XML shaped from representative private reference cases; identifying metadata and original acquisition timestamps are removed, measurement values are transformed or synthesized, and the files are explicitly excluded from validation evidence.
- Embedded the examples into the generated single-file analyzer so the same examples work on GitHub Pages and in the downloaded offline HTML.
- Reworked the demonstration data after scientific review: DIT now preserves coupled Vcpd relationships and is algorithm-valid; QSS Injection has coherent lifetime/transient data and finite vendor-compatible results; SPV has finite DL/Tau; Emitter J0 is positive; VCPD uses a representative contact-potential range; Leakage includes finite bipolar VSASS and LI.
- Added regression coverage for example sanitization, measurement-type routing, dedicated parser/analyzer execution, physically meaningful headline results and landing/build wiring.

## v20260929.1 — 2026-09-29

- Reset the public repository to a clean baseline while preserving the current analyzer implementation, tests, scientific documentation, validation profiles, licensing and contribution workflow.
- Removed the tracked standalone `legacy/` analyzer and completed development-only handoff, audit, migration-plan and UI-refactor archive documents from the public tree. Historical/reference copies are preserved in the private reference repository.
- Public Git history before this baseline is intentionally retired. Future public development continues from this baseline commit.
- No scientific calculation, parsing, geometry, validation-envelope or export behavior is intentionally changed by the baseline reset.
