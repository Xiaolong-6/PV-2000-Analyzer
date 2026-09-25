# LBIC

LBIC (`LBICMeasurement`) is a spatial optical/electrical raster measurement. A focused beam is scanned across the sample while photocurrent and, where configured, reflected-light channels are recorded.

## Physical measurement principle

Absorbed photons generate electron-hole pairs. Carriers that reach the collecting junction/contact contribute to photocurrent, so spatial variations in recombination, optical reflection, diffusion and collection appear as LBIC contrast.

For incident photon flux $\Phi$ and current $I$,

```math
\mathrm{EQE}=\frac{I/q}{\Phi}.
```

With a simple front-reflection correction,

```math
\mathrm{IQE}=\frac{\mathrm{EQE}}{1-R}.
```

Different wavelengths probe different silicon generation depths,

```math
Z(\lambda,T)\sim\frac{1}{\alpha(\lambda,T)}.
```

Multi-wavelength IQE can therefore probe depth-dependent carrier collection.

## Active measurement channels

Known XML channels include Current, DirectReflection and ScatteredReflection. Measurement flags decide whether a channel is actually active; a numeric placeholder in a disabled channel is not treated as measured data.

This matters for reflectance-only measurements, where `Current=0` may be stored while `MeasureCurrent=false`.

## Reflectivity

For the validated Direct + Scattered path,

```math
R_{raw}[\%]=R_{direct}[\%]+R_{scattered}[\%].
```

Displayed Reflectivity is clipped,

```math
R_{display}=\operatorname{clamp}(R_{raw},0,100),
```

while the unclipped optical sum is retained where compatibility calculations require it.

## EQE and IQE compatibility path

When current and photon flux are available,

```math
\mathrm{EQE}[\%]=\frac{I/q}{\Phi}\times100.
```

Calculated EQE remains an Advanced/intermediate quantity because the vendor reference export does not expose it as a standalone primary output.

The current IQE path uses

```math
\mathrm{IQE}[\%]
=
\frac{\mathrm{EQE}[\%]}{1-R_{raw}/100}.
```

The denominator deliberately uses **unclipped** reflectivity for compatibility. No EQE/IQE is synthesized when the required current channel is inactive.

## Multi-wavelength diffusion length

For qualifying current-plus-scattered data, each wavelength is converted to the profile's silicon penetration depth and the analyzer fits

```math
\frac{1}{\mathrm{IQE}}=a+bZ.
```

The compatibility diffusion length is

```math
L=\frac{a}{b}.
```

This uses wavelength-dependent generation depth to characterize an effective collection/diffusion length. It is a profile-specific compatibility model, not a claim that arbitrary $1/IQE$ spectra must always be linear in $Z$.

Enough distinct qualifying wavelengths, active required channels, a finite fit and the XML `MaxDLValue` range gate are required.

## Maps, beams and filtering

The analyzer keeps position × iteration × beam/wavelength × channel separate. Geometry is reconstructed from the measurement pattern/target rather than inferred from filenames.

The Valid-data filter is scoped to the active iteration and beam/wavelength and provides one population for summary statistics, map, distribution and X/Y profiles. Filtering does not rewrite raw XML values.

## Outputs and interpretation

- **Current** — measured photocurrent when enabled.
- **Reflectivity** — result from active reflection channels.
- **EQE** — Analyzer intermediate where calculable.
- **IQE** — collection efficiency corrected by the compatibility reflection path.
- **DL [µm]** — shared cross-beam result for the validated multi-wavelength path.

A low-response pixel does not uniquely identify one mechanism: recombination, optical reflection, electrical collection and local material/device structure can all contribute.

## Validation status

Current/Reflectivity/IQE calculation profiles and geometry profiles are tracked independently.

`LBIC-CALC-DL-MULTIWAVELENGTH-005` validates finite DL for the **current-plus-scattered** cross-beam path. The direct-plus-scattered paired evidence contains only unavailable DL and does not establish finite DL for that optical combination.

Exact pair counts and tolerances remain in `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.

## Related documentation

- [Scientific Foundations](Scientific-Foundations)
- [Measurement Families](Measurement-Families)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
- repository `docs/ALGORITHMS_LBIC.md`
