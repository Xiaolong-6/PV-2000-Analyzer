# Public PV-2000 reference data

This directory is the opt-in public regression-data area for the project.

It exists so PV-2000 users can contribute new measurement/result combinations even when they do not write code. A useful contribution is usually a raw XML plus the matching PV-2000 export, with a screenshot strongly recommended.

## Directory layout

Use one self-contained directory per measurement case:

```text
reference_data/
    <measurement>/
        <case-id>/
            raw.xml
            pv2000_export.csv
            screenshot.png
            README.md
```

The filenames may differ, but the case must be unambiguous.

## Minimum useful case

Required:

- raw PV-2000 XML;
- matching PV-2000 exported CSV (or XPS when that is the only relevant vendor export);
- case README describing what should be validated/supported.

Strongly recommended:

- screenshot from PV-2000 showing the selected result and relevant settings;
- notes about units, pattern type, beam/channel selection or validity behavior when visible in the software.

The XML and vendor export must represent the same measurement/result context. Do not pair files merely because they look similar.

## Case README template

Copy this into each case README:

```markdown
# <case-id>

- Measurement type / xsi:type:
- Requested result or feature:
- XML file:
- Matching PV-2000 export:
- Screenshot:
- Relevant PV-2000 settings:
- Expected point count / map shape, if known:
- Existing profile family or possible NEW PROFILE:
- Anonymization performed:
- Publication-rights confirmation: I have the right to publish these files in this repository.

## Notes

Describe what is currently unsupported or different from PV-2000.
```

## What belongs here

This directory may contain intentionally published:

- `.xml`;
- `.csv`;
- `.xps`;
- `.png`, `.jpg`, `.jpeg` screenshots;
- Markdown metadata/notes.

Do not put vendor manuals, confidential customer data, group code, credentials or unrelated documents here.

## Validation meaning

A public reference case is regression evidence, not a claim that the internal PV-2000 implementation has been discovered.

Cases that exercise the same semantic input→output path can extend confidence in an existing profile family. Categorical changes in schema, algorithm mode, pattern/coordinate encoding, beam/channel/result combination, units, validity rules or derived-result path may define a NEW PROFILE.

See `docs/REFERENCE_PROFILES.md` for the canonical validation envelope.
