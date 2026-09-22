# Reference profiles and validation envelope

This document is the central registry for **what has actually been validated against PV-2000 reference output**.

A measurement type being supported does **not** mean every possible algorithm path of that type is vendor-validated. Validation applies to the explicit profile families recorded below.

A **reference instance** is one concrete XML + vendor-output pair. A **validated profile family** is the semantic input→output path established by one or more reference instances. Numeric settings can vary inside a validated family when they are inputs to the same already-validated formulas or coordinate rules. A new profile is triggered by a categorical/semantic path change, not merely by a different numeric value.

When new real XML + matching PV-2000 output become available, append them as evidence to an existing family when they exercise the same path. Reference material may remain private under `private/reference/` or, when a contributor explicitly has the right to publish it, be tracked as a public case under `reference_data/`. Create a NEW PROFILE only when the new data change the schema, algorithm branch, coordinate encoding, channel/result combination, unit convention, validity behavior, or other logic that could require different software behavior.

## Status vocabulary

- **validated** — numerically checked against a matching PV-2000 export/display for the stated reference envelope.
- **reproduced at shown precision** — only rounded PV-2000 display/screenshot values were available.
- **inferred** — reverse-engineered or physically plausible, but not confirmed against matching vendor output for that profile.
- **unsupported** — no implemented/validated calculation.

## Profile registry

### DIT-STD-001 — Standard COCOS / Dit reference

**Measurement type**

`DITMeasurement`

**Reference material**

Private W1 XML plus matching PV-2000 summary/raw exports and development reference calculations.

**Validated / established**

- Standard COCOS remains the established reference family and measured dark/light algorithm path for the current **Si** reference material.
- The historical validation record, obtained before the intrinsic-carrier-concentration cleanup, reported about **2.6% mean error** for Qtot and minimum Dit.
- The current Si implementation uses the legacy MATLAB midgap value `ni = 9.65e9 cm^-3` consistently for both midgap targeting and Qsc, with `εr = 11.68`; Qsc previously used the rounded `1.00e10 cm^-3`.
- The analyzer also supports a **Ge legacy-MATLAB compatibility path** using `ni = 2e13 cm^-3` and `εr = 16.2`, but no matching PV-2000 Ge export has been supplied, so Ge is not validated by DIT-STD-001.
- Re-run the private DIT-STD-001 Si regression before quoting the historical 2.6% figure as the exact error of the unified-ni implementation.

**Not validated by this profile**

- PV2000 COCOS-II vendor algorithm.
- Back Surface Shift behavior outside the supplied adjustment set.
- Germanium or another semiconductor material until a matching PV-2000 material-specific reference is regressed.
- Any new Dit XML/data path that changes the extraction behavior materially.

**NEW PROFILE triggers**

Treat as a new profile when a real dataset introduces a materially different Dit algorithm path or XML structure, including:

- `UseCocosII=true` vendor-output validation;
- a case where Back Surface Shift changes vendor results;
- new COCOS-II acceptance/window behavior;
- a different pointwise Dit/Vsb export structure;
- materially different flatband/extraction fields that require new parser or calculation assumptions;
- a new semiconductor material reference (including the first PV-2000 Ge reference) that establishes material-specific vendor parity.

Current COCOS-II status remains **inferred** until matching vendor pointwise output validates it.

---

### QSS-MAP-001 — QSS-µPCD 305-point map

**Measurement type**

`QssUpcdMeasurement`

**Reference material**

One matching XML + PV-2000 CSV export with 305 points.

**Validated / established**

- point count: **305**;
- X/Y coordinates: **exact pointwise match**;
- effective lifetime: **exact pointwise match**;
- Smax: matches to floating-point precision, max error approximately **5e-12 cm/s**;
- Implied Voc: maximum pointwise error below approximately **0.1 mV** using the documented PV-2000-compatibility `ni(T)` model;
- lifetime/Smax summary statistics reproduce the export;
- coordinate acquisition order is validated for this map pattern.

**Analyzer features not claimed as vendor algorithms**

- user-controlled valid-data filtering;
- distance-limited smooth-map visualization;
- histogram axis swapping and related UI behavior.

Those are analyzer features and should not be described as PV-2000 replication.

**NEW PROFILE triggers**

Examples include:

- a QSS map pattern or coordinate encoding outside the validated QSS-MAP-001 and QSS-MAP-002 families (ordinary numeric geometry changes inside either established coordinate rule are not automatically a new profile);
- a new XML path for lifetime/injection data;
- a configuration whose Smax or Implied Voc calculation fields differ;
- different temperature/ni handling;
- QSS-µPCD Scan/J0 or emitter-J0 data, which are separate scientific result paths rather than automatic extensions of QSS-MAP-001.

A new QSS profile must use the actual XML + matching PV-2000 export to determine whether existing coordinate and derived-quantity logic still applies.

---

### QSS-MAP-002 — QSS-µPCD SquareRegionPattern rectangular raster

**Measurement type**

`QssUpcdMeasurement`

**Reference material**

One matching XML + PV-2000 CSV export with **1050** points. This pair exercises `SquareRegionPattern + SquareCell`, a different coordinate encoding from QSS-MAP-001.

**Validated family**

- `SquareRegionPattern` stores raster origin/extent in `Region` and site counts in `Dimension`;
- coordinates are X-fast row-major, with X increasing within each row and Y increasing between rows;
- when no explicit `Pitch` exists, spacing is `Width/(Nx-1)` and `Height/(Ny-1)`;
- the `SquareCell` target is the nominal sample outline, while the explicit `Region` is the measured/smoothed raster support.

The current reference instance uses Region X = -40 mm, Y = -30 mm, Width = 70 mm, Height = 60 mm and Dimension = 35 × 30. These numbers are evidence, not runtime whitelist values.

**Validated / established**

- XML point count: **1050** = 35 × 30;
- reconstructed coordinate count: **1050**;
- first site: **(-40, -30) mm**;
- last site: **(30, 30) mm**;
- effective pitch: **70/34 ≈ 2.058823529 mm** in X and **60/29 ≈ 2.068965517 mm** in Y;
- all reconstructed X/Y coordinates match the paired PV-2000 CSV point-by-point to floating-point precision.

This reference expands the validated **coordinate reconstruction** envelope. It does not create a separate lifetime/Smax/Implied-Voc formula family: lifetime remains raw XML data, while derived-quantity validation claims remain those explicitly documented for QSS-MAP-001 unless separately regressed.

**Same-family numeric changes**

Different Region origin/width/height or Dimension values stay inside QSS-MAP-002 when the same Region + Dimension encoding and X-fast/ascending-Y order apply.

**NEW PROFILE triggers**

Examples include another pattern/coordinate encoding, reversed or serpentine acquisition semantics, a different point-count interpretation, or another vendor result path that changes how sites map to output rows.

### QSS HighDensityPattern — runtime support, inferred

Older QSS XMLs observed in the supplied development set use `HighDensityPattern` with a scalar `Dimension` and explicit normalized `Coefficients` covering a full square grid. Current observed instances include 15 × 15 and 20 × 20 on a 100 mm `RoundWafer` with 7 mm edge exclusion, plus 35 × 35 on a 156 × 156 mm `SquareCell` with 7 mm edge exclusion.

Runtime support preserves coefficient order and requires coefficient count = measured-value count. `SquareCell` coefficients are scaled to the EdgeExclusion-adjusted rectangle. `RoundWafer` coefficients are restricted to the strict normalized unit-circle subset (`x²+y² < 1`) and then scaled by the EdgeExclusion-adjusted radius.

This path is **inferred**, not a new validated profile, because no matching PV-2000 X/Y export has yet been supplied. A paired export should be used before promoting this coordinate mapping to validated status.

---

### QSS-INJ-001 — Dual QSS injection sweep / stored transient family

**Measurement type**

`DualQssMeasurement`

**Reference material**

A private corpus of **72 XML files**, of which **57** have matching same-basename PV-2000 raw CSV exports. The 57 paired files contain **1003 injection points**.

**Validated / established raw path**

- current XML family: `OnePointPattern + RoundWafer`, one `QssDataItem` per measurement;
- XML `Intensity` and `Power` vectors match the vendor CSV top-table QSS intensity and laser-power columns exactly;
- XML `Values` / `TransientInfo@LifeTime` match the CSV raw-data `LifeTime [μs]` values to export rounding, maximum absolute difference about **0.0050414 µs**;
- each current XML `TransientInfo` stores **2000** `SmallPoint` samples;
- the CSV raw export contains the first **1999** samples of each current transient and omits the final XML sample;
- **2,004,997** paired raw Time/Voltage samples compare exactly at exported precision;
- ordinary numeric changes in intensity schedule, wafer thickness, doping, optical factor or laser-power setting remain inside this raw schema family when the same structure is retained.

**Vendor result-table path observed but not yet reproduced**

The same CSVs expose `Lifetime[us]`, `dn[cm-3]`, `Implied Voc[V]` and `QDC` in the result table. Vendor `Lifetime[us]` is not the raw XML lifetime. Across the current 1003 paired rows, 775 have positive result-table Lifetime and 228 are zero.

For positive result-table Lifetime rows, `dn` is consistent with:

```text
G = 2.38e17 * I[suns] / W[cm] * OpticalFactor
dn = G * Lifetime
```

to the precision of the rounded CSV values (maximum relative difference below about 0.5% in the current corpus). This establishes the Lifetime→dn step, not the raw→vendor-Lifetime transformation.

The result-table Lifetime transformation, zero/blank acceptance rule, Implied-Voc processing, Basore-Hansen J0, Kane-Swanson J0 and any LP/HP stitching remain **inferred/unsupported** until reproduced point-by-point.

**Analyzer features not claimed as PV-2000 algorithms**

- log/linear presentation;
- positive-raw-lifetime summary filtering;
- selected transient inspection;
- local multi-XML LP/HP/repeat overlay;
- CSV export of parsed XML quantities.

**NEW PROFILE triggers**

Treat multiple iterations, another DataItem/transient layout, another pattern semantic or another unit convention as a new structural profile. A future implementation of the vendor result-table post-processing extends this profile only after the existing 57 paired exports are regressed point-by-point.

See `docs/ALGORITHMS_DUAL_QSS.md`.

---

### JZERO-MAP-001 — two-intensity Emitter J0 pseudo-square map

**Measurement type**

`JZeroMeasurement`

**Reference material**

One matching private XML + PV-2000 CSV export with **5017 sites**. The XML contains two `UpcdIterationData` arrays measured at **1000 mSun** and **3000 mSun**.

**Validated family**

- `MapPattern + PseudoSquareCell`;
- two lifetime iterations paired by site index;
- X-fast, ascending-Y centered lattice;
- scheduled target = intersection of the EdgeExclusion-adjusted rectangle and circle;
- seven vendor quantities: Basore J0, τeff.d ×2, Smax ×2 and Implied Voc ×2.

The current reference instance uses target Size = 156 × 156 mm, Diameter = 205 mm, EdgeExclusion = 7 mm, Pitch = 2 × 2 mm, WaferThickness = 200 µm, Doping = 1.5e16 cm⁻³ PType and OpticalFactor = 1. Those numeric values are evidence rather than runtime whitelist keys.

**Validated / established**

- XML lifetime point count: **5017 + 5017**;
- reconstructed coordinate count: **5017**;
- first site: **(-64, -70) mm**;
- last site: **(64, 70) mm**;
- all X/Y coordinates match the vendor CSV exactly;
- both τeff.d arrays match the export to floating-point precision (max abs error approximately **5.2e-13 µs**);
- both Smax arrays, using `Smax = W/(2τ)`, match to floating-point precision (max abs error approximately **5e-13 cm/s**);
- Basore-Hansen J0 uses the two-intensity slope of inverse lifetime squared versus generation rate and matches point-by-point with maximum absolute error approximately **9.1e-13 fA/cm²** under the documented JZero compatibility calibration;
- both Implied Voc channels are reproduced with maximum absolute errors of approximately **0.061 mV** and **0.066 mV**, respectively, using the separate JZero compatibility path documented in `docs/ALGORITHMS_JZERO.md`;
- Average / Median / sample Stdev / Min / Max are regressed for all seven quantities.

**Compatibility caveat**

The Basore and Implied-Voc compatibility constants are reverse-engineered from this paired result path. They reproduce the observed vendor output but are not claims about undisclosed PV-2000 internal constants. In particular, JZero Implied Voc must remain separate from the general QSS-map compatibility model because directly reusing that model produces a systematic offset on this reference.

**Same-family numeric changes**

Different two-QSS intensity values, pitch, pseudo-square dimensions, EdgeExclusion, wafer thickness, doping or optical factor stay inside this family when the same two-iteration schema, coordinate rule and result formulas apply. Numeric changes should still be sanity-checked, but they do not automatically create a new profile.

**NEW PROFILE triggers**

Examples include another pattern/target encoding, more or fewer than two lifetime iterations, a different iteration/result ordering, a different raw data item schema, additional vendor outputs, or evidence that the derived-result formulas/validity behavior change.

See `docs/ALGORITHMS_JZERO.md` and run `npm run validate:jzero`.

---

### ISC-MAP-001 — repeated-reading Initial Surface Charge map

**Measurement type**

`ISCMeasurement`

**Reference material**

One matching PV-2000 XML + CSV export. The XML contains repeated dark/light VCPD readings for every site; the CSV contains the vendor Vcpd Dark, Vcpd Light and Vsb result columns plus summary statistics.

**Validated family**

Semantic input/output path:

- one iteration;
- repeated `VcpdDark` and `VcpdLight` readings per `ISCDataItem`;
- `MapPattern + SquareCell`;
- finite XML `VcpdOffset` and `VsbCorrectionFactor`;
- vendor outputs Vcpd Dark / Vcpd Light / Vsb in volts.

Let `D` and `L` be the per-site means of the raw dark/light readings, `O` the XML Vcpd offset and `F` the XML VSB correction factor. The paired export establishes:

```text
Vcpd Dark  = D - O
Vsb        = F * (D - L)
Vcpd Light = Vcpd Dark - Vsb
```

The current reference instance has 169 sites, 24 readings/site, a 100 × 100 mm SquareCell, 30 mm EdgeExclusion and 3 × 3 mm pitch. Those numeric settings are evidence, not runtime whitelist values.

**Validated / established**

- 169 XML sites = 169 vendor rows;
- centered X-fast row-major coordinates from -18 to +18 mm in both axes match the vendor export exactly;
- Vcpd Dark pointwise maximum absolute error ≈ **3.55e-15 V**;
- Vcpd Light pointwise maximum absolute error ≈ **3.55e-15 V**;
- Vsb pointwise maximum absolute error ≈ **7.49e-16 V**;
- Average / Median / sample Stdev / Min / Max reproduce the vendor summary to ≈ **3.33e-15** maximum absolute error.

**Analyzer features not claimed as vendor algorithms**

- browser raster color interpolation/palette;
- distribution histogram presentation;
- shared plot zoom/manual-axis controls.

The selected-site raw-reading plot exposes the underlying repeated XML readings; the manual documents ISC Raw Data Export as the voltage transients/readings for each measurement point.

**NEW PROFILE triggers**

Examples include:

- another pattern/coordinate encoding or target geometry requiring a different scheduling rule;
- multiple iterations or another raw-reading structure;
- a different offset/correction path or missing correction factor semantics;
- another unit convention or vendor result set.

Ordinary numeric changes in pitch, target size, edge exclusion, reading count, offset or correction factor stay inside this family when the same semantic path applies.

---

### VCPD-MAP-001 — direct dark-contact-potential wafer map

**Measurement type**

`VcpdMeasurement`

**Reference material**

One matching PV-2000 XML + CSV export plus a PV-2000 result screenshot. The XML contains one `Readings/double` value for every `VcpdDataItem`; the CSV contains X/Y coordinates, vendor `Vcpd Dark [V]` and summary statistics.

**Validated family**

Semantic input/output path:

- one iteration;
- `VcpdDataItem/Readings` with exactly one reading/site;
- `MapPattern + RoundWafer`;
- `LightOn=false`;
- iteration-level `VcpdOffset=0 V`;
- vendor output `Vcpd Dark [V]`.

For this paired reference:

```text
Vcpd Dark = XML Reading
```

The runtime stores VCPD site results through the shared ISC/Kelvin-probe data model and uses the mean of the `Readings` container. This does **not** expand the validated claim to multiple readings/site or non-zero offsets.

The reference instance has 1649 sites, one reading/site, a 200 mm RoundWafer, 8 mm EdgeExclusion and 4 × 4 mm pitch. Those numeric settings are evidence, not a runtime whitelist.

**Validated / established**

- 1649 XML sites = 1649 vendor rows;
- scheduled radius = 200/2 − 8 = **92 mm**;
- strict circular `x²+y²<r²` X-fast row-major lattice reproduces every vendor coordinate exactly;
- first coordinate = **(-24, -88) mm** and last coordinate = **(24, 88) mm**;
- Vcpd Dark pointwise maximum absolute error = **0 V**;
- Average = **0.40415552129527 V**;
- Median = **0.431620389 V**;
- sample Stdev = **0.292987392588935 V**;
- Min = **-3.43040323 V**;
- Max = **2.16074562 V**;
- analyzer finite-site summary reproduces the vendor summary to floating-point precision.

**Shared analyzer behavior**

`VcpdMeasurement` reuses the ISC/Kelvin-probe map, distribution, selected-site reading inspection, geometry, zoom/manual-axis and CSV-export infrastructure. Its result selector contains only Vcpd Dark; ISC-only Vcpd Light and VSB are not synthesized.

**NEW PROFILE triggers**

Examples include:

- non-zero iteration-level VcpdOffset;
- `LightOn=true`;
- multiple readings/site;
- another pattern/coordinate encoding or target geometry;
- multiple iterations;
- another unit convention or additional vendor result quantity.

---

### LBIC-SINGLE-001 — single-beam Current/Reflectivity/IQE family

**Measurement type**

`LBICMeasurement`

**Reference material**

Four matching PV-2000 XML + CSV pairs.

**Validated family**

Semantic input/output path:

- one iteration;
- one beam;
- `SquareRegionPattern`;
- current unit µA;
- finite positive photon FluxCache associated with that beam;
- raw numeric channels:
  - `Current`
  - `DirectReflection`
  - `ScatteredReflection`
- vendor result set:
  - Current
  - Reflectivity
  - IQE.

Numeric wavelength, laser power, photon flux, Region origin/size, pitch and raster dimensions are parameters inside this family; changing them does not by itself create a new profile.

**Reference instances currently available**

All four current references happen to use 984 nm, power 0.6 and FluxCache 1708439235302983. Their raster geometries include:

1. 51 × 51, Region origin (-37, 42) mm, Size 5 × 5 mm;
2. 51 × 51, Region origin (-38.5, 42) mm, Size 5 × 5 mm;
3. 101 × 101, Region origin (-37, 42) mm, Size 5 × 5 mm.

The 101 × 101 geometry is represented by two independent measurements. These concrete values are evidence, not runtime whitelist values.

**Validated / established**

Coordinate reconstruction:

```
dx = width  / (nx - 1)
dy = height / (ny - 1)
index = row * nx + col
x = x0 + col * dx
y = y0 + row * dy
```

- X-fast, row-major acquisition order;
- positive-Y progression;
- X/Y coordinates match the vendor exports exactly.

PV-2000 Reflectivity:

```
Reflectivity[%] = DirectReflection[%] + ScatteredReflection[%]
```

PV-2000-compatible IQE path:

```
q_PV2000 = 1.602e-19 C
EQE[%] = Current[µA] * 1e-6 / q_PV2000 / photonFlux * 100
IQE_raw[%] = EQE[%] / (1 - Reflectivity[%] / 100)
```

Vendor output validity observed in all four references:

- non-computable IQE is blank;
- calculated IQE > 100% is blank;
- finite retained IQE values reproduce the PV-2000 export at approximately 1e-12 percentage-point scale;
- blank/valid behavior is reproduced;
- summary statistics use finite retained values;
- Stdev is sample standard deviation.

Default analyzer results therefore mirror the vendor exports:

- Current;
- Reflectivity;
- IQE.

Advanced diagnostic/intermediate channels contain:

- Direct reflectance;
- Scattered reflectance;
- EQE;
- unknown numeric XML channels.

**Still not validated**

- standalone EQE as a vendor-exported result, because these CSVs do not expose an EQE column;
- multi-beam semantics outside the independently validated `LBIC-MULTI-002` per-beam result path;
- diffusion length;
- alternate raw/output channel paths.

**NEW PROFILE triggers**

Categorical changes such as:

- another pattern type or coordinate encoding;
- multiple beams or iteration semantics that alter result interpretation;
- another current/unit convention;
- a different numeric BeamData channel set (for example raw Reflectivity/EQE/IQE instead of Direct + Scattered);
- a different vendor output combination or validity/blanking rule.

The following **do not by themselves** create a new profile: a different wavelength, laser power, finite FluxCache value, Region origin/size, pitch, or grid dimensions such as 4×4 versus 5×5, provided the same single-beam input/output path is used.

For a NEW PROFILE, runtime may still calculate candidates, but derived values remain **inferred** until the real XML + matching PV-2000 output are regressed.


### LBIC-MULTI-002 — multi-beam MapPattern + PseudoSquareCell family

**Measurement type**

`LBICMeasurement`

**Reference material**

One matching PV-2000 XML + CSV pair with **54,449** spatial sites and four beams (984, 952, 855 and 656 nm). The XML uses `MapPattern + PseudoSquareCell`; the vendor export contains X/Y plus Current / Reflectivity / IQE for each beam.

**Validated family**

Semantic input/output path:

- one iteration;
- two or more independent beam keys, each joined to `LaserSettings` and `FluxCache` by beam index;
- `MapPattern + PseudoSquareCell`;
- current unit µA;
- raw per-beam `Current`, `DirectReflection` and `ScatteredReflection`;
- finite positive per-beam photon flux;
- vendor per-beam Current / Reflectivity / IQE outputs.

The number of beams, wavelengths, power values and photon-flux values are numeric parameters inside this family when every beam follows the same independent per-beam result path.

**Pseudo-square coordinate reconstruction**

The reference XML contains:

- target Size = 125 × 125 mm;
- Diameter = 150 mm;
- EdgeExclusion = 3 mm;
- Pitch = 0.5 × 0.5 mm.

The scheduled pseudo-square is the intersection of the edge-exclusion-adjusted rectangle and circle:

```
halfWidth  = Width / 2  - EdgeExclusion
halfHeight = Height / 2 - EdgeExclusion
radius     = Diameter / 2 - EdgeExclusion
```

A centered X-fast, ascending-Y lattice is generated at the XML pitch, retaining sites satisfying the adjusted rectangular limits and circular limit. For the supplied instance this gives halfWidth = halfHeight = 59.5 mm, radius = 72 mm and exactly **54,449** sites.

**Validated / established**

- reconstructed coordinate count: **54,449**;
- first site: **(-40.5, -59.5) mm**;
- last site: **(40.5, 59.5) mm**;
- all X/Y coordinates match the vendor CSV point-by-point with maximum absolute error **0 mm**;
- raw Current matches point-by-point for all four beams;
- displayed Reflectivity is the raw optical sum clamped to the vendor display range:

```
Rraw = DirectReflection + ScatteredReflection
Reflectivity_display = clamp(Rraw, 0%, 100%)
```

- the reference contains four 656 nm sites with negative `Rraw`; PV-2000 displays Reflectivity = 0% at those sites;
- IQE uses the **unclamped raw optical sum** in the denominator, while `Rraw >= 100%` remains non-computable:

```
EQE[%] = Current[µA] * 1e-6 / (1.602e-19 C) / photonFlux * 100
IQE_raw[%] = EQE[%] / (1 - Rraw/100)
```

- finite IQE values reproduce the vendor export to approximately **1e-13 percentage-point** scale;
- vendor `Ud.` IQE cells correspond to non-computable or calculated-above-100% results and are represented as unavailable values in the analyzer;
- summary statistics use the finite retained vendor-compatible values.

**Analyzer geometry behavior**

The map uses equal physical X/Y scale, shows the nominal `PseudoSquareCell` outline, shows the EdgeExclusion-adjusted scheduled boundary as a dashed outline, and clips raster cells to that scheduled shape. X/Y line profiles are selected by physical coordinate equality rather than dense rectangular array indexing, so masked pseudo-square rows/columns remain correct.

**Still not validated**

- diffusion-length (`DL`) calculation. The paired CSV contains DL, but the XML does not expose a raw DL channel and this profile does not establish the proprietary DL algorithm;
- multi-iteration LBIC semantics;
- other target/pattern encodings;
- different raw channel/result combinations.

**NEW PROFILE triggers**

Examples include another coordinate encoding, another target-shape scheduling rule, coupled cross-beam calculations, a different unit convention, a different raw BeamData channel set, or a different vendor output/validity path.

Ordinary changes in pseudo-square Width/Height/Diameter/EdgeExclusion, pitch, beam count, wavelength, power and finite FluxCache values stay inside this family when the same independent per-beam path applies.

---

## Procedure for adding a new profile

When a new real data combination arrives:

1. place confidential/local material under ignored `private/reference/`, or add explicitly publishable contribution material under `reference_data/<measurement>/<case-id>/` with a case README; never copy private material into the public tree merely for convenience;
2. confirm the XML and vendor export are from the same measurement/result context and record any screenshot/display evidence;
3. identify whether it exercises the same semantic input/output path as an existing validated family;
4. if not, assign a new profile ID in this document;
5. compare parser structure and point count first;
6. compare coordinates/acquisition order point-by-point where applicable;
7. compare raw quantities point-by-point;
8. reverse-engineer derived quantities only from the matching vendor output;
9. check validity/blank/mask behavior and summary statistics;
10. revise software logic if the new profile behaves differently;
11. add or extend the appropriate validator; public reference cases should be regression-testable without becoming runtime dependencies;
12. update this registry, `docs/VALIDATION.md`, the relevant algorithm document, HANDOFF and CHANGELOG;
13. only then change a result from **inferred** to **validated**.

Do not create artificial NEW PROFILE boundaries around ordinary numeric parameter changes. At the same time, do not expand validation across a genuinely different input/output path merely because a formula is physically reasonable or the `xsi:type` is unchanged.
