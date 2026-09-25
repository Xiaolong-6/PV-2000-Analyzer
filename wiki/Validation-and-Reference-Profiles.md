# Validation and Reference Profiles

PV-2000 Analyzer records scientific models and compatibility evidence separately.

## 1. Reference instance

A reference instance is one concrete measurement file together with its matching PV-2000 output.

A pair can establish:

- point count;
- coordinate order;
- units;
- raw-to-result relationships;
- derived quantities;
- blanking and undefined behavior;
- summary statistics.

## 2. Reference profile family

A profile family is a semantic input-to-output path established by one or more reference instances.

Numeric changes can remain inside one family when the calculation path is unchanged. Examples include raster size, pitch, origin, wavelength, laser power and ordinary scalar settings.

A categorical change can require a new profile, such as:

- a different XML schema/path;
- a different algorithm mode;
- a different geometry encoding;
- a new channel combination;
- a new result family;
- a new unit convention;
- a different blanking rule;
- a different source for a stored or derived quantity.

## 3. Status labels

### Validated

The implemented calculation has been numerically compared with matching PV-2000 output for the stated profile.

### Reproduced at shown precision

Only rounded reference values were available, so the comparison is limited to that displayed precision.

### Inferred

The scientific or compatibility model is documented, while a matching output pair has not established numerical parity.

### Unsupported

The project does not currently provide the corresponding result.

## 4. Validation belongs to a path

A single measurement family can contain multiple paths with different validation status.

For example, coordinate reconstruction may be validated while an optional derived quantity remains inferred.

Family pages therefore state validation at the quantity/path level.

## 5. Physical knowledge and compatibility evidence

A physically correct equation can differ numerically from a historical software profile because of:

- constants;
- temperature convention;
- calibration factors;
- unit scaling;
- clipping;
- discrete point selection;
- interpolation;
- invalid-value handling.

The project records both the scientific relation and the compatibility status.

## 6. Current profile examples

The current implemented analyzers include several explicitly named profile families, for example:

- `QSS-INJ-RESULT-001` — Dual-QSS non-Auger Back/Back `OnePointPattern` final-result path, anchored by the original two-pair core and extended by three compatible 100-case OnePoint rows; target geometry is validated independently and conflicting FixedPoints rows remain diagnostic;
- the JZero calculation/geometry profiles for the paired two-intensity pseudo-square reference;
- separate ISC and VCPD paired map profiles;
- `CET-9PT-SQUARE-001` — CET NinePointPattern + SquareCell;
- `LBIC-SINGLE-001` — current-enabled single-beam LBIC;
- `LBIC-MULTI-002` — current-enabled multi-beam pseudo-square LBIC;
- `LBIC-REFLECTANCE-003` — reflectance-only LBIC;
- `SPV-CALC-STANDARD-001` — paired standard two-wavelength SPV DL/Tau path;
- `LEAKAGE-CALC-VSASS-001` — paired Leakage natural-cubic VSASS/LI extraction.

This list is illustrative, not the authoritative profile registry. Exact IDs, matching conditions, tolerances and evidence remain in the repository validation documents.

## 7. Example: CET fixed-point profile

`CET-9PT-SQUARE-001` is a useful example of path-scoped validation. One paired `NinePointPattern + SquareCell` reference validates target-relative fixed-point geometry together with EOT, Cd, R² and the legacy undefined-fit behavior. Other CET geometries can still be importable while remaining inferred until paired output extends the evidence envelope.

## 8. Public and private reference data

The browser application remains XML-only at runtime.

Reference CSVs, reports and screenshots are development evidence. Public contribution cases can be tracked when publication rights are clear. Confidential or uncleared material remains outside public tracked content.

## 9. Authoritative project records

Exact profile IDs and validation claims live in:

- docs/REFERENCE_PROFILES.md
- docs/VALIDATION.md

The Wiki explains the methodology and scientific context in a form intended for continuous reading.
