# ISC and VCPD

ISC and VCPD use Kelvin-probe contact-potential measurements, but they are separate XML/result profiles.

## Kelvin-probe physical principle

A Kelvin probe measures a contact-potential difference caused by the work-function difference between the reference probe and sample. Up to the instrument sign convention,

```math
V_{\mathrm{CPD}}\propto\frac{\Phi_{\mathrm{sample}}-\Phi_{\mathrm{probe}}}{q}.
```

For a semiconductor, the sample work function depends on the bulk Fermi level, surface dipoles/oxide charge and surface band bending. Illumination changes carrier populations and can change surface potential, so dark/light CPD differences can be used as a surface-band-bending-related measurement.

The analyzer follows the paired PV-2000 sign/result definitions rather than imposing a universal Kelvin-probe sign convention.

## ISC measurement sequence

ISC stores repeated dark and illuminated readings. Let $D$ and $L$ be their means, $O$ the stored Vcpd offset and $F$ the Vsb correction factor:

```math
V_{\mathrm{CPD,dark}}=D-O,
```

```math
V_{\mathrm{SB}}=F(D-L),
```

```math
V_{\mathrm{CPD,light}}
=
V_{\mathrm{CPD,dark}}-V_{\mathrm{SB}}.
```

The final light result is therefore not generally $L-O$ when $F\ne1$.

$V_{SB}$ is a profile-defined surface-band-bending-related voltage. A scalar VSB result alone does not uniquely separate interface states, fixed charge, surface dipoles and other electrostatic contributions.

## VCPD measurement

The current VCPD profile uses repeated dark CPD readings without synthesizing the ISC illumination result. For $N$ readings,

```math
\overline{V}_{\mathrm{CPD}}=\frac{1}{N}\sum_{i=1}^{N}V_i.
```

Paired profiles cover one, four and sixteen dark readings per site on the current dark/no-offset path.

VCPD does not synthesize ISC-only Vcpd Light or VSB. Nonzero offset handling, illumination or materially different result semantics require their own paired profile.

## Why dark/light CPD is useful

Dark/light surface-potential changes are useful for contactless semiconductor surface characterization, but interpretation is model-dependent. DIT/COCOS and CET add charge sweeps and additional electrostatic models when the objective is to estimate interface-state density or effective capacitance.

## Maps, filtering and selected-site readings

Calculation and geometry profiles are independent. Current paired geometry evidence spans several Map, SquareRegion, HighDensity and OnePoint combinations.

The active Valid-data filter defines the population used by summary statistics, map, distribution and export without rewriting the underlying repeated readings. Selected-site inspection keeps those raw readings visible beside the corrected result quantities.

## Validation status

ISC and VCPD calculation profiles are independently validated against matching XML/CSV pairs, with supported coordinate paths validated separately.

A successfully parsed Kelvin-probe-shaped XML does not automatically enter either validated profile. Different correction semantics, illumination state, iteration structure or output definitions require their own paired evidence.

## Related documentation

- [Scientific Foundations](Scientific-Foundations)
- [DIT](DIT)
- [CV and CET](CV-and-CET)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
- repository `docs/ALGORITHMS_ISC.md`
- repository `docs/ALGORITHMS_VCPD.md`
