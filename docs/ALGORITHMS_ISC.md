# ISC algorithm notes

## Scope

This shared Kelvin-probe module handles PV-2000 `ISCMeasurement` XML results (Initial Surface Charge) and also dispatches the separately validated `VcpdMeasurement` result family. ISC reconstruction remains documented here; VCPD-specific semantics are documented in [ALGORITHMS_VCPD.md](ALGORITHMS_VCPD.md). The shipped browser remains XML-only; matching PV-2000 CSV exports are used only for regression.

The PV-2000A manual describes ISC as a non-contact Kelvin-probe measurement of VCPD in the dark and under illumination, with VSB determined from the dark/light difference. The ISC data-viewing section lists exactly three result quantities: **Vcpd Dark [V]**, **Vcpd Light [V]** and **VSB [V]**. It also states that ISC Raw Data Export contains the voltage transients/readings for each measurement point.

## Validated scalar reconstruction

One paired `ISCMeasurement` XML + PV-2000 CSV export establishes the current validated result path. Each XML `ISCDataItem` contains repeated `VcpdDark` and `VcpdLight` readings. Let:

- `D` = mean of the raw `VcpdDark` readings at one site;
- `L` = mean of the raw `VcpdLight` readings at one site;
- `O` = XML `MeasurementData/VcpdOffset` (legacy spelling `VcpdOffsett` is also accepted);
- `F` = XML `MeasurementData/VsbCorrectionFactor`.

The vendor export is reproduced point-by-point by:

```text
Vcpd Dark = D - O
VSB       = F * (D - L)
Vcpd Light = Vcpd Dark - VSB
```

The final line is important: when `F != 1`, the PV-2000 exported `Vcpd Light` is **not** simply `L - O`. The correction factor is applied through the reported VSB path. On the current paired reference, all three result columns reproduce the vendor CSV to floating-point precision.

If `VsbCorrectionFactor` is absent, the analyzer does not invent a vendor-compatible VSB or corrected Vcpd Light; those results remain unavailable while the dark result can still be reconstructed when its raw readings and offset are available.

## Validated map geometry

The paired reference uses:

- `Pattern/@xsi:type = MapPattern`;
- `Target/@xsi:type = SquareCell`;
- target Size = 100 × 100 mm;
- EdgeExclusion = 30 mm;
- Pitch = 3 × 3 mm;
- 169 sites (13 × 13).

For this profile, the scheduled half-extents are:

```text
hx = Width/2  - EdgeExclusion
hy = Height/2 - EdgeExclusion
```

The centered lattice is generated with X-fast row-major acquisition order:

```text
ix = -floor(hx / PitchX) ... +floor(hx / PitchX)
iy = -floor(hy / PitchY) ... +floor(hy / PitchY)
x = ix * PitchX
y = iy * PitchY
```

For the reference instance this gives coordinates from -18 to +18 mm in both axes. All 169 X/Y pairs match the vendor export exactly.

The validated ISC/VCPD profiles use the documented MapPattern target/pitch coordinate rules. Raw XML coefficients are preserved when present, but an unclassified coefficient encoding is not treated as millimetres automatically. Another coefficient interpretation remains inferred/unsupported until paired PV-2000 X/Y output establishes its coordinate semantics.

## Statistics

The ISC summary table reports finite-site Average, Median, sample Stdev, Min and Max. The paired reference reproduces the vendor summary to floating-point precision.

## Analyzer valid-data filter

ISC now uses the shared site-selection contract introduced by the measurement-domain architecture. The user may choose **Vcpd Dark**, **Vcpd Light** or **VSB** as the filter quantity and set lower/upper bounds. That selection creates one site-level active mask; the same mask is then applied to every displayed ISC result quantity, summary statistic, spatial map, distribution and map export. Quantity-specific availability is applied after the shared active mask.

Filtering is analyzer-side presentation/analysis state and does **not** alter the reconstructed PV-2000 result values or the raw XML readings. Excluded sites retain their values and can still be inspected. Map exports include the result value, quantity availability, filter-pass state, displayed state, selected filter quantity and active lower/upper bounds.

`Reset` expands the range to all available sites of the selected filter quantity. `1–99%` provides a convenience percentile range and is not a vendor algorithm or automatic validity claim.

## Visualization and export

The analyzer provides:

- selectable Vcpd Dark / Vcpd Light / VSB spatial map;
- distribution histogram;
- selected-site repeated dark/light reading plot;
- CSV export for the selected map quantity, histogram and selected-site raw readings;
- shared wheel zoom, axis-only zoom, double-click Auto reset and compact header Axes popovers for manual limits;
- Distribution axis swapping;
- geometry-aware map framing: solid nominal RoundWafer/SquareCell target boundary and dashed EdgeExclusion-adjusted scheduled boundary, with equal physical X/Y scale.

The raster rendering and histogram presentation are analyzer visualizations. They are not claimed to reproduce PV-2000's proprietary interpolation or color-scaling implementation.

## Validation boundary

The current vendor-validated family is the repeated-reading `ISCMeasurement` result path with `MapPattern + SquareCell`, XML offset/correction factor and vendor Vcpd Dark / Vcpd Light / VSB outputs. Ordinary numeric changes such as pitch, target dimensions, edge exclusion, reading count, offset or correction factor do not automatically create a new profile when the same input/output path applies.

A different pattern/coordinate encoding, target geometry requiring another scheduling rule, iteration structure, raw-reading schema, correction path, unit convention or vendor result set is a **NEW PROFILE** and requires its own XML + matching PV-2000 output before validation expands.
