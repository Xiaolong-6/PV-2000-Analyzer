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

Implied Voc is calculated from injection, base doping and the profile-specific intrinsic-carrier model.

The JZero compatibility path is kept distinct from the general QSS-map implied-Voc path because the paired vendor result family has its own numerical calibration boundary.

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

Eight successful numeric pairs from the private 100-case corpus validate the common two-intensity calculation independently of geometry:

- both lifetime channels;
- both Smax channels;
- Basore J0;
- shared geometry profiles for the paired OnePoint, SquareRegion, HighDensity and Map cases.

Across those pairs, lifetime/Smax/Basore differences remain at floating-point or approximately 1e-11 scale, and X/Y coordinates agree within approximately 4.97e-14 mm.

Implied Voc has a narrower evidence envelope. Two `MapPattern + PseudoSquareCell` pairs support `JZERO-VOC-MAP-PSEUDOSQUARE-001` with maximum error approximately 0.850 mV. Paired OnePoint, SquareRegion and HighDensity cases differ by roughly 18.7–21.1 mV under the same compatibility calibration, so their Voc output remains inferred/diagnostic rather than being promoted with the other quantities.

Incomplete acquisitions remain profile-specific and do not become vendor-validated merely because a geometry can be reconstructed.
