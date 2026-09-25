# ISC and VCPD

ISC and VCPD share Kelvin-probe measurement concepts and runtime infrastructure, but they are separate XML/result profiles.

- `ISCMeasurement` reports dark/light contact potential difference and surface band bending.
- `VcpdMeasurement` reports a direct contact-potential-difference result on its current validated path.

## ISC repeated readings

For one ISC site, let:

- `D` be the mean dark Kelvin-probe reading;
- `L` be the mean illuminated reading;
- `O` be the stored Vcpd offset;
- `F` be the stored Vsb correction factor.

The validated ISC result path is:

```math
V_{\mathrm{CPD,dark}} = D-O,
```

```math
V_{\mathrm{SB}} = F(D-L),
```

and

```math
V_{\mathrm{CPD,light}}
=
V_{\mathrm{CPD,dark}}-V_{\mathrm{SB}}.
```

The final light result therefore is not generally identical to `L-O` when the correction factor differs from one.

## VCPD

Paired VCPD profiles cover one, four and sixteen dark readings per site. The reported Vcpd Dark is their arithmetic mean when `LightOn=false` and the iteration offset is zero.

VCPD does not synthesize ISC-only Vcpd Light or VSB.

Alternate behavior such as non-zero offset handling or illumination remains a new profile until paired vendor output establishes it.

## Maps and geometry

Calculation profiles are independent of validated coordinate paths. The paired geometry paths include:

- ISC: `MapPattern + SquareCell`, `MapPattern + RoundWafer`, `SquareRegionPattern + SquareCell`;
- VCPD: `MapPattern + RoundWafer`, `HighDensityPattern + PseudoSquareCell`, `OnePointPattern + RoundWafer`.

The analyzer reconstructs the scheduled coordinates from target dimensions, edge exclusion and pitch rather than guessing positions from filenames or result names.

Explicitly terminated acquisitions can display an acquired leading schedule prefix when the canonical acquisition order is known. Such incomplete geometry is labelled **inferred** unless matching vendor coordinates validate it.

## Valid-data filter

ISC can filter by:

- Vcpd Dark;
- Vcpd Light;
- VSB.

VCPD filters by Vcpd Dark on its current result path.

The selected range creates one active site population used consistently by summary statistics, map, distribution and export. Raw repeated readings are preserved and filtering does not modify reconstructed result values.

## Selected-site inspection

ISC can show the repeated dark/light readings stored for the selected site. This keeps the measured raw readings visible alongside the corrected result quantities.

VCPD uses its own stored-reading structure and result boundary.

## Validation status

The current ISC and VCPD reference profiles are independently validated against matching XML/CSV pairs for their documented result and coordinate paths.

A successful import of another Kelvin-probe-shaped XML does not automatically place it inside either validated profile.
