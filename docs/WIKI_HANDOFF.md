# Wiki handoff

Branch: **docs/reference-knowledge-wiki-plan**

Purpose: provide finished Markdown sources that a local agent can push directly into the GitHub Wiki repository while feature agents continue working on the application.

## 1. Wiki source directory

Files under **wiki/** are written as publishable Wiki pages, using GitHub Wiki page slugs as filenames.

Current ready-to-push set:

- Home.md
- _Sidebar.md
- Scientific-Foundations.md
- Measurement-Families.md
- Validation-and-Reference-Profiles.md
- DIT.md
- QSS-uPCD.md
- CV-and-CET.md

These pages are living documents. Update the current text directly when scientific understanding improves. Git history provides the change record.

## 2. Writing style

Wiki pages present the current scientific model in a continuous narrative.

Preferred content:

- physical meaning;
- equations;
- symbol definitions;
- units;
- derivation/rationale;
- assumptions;
- validity conditions;
- result provenance;
- relationships to other measurements;
- validation status.

Avoid patch-note language inside scientific pages. Historical correction narratives belong in Git history, changelog or private research notes.

## 3. Public-content boundary

Wiki pages may contain independently stated physics, mathematics, units, measurement semantics and observed compatibility relationships.

Keep the following outside the public Wiki:

- vendor binaries;
- debug symbols;
- decompiled source;
- internal source/build paths;
- binary offsets;
- proprietary implementation fragments;
- raw reverse-engineering logs;
- private reference files without publication clearance.

## 4. Local-agent push workflow

If the Wiki repository is already initialized:

    git clone https://github.com/Xiaolong-6/PV-2000-Analyzer.wiki.git
    cd PV-2000-Analyzer.wiki
    copy or sync ../PV-2000-Analyzer/wiki/*.md into this repository
    git add .
    git commit -m "Add scientific measurement reference"
    git push

On Windows, the copy/sync step can be performed by the local agent using PowerShell, Python or normal file operations.

If GitHub has not initialized the Wiki git repository yet, create the initial Home page once through the GitHub Wiki UI, then clone/push normally.

## 5. Source-of-truth split

Wiki:
- primary public scientific explanation;
- equations and derivations;
- physical interpretation;
- units and assumptions;
- validity conditions.

Repository docs:
- XML/implementation mapping;
- exact reference-profile IDs;
- validation evidence;
- tests;
- architecture and contributor rules.

For validation status, docs/REFERENCE_PROFILES.md and docs/VALIDATION.md remain authoritative.

## 6. Next Wiki pages

Recommended continuation order:

1. SPV-and-Diffusion-Length
2. Voc-and-Voc-Mapping
3. Frequency-Scan
4. Leakage
5. Fe-and-LID
6. Surface-Passivation
7. Junction-Lifetime
8. Sheet-Resistance-and-Eddy
9. Geometry-and-Coordinate-Reconstruction
10. Dual-QSS
11. Emitter-J0
12. ISC
13. VCPD
14. LBIC

The local reverse-engineering notebook contains the algorithm-level material needed for these pages.

## 7. Private research handoff

The current private research notebook is:

**PV2000_REFERENCE_ANALYSIS_2026-09-22.md**

It contains the detailed reconstruction ledger, formulas, defaults, managed-result inventory and remaining validation boundaries.

Continue research from its Progress / handoff ledger rather than rescanning completed families.
