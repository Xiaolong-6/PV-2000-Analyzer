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

- Standard COCOS remains the established reference family and measured dark/light algorithm path.
- The historical validation record, obtained before the intrinsic-carrier-concentration cleanup, reported about **2.6% mean error** for Qtot and minimum Dit.
- The current implementation uses the legacy MATLAB midgap value `ni = 9.65e9 cm^-3` consistently for both midgap targeting and Qsc; Qsc previously used the rounded `1.00e10 cm^-3`.
- Re-run the private DIT-STD-001 regression before quoting the historical 2.6% figure as the exact error of the unified-ni implementation.

**Not validated by this profile**

- PV2000 COCOS-II vendor algorithm.
- Back Surface Shift behavior outside the supplied adjustment set.
- Any new Dit XML/data path that changes the extraction behavior materially.

**NEW PROFILE triggers**

Treat as a new profile when a real dataset introduces a materially different Dit algorithm path or XML structure, including:

- `UseCocosII=true` vendor-output validation;
- a case where Back Surface Shift changes vendor results;
- new COCOS-II acceptance/window behavior;
- a different pointwise Dit/Vsb export structure;
- materially different flatband/extraction fields that require new parser or calculation assumptions.

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

- a different QSS map pattern type or coordinate encoding (ordinary numeric radius/pitch/size changes within the same validated coordinate rule are not automatically a new profile);
- a new XML path for lifetime/injection data;
- a configuration whose Smax or Implied Voc calculation fields differ;
- different temperature/ni handling;
- QSS-µPCD Scan/J0 or emitter-J0 data, which are separate scientific result paths rather than automatic extensions of QSS-MAP-001.

A new QSS profile must use the actual XML + matching PV-2000 export to determine whether existing coordinate and derived-quantity logic still applies.

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
- multi-beam semantics / wavelength-combination logic;
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
