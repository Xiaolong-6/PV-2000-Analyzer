# Reference profiles and validation envelope

This document is the central registry for **what has actually been validated against PV-2000 reference output**.

A measurement type being supported does **not** mean every possible algorithm path of that type is vendor-validated. Validation applies to the explicit profile families recorded below.

A **reference instance** is one concrete XML + vendor-output pair. A **validated profile family** is the semantic input→output path established by one or more reference instances. Numeric settings can vary inside a validated family when they are inputs to the same already-validated formulas or coordinate rules. A new profile is triggered by a categorical/semantic path change, not merely by a different numeric value.

When new real XML + matching PV-2000 output become available, append them as evidence to an existing family when they exercise the same path. Reference material may remain private under `private/reference/` or, when a contributor explicitly has the right to publish it, be tracked as a public case under `reference_data/`. Create a NEW PROFILE only when the new data change the schema, algorithm branch, coordinate encoding, channel/result combination, unit convention, validity behavior, or other logic that could require different software behavior.

## PV-2000 software-version boundary

The current **version-level reference baseline is Semilab PV-2000 v1.3.0.5**. Validation claims in this registry are therefore anchored to measurement files and matching vendor outputs produced by that software release unless a profile explicitly records another source version.

This is a validation boundary, not an exact-version runtime whitelist. XML from another PV-2000 release may be schema/profile-compatible and may load correctly, but it must be described as **version-unvalidated** until paired output from that release confirms the same input→output behavior. When contributor/reference data provide the originating PV-2000 software version, record it with the reference evidence.

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

- Standard COCOS remains the established measured dark/light reference family.
- The historical validation record, obtained before the intrinsic-carrier-concentration cleanup, reported about **2.6% mean error** for Qtot and minimum Dit.
- The default Analyzer Si model uses the legacy MATLAB midgap value `ni = 9.65e9 cm^-3` consistently for both midgap targeting and Qsc, with `εr = 11.68`; Qsc previously used the rounded `1.00e10 cm^-3`.
- The optional Ge choice is an **Analyzer-only legacy-MATLAB model** using `ni = 2e13 cm^-3` and `εr = 16.2`. PV-2000 itself has no Si/Ge material selector, so a Ge-sample export is not evidence for a PV-2000 Ge algorithm/profile.
- Re-run the private DIT-STD-001 Si-sample regression before quoting the historical 2.6% figure as the exact error of the unified-ni implementation.
- A broader private OnePoint/raw-CSV audit has 176 row-aligned Standard COCOS pairs and exact Qc schedule agreement across 11,575 process rows. Only 168 pairs remain within 2 mV maximum dark-channel error; eight diverge, and the corrected light/Vsb/Dit export path remains unresolved. This audit does not expand validation to the whole corpus or to the Analyzer Ge option.

**Not validated by this profile**

- PV2000 COCOS-II vendor algorithm.
- Back Surface Shift behavior outside the supplied adjustment set.
- Any new Dit XML/data path that changes the extraction behavior materially.
- Any separately reprocessed/corrected-light export branch that is not uniquely recoverable from the saved XML.

**NEW PROFILE triggers**

Treat as a new profile when a real dataset introduces a materially different Dit algorithm path or XML structure, including:

- `UseCocosII=true` vendor-output validation;
- a case where Back Surface Shift changes vendor results;
- new COCOS-II acceptance/window behavior;
- a different pointwise Dit/Vsb export structure;
- materially different flatband/extraction fields that require new parser or calculation assumptions;
- independent evidence of a material-specific vendor algorithm; a Ge-named sample/export alone does not establish one because PV-2000 provides no Si/Ge selector in these files.

Current COCOS-II status remains **inferred** until matching vendor pointwise output validates it.

---

### QSS-MAP-001 — QSS-µPCD MapPattern + RoundWafer family

**Measurement type**

`QssUpcdMeasurement`

**Reference material**

The original paired reference contains 305 sites. A later private corpus adds **96 RoundWafer XML files**, including 100 mm / 305-site and 125 mm / 489-site maps at 5 mm pitch. **Nine** of those measurements have matching numeric PV-2000 CSV exports; **108** associated PV-2000 XPS printouts establish the observed result/display family. Private files remain regression evidence and are not runtime dependencies.

**Validated / established**

- coordinate rule: `MapPattern + RoundWafer`, X-fast within ascending-Y rows, with the strict circular schedule after EdgeExclusion;
- original 305-site X/Y coordinates: exact pointwise match;
- all nine later paired X/Y exports: exact pointwise match;
- effective lifetime: XML → paired CSV exact for the later nine pairs;
- Smax: `W/(2τ)` reproduces the paired exports to numeric export precision; the original reference remains at floating-point precision;
- ordinary numeric diameter/pitch/thickness/doping/optical-factor changes stay inside this family when the same XML/result path is used;
- PV-2000 can store **`τeff.d = -1 µs` as a raw sentinel** and can carry it numerically into raw Smax/display summaries. Raw values must therefore be preserved for parity and export rather than silently rewritten.

**Implied Voc compatibility envelope**

- the original 305-point reference instance remains within approximately **0.1 mV** maximum error using the documented compatibility `ni(T)` model;
- across the later nine-pair corpus, the same model reaches approximately **1.94 mV maximum absolute error** on finite vendor Implied-Voc values;
- therefore the <0.1 mV figure is an instance-level result, not a family-wide guarantee.

**Analyzer features not claimed as vendor algorithms**

- default scientific exclusion of non-positive lifetime sentinels while preserving the raw value;
- user-controlled valid-data filtering;
- lifetime → SRV post-processing with planar/textured controls;
- explicit Physical Si / Physical Ge Implied-Voc estimates;
- distance-limited smooth-map visualization;
- histogram axis swapping and related UI behavior.

The QSS XMLs in this corpus do **not** provide a trustworthy material identifier. Material-specific analysis must be selected explicitly and must never be inferred from filenames, result names or substrate IDs. The default Implied-Voc path remains PV-2000-compatible for vendor comparison.

**NEW PROFILE triggers**

Examples include:

- a QSS map pattern or coordinate encoding outside the validated QSS-MAP-001 and QSS-MAP-002 families (ordinary numeric geometry changes inside either established coordinate rule are not automatically a new profile);
- a new XML path for lifetime/injection data;
- a different sentinel/blanking convention that is not the established numeric `-1 µs` behavior;
- a configuration whose Smax or Implied Voc calculation fields differ materially;
- a vendor path that explicitly encodes and applies semiconductor material;
- QSS-µPCD Scan/J0 or emitter-J0 data, which are separate scientific result paths rather than automatic extensions of QSS-MAP-001.

A new QSS profile must use the actual XML + matching PV-2000 export/display to determine whether existing coordinate, validity and derived-quantity logic still applies.

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

A private corpus of **330 XML files**. **273** have exact-basename PV-2000 raw CSV exports, containing **5833 paired injection points**. Another 57 XMLs have no exact-basename CSV in the corpus; 10 CSVs have no exact-basename XML and are not automatically paired.

**Validated / established raw path**

- current XML family: `OnePointPattern`, one `QssDataItem` per measurement; circular spatial context may be stored in an explicit target or in `Substrate/SubstrateShape`;
- all 330 XMLs have aligned `Values`, `Intensity`, `Power` and `TransientInfo` counts;
- XML `Intensity` and `Power` match the vendor CSV top-table QSS intensity and laser-power columns exactly;
- CSV raw-data `LifeTime [μs]` matches **`TransientInfo@LifeTime` exactly** across all 5833 paired points;
- XML `Values` is retained as a distinct diagnostic lifetime vector; it can differ from `TransientInfo@LifeTime` (observed max |Δ| **0.020593307 µs**);
- each supplied `TransientInfo` stores **2000** `SmallPoint` samples;
- each paired CSV raw export contains the first **1999** samples and omits the final XML sample;
- **11,660,167** paired raw Time/Voltage samples compare exactly at exported precision;
- ordinary numeric changes in injection schedule, wafer thickness, doping, optical factor or laser-power setting remain inside this raw schema family when the same structure is retained.

**Supplemental one-point geometry / J0-request examples**

Six additional XML-only examples use `SubstrateShape=Circle` with **50 mm radius**, **7 mm EdgeExclusion**, a single `(0,0)` coefficient, and high-range injection schedules. All request `CalculateJZeroParams=true`; they also set `IncludeKSJ0=true`, `UseAugerCorrection=false` and `DefaultDeltaN=5e16`.

These files expand runtime coverage for one-point geometry and stored recipe metadata only. Without matching vendor result-table exports, they do not validate J0, processed Lifetime, Δn or Implied Voc.

**Vendor result-table path observed but not yet reproduced**

The same CSVs expose `Lifetime[us]`, `dn[cm-3]`, `Implied Voc[V]` and textual `QDC` in the result table. Vendor `Lifetime[us]` is not either raw XML lifetime field. Across the 5833 paired rows, **4628** have positive result-table Lifetime and **1205** are zero.

For positive result-table Lifetime rows, `dn` is consistent with:

```text
G = 2.38e17 * I[suns] / W[cm] * OpticalFactor
dn = G * Lifetime
```

to rounded CSV precision, with maximum relative discrepancy about **0.509%** in the expanded corpus. This establishes the Lifetime→dn step, not the raw→vendor-Lifetime transformation.

The result-table Lifetime transformation, zero/blank acceptance rule, Implied-Voc processing, Basore-Hansen J0, Kane-Swanson J0 and any vendor LP/HP stitching remain **inferred/unsupported** until reproduced point-by-point.

**Analyzer behavior**

- runtime curve/summary lifetime: `TransientInfo@LifeTime` from the imported XML, with XML `Values` used only as a fallback when needed;
- raw CSV comparison and the distinction between the two XML lifetime fields remain development-validation concerns rather than runtime source controls;
- stored transient inspection, local multi-XML overlay, log/linear X and XML-only CSV export are analyzer features, not claimed vendor post-processing.

**NEW PROFILE triggers**

Treat multiple iterations, another DataItem/transient layout, another pattern/target semantic, another unit convention, or a different vendor result-table path as a new semantic profile. Ordinary numeric parameter changes inside the established raw path do not create a new profile.

See `docs/ALGORITHMS_DUAL_QSS.md`.

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

**Runtime-supported inferred cases**

Two supplied XML-only cases use `SquareRegionPattern + RoundWafer` and remain outside JZERO-MAP-001 vendor parity:

- a completed 1 × 1 SquareRegion with two one-site lifetime iterations; the structured Region + Dimension fields resolve a single measurement position at (0, 0) mm;
- a terminated 3 × 3 SquareRegion where only five first-intensity sites were stored and no second lifetime iteration was acquired. The analyzer maps the five sites to the leading 5 / 9 row-major schedule prefix, preserves first-intensity τeff.d/Smax/Implied-Voc, and leaves second-intensity results and Basore J0 unavailable.

These cases establish runtime compatibility only. They do not validate SquareRegion coordinates against vendor X/Y export, incomplete-scan ordering against PV-2000, or one-iteration Basore-result semantics.

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

**Partial acquisitions — inferred**

One supplied terminated ISC XML uses `MapPattern + RoundWafer` with a 200 mm target, 4 mm EdgeExclusion and 1 × 1 mm pitch. The complete strict-circle schedule contains **28,913** sites, while the saved XML contains **10,947** DataItems. Runtime support maps those DataItems to the leading X-fast / ascending-Y schedule prefix so the partial wafer remains viewable. This coordinate interpretation is labelled **partial / inferred** and is excluded from `ISC-MAP-001` profile parity until matching vendor X/Y output confirms incomplete-scan ordering.

Completed/normal acquisitions with mismatched point counts remain unsupported instead of using prefix truncation.

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

### LBIC-REFLECTANCE-003 — reflectance-only SquareRegionPattern family

**Measurement type**

`LBICMeasurement`

**Reference material**

A private corpus of **62 XML files** plus **60 PV-2000 XPS result printouts** covering **44 matching XML measurements**. Some measurements have more than one XPS printout because the display color scale was changed; the result summary is unchanged.

**Validated family**

Semantic input/output path:

- one iteration;
- one beam;
- `SquareRegionPattern`;
- XML measurement flags:
  - `MeasureCurrent=false`
  - `MeasureDirectReflectance=true`
  - `MeasureScatteredReflectance=true`;
- raw numeric BeamData attributes still contain `Current`, `DirectReflection` and `ScatteredReflection`;
- every supplied reflectance-only XML has `Current=0` at every site, so this field is an inactive placeholder rather than a measured current result;
- vendor result shown in the paired XPS printouts is **Reflectivity [%]**.

The validated label requires these flags explicitly and the zero-valued inactive Current placeholder. If an XML has a different or missing flag state, or nonzero inactive Current data, the active raw channels remain inspectable but the derived Reflectivity is labelled **inferred** pending a matching vendor result. Current-enabled LBIC profiles likewise require explicit active Current/Direct/Scattered flags and an explicit µA unit; absent unit metadata cannot justify calculated EQE/IQE.

The supplied corpus spans 656, 855 and 984 nm lasers plus ordinary numeric Region/grid changes. Those numeric settings are evidence values, not runtime whitelist keys.

**Validated / established**

For all 60 paired XPS printouts, the PV-2000 Reflectivity summary is reproduced from the XML as:

```
Rraw[%] = DirectReflection[%] + ScatteredReflection[%]
Reflectivity_display[%] = clamp(Rraw, 0, 100)
```

Across the 60 XPS comparisons, Average / Median / sample Stdev / Minimum / Maximum agree with the vendor's two-decimal displayed values with maximum absolute discrepancy below **0.005 percentage point**, i.e. within display rounding. One representative pair gives:

- Average: XML **30.8180159%** vs XPS **30.82%**;
- Median: XML **8.5744989%** vs XPS **8.57%**;
- Stdev: XML **32.2960455%** vs XPS **32.30%**;
- Minimum: XML **0.2193933%** vs XPS **0.22%**;
- Maximum: XML **83.0026011%** vs XPS **83.00%**.

Runtime semantics for this family therefore are:

- do **not** expose the disabled `Current` placeholder as a measured result;
- do **not** synthesize EQE or IQE from that placeholder, even when FluxCache is present;
- default the quantity selector to **Reflectivity**;
- keep active raw Direct/Scattered reflectance available under Advanced;
- label the complete SquareRegionPattern path as `LBIC-REFLECTANCE-003`.

**Partial acquisitions**

One supplied 61 × 61 recipe contains only **2814 of 3721** scheduled DataItems. The analyzer maps those available points to the leading X-fast / ascending-Y SquareRegionPattern schedule so the partial map remains usable, but this incomplete-prefix coordinate interpretation is labelled **partial / inferred** and is not claimed as `LBIC-REFLECTANCE-003` vendor parity until a matching vendor coordinate export confirms the incomplete-scan behavior.

The UI exposes this status as `partial acquisition · inferred` in Reference parity, alongside the measured/expected point count.

**NEW PROFILE triggers**

Examples include:

- `MeasureCurrent=false` with another active optical-channel combination;
- raw total Reflectivity instead of Direct + Scattered;
- another pattern/coordinate encoding;
- multiple beams or multiple iterations;
- another output quantity or validity rule;
- an incomplete-acquisition ordering that is not the leading X-fast / ascending-Y schedule.

Ordinary wavelength, laser power, Region origin/size and complete SquareRegionPattern grid-dimension changes stay inside this family when the same reflectance-only semantic path applies.

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
8. inventory XML-only stored/unknown numeric quantities that the vendor UI/CSV does not expose; preserve meaningful extras and record whether they belong in Advanced/diagnostic analysis;
9. reverse-engineer vendor-derived quantities only from matching vendor output;
10. check validity/blank/mask behavior and summary statistics;
11. revise software logic if the new profile behaves differently;
12. add or extend the appropriate validator; public reference cases should be regression-testable without becoming runtime dependencies;
13. update this registry, `docs/VALIDATION.md`, the relevant algorithm document, HANDOFF and CHANGELOG;
14. only then change a result from **inferred** to **validated**.

Do not create artificial NEW PROFILE boundaries around ordinary numeric parameter changes. At the same time, do not expand validation across a genuinely different input/output path merely because a formula is physically reasonable or the `xsi:type` is unchanged.
