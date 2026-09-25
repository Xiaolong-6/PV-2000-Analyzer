# SPV / Diffusion Length

`SPVMeasurement` is the dedicated two-wavelength surface-photovoltage (SPV) analyzer. It uses wavelength-dependent optical generation to infer minority-carrier diffusion length, then derives a lifetime from that diffusion length.

## Physical measurement principle

Surface photovoltage is the illumination-induced change in semiconductor surface potential. Light creates excess electron-hole pairs; generated minority carriers diffuse before they recombine, and carriers reaching the surface space-charge region modify the measured surface potential.

A characteristic optical generation depth is

```math
Z(\lambda,T)\sim\frac{1}{\alpha(\lambda,T)},
```

where $\alpha$ is the absorption coefficient. Two wavelengths therefore probe different generation-depth distributions. Their corrected SPV ratio contains information about how efficiently carriers generated at different depths can diffuse to the surface region.

SPV diffusion length is therefore an optical transport result, not a transient-lifetime measurement.

## What is measured

For each site the XML stores two SPV channels, exposed as **SPV8 [mV]** and **SPV6 [mV]** after the stored multiplier. These channels remain available even when DL/Tau are undefined.

The result path also uses wavelength, chuck/LED temperature, linearity settings and optical-correction settings.

## Standard two-wavelength model

After the applicable signal and optical corrections,

```math
R=\frac{V_{8,\mathrm{corr}}}{V_{6,\mathrm{corr}}}.
```

The PV-2000-compatible two-depth relation is

```math
L=\frac{Z_6-RZ_8}{R-1},
```

with $L$ the minority-carrier diffusion length. Algebraically this is the solution of

```math
R=\frac{L+Z_6}{L+Z_8}.
```

This closed form belongs to the adopted two-depth compatibility model; it is not a universal SPV equation for arbitrary optical structures.

The standard path applies, in order, the applicable legacy linearity correction, wavelength/temperature penetration-depth conversion, optical correction, LED-temperature correction, the two-channel ratio, diffusion-length calculation and availability/range checks. Non-positive DL and DL above 2500 µm are unavailable on the current path.

## From diffusion length to lifetime

Diffusion length, diffusion coefficient and minority-carrier lifetime obey

```math
L=\sqrt{D\tau},
\qquad
\tau=\frac{L^2}{D}.
```

With the Einstein relation,

```math
D=\mu\frac{kT}{q}.
```

The compatibility Tau output uses the historical profile mobility for the selected doping type. In the paired standard P-type path,

```math
\tau_{\mu s}=\frac{L_{\mu m}^{,2}\,0.01}{0.0259\,\mu}.
```

**Tau is derived from DL.** It does not have the same provenance as a QSS-µPCD transient/controller lifetime.

## Enhanced finite-wafer model

When wafer thickness and back-surface recombination cannot be neglected, the Enhanced path solves a finite-wafer diffusion model with a back-surface boundary condition.

For candidate diffusion length $L$, wafer thickness $W$, back-surface velocity $S_b$ and diffusion coefficient $D$,

```math
A=\frac{D}{L},
```

and, for nonzero $S_b$,

```math
B=
\frac{(A/S_b)\sinh(W/L)+\cosh(W/L)}
     {\sinh(W/L)+(A/S_b)\cosh(W/L)}.
```

For $S_b=0$, $B=\tanh(W/L)$. The corrected ratio is matched by solving

```math
\frac{1-(Z_6/L)^2}{1-(Z_8/L)^2}
\frac{1-BZ_8/L}{1-BZ_6/L}
-R=0.
```

The paired Enhanced N-type profile validates this finite-wafer/back-surface DL path. Its reported Tau is still obtained from the historical DL-to-lifetime compatibility conversion.

## Outputs and interpretation

- **DL [µm]** — minority-carrier diffusion length from the applicable SPV compatibility model.
- **Tau [µs]** — lifetime derived from DL and the selected profile mobility.
- **SPV8 / SPV6 [mV]** — measured/corrected channel values used by the result path.

A larger DL generally indicates farther minority-carrier transport before recombination, but interpretation depends on material, doping, surfaces, optical corrections and the validity of the selected model.

## Validation status

Standard P-type positive-oxide and zero-oxide paths are paired-validated across several geometries. A separate paired N-type Enhanced case establishes `SPV-CALC-ENHANCED-N-003`.

The current paired evidence does **not** validate Enhanced **P-type** processing, texture correction, parsed-signal processing, manual-linearity-ratio processing, or nonzero reflectivity correction in the zero-oxide branch.

Geometry validation is tracked separately from calculation validation. Exact case counts and numerical tolerances remain in the repository validation documents.

## Related documentation

- [Scientific Foundations](Scientific-Foundations)
- [Measurement Families](Measurement-Families)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
- repository `docs/ALGORITHMS_SPV.md`
- repository `docs/REFERENCE_PROFILES.md`
- repository `docs/VALIDATION.md`
