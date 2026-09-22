## Contributor license agreement

- [ ] I have read and agree to [CLA.md](../CLA.md) for the copyrightable material in this PR, and I have authority to grant those rights.

## What does this PR add?

Describe the PV-2000 measurement/result combination, bug fix or feature.

## Contribution type

- [ ] Data-only PV-2000 reference case
- [ ] Implementation + reference case
- [ ] Code/docs change without new vendor reference data

## Reference evidence

For new or expanded PV-2000 support:

- [ ] Raw PV-2000 XML is included, or the reason it must remain private is documented
- [ ] Matching PV-2000 exported CSV/XPS is included, or the reason it must remain private is documented
- [ ] PV-2000 screenshot is included when available
- [ ] XML and vendor export are from the same measurement/result context
- [ ] Relevant measurement/result/settings are described
- [ ] Any anonymization is documented
- [ ] I have the right to publish every file committed under `reference_data/`
- [ ] No confidential/customer data, vendor manuals, credentials or group/internal code are included

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
