# LBIC

LBIC (`LBICMeasurement`) is a spatial optical/electrical raster measurement. The analyzer models each result as **position × iteration × beam/wavelength × channel** and keeps measured channels separate from derived optical quantities.

## Active measurement channels

Known XML channels include:

- Current;
- DirectReflection;
- ScatteredReflection.

The XML measurement flags determine whether a channel is actually active. A stored numeric placeholder from a disabled channel is not automatically treated as measured data.

This matters for reflectance-only measurements: current can be stored as zero even when `MeasureCurrent=false`. The analyzer suppresses that placeholder instead of presenting a false zero-current result.

## Reflectivity

For the validated Direct + Scattered path,

```math
R_{raw}[\%]
=
R_{direct}[\%]+R_{scattered}[\%].
```

Displayed Reflectivity is clipped to the physical display interval:

```math
R_{display}=\operatorname{clamp}(R_{raw},0,100).
```

The raw optical sum is retained separately where it is needed for compatibility calculations.

## EQE

When current measurement is active and photon flux is available, an external quantum efficiency intermediate can be written as

```math
\mathrm{EQE}[\%]
=
\frac{I/q}{\Phi}\times100,
```

where `I` is photocurrent and `Phi` is photon flux.

For the current compatibility profiles, the exact unit scaling and historical charge constant are profile-defined. The vendor reference export does not expose EQE as a standalone result column, so the analyzer keeps it as an Advanced/intermediate quantity rather than promoting it to a validated primary vendor output.

No EQE is synthesized when current measurement is disabled.

## IQE

For the current validated path,

```math
\mathrm{IQE}[\%]
=
\frac{\mathrm{EQE}[\%]}
{1-R_{raw}/100}.
```

The compatibility calculation uses the **unclipped raw optical sum** in this denominator even though displayed Reflectivity is clipped to 0–100%.

Vendor-unavailable/non-computable IQE remains unavailable rather than being replaced with a numerical zero.

No IQE is synthesized for the reflectance-only profile because current is not measured.

## Single-beam and multi-beam measurements

The analyzer supports dynamic beam/wavelength selection.

The current validated geometry/result families include:

- current-enabled single-beam `SquareRegionPattern`;
- current-enabled multi-beam `MapPattern + PseudoSquareCell`;
- reflectance-only `SquareRegionPattern`.

Wavelength, power and ordinary numeric raster-size changes do not by themselves define a new scientific profile when the semantic channel/result path is unchanged.

## Maps and line profiles

The raster map uses reconstructed physical coordinates.

For rectangular `SquareRegionPattern` scans, the structured Region and Dimension fields define the grid. For the validated pseudo-square map, the scheduled lattice is clipped by both the target rectangle and circular diameter after edge exclusion.

X and Y profiles are extracted from the selected physical coordinate rather than assuming that every LBIC map is a dense rectangular array.

Interrupted/incomplete rasters can display a leading acquisition prefix where the schedule is known; that incomplete-coordinate path remains **inferred** until matching vendor evidence validates it.

## Valid-data filter

The filter is scoped to the current iteration and beam/wavelength.

One selected filter quantity defines the active site population used by:

- summary statistics;
- raster map;
- distribution;
- X profile;
- Y profile.

Changing only the displayed quantity does not silently change the filter metric. Raw data remain preserved.

## Calculated diffusion length

Some vendor LBIC outputs can contain diffusion length, but the current XML reference path does not expose a raw DL channel and the vendor calculation has not been established from matching XML→numeric output.

Calculated diffusion length is therefore **unsupported** in the analyzer.

## Validation status

The current validated families are:

- `LBIC-SINGLE-001`;
- `LBIC-MULTI-002`;
- `LBIC-REFLECTANCE-003`.

Their exact geometry/channel/profile boundaries and numerical tolerances are recorded in the repository validation documentation.
