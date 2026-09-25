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

### SPV-CALC-STANDARD-001 — positive-oxide two-wavelength SPV

**Measurement type**

`SPVMeasurement`

**Reference material**

The original two 1649-site RoundWafer maps plus five new real XML + vendor CSV pairs (877, 1, 1649, 221 and 221 sites). The new geometry spans full-wafer maps and a one-point target.

**Validated / established**

- output set: DL [µm], Tau [µs], SPV8 [mV], SPV6 [mV];
- standard non-enhanced calculation branch;
- measured-linearity correction path;
- wavelength-to-penetration-depth conversion;
- oxide-thickness correction path used by the paired files;
- DL acceptance rule: non-positive or >2500 µm becomes unavailable;
- Tau is derived from DL using the vendor minority-carrier mobility constant;
- SPV8/SPV6 remain available independently of DL/Tau availability;
- paired `Ud.` masks for DL/Tau reproduce with zero mismatches.

Across the seven pairs, the original maximum absolute differences remain approximately **1.64e-11 µm** for DL and **2.06e-11 µs** for Tau. The five additional pairs agree within **2.39e-12 µm** and **4.33e-13 µs** respectively; SPV8/SPV6 agree to floating-point precision and all availability masks agree.

Ordinary numeric settings that are inputs to this same formula — for example wavelength, temperature, multiplier and positive oxide-thickness magnitude — do not create a new profile by themselves.

**Not validated by this profile**

- `UseEnhancedMode=true`;
- texture-correction-enabled cases;
- parsed-signal mode;
- manual-linearity-ratio (`UseManualLR`) branch;
- alternate wavelength/configuration families or optical branches not exercised by the pair.

Calculation validation is separate from geometry validation. The paired full maps and one-point case resolve through the shared geometry profiles.

---

### SPV-CALC-ZERO-OXIDE-002 — zero oxide, zero reflectivity correction

Three private real XML + vendor CSV pairs cover 59-site terminated HighDensity/SquareCell, 9-site NinePoint/RoundWafer and 176-site HighDensity/PseudoSquareCell acquisitions. All have `OxideThickness=0`, `ReflectivityCorrection8=0`, `ReflectivityCorrection6=0`, P-type doping, measured linearity and standard non-enhanced, non-texture, non-parsed-signal processing.

Across their 244 sites, all DL/Tau values are finite and the maximum absolute differences are **5.52e-12 µm** for DL and **7.15e-13 µs** for Tau. SPV8/SPV6 and the availability masks agree pointwise. This validates the separate zero-oxide optical path with zero reflectivity correction. Nonzero reflectivity correction, N-type doping, enhanced mode, manual linearity, texture and parsed signals remain outside this profile.

The 59-site acquisition is marked `Terminated`: its first 59 scheduled coordinates agree with the vendor CSV within **1.6e-14 mm**. Its geometry remains **partial** and does not receive a complete geometry profile. The NinePoint and PseudoSquare coordinates agree within **2.1e-14 mm** through their independent complete geometry profiles.

The ninth new pair is `UseEnhancedMode=true` and N-type: 28 of 69 DL/Tau sites are finite in vendor output. Raw SPV8/SPV6 agree to floating-point precision; evaluating the standard path on those sites gives DL/Tau maximum errors of **296.64 µm** and **420.23 µs**. This is evidence for a separate enhanced calculation path, not for applying either standard profile.

---

### LEAKAGE-CALC-VSASS-001 — Leakage VSASS / LI extraction

**Measurement type**

`LeakageMeasurement`

**Reference material**

Two private real XML + numeric PV-2000 CSV pairs. One contains positive and negative branches; one is positive-only.

**Validated / established**

- mean Vcpd-offset subtraction;
- time axis from the stored measurement interval;
- local knot window around 1.2 s;
- vendor natural cubic spline and end-interval extrapolation behavior;
- evaluation at `1.2 s - polarity delay`;
- VSASS+, VSASS- and LI availability semantics;
- positive-only data preserve VSASS+ while VSASS-/LI remain unavailable.

For the both-polarity pair, maximum absolute differences are approximately **4.3e-14 V** for VSASS+, **1.1e-14 V** for VSASS- and **2.8e-14 V** for LI. The positive-only pair reproduces VSASS+ to approximately **1.8e-15 V**.

The sampling interval is an ordinary numeric input to this spline path and is not used as profile identity.

**Not validated by this profile**

- negative-only Leakage operation;
- multi-point Leakage result geometry;
- other material/thickness acquisition branches;
- the derivative I-V diagnostic as a separately user-facing validated quantity.

The paired one-point non-zero coefficient case also establishes the shared target-relative OnePoint geometry path independently of the scientific calculation profile.

---

### CET-9PT-SQUARE-001 — CET paired evidence bundle

**Measurement type**

`CETMeasurement`

Runtime validation is split into `CET-CALC-001` for EOT/Cd/R² calculation semantics and `GEOM-NINEPOINT-SQUARE-001` for the paired NinePointPattern + SquareCell coordinate path. `CET-9PT-SQUARE-001` remains the historical evidence-bundle name, not a runtime geometry+algorithm gate.

The validated calculation path requires one iteration, at least one acquired site and a positive finite `Process.CoronaCharge`. The empty pair does not expand this path.

**Reference material**

The original private **9-site** NinePoint/SquareCell pair plus seven new nonempty paired XML/vendor CSV exports (**19 sites**) across FivePoint/RoundWafer, SquareRegion/SquareCell, SquareRegion/RoundWafer, OnePoint/SquareCell, OnePoint/RoundWafer and NinePoint/SquareCell. An eighth new pair has zero acquired sites and establishes empty-export handling only.

**Validated / established**

- the nine XML coefficients are target-relative, not millimetres;
- for the paired 156 × 156 mm SquareCell with 4 mm EdgeExclusion, the scheduled half-width/height is 74 mm and coefficient magnitude `0.6324555320336759` resolves to **46.801709370492 mm**;
- all nine X/Y coordinates reproduce the vendor export to floating-point precision;
- process charge axis: `Qc[i] = i * Process.CoronaCharge`;
- illuminated CPD input: vector mean minus `VcpdOffsett`;
- compatibility constant: `q = 1.602e-19 C`;
- `Cd_internal = (1/m) * q * 1e6`;
- reported `Cd = Cd_internal * 1000` [nF/cm²];
- `EOT = 34.5 / Cd_internal` [Å];
- R² is the linear-fit coefficient of determination;
- one undefined one-point fit is exported as EOT/Cd `Ud.` and R² = 0; the analyzer preserves that quantity-specific validity behavior.

The private pointwise validator currently reports maximum differences of approximately **2.1e-14 mm** for coordinates, **3.2e-12 Å** for EOT, **6.2e-13 nF/cm²** for Cd and **1.2e-13** for R². Average / median / sample-stdev / min / max summaries also reproduce the vendor CSV at floating-point precision.

The seven new nonempty pairs add five finite EOT/Cd sites and 19 finite R² sites. Their maximum errors are **2.27e-12 Å** (EOT), **5.69e-13 nF/cm²** (Cd), **6.03e-14** (R²) and **2.1e-14 mm** (coordinates); every `Ud.` mask agrees. The one-point and all-unavailable NinePoint cases also confirm quantity-specific summaries. The zero-site case is reported as empty rather than promoted to a numeric profile.

**Supported but not validated by this profile**

FixedPoints and other still-unpaired CET configurations remain inferred. Calculation validation is `CET-CALC-001`; the six observed geometry combinations each use their independent shared geometry profile. The historical `CET-9PT-SQUARE-001` label refers only to the original evidence bundle.

**NEW PROFILE triggers**

Treat a CET case as a new calculation profile when it changes the process/result branch, unit convention, undefined-value rule or EOT/Cd arithmetic. New coordinate encodings require their own paired geometry evidence.

See `docs/ALGORITHMS_CET.md`.

---

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
- PV-2000 can store **`τeff.d = -1 µs` as a raw XML/controller sentinel**. The later 100-case paired final-result exports resolve this separately from display availability: sentinel sites export lifetime as `Ud.`, Smax as `0`, and Implied Voc as `0`. Raw XML values remain preserved for provenance.

**Implied Voc compatibility envelope**

- the original 305-point reference instance remains within approximately **0.1 mV** maximum error using the documented compatibility `ni(T)` model;
- across the later nine-pair RoundWafer corpus, the same model reaches approximately **1.94 mV maximum absolute error** on finite vendor Implied-Voc values;
- the seven-pair 100-case cross-geometry audit reaches approximately **4.918 mV**, so Implied Voc remains an inferred compatibility quantity outside the tightly regressed original instance;
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

- a QSS map pattern or coordinate encoding not covered by a resolved shared geometry profile or the paired QSS Map/SquareRegion/HighDensity-Round evidence (ordinary numeric geometry changes inside an established coordinate rule are not automatically a new calculation profile);
- a new XML path for lifetime/injection data;
- a different raw-controller or final-result sentinel/blanking convention from the established XML `-1 µs` → result `Ud. / 0 / 0` lifetime/Smax/Voc behavior;
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

This reference expands the validated **coordinate reconstruction** envelope. The later 100-case corpus separately validates the cross-geometry lifetime/Smax calculation profile described below; Implied Voc remains a narrower inferred compatibility quantity.

**Same-family numeric changes**

Different Region origin/width/height or Dimension values stay inside QSS-MAP-002 when the same Region + Dimension encoding and X-fast/ascending-Y order apply.

**NEW PROFILE triggers**

Examples include another pattern/coordinate encoding, reversed or serpentine acquisition semantics, a different point-count interpretation, or another vendor result path that changes how sites map to output rows.

### QSS-CALC-LIFETIME-SMAX-001 — stored lifetime and Smax result semantics

The 100-case private harness corpus supplies **seven nonempty QSS-µPCD numeric pairs** across four `SquareRegionPattern + SquareCell`, one `MapPattern + RoundWafer`, and two `HighDensityPattern + RoundWafer` measurements. Five additional exports are zero-site acquisitions and do not promote numeric evidence.

Across the seven numeric pairs:

- positive XML lifetime matches vendor lifetime to a maximum absolute error of **5.68e-14 µs**;
- Smax matches the positive-lifetime rule `W/(2τ)` to **5.00e-12 cm/s**;
- **39** XML/controller sentinel sites with `τ=-1 µs` all export lifetime as `Ud.`, Smax as **0**, and Implied Voc as **0**;
- raw XML `-1` is retained independently for provenance and scientific availability masking.

This profile is calculation/availability evidence and is independent of the geometry profile selected for a site schedule. It does **not** validate the finite-value Implied-Voc formula across these geometries; the observed compatibility error reaches about **4.918 mV**.

### QSS HighDensityPattern — paired RoundWafer geometry

The same 100-case corpus supplies two nonempty `HighDensityPattern + RoundWafer` QSS pairs: **145 sites** from a 15 × 15 normalized template and **276 sites** from a 20 × 20 template, both on a 100 mm RoundWafer with 7 mm edge exclusion.

The shared geometry resolver preserves coefficient order, restricts the normalized template to the strict unit-circle subset (`x²+y² < 1`), then scales by the EdgeExclusion-adjusted radius. The paired vendor X/Y coordinates agree to a maximum error of **7.03e-14 mm**, establishing `GEOM-HIGHDENSITY-ROUND-001` directly on QSS data.

Observed `HighDensityPattern + SquareCell` runtime geometry remains governed by its separate shared geometry evidence; the RoundWafer QSS pairs do not automatically widen calculation or geometry claims to every HighDensity target combination.

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

### QSS-INJ-RESULT-001 — Dual QSS paired final-result parity

**Measurement type**

`DualQssMeasurement`

**Reference material**

Two private **real XML + matching numeric PV-2000 final-result CSV** pairs. Both use `OnePointPattern + RoundWafer`, `ProbeSelection=Back`, `QssBiasSelection=Back` and `UseAugerCorrection=false`. The HighPower sweep contains an acquired 1000 mSun point; the LowPower sweep terminates at 681 mSun.

**Validated / established**

- QDC is independently reconstructed from each stored transient. Maximum absolute error against the original DLL internal QDC arrays is about **7.92e-11** (25-point HighPower) and **2.67e-12** (16-point LowPower).
- The QDC support rule is the contiguous interval from the first point inside `ValidQdcRange` through the last point inside the range.
- Steady-state reconstruction uses the reference-build MinPack preprocessing followed by **log-log Akima** densification ×10,000, local-extremum selection, trapezoidal integration and corrected-lifetime interpolation.
- `teff.d (1 Sun)` is taken from XML `Values` through the vendor clamped interpolation path.
- HighPower `teff.SS (1 Sun)` = **280.94342922609 µs** and `teff.SS Max` = **893.70740338579 µs** are reproduced to about **2.3e-13 µs** and **3.4e-13 µs** respectively.
- LowPower `teff.SS (1 Sun)` = **236.991629 µs** and `teff.SS Max` = **1984.29119677534 µs** are reproduced to 0 and about **9.1e-13 µs** respectively.
- HighPower Δn (1 Sun), Smax values, Implied Voc, Basore J0 and K-S J0 all reproduce the numeric vendor export within floating-point tolerance.
- LowPower preserves vendor availability semantics: Basore J0 and Δn are `Ud.`, while Implied Voc and K-S J0 remain defined.
- K-S J0 maximum observed absolute error is about **7.3e-12 fA/cm²**; Implied Voc maximum observed absolute error is about **4.4e-16 V**.
- The runtime result-table export uses the same profile-scoped quantities and preserves unavailable results rather than substituting zeros as valid values.

**Runtime boundary**

The full result path is enabled only for the paired semantic envelope above. `UseAugerCorrection=true`, alternate source selections, a sweep spanning 1000 mSun without an exact acquired 1000-mSun point, and other structural/categorical branches remain unavailable until real paired output validates them.

The broader `QSS-INJ-001` 273-pair corpus still validates the raw injection/transient path; it does not automatically extend this final-result profile to all historical Dual QSS files.

The 100-case harness adds ten further Dual QSS exports. Four contain no acquired result row and one is an older laser-power/Lifetime-only branch. Of the five nonempty final-result rows, three OnePoint cases stay inside the current non-Auger Back/Back calculation family. One `CalculateJZeroParams=false` pair proves a quantity-level availability rule: `teff.SS Max` and its corresponding maximum-Smax output are vendor `Ud.` even though `teff.SS (1 Sun)`, Δn, Smax and Implied Voc remain finite. Runtime therefore marks those maximum quantities unavailable when J0 calculation is not requested.

Two `FixedPointsPattern + PseudoSquareCell` pairs are intentionally not used to widen the result-profile geometry gate: one is numerically close to the current reconstruction, while the other differs materially in teff.SS, teff.SS Max, J0 and downstream quantities. That conflicting evidence is a categorical result-path boundary, not a reason to generalize by geometry alone.

**Validation**

Run the public launcher against the private paired case directories:

```bash
npm run validate:dual-qss-runtime-results -- <case-dir> [<case-dir> ...]
```

The private workflow executes that runtime directly against both real XML+CSV pairs.

**NEW PROFILE triggers / evidence extensions**

A different pattern/target/source-selection path, `UseAugerCorrection=true`, a multi-iteration schema, another result-table algorithm, or a different 1000-mSun placement rule requires new matching numeric vendor output before the profile is widened.

See `docs/ALGORITHMS_DUAL_QSS.md`.

---

### JZERO-CALC-001 — two-intensity Emitter J0 calculation

**Measurement type**

`JZeroMeasurement`

**Reference material**

The original private 5017-site XML/PV-2000 CSV pair is supplemented by **eight successful harness-generated numeric pairs** from the 100-case private corpus. Those eight pairs cover independently resolved OnePoint, SquareRegion, HighDensity and Map geometries.

**Validated calculation family**

- exactly two nonempty lifetime iterations paired by site index;
- direct XML lifetime → τeff.d for both QSS states;
- `Smax = W/(2τ)`;
- Basore-Hansen J0 from the two-intensity inverse-lifetime-squared slope;
- calculation identity independent of Pattern/Target geometry.

Across the eight numeric pairs:

- τeff.d maximum absolute error is approximately **5.12e-13 µs**;
- Smax maximum absolute error is approximately **4.77e-12 cm/s**;
- Basore J0 maximum absolute error is approximately **4.73e-11 fA/cm²**.

These quantities therefore retain `JZERO-CALC-001` across separately validated geometry profiles. Pattern/Target is not a calculation-profile key.

**Geometry evidence**

The same corpus independently confirms the shared geometry resolver on JZero outputs including:

- `GEOM-ONEPOINT-CENTER-001`;
- `GEOM-SQUAREREGION-ROUND-001`;
- `GEOM-SQUAREREGION-SQUARE-001`;
- `GEOM-HIGHDENSITY-ROUND-001`;
- `GEOM-MAP-PSEUDOSQUARE-001`.

Maximum observed paired coordinate error is approximately **4.97e-14 mm**. Geometry validation remains a separate axis and does not promote a narrower derived quantity automatically.

### JZERO-VOC-MAP-PSEUDOSQUARE-001 — JZero Implied-Voc quantity profile

The JZero-specific Implied-Voc calibration is **not** part of the broad `JZERO-CALC-001` claim.

Two numeric `MapPattern + PseudoSquareCell` pairs support this quantity profile:

- the original 5017-site pair reproduces the first/second Voc channels within approximately **0.061 / 0.066 mV**;
- a second 1221-site pair reaches approximately **0.850 mV** maximum error.

The runtime therefore labels JZero Voc on this paired geometry as reproduced at displayed precision.

The same current calibration differs by approximately **18.7–21.1 mV** on paired OnePoint, SquareRegion and HighDensity cases. Those outputs remain **inferred/diagnostic** even though their lifetime/Smax/Basore quantities and their geometry can be validated independently. No geometry-only change may silently widen this Voc quantity profile.

The Basore and Implied-Voc compatibility constants are reverse-engineered regression models for observed vendor output, not claims about undisclosed PV-2000 internal constants.

**Incomplete acquisitions**

Explicitly interrupted acquisitions may preserve first-intensity quantities while second-intensity quantities and Basore J0 remain unavailable. Leading schedule-prefix geometry may be displayed as partial/inferred. Such cases do not enter `JZERO-CALC-001` without paired numeric evidence.

**NEW PROFILE triggers**

Examples include more or fewer than two lifetime iterations, a different iteration/result ordering, a different raw data-item schema, additional vendor outputs, or evidence that the Basore calculation/availability path changes. Implied-Voc changes are quantity-profile questions and must not be used to invalidate otherwise matching lifetime/Smax/Basore calculation parity.

See `docs/ALGORITHMS_JZERO.md` and run `npm run validate:jzero`.

---

### ISC-CALC-001 — repeated-reading Initial Surface Charge

**Measurement type**

`ISCMeasurement`

**Reference material**

The original 169-site pair plus nine additional private XML + vendor CSV exports (1860 sites). They cover repeated dark/light readings with Map/RoundWafer, Map/SquareCell and SquareRegion/SquareCell geometries.

**Validated family**

Semantic input/output path:

- one iteration;
- repeated `VcpdDark` and `VcpdLight` readings per `ISCDataItem`;
- calculation independent of pattern/target geometry;
- finite XML `VcpdOffset` and `VsbCorrectionFactor`;
- vendor outputs Vcpd Dark / Vcpd Light / Vsb in volts.

Let `D` and `L` be the per-site means of the raw dark/light readings, `O` the XML Vcpd offset and `F` the XML VSB correction factor. The paired export establishes:

```text
Vcpd Dark  = D - O
Vsb        = F * (D - L)
Vcpd Light = Vcpd Dark - Vsb
```

The original reference instance has 169 sites, 24 readings/site, a 100 × 100 mm SquareCell, 30 mm EdgeExclusion and 3 × 3 mm pitch. The new pairs cover 16 and 24 readings/site. Those numeric settings are evidence, not runtime whitelist values.

**Validated / established**

- 169 XML sites = 169 vendor rows;
- centered X-fast row-major coordinates from -18 to +18 mm in both axes match the vendor export exactly;
- Vcpd Dark pointwise maximum absolute error ≈ **3.55e-15 V**;
- Vcpd Light pointwise maximum absolute error ≈ **3.55e-15 V**;
- Vsb pointwise maximum absolute error ≈ **7.49e-16 V**;
- Average / Median / sample Stdev / Min / Max reproduce the vendor summary to ≈ **3.33e-15** maximum absolute error.
- All nine new pairs reproduce three result columns and summaries pointwise; the largest absolute result error is **4.44e-14 V**. All **1860** new X/Y rows independently match the shared geometry resolver (maximum coordinate error below **6e-15 mm**).

**Partial acquisitions — inferred**

One supplied terminated ISC XML uses `MapPattern + RoundWafer` with a 200 mm target, 4 mm EdgeExclusion and 1 × 1 mm pitch. The complete strict-circle schedule contains **28,913** sites, while the saved XML contains **10,947** DataItems. Runtime support maps those DataItems to the leading X-fast / ascending-Y schedule prefix so the partial wafer remains viewable. This geometry remains **partial / inferred** until matching vendor X/Y output confirms incomplete-scan ordering. Completed RoundWafer pairs do not establish this terminated prefix.

Completed/normal acquisitions with mismatched point counts remain unsupported instead of using prefix truncation.

**Analyzer features not claimed as vendor algorithms**

- browser raster color interpolation/palette;
- distribution histogram presentation;
- shared plot zoom/manual-axis controls.

The selected-site raw-reading plot exposes the underlying repeated XML readings; the manual documents ISC Raw Data Export as the voltage transients/readings for each measurement point.

**NEW PROFILE triggers**

Examples include:

- a new pattern/target schedule without matching vendor coordinate evidence (geometry axis only);
- multiple iterations or another raw-reading structure;
- a different offset/correction path or missing correction factor semantics;
- another unit convention or vendor result set.

Ordinary numeric changes in pitch, target size, edge exclusion, reading count, offset or correction factor stay inside this family when the same semantic path applies.

---

### VCPD-CALC-001 — dark-contact-potential reading mean

**Measurement type**

`VcpdMeasurement`

**Reference material**

The original 1649-site XML/CSV pair and screenshot plus three new paired exports with 213, 1069 and 1 measured sites. A fourth new pair has zero acquired sites and supplies only empty-export evidence.

**Validated family**

Semantic input/output path:

- one iteration;
- `VcpdDataItem/Readings` with one, four or sixteen readings/site;
- calculation independent of paired Map/RoundWafer, HighDensity/PseudoSquareCell and OnePoint/RoundWafer geometry;
- `LightOn=false`;
- iteration-level `VcpdOffset=0 V`;
- vendor output `Vcpd Dark [V]`.

For these paired references:

```text
Vcpd Dark = arithmetic mean(XML Readings at the site)
```

The runtime uses the mean of the `Readings` container. Multi-reading counts of four and sixteen are paired; non-zero offset remains outside the validated envelope.

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
- New 213-site HighDensity/PseudoSquareCell with sixteen readings/site matches within **4.45e-16 V** pointwise; the 1069-site RoundWafer map with one reading/site matches exactly; the one-site RoundWafer target with four readings yields **60 V** exactly. New summary errors stay below **5e-15 V**, including the vendor's unavailable one-site Stdev.
- All **1283** new measured coordinates match independently (maximum coordinate error below **7e-14 mm**). The empty 0-site export provides no finite numeric or geometry validation.

**Shared analyzer behavior**

`VcpdMeasurement` reuses the ISC/Kelvin-probe map, distribution, selected-site reading inspection, geometry, zoom/manual-axis and CSV-export infrastructure. Its result selector contains only Vcpd Dark; ISC-only Vcpd Light and VSB are not synthesized.

**NEW PROFILE triggers**

Examples include:

- non-zero iteration-level VcpdOffset;
- `LightOn=true`;
- reading counts inconsistent with the XML setting;
- a new pattern/target schedule without matching vendor coordinate evidence (geometry axis only);
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
- IQE uses the **unclamped raw optical sum** in the denominator; an exact 100% raw sum is singular:

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

- multi-iteration LBIC semantics;
- other target/pattern encodings;
- different raw channel/result combinations.

**NEW PROFILE triggers**

Examples include another coordinate encoding, another target-shape scheduling rule, coupled cross-beam calculations, a different unit convention, a different raw BeamData channel set, or a different vendor output/validity path.

Ordinary changes in pseudo-square Width/Height/Diameter/EdgeExclusion, pitch, beam count, wavelength, power and finite FluxCache values stay inside this family when the same independent per-beam path applies.

### LBIC-CALC-DL-MULTIWAVELENGTH-005 — cross-beam diffusion length

One private 961-site, four-wavelength XML/vendor CSV pair has 956 finite DL values and five `Ud.` values. Three further four-wavelength one/five-point pairs add seven entirely `Ud.` DL sites. The 961-site pair validates the finite numeric path with a 700–1000 nm XML wavelength range, 2000 µm maximum and current-plus-scattered-reflection IQE inputs. For every selected beam, convert wavelength and iteration temperature to silicon penetration depth, fit `1/IQE` against depth at the same site, and set `DL = intercept/slope` only for a finite result in `(0, MaxDLValue]`.

The maximum finite DL difference is **1.66e-11 µm** across 956 sites. All **12** unavailable sites across the four pairs agree with vendor `Ud.`; the DL summary differs by at most **1.07e-11 µm**. The 656 nm beam is excluded from the numeric pair by its stored 700–1000 nm range. The direct-plus-scattered five-point pair contributes unavailable-value evidence only; a finite direct-plus-scattered DL result is still unvalidated. Geometry is matched by its own profile, including `GEOM-MAP-SQUARE-001` for the finite map and `GEOM-FIVEPOINT-SQUARE-001` for the five-point blank case.

New optical channel semantics, a missing flux, duplicate wavelengths, multiple iterations, or altered validity/model branches remain outside this DL profile. The runtime never reads vendor CSV during import.

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

## 2026-09-24 cross-profile audit boundary

The private cross-profile audit described in `docs/CROSS_PROFILE_PARITY_AUDIT_20260924.md` used 30 harness-generated pairs across the already implemented families. It showed that the canonical coordinate rules frequently validate across Pattern/Target combinations that the current monolithic profile matchers classify as `NEW PROFILE`.

This evidence changes the **profile architecture rule**, not the public validation labels by itself:

- calculation semantics and geometry semantics are separate validation axes;
- exact X/Y parity can promote a geometry profile without promoting every derived quantity;
- a calculation may retain its validated profile across multiple independently validated geometries when pointwise result parity confirms the same algorithm path;
- individual quantities may have narrower profiles than their sibling outputs;
- future validators must report calculation, geometry and quantity parity separately.

The strongest new examples are ISC/VCPD, where the same result equations are exact across multiple geometries, and JZero, where lifetime/Smax/Basore J0 generalize while Implied Voc does not. LBIC additionally demonstrates that channel/result combinations such as current-only and scattered-reflectance-only are genuine calculation-profile changes and must not be confused with geometry changes.

No profile is automatically widened merely by this audit. Each public `validated` label should be updated only together with the corresponding runtime/profile migration and regression gate.

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
