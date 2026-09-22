# Public PV-2000 reference data

This directory is the opt-in public regression-data area for the project.

Public reference material is governed by [REFERENCE_DATA_LICENSE.md](../REFERENCE_DATA_LICENSE.md). A contributor must have the right and any employer/university/customer authorization needed to make the grants in that license.

## Preferred directory layout

Use one self-contained directory per measurement case:

```text
reference_data/
    <measurement>/
        <case-id>/
            raw.xml
            pv2000_export.csv
            README.md
            screenshot.png        # optional/minimal
```

The filenames may differ, but the case must be unambiguous.

## Minimum useful case

Preferred:

- raw PV-2000 XML;
- matching numeric PV-2000 CSV/export;
- case README describing what should be validated/supported.

Optional:

- a **minimal** screenshot showing a result/setting that cannot be established from the numeric files alone, only when publication rights are clear;
- notes about units, pattern type, beam/channel selection or validity behavior.

Do not treat full XPS/vendor reports or full-interface screenshots as normal reference artifacts. Keep them private unless redistribution rights are specifically clear.

The XML and vendor export must represent the same measurement/result context. Do not pair files merely because they look similar.

## Required PR acceptance

A pull request that adds or changes files under `reference_data/` must be authored by someone who has read [REFERENCE_DATA_LICENSE.md](../REFERENCE_DATA_LICENSE.md) and posts the exact acceptance comment specified there.

The normal project CLA also applies to copyrightable material submitted through the pull request.

## Case README template

Copy this into each case README:

```markdown
# <case-id>

- Measurement type / xsi:type:
- Requested result or feature:
- XML file:
- Matching PV-2000 numeric export:
- Minimal screenshot, if any:
- Relevant PV-2000 settings:
- Expected point count / map shape, if known:
- Existing profile family or possible NEW PROFILE:
- Anonymization performed:
- Rights/authority confirmation: I am authorized to publish and license these files under REFERENCE_DATA_LICENSE.md.

## Notes

Describe what is currently unsupported or different from PV-2000.
```

## What belongs here

This directory may contain intentionally published and properly licensed:

- `.xml`;
- numeric `.csv` or equivalent machine-readable exports;
- minimal `.png`, `.jpg`, `.jpeg` screenshots when necessary and permitted;
- Markdown metadata/notes.

Do **not** put vendor manuals, full vendor reports/XPS by default, proprietary binaries, PDB/debug symbols, decompiled source, confidential customer data, group code, credentials or unrelated documents here.

## Validation meaning

A public reference case is regression evidence, not a claim that the internal PV-2000 implementation has been discovered.

Cases that exercise the same semantic input→output path can extend confidence in an existing profile family. Categorical changes in schema, algorithm mode, pattern/coordinate encoding, beam/channel/result combination, units, validity rules or derived-result path may define a NEW PROFILE.

See `docs/REFERENCE_PROFILES.md` for the canonical validation envelope.
