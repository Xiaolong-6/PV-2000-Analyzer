# Emitter J0 map algorithm and validation status

## Scope

This module handles PV-2000 `JZeroMeasurement` XML results. The runtime remains XML-only. Matching PV-2000 CSV exports are development references used for pointwise regression and are never required during analysis.

The supplied reference contains two `UpcdIterationData` maps measured at the first and second QSS intensities. The analyzer pairs the two iterations by site index and exposes the seven vendor result quantities documented for Emitter J0 Map:

- Basore J0 [fA/cm²];
- τeff.d at the first QSS intensity;
- τeff.d at the second QSS intensity;
- Smax at the first QSS intensity;
- Smax at the second QSS intensity;
- Implied Voc at the first QSS intensity;
- Implied Voc at the second QSS intensity.

## Reference geometry

The paired reference uses:

- `Pattern/@xsi:type = MapPattern`;
- `Target/@xsi:type = PseudoSquareCell`;
- target Size = 156 × 156 mm;
- Diameter = 205 mm;
- EdgeExclusion = 7 mm;
- Pitch = 2 × 2 mm;
- 5017 sites in each lifetime iteration.

The scheduled pseudo-square is the intersection of the EdgeExclusion-adjusted rectangle and circle:

```text
half width  = 156/2 - 7 = 71 mm
half height = 156/2 - 7 = 71 mm
radius      = 205/2 - 7 = 95.5 mm
```

The X-fast row-major lattice keeps sites satisfying both:

```text
|x| <= 71 mm
|y| <= 71 mm
x² + y² <= 95.5² mm²
```

with x/y on the 2 mm lattice. This yields exactly 5017 points. The first site is (-64, -70) mm and the last is (64, 70) mm. Every reconstructed coordinate matches the vendor CSV exactly.

## Lifetime and Smax

Each `UpcdIterationData/Data/DataItem/Value` is the vendor-exported small-perturbation lifetime for the corresponding QSS intensity. Both 5017-point lifetime arrays match the vendor export to floating-point precision.

For wafer thickness `W` in cm and lifetime `τ` in seconds:

```text
Smax = W / (2 τ)
```

The reference uses W = 200 µm. Both Smax maps match the vendor export to floating-point precision.

## Generation rate

The analyzer uses the same QSS generation convention already established elsewhere in the project:

```text
G = 2.38e17 × I_sun / W_cm × OpticalFactor
```

where `I_sun = QssLampIntensity / 1000`.

For the reference, the XML stores 1000 and 3000 mSun, W = 200 µm and OpticalFactor = 1.

## Basore-Hansen J0

The PV-2000A manual states that Basore-Hansen J0 is determined from the slope of inverse-small-perturbation-lifetime squared versus generation rate.

For the two-intensity Emitter J0 map, the sitewise slope is:

```text
m = ((1/τ2)² - (1/τ1)²) / (G2 - G1)
```

The vendor result is reproduced by:

```text
J0 = q × ni,compat² × (W/4) × m
```

with:

```text
q = 1.602176634e-19 C
ni,compat = 8.626227186463587e9 cm⁻³
```

and the final result converted from A/cm² to fA/cm².

For the paired 5017-point reference, Basore J0 matches the vendor CSV with maximum absolute error below 1e-8 fA/cm²; the observed error is at floating-point level (~1e-12 fA/cm²).

The fitted `ni,compat` is a **PV-2000 compatibility calibration for this validated result path**, not a claim that the proprietary PV-2000 implementation internally stores or independently uses that exact intrinsic-carrier-density constant.

## Implied Voc compatibility path

The analyzer derives injection level from:

```text
Δn = G × τeff.d
```

and uses:

```text
Voc = kT/q × ln( Δn × (N + Δn) / ni(T)² )
```

with the XML doping concentration and iteration-specific chuck temperature.

The supplied vendor export cannot be reproduced by the current general QSS-µPCD `ni(T)` normalization. The JZero analyzer therefore keeps a separate reference-regressed compatibility normalization for the first and second QSS result channels:

```text
ni,300(first)  = 1.1136399052670412e10 cm⁻³
ni,300(second) = 1.107764334152709e10 cm⁻³
```

using the same silicon temperature dependence as the QSS analyzer.

Across all 5017 sites, both Implied Voc maps reproduce the vendor export within 0.07 mV maximum absolute error. These two normalizations are explicitly compatibility values inferred from the current paired reference. They are not claimed as the proprietary PV-2000 internal formula, and alternate JZero result paths remain NEW PROFILE until matching vendor output is supplied.

## UI behavior

The dedicated JZero analyzer provides:

- Basore J0 as the default map;
- all seven vendor result quantities in the map selector;
- geometry-aware PseudoSquareCell nominal and EdgeExclusion outlines;
- equal physical X/Y scale in the automatic map view;
- filled-site and point map modes;
- valid-data filtering shared by map, distribution and summary statistics;
- Distribution with Count on X by default, Swap axes and Bins controls;
- manual Axes controls, wheel zoom and double-click Auto;
- pointwise CSV export for the selected metric;
- histogram CSV export;
- current-dataset and acquisition metadata panels.

The filled map uses the measured lattice cells directly rather than an expensive all-pixel interpolation, so dense 5017-site maps remain responsive while preserving the measured spatial resolution.

## Validated envelope

The current paired reference establishes:

- `JZeroMeasurement`;
- exactly two `UpcdIterationData` lifetime iterations;
- first/second QSS-intensity pairing by iteration order;
- `MapPattern + PseudoSquareCell`;
- X-fast row-major pseudo-square schedule;
- direct XML lifetime → vendor τeff.d;
- `Smax = W/(2τ)`;
- the Basore J0 compatibility equation above;
- the reference-regressed Implied Voc compatibility path;
- sample-standard-deviation summary statistics.

Ordinary numeric changes in pitch, target dimensions, EdgeExclusion, wafer thickness, doping, optical factor or the two QSS intensity values do not automatically define a new measurement type. However, the following are outside the current vendor-regressed envelope until paired output is supplied:

- another pattern or target geometry;
- more or fewer than two lifetime iterations;
- a different iteration/result ordering;
- a different raw data item schema;
- additional vendor result quantities;
- a materially different Implied Voc or Basore post-processing path.

Run:

```bash
npm run validate:jzero
```

Matching private references use the same basename under `private/reference/jzero/`.
