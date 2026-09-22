## Contributor license agreement

External PR authors must read [CLA.md](../CLA.md) and, after opening the PR, post this exact comment:

`I have read and agree to CLA.md for this pull request, and I have authority to grant the rights described there.`

The automated **Legal / contributor grants** status verifies that the acceptance was posted by the PR author. The repository owner is automatically exempt for the owner's own contributions.

## What does this PR add?

Describe the PV-2000 measurement/result combination, bug fix or feature.

## Contribution type

- [ ] Data-only PV-2000 reference case
- [ ] Implementation + reference case
- [ ] Code/docs change without new vendor reference data

## Reference evidence

For new or expanded PV-2000 support:

- [ ] Raw PV-2000 XML is included, or the reason it must remain private is documented
- [ ] Matching numeric PV-2000 export is included, or the reason it must remain private is documented
- [ ] XML and vendor export are from the same measurement/result context
- [ ] Relevant measurement/result/settings are described
- [ ] Any anonymization is documented
- [ ] No confidential/customer data, vendor manuals, binaries, PDB/debug symbols, decompiled source, credentials or group/internal code are included

If this PR adds or changes anything under `reference_data/`, the PR author must also read [REFERENCE_DATA_LICENSE.md](../REFERENCE_DATA_LICENSE.md) and post this exact comment:

`I have read and agree to REFERENCE_DATA_LICENSE.md for the reference material in this pull request, and I have authority to grant those rights.`

Prefer XML + numeric CSV. Do not include full XPS/vendor reports or full-interface screenshots unless redistribution rights are specifically clear; use a minimal screenshot only when necessary and permitted.

## Validation scope

- [ ] I identified the existing profile family this case exercises, or marked it as a possible NEW PROFILE
- [ ] I did not treat ordinary numeric changes alone (for example grid size, wavelength, power or FluxCache) as a new profile
- [ ] Any new categorical schema/algorithm/pattern/channel/result/unit/validity path is treated as NEW PROFILE until regressed
- [ ] Unconfirmed reverse-engineered calculations remain labelled **inferred**

## Implementation checks

For code changes:

- [ ] `npm test`
- [ ] `npm run build`
- [ ] Relevant private/public regression validator(s)
- [ ] `docs/REFERENCE_PROFILES.md` / `docs/VALIDATION.md` updated when validation scope changed
- [ ] CHANGELOG / HANDOFF updated when appropriate

## Notes

Add anything a reviewer needs to reproduce the PV-2000 comparison.
