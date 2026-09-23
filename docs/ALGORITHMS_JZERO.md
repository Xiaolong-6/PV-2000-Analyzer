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

## Calculation semantics and geometry semantics

The JZero calculation path and the measurement geometry are separate concerns.

The calculation path is determined by the JZero measurement schema: two lifetime iterations, two QSS intensities, wafer thickness, doping, optical factor and iteration metadata. Pattern/Target determines where those paired lifetime sites are located.

The supplied paired reference validates one geometry instance, but that geometry does not define the JZero calculation itself.

## SquareRegion and incomplete-acquisition runtime support

JZero now also accepts resolver-supported `SquareRegionPattern` geometry from the structured `Region` + `Dimension` fields. Pattern/Name remains display metadata and is not used to infer grid size. A 1 × 1 SquareRegion therefore renders as a single measurement position; larger regions use the explicit row-major schedule reconstructed from Region origin/size and Dimension.

Incomplete acquisition is treated separately from calculation validity. If the XML job status explicitly indicates an interrupted run (for example `Terminated`) and fewer spatial sites than the full schedule were saved, the shared geometry layer may map available DataItems to the leading X-fast / ascending-Y schedule prefix. Such coordinates are labelled **partial / inferred** and do not extend the validated geometry profile.

The calculation layer now preserves available first-intensity data when the second JZero lifetime iteration is missing or shorter. All seven result arrays remain aligned to one common site index space:

- first-iteration τeff.d, Smax and Implied Voc remain available where their inputs are finite;
- second-iteration quantities are unavailable where that iteration was not acquired;
- Basore J0 is available only at sites with both lifetime values;
- missing quantities are represented as unavailable values rather than shifting or dropping site indices.

A complete, non-interrupted two-iteration acquisition continues to use the existing `JZERO-CALC-001` validated path unchanged. Incomplete runs are runtime-supported but are not promoted to vendor-validated calculation parity without matching PV-2000 output.

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

- Basore J0 as the default map when paired two-intensity data are available; otherwise the first τeff.d channel becomes the default view;
- all seven vendor result quantities in the map selector;
- geometry-aware PseudoSquareCell nominal and EdgeExclusion outlines;
- equal physical X/Y scale in the automatic map view;
- filled-site and point map modes;
- shared site-level valid-data filtering across summary, map, distribution and export;
- Distribution with Count on X by default, Swap axes and Bins controls;
- manual Axes controls, wheel zoom and double-click Auto;
- pointwise CSV export for the selected metric;
- histogram CSV export;
- current-dataset and acquisition metadata panels.

The filled map uses the measured lattice cells directly rather than an expensive all-pixel interpolation, so dense 5017-site maps remain responsive while preserving the measured spatial resolution.


## Valid-data filter semantics

JZero now uses the shared `PV2000.selection.createFilter()` and shared Valid-data filter UI contract introduced in `v20260923.12`. Any of the seven JZero result quantities may be selected as the filter metric. Lower/upper limits create one **site-level active mask** in the common site index space shared by both lifetime iterations and every derived result.

For a displayed result quantity, the renderer combines that shared active mask with the displayed quantity's own finite/support mask. This matters when a site passes a lifetime-based filter but a derived J0, Smax or Implied Voc value is not computable at that site: the paired site remains active, while the unavailable displayed value is omitted from that quantity's summary, map and distribution.

Filtering is Analyzer-side state. It does not mutate either XML lifetime iteration, change the two-iteration pairing, or alter the Basore J0 / Smax / Implied Voc equations. `Reset` restores the available range of the selected filter metric and `1–99%` is only a convenience percentile range, not a PV-2000 validity rule.

Pointwise exports retain all paired sites and add filter provenance: metric availability, whether the site passes the shared filter, whether the selected output is displayed, the filter metric, and the active bounds. Histogram exports include the same filter metric/bounds metadata.

## Validated envelope

The current paired reference establishes the **calculation path**:

- `JZeroMeasurement`;
- exactly two `UpcdIterationData` lifetime iterations;
- first/second QSS-intensity pairing by iteration order;
- direct XML lifetime → τeff.d;
- Smax, Basore J0 and the JZero-specific Implied Voc compatibility equations.

It separately establishes the **geometry profile**:

- `MapPattern + PseudoSquareCell`;
- X-fast row-major pseudo-square schedule;
- direct XML lifetime → vendor τeff.d;
- `Smax = W/(2τ)`;
- the Basore J0 compatibility equation above;
- the reference-regressed Implied Voc compatibility path;
- sample-standard-deviation summary statistics.

Ordinary numeric changes in pitch, target dimensions, EdgeExclusion, wafer thickness, doping, optical factor or the two QSS intensity values do not automatically define a new measurement type.

A different resolver-supported Pattern/Target combination may reuse the same two-iteration JZero calculation path while carrying a separate geometry status. `MapPattern + PseudoSquareCell` is currently geometry-validated. `OnePointPattern + SquareCell` is loadable through the shared geometry resolver and remains geometry-**inferred** until paired X/Y/display evidence is supplied.

The following remain outside the current vendor-regressed **calculation** envelope until paired output is supplied:
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
