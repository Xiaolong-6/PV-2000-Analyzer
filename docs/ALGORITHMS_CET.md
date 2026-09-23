# CETMeasurement — contactless capacitance / EOT analyzer

## Scope

`CETMeasurement` is a derived corona/Kelvin-probe measurement family. Runtime input remains the PV-2000 XML only. Matching PV-2000 CSV output is development regression evidence and is never required by the browser application.

The implemented result quantities are:

- **EOT** [Å]
- **Cd** [nF/cm²]
- **R²** [dimensionless]

The first paired profile is `CET-9PT-SQUARE-001`: `NinePointPattern + SquareCell`.

## XML path

For each `DataItem`, the analyzer reads `ProcessData/VcpdLight`. Each stored vector is reduced to its arithmetic mean and corrected by the XML VCPD offset:

```text
Vlight[i] = mean(ProcessData/VcpdLight[i]) - VcpdOffsett
```

The corona-charge axis follows the process index and the configured process charge increment:

```text
Qc[i] = i * Process/Settings/CoronaCharge
```

No vendor CSV values participate in this runtime calculation.

## Linear fit and compatibility arithmetic

A least-squares line is fitted to the finite process points:

```text
Vlight = intercept + m * Qc
```

The CET compatibility path uses the historical charge constant

```text
q = 1.602e-19 C
```

and calculates:

```text
Cd_internal = (1 / m) * q * 1e6
Cd_reported = Cd_internal * 1000          [nF/cm²]
EOT_A       = 34.5 / Cd_internal          [Å]
```

`R²` is the coefficient of determination of the same fit.

These are compatibility relations for the saved PV-2000 charge-axis/unit convention. They should not be silently replaced by a different physical-constant precision or by a generic contacted C-V model.

## Undefined-fit behavior

The paired reference contains one site with only one usable process point. A line cannot be fitted there.

The vendor output represents that site as:

- EOT: `Ud.`
- Cd: `Ud.`
- R²: `0`

The analyzer therefore keeps EOT and Cd unavailable while retaining R² = 0 for this legacy undefined-fit behavior. Availability is kept quantity-specific.

## Canonical geometry

All map geometry goes through `PV2000.geometry.resolveMeasurementGeometry()`.

### NinePointPattern

`Pattern/Coefficients` are target-relative coordinates, not millimetres.

For `SquareCell`:

```text
scaleX = Width / 2  - EdgeExclusion
scaleY = Height / 2 - EdgeExclusion

x_mm = coefficient_x * scaleX
y_mm = coefficient_y * scaleY
```

The paired 156 × 156 mm SquareCell with 4 mm edge exclusion therefore uses a 74 mm scheduled half-extent. The standard coefficient magnitude `0.6324555320336759` becomes:

```text
0.6324555320336759 * 74 = 46.801709370492 mm
```

All nine exported X/Y coordinates match the canonical reconstruction to floating-point precision.

### Other observed CET patterns

The supplied XML corpus also contains OnePoint, FixedPoints, RoundWafer NinePoint and one-point SquareRegion examples.

- `OnePointPattern` center geometry is supported through the shared resolver.
- `FixedPointsPattern/PointValues` is treated as explicit absolute millimetre coordinates.
- `SquareRegionPattern` uses the shared Region + Dimension path where its XML fields are complete.
- other CET pattern/target combinations remain **inferred** until matching vendor coordinate/output evidence is paired.

Support for parsing/importing a geometry does not upgrade that geometry or result profile to validated status.

## Shared measurement-domain model

CET uses the shared architecture:

- `PV2000.quantity` for quantity provenance, units, availability and validation status;
- `PV2000.selection` for one site-level active filter mask;
- `PV2000.measurement` for normalized family metadata;
- `PV2000.profiles` for validation-profile matching;
- canonical `pointsMm` from the geometry core.

The Valid-data filter can use EOT, Cd or R². The same active site mask drives result summaries, map, Distribution and filter-aware exports. Raw XML values and per-site fit inputs remain preserved.

## Validation — CET-9PT-SQUARE-001

The private paired reference contains 9 sites.

Pointwise regression reproduces the matching PV-2000 CSV with approximately:

- X/Y maximum error: `2.1e-14 mm`
- EOT maximum error: `3.2e-12 Å`
- Cd maximum error: `6.2e-13 nF/cm²`
- R² maximum error: `1.2e-13`

Average / median / sample-stdev / min / max summaries are also reproduced at floating-point precision, including the single undefined EOT/Cd site and its R² = 0 contribution.

Run the private validator with:

```bash
npm run validate:cet
```

By default it looks for same-basename XML/CSV pairs under `private/reference/cet/`. The browser application itself never reads these files.

## Profile boundary

`CET-9PT-SQUARE-001` validates:

- `CETMeasurement`;
- `NinePointPattern + SquareCell`;
- target-relative fixed-point geometry;
- process-index corona-charge axis;
- illuminated-CPD averaging and offset correction;
- linear-fit R²;
- EOT/Cd compatibility arithmetic and legacy undefined-fit semantics.

A new profile or explicit evidence extension is required when a real pair changes the coordinate encoding, target scheduling rule, process/result branch, units, undefined-value semantics or derived arithmetic.

Scientific background and the relationship between CET and general capacitance/EOT concepts are maintained in the Wiki page **CV and CET**.
