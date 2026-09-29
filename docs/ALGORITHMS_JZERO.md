# Emitter J0 map algorithm and validation status

## Scope

This module handles PV-2000 `JZeroMeasurement` XML results. The runtime remains XML-only. Matching PV-2000 CSV exports are development references used for pointwise regression and are never required during analysis.

The paired evidence contains two `UpcdIterationData` lifetime states measured at the first and second QSS intensities. The analyzer pairs the two iterations by site index and exposes the seven vendor result quantities documented for Emitter J0 Map:

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

The original 5017-site pair validated one pseudo-square geometry instance. The 100-case private corpus now adds eight successful numeric JZero exports across OnePoint, SquareRegion, HighDensity and Map geometries. Across those pairs, lifetime, Smax and Basore J0 retain floating-point/approximately 1e-11-scale parity while geometry resolves independently. This establishes `JZERO-CALC-001` as a calculation profile rather than a Pattern/Target profile.

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

Each `UpcdIterationData/Data/DataItem/Value` is the vendor-exported small-perturbation lifetime for the corresponding QSS intensity. Both 5017-point lifetime arrays match the original vendor export to floating-point precision. Across all eight successful 100-case JZero exports, both lifetime channels remain at floating-point parity; the largest observed absolute difference is approximately 5.12e-13 µs.

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

For the paired 5017-point reference, Basore J0 matches the vendor CSV at floating-point level (~1e-12 fA/cm²). Across all eight successful 100-case JZero exports, the maximum observed Basore J0 difference remains approximately 4.73e-11 fA/cm², including OnePoint, SquareRegion and HighDensity geometries.

The fitted `ni,compat` is a **PV-2000 compatibility calibration for this validated result path**, not a claim that the proprietary PV-2000 implementation internally stores or independently uses that exact intrinsic-carrier-density constant.

## Implied Voc compatibility path

Injection level remains:

```text
Δn = G × τeff.d
```

For the current managed PV-2000 DLL, JZero Implied Voc follows a recovered
legacy compatibility path rather than the general QSS-map physical
`ni(T)` model:

```text
Tcompat = ChuckTemperature_C + 272.15
Vt      = 1.38066e-23 × Tcompat / 1.602e-19
ni      = 1.22e10 cm⁻³

Voc = Vt × ln( Δn × (N + Δn) / ni² + 1 )
```

The historical details are intentional compatibility behavior. In the current
managed DLL, `NiForSilicon(T)` ignores its temperature argument and returns
`1.22e10 cm⁻³`; the Celsius conversion uses `+272.15`, not the conventional
`+273.15`; and the DLL uses the rounded constants shown above. `GetTemperatureForIteration()` falls back to **27 °C** when the stored chuck temperature is zero/missing, and the injection conversion falls back to **200 µm** when wafer thickness is non-positive. These details
must not be "corrected" inside the PV-2000-compatible path because doing so
changes vendor parity.

The earlier public reconstruction fitted two effective `ni,300` values to the
original warm Map/PseudoSquare reference and then applied a physical silicon
`ni(T)` correction. That happened to reproduce the approximately 28.5 °C map
closely, but it produced a systematic approximately 18.7–21.1 mV offset on
paired data near 23.6–24.2 °C. The apparent geometry dependence was therefore
a temperature/corpus confounder, not a geometry-dependent algorithm.

Private managed-IL tracing plus the paired harness corpus closes this path as
`JZERO-VOC-COMPAT-001`. Across 12 harness-generated JZero XML/vendor-CSV
pairs and 15,886 finite Implied-Voc values, covering Map, HighDensity,
NinePoint, SquareRegion and OnePoint geometries, the recovered DLL equation is
pointwise exact at the exported precision; the forensic audit reports
`0.000000000 mV` maximum absolute error.

This is a **PV-2000 compatibility equation**, not a recommendation for a modern
physical silicon intrinsic-carrier model. A physically motivated Voc model
must remain separately labelled and must not silently replace these legacy
constants in vendor-comparison mode.

## UI behavior

The dedicated JZero analyzer provides:

- Basore J0 as the default map when paired two-intensity data are available; otherwise the first τeff.d channel becomes the default view;
- all seven vendor result quantities in the map selector;
- geometry-aware PseudoSquareCell nominal and EdgeExclusion outlines;
- equal physical X/Y scale in the automatic map view;
- filled-site and point map modes;
- shared site-level valid-data filtering across summary, map, distribution and export;
- Distribution with Count on X by default, Swap axes and Bins controls;
- manual Axes controls, Ctrl/⌘ + wheel zoom and double-click Auto; plain wheel/trackpad motion scrolls the workspace pane;
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

The eight successful 100-case numeric pairs establish the **calculation path**:

- `JZeroMeasurement`;
- exactly two `UpcdIterationData` lifetime iterations;
- first/second QSS-intensity pairing by iteration order;
- direct XML lifetime → τeff.d;
- Smax and Basore J0 under `JZERO-CALC-001`.

Implied Voc is validated separately as `JZERO-VOC-COMPAT-001`. The current
managed-DLL formula is geometry-independent and is backed by 12 harness
XML/vendor-CSV pairs / 15,886 finite Voc values across Map, HighDensity,
NinePoint, SquareRegion and OnePoint geometries. Complete two-iteration
`JZERO-CALC-001` acquisitions therefore expose the compatible Voc quantity as
validated without tying that status to one Pattern/Target identity.

Geometry is validated on its own axis. The current paired JZero corpus exercises shared OnePoint, SquareRegion, HighDensity and Map profiles, with maximum observed X/Y error approximately 4.97e-14 mm. The original `MapPattern + PseudoSquareCell` case remains the clearest dense-map geometry reference.

Ordinary numeric changes in pitch, target dimensions, EdgeExclusion, wafer thickness, doping, optical factor or the two QSS intensity values do not automatically define a new measurement type.

A different resolver-supported Pattern/Target combination may reuse the same two-iteration JZero calculation path while carrying its own geometry profile. Paired evidence now covers OnePoint, SquareRegion, HighDensity and Map geometry families; an unpaired or incomplete path remains inferred until matching coordinate/output evidence is available.

The following remain outside the current vendor-regressed **calculation** envelope until paired output is supplied:
- more or fewer than two lifetime iterations;
- a different iteration/result ordering;
- a different raw data item schema;
- additional vendor result quantities;
- a materially different Basore post-processing path;
- a different PV-2000 version whose managed Implied-Voc constants or temperature convention differ from `JZERO-VOC-COMPAT-001`.

Run:

```bash
npm run validate:jzero
```

Matching private references use the same basename under `private/reference/jzero/`.
