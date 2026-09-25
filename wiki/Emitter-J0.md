# Emitter J0

The Emitter J0 analyzer handles `JZeroMeasurement`. The current result family combines two QSS lifetime states at the same spatial sites to report recombination-related maps.

## Main quantities

The analyzer exposes seven aligned quantities where inputs are available:

- Basore J0;
- effective lifetime at the first QSS intensity;
- effective lifetime at the second QSS intensity;
- Smax at the first QSS intensity;
- Smax at the second QSS intensity;
- implied Voc at the first QSS intensity;
- implied Voc at the second QSS intensity.

All quantities share one site index space. If an incomplete acquisition lacks the second lifetime at a site, first-state quantities can remain available while second-state quantities and J0 are unavailable.

## Smax

For wafer thickness `W` and effective lifetime `tau`,

```math
S_{max}=\frac{W}{2\tau}.
```

With `W` in micrometres and `tau` in microseconds,

```math
S_{max}[\mathrm{cm/s}]
=
50\frac{W_{\mu m}}{\tau_{\mu s}}.
```

## Generation and excess carriers

For a QSS condition,

```math
\Delta n = G\tau.
```

The generation rate depends on illumination, wafer thickness and the optical factor. The current compatibility path uses the same QSS-family generation convention described on [QSS-uPCD](QSS-uPCD).

## Basore-style J0

The current two-intensity map uses the slope of inverse small-perturbation lifetime squared versus generation rate.

For two states,

```math
m=
\frac{(1/\tau_2)^2-(1/\tau_1)^2}
{G_2-G_1}.
```

The compatibility result converts this slope to emitter saturation current density using the profile-defined wafer/material constants and reports J0 in fA/cm².

The exact compatibility constants belong to the validation profile. They should not be interpreted as a claim about undisclosed internal PV-2000 constants.

## Implied Voc

For each QSS state the analyzer first obtains excess-carrier density from

```math
\Delta n = G\tau.
```

The **PV-2000-compatible** JZero Voc path follows the current managed DLL:

```math
T_{compat}=T_{chuck}[^{\circ}\mathrm C]+272.15,
```

```math
V_{oc}
=
\frac{1.38066\times10^{-23}T_{compat}}
{1.602\times10^{-19}}
\ln\left(
\frac{\Delta n(N+\Delta n)}
{(1.22\times10^{10})^2}
+1
\right).
```

The unusual constants are intentional compatibility details. The current
vendor `NiForSilicon(T)` method returns a fixed
`1.22×10^10 cm⁻³` and ignores temperature, and the DLL uses
`T_C + 272.15` rather than the conventional Kelvin conversion. Zero/missing chuck temperature falls back to 27 °C, and non-positive wafer thickness falls back to 200 µm for the injection conversion. The analyzer
preserves those behaviors only for the PV-2000-compatible result.

A modern physical `ni(T)` model would be scientifically reasonable for a
separate analysis mode, but it is numerically different and must not be mixed
into vendor-comparison results.

## Geometry

Paired evidence now covers shared OnePoint, SquareRegion, HighDensity and Map geometry profiles. The principal dense-map reference uses a `MapPattern + PseudoSquareCell` schedule. The analyzer separates:

- the nominal pseudo-square target;
- the EdgeExclusion-adjusted scheduled region;
- the acquired sites;
- result availability.

Resolver-supported SquareRegion measurements can also be displayed. For interrupted scans, leading acquisition-order reconstruction may be shown as **partial / inferred** when matching vendor coordinate evidence is absent.

## Valid-data filter

Any aligned JZero result quantity can define the site-level user filter. That same selected population is applied to summaries, maps, distributions and exports, while each displayed quantity still applies its own finite/support availability.

Filtering does not alter either lifetime iteration or recalculate J0 from a different site population.

## Validation status

The common two-intensity calculation remains validated independently of
geometry for lifetime, Smax and Basore J0.

The JZero Implied-Voc path is now closed as `JZERO-VOC-COMPAT-001`.
Managed-IL tracing recovered the exact current-DLL equation above. A private
cross-profile audit evaluated 12 harness-generated JZero XML/vendor-CSV pairs
and 15,886 finite Voc values spanning Map, HighDensity, NinePoint,
SquareRegion and OnePoint geometries. The recovered equation reproduces the
vendor values at exported precision; the audit reports
`0.000000000 mV` maximum absolute error.

The earlier approximately 18.7–21.1 mV discrepancy came from applying a
physical silicon `ni(T)` correction to two normalization constants fitted to
the original approximately 28.5 °C map. The older non-map pairs were mostly
near 23.6–24.2 °C, so temperature and geometry were confounded. Pattern/Target
does not enter the vendor Voc calculation.

Geometry validation still remains a separate axis. Incomplete acquisitions
remain profile-specific and are not promoted merely because the compatibility
equation is known.
