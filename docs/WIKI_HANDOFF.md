# Wiki publication handoff

## Source of truth

The canonical Wiki source is the version-controlled `wiki/` directory on `main`.

The live GitHub Wiki is a publication target. Do not treat a direct edit on the live Wiki as authoritative; make the change in `main/wiki/`, review it with the repository change, and let the sync workflow publish it.

## Current page set

User guide:

- `Home.md`
- `Getting-Started.md`
- `Using-the-Analyzer.md`
- `Measurement-Families.md`

Supported analyzers:

- `DIT.md`
- `QSS-uPCD.md`
- `Dual-QSS.md`
- `Emitter-J0.md`
- `ISC-and-VCPD.md`
- `CV-and-CET.md`
- `LBIC.md`
- `SPV.md`
- `Leakage.md`

Reference:

- `Scientific-Foundations.md`
- `Validation-and-Reference-Profiles.md`
- `_Sidebar.md`

## Automatic synchronization

`.github/workflows/wiki-sync.yml` mirrors `main/wiki/*.md` to the repository's GitHub Wiki after Wiki-source changes reach `main`. The workflow is intentionally one-way so a separately edited Wiki cannot silently override reviewed repository source.

The workflow:

1. checks out the main repository;
2. checks out the associated `.wiki` repository;
3. replaces the published Markdown set with `main/wiki/*.md`;
4. commits and pushes only when content changed.

A manual `workflow_dispatch` entry is also available for republishing the current source.

## Content boundary

The public Wiki may contain independently stated physics, mathematics, units, measurement semantics and observed compatibility relationships.

Do not copy these materials into the public Wiki:

- proprietary vendor binaries or source fragments;
- debug symbols or decompiled implementation fragments;
- raw reverse-engineering logs;
- private reference files without publication clearance;
- confidential customer/sample information;
- local filesystem paths that expose private infrastructure.

Exact reference-profile IDs and regression tolerances remain authoritative in `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

## Markdown rules

Use GitHub-compatible Markdown:

- inline math: `$...$`;
- display math: fenced `math` blocks where practical;
- Wiki links use page slugs such as `Dual-QSS` rather than repository-relative file paths;
- avoid links to untracked/planned pages.

## Verification after publication

After a Wiki-source merge:

1. confirm the **Sync Wiki** workflow succeeds;
2. open the live Home page and Sidebar;
3. verify newly added/renamed pages resolve;
4. spot-check display equations and tables;
5. confirm unsupported families are not presented as dedicated analyzers.

If automatic publication is unavailable, a maintainer may clone the `.wiki.git` repository and copy the reviewed `main/wiki/*.md` files manually. The source of truth still remains `main/wiki/`.
