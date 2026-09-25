# Validation record

The central registry of validated reference envelopes is `docs/REFERENCE_PROFILES.md`. This file contains detailed regression evidence. Any materially new data/configuration outside a recorded envelope is a **NEW PROFILE** until its actual XML + matching PV-2000 output are regressed.

## Reference data locations

- `private/reference/` — ignored local/confidential validation material. It must never be committed.
- `reference_data/` — intentionally public contributor-supplied regression cases. Each case must pair the raw PV-2000 XML with its matching vendor export and should include a PV-2000 screenshot plus a short case README.

Public reference data do not change the runtime contract: the analyzer still consumes XML only. CSV/XPS/screenshots are test and reverse-engineering evidence. A public dataset also does not by itself prove the PV-2000 internal algorithm; the validation label applies only to the observed input→output envelope.

### CI validation semantics

Public GitHub CI does **not** have access to `private/reference/`, so it does not claim private PV-2000 vendor parity. CI runs unit/integration tests, including sanitized XML parser fixtures, checks validator script syntax, and builds the distribution. The CI log emits an explicit `Private vendor parity: NOT RUN` notice instead of executing private-data validators that would only return `SKIP`.

On a maintainer machine that has the private reference corpus, use the required-data commands when a missing corpus must be treated as a failure:

```text
npm run validate:qss:required
npm run validate:dual-qss:required
npm run validate:dual-qss-results:required
npm run validate:lbic:required
```

The ordinary `validate:*` commands keep their convenient optional-data behavior for exploratory local work. The `:required` variants fail when the validator reports `SKIP` without any `PASS`, so a green required run is evidence that paired reference data were actually exercised.

## SPV — independent calculation and geometry regression

Two private 1649-site `SPVMeasurement` XML + numeric CSV pairs establish `SPV-CALC-STANDARD-001`.

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| site count | 1649 XML = 1649 export for both pairs | validated |
| SPV8 / SPV6 | floating-point agreement | validated |
| DL | max abs error ≈ 1.64e-11 µm | validated |
| Tau | max abs error ≈ 2.06e-11 µs | validated |
| DL/Tau `Ud.` mask | 0 mismatches | validated semantic handling |
| map geometry | 4 mm RoundWafer schedule, 1649 sites | validated through independent geometry profile |

One pair contains only one finite DL/Tau site; the other contains 49. Raw SPV channels remain present at all measured sites where DL/Tau are unavailable.

The validated calculation envelope is the standard non-enhanced, non-texture, non-parsed-signal, measured-linearity branch exercised by the pairs. The recovered DLL also shows a historical parameter-order quirk in which the stored LED6 temperature coefficient is applied to SPV8 and LED8 to SPV6; runtime and the validator preserve that behavior. Other SPV branches remain inferred until paired output extends the calculation profile.

The 100-case corpus adds **nine** paired SPV exports. Eight standard pairs cover **3213 sites**: five positive-oxide pairs extend `SPV-CALC-STANDARD-001`, while three zero-oxide/zero-reflectivity pairs establish `SPV-CALC-ZERO-OXIDE-002`. All **1542 finite DL/Tau sites** in these new pairs agree pointwise (new-pair maxima 5.52e-12 µm and 7.15e-13 µs), and no value or raw-channel availability masks differ. Geometry is independently checked: 877-, 1649- and 221-site RoundWafer maps, NinePoint/RoundWafer, OnePoint/RoundWafer and HighDensity/PseudoSquareCell are complete; a terminated 59-site HighDensity/SquareCell acquisition matches the vendor coordinate prefix but stays partial.

The paired N-type `UseEnhancedMode=true` case has **69 sites**, with **28 finite DL/Tau** values and 41 vendor `Ud.` sites. The recovered finite-wafer/back-surface model now reproduces the full paired result: DL maximum absolute error is **2.11e-7 µm**, Tau **1.46e-7 µs**, raw SPV8/SPV6 agree to floating-point precision, and the DL/Tau availability mask has **zero mismatches**. This establishes `SPV-CALC-ENHANCED-N-003`.

The validated Enhanced envelope is N-type, measured-linearity, non-texture, non-parsed-signal processing with positive oxide thickness and finite wafer-thickness / BSR parameters. Enhanced P-type, texture correction, parsed signals and manual-linearity mode remain outside the paired profile. CSV remains development evidence only; runtime stays XML-only.

## VCPD empty-acquisition diagnostic

The 100-case VCPD set contains one paired export with zero acquired sites and zero point rows. The validator reports it as `VCPD EMPTY` / diagnostic evidence and does not promote a calculation or geometry profile. The three nonempty paired VCPD cases remain the numeric validation evidence.

## Leakage — paired VSASS / LI regression

Two private `LeakageMeasurement` XML + numeric CSV pairs establish `LEAKAGE-CALC-VSASS-001`.

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| VSASS+ | max abs error ≈ 4.3e-14 V on both-polarity pair; ≈1.8e-15 V on positive-only pair | validated |
| VSASS- | max abs error ≈ 1.1e-14 V | validated |
| LI | max abs error ≈ 2.8e-14 V | validated |
| positive-only availability | VSASS+ available, VSASS-/LI unavailable | validated |
| target-relative one-point coordinate | non-zero coefficient resolves to vendor 18.4 mm / 18.4 mm | validated geometry path |

The compatibility implementation reproduces the vendor natural-cubic spline extraction around 1.2 s and its end-interval extrapolation behavior. The separate derivative I-V diagnostic is recovered reference knowledge but is not currently a separately validated primary output.

## CET — paired NinePointPattern / SquareCell regression

One private `CETMeasurement` XML + matching PV-2000 numeric CSV export establishes the historical `CET-9PT-SQUARE-001` evidence bundle. Runtime validation is decoupled into `CET-CALC-001` for EOT/Cd/R² and `GEOM-NINEPOINT-SQUARE-001` for the paired NinePointPattern + SquareCell coordinates.

The pair contains 9 sites and validates both the fixed-point geometry and the derived result path.

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| point count | 9 XML = 9 export | validated |
| NinePointPattern X/Y | max abs error ≈ 2.1e-14 mm | validated |
| EOT | max abs error ≈ 3.2e-12 Å on finite sites | validated |
| Cd | max abs error ≈ 6.2e-13 nF/cm² on finite sites | validated |
| R² | max abs error ≈ 1.2e-13 | validated |
| Average / Median / sample Stdev / Min / Max | reproduced at floating-point precision | validated |
| undefined one-point fit | EOT/Cd unavailable; R² = 0 | validated semantic handling |

The 156 × 156 mm SquareCell has 4 mm EdgeExclusion, so the scheduled half-width/height is 74 mm. The standard coefficient magnitude `0.6324555320336759` maps to **46.801709370492 mm**, confirming that the fixed-point coefficients are target-relative rather than physical millimetres.

The paired result also fixes the historical compatibility constant used by the current path at `q = 1.602e-19 C`. Using a higher-precision modern electron-charge constant changes the displayed Cd/EOT enough to break exact compatibility and is therefore not substituted silently.

Run:

```bash
npm run validate:cet
```

The validator expects same-basename private XML/CSV pairs under `private/reference/cet/` by default. The curated pair is also stored in the separate private-reference repository for development testing; neither location is a runtime dependency.

Seven additional nonempty CET XML/vendor CSV pairs cover **19 sites** across FivePoint/RoundWafer, SquareRegion/SquareCell and RoundWafer, OnePoint/SquareCell and RoundWafer, and NinePoint/SquareCell. EOT/Cd/R² maximum new errors are **2.27e-12 Å**, **5.69e-13 nF/cm²** and **6.03e-14**; all availability masks agree. Their geometry resolves independently with maximum coordinate error below **2.1e-14 mm**. One additional zero-site pair is classified as empty and does not promote a numeric result. FixedPoints and other unpaired paths remain inferred.

See `docs/ALGORITHMS_CET.md` and the CET evidence/profile section in `docs/REFERENCE_PROFILES.md`.

## QSS-µPCD map — XML + raw PV-2000 export

Private references:

- `private/reference/qss_upcd_example.xml`
- `private/reference/qss_upcd_export.csv`

The export contains 305 rows with X, Y, τeff.d, Smax and Implied Voc, plus vendor summary statistics.

| Quantity | Regression result | Status |
|---|---:|---|
| point count | 305 XML = 305 export | validated |
| X/Y coordinates | max abs error 0 mm | validated |
| τeff.d | max abs error 0 µs | validated |
| Smax | max abs error ~5e-12 cm/s | validated |
| Implied Voc | max abs error <9.6e-5 V | validated to <0.1 mV |
| lifetime avg/median/Stdev | 11.658483 / 10.914566 / 3.238539 µs | exact vs export |
| Smax avg/median/Stdev | 1343.467131 / 1374.310292 / 220.661212 cm/s | exact vs export |
| PV-2000 Voc avg/median/Stdev | 0.360150235 / 0.359081753 / 0.005384383 V | export reference |

Run:

```bash
npm run validate:qss
```

The validator also verifies coordinate acquisition order. The current QSS reference remains private and ignored. Future explicitly publishable cases may be added under `reference_data/`; neither private nor public vendor exports are required by the shipped browser application.

### Expanded RoundWafer corpus

A later private corpus adds **96 `QssUpcdMeasurement + MapPattern + RoundWafer` XML files**. The geometry remains inside QSS-MAP-001:

- 95 files use 100 mm RoundWafer geometry with 5 mm pitch and 305 XML lifetime values;
- one file uses 125 mm RoundWafer geometry with 5 mm pitch and 489 XML lifetime values;
- nine files have same-measurement numeric PV-2000 CSV exports;
- 108 associated XPS printouts show the same τeff.d / Smax / Implied-Voc result family.

Pointwise regression on the nine numeric pairs establishes:

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| paired CSV cases | 9 | expanded evidence set |
| X/Y coordinates | max abs error 0 mm | validated |
| XML τeff.d vs CSV | max abs error 0 µs | validated |
| Smax from `W/(2τ)` | max abs error ~5e-8 cm/s | validated to CSV numeric precision |
| finite Implied Voc, existing compatibility model | max abs error ~1.94 mV | compatibility close, not vendor-exact |

The original 305-point reference remains the tighter <0.1 mV Implied-Voc instance. The expanded corpus demonstrates that this tighter figure must not be generalized to all RoundWafer files.

The older 96-XML corpus establishes that the controller can store **`τeff.d = -1 µs`** as a raw XML sentinel: 76 files contain it, totaling **13,649 of 29,464 XML sites**. The newer 100-case harness corpus resolves the final-result semantics more precisely. Across **39 paired sentinel sites**, PV-2000 exports lifetime as **`Ud.`**, Smax as the numeric placeholder **`0`**, and Implied Voc as **`0`**. Runtime therefore preserves raw XML `-1` for provenance, while PV-2000-compatible derived-result values use the observed placeholders and default scientific analysis excludes non-positive lifetime before user filtering.

### QSS analyzer-derived SRV and material modes

The QSS analyzer now exposes lifetime → SRV as optional post-processing:

```text
planar:   S = W/2 * (1/tau_eff - 1/tau_bulk)
textured: S = W   * (1/tau_eff - 1/tau_bulk) - S_planar_reference
```

Bulk lifetime is optional (blank = infinity), textured mode exposes the planar-reference SRV, and an optional minimum-lifetime threshold can reject low-lifetime points. Negative calculated SRV is clamped to zero. This is **analyzer-derived**, not a PV-2000 vendor-result validation claim.

Implied Voc remains **PV-2000 compatible by default**. Optional Physical Si / Physical Ge modes are explicit user-selected estimates. The QSS XML family does not provide a trustworthy material identifier, so the analyzer never infers material from filenames, result names or substrate IDs.

### HighDensityPattern compatibility

Status: **paired RoundWafer validation; other target combinations remain independently profile-scoped**.

The 100-case private corpus supplies two nonempty `QssUpcdMeasurement + HighDensityPattern + RoundWafer` XML/vendor-CSV pairs: **145 sites** from a 15 × 15 normalized coefficient template and **276 sites** from a 20 × 20 template. The shared geometry resolver reproduces vendor X/Y with a maximum error of **7.03e-14 mm**, directly validating `GEOM-HIGHDENSITY-ROUND-001` on QSS data.

Across all seven nonempty QSS pairs in that corpus (four SquareRegion/SquareCell, one Map/RoundWafer and two HighDensity/RoundWafer), positive stored lifetime agrees with vendor output to **5.68e-14 µs** and Smax to **5.00e-12 cm/s**. The same pairs contain **39** non-positive controller sentinels; all 39 follow the quantity-specific `Ud. / 0 / 0` lifetime/Smax/Voc result convention described above. Five additional QSS exports are zero-site acquisitions and do not promote a numeric profile.

This evidence promotes the lifetime/Smax calculation path independently of geometry. It does **not** promote Implied Voc to a vendor-exact cross-profile quantity: finite compatibility error in the seven pairs reaches **4.918 mV**. The previously observed SquareCell HighDensity reconstruction and other QSS pattern/target combinations remain governed by their own geometry evidence rather than inheriting validation from RoundWafer.

### Valid-data filtering

The valid-range UI is an analyzer feature rather than a vendor-output replication. Availability and filtering are intentionally separate: non-positive lifetime sentinels are unavailable by default, then the user-controlled lower/upper range filters the remaining available sites. Raw XML/controller values can retain the sentinel for provenance inspection. Tests lock support-mask behavior so unavailable sites do not distort scientific histograms, smooth maps or summaries. This is also important for quarter wafers/coupons where geometrically scheduled sites outside the sample would otherwise corrupt the summary.

## Dual QSS injection sweep — paired raw XML/CSV regression

The supplied private corpus contains **330 `DualQssMeasurement` XML files**. **273** have exact-basename PV-2000 raw CSV exports, yielding **5833 paired injection points**. The other 57 XMLs are kept as structure/runtime coverage; 10 CSVs without an exact-basename XML are not auto-paired.

Regression results:

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| XML corpus | 330 files | established current structure |
| exact XML/CSV pairs | 273 | validated evidence set |
| paired injection rows | 5833 | exact count match |
| QSS intensity | max abs error 0 mSun | validated raw path |
| laser power vector | max abs error 0 | validated raw path |
| `TransientInfo@LifeTime` vs CSV raw `LifeTime [μs]` | max abs error **0 µs** | validated raw path |
| XML `Values` vs `TransientInfo@LifeTime` | max abs difference **0.020593307 µs**; one paired point >0.006 µs | distinct diagnostic XML field |
| XML transient samples | 2000 per supplied transient | established XML structure |
| CSV raw transient samples | first 1999 samples | vendor export behavior |
| paired raw Time/Voltage samples | **11,660,167** compared; max abs error 0 at export precision | validated raw path |
| vendor result-table Lifetime | **4628 positive / 1205 zero** | observed, transformation unresolved |
| vendor `dn` given positive vendor Lifetime | generation formula max relative discrepancy ≈ **0.509%** at rounded CSV precision | validated downstream step |
| Implied Voc / J0 | output path not reproduced | inferred / unsupported |

The expanded corpus resolves an earlier ambiguity: **CSV raw `LifeTime` corresponds to `TransientInfo@LifeTime`, while XML `Values` is a separate closely related lifetime vector.** The analyzer uses `TransientInfo@LifeTime` for the injection curve (with XML `Values` fallback only when needed) and preserves both fields explicitly in CSV export.

The CSV top-table `Lifetime[us]` remains a third, post-processed quantity. It is not synthesized at runtime until its transformation and validity rule are reproduced point-by-point.

A supplemental six-XML set confirms `OnePointPattern` center coordinates with `SubstrateShape=Circle`, radius 50 mm and 7 mm edge exclusion. These files request J0-related post-processing but have no matching result-table export; they exercise one-point geometry/metadata handling only.

The analyzer remains XML-only at runtime. Paired CSVs are private regression evidence and are not runtime inputs.

See `docs/ALGORITHMS_DUAL_QSS.md` and `docs/REFERENCE_PROFILES.md`.

## Dual QSS numeric final-result parity — QSS-INJ-RESULT-001

The original core evidence is two real `DualQssMeasurement` XML files with matching **numeric PV-2000 final-result CSV exports**, both `OnePointPattern + RoundWafer`, Back/Back source selection and non-Auger. The 100-case harness adds three compatible current-style `OnePointPattern` result rows, including one `SquareCell` target; target geometry is therefore validated independently from the OnePoint calculation envelope.

The independent private reconstruction starts from XML only and reproduces vendor QDC internals plus all nine final scalar outputs. The public runtime validator then executes the browser implementation against the same two XML+CSV pairs.

| Quantity / behavior | Paired regression | Status |
|---|---:|---|
| QDC, HighPower 25 transients | max abs error ≈ **7.92e-11** | validated internal path |
| QDC, LowPower 16 transients | max abs error ≈ **2.67e-12** | validated internal path |
| teff.d (1 Sun) | **0 µs** error in both pairs | validated |
| teff.SS (1 Sun) | max abs error ≈ **2.3e-13 µs** | validated |
| teff.SS Max | max abs error ≈ **9.1e-13 µs** | validated |
| Basore J0 | finite HighPower value exact to floating-point tolerance; LowPower `Ud.` reproduced | validated |
| Δn (1 Sun) | finite HighPower value reproduced; LowPower `Ud.` reproduced | validated |
| Smax (1 Sun) | max abs error ≈ **4.3e-14 cm/s** | validated |
| Smax at max teff.SS | max abs error ≈ **4.7e-14 cm/s** | validated |
| Implied Voc (1 Sun) | max abs error ≈ **4.4e-16 V** | validated |
| K-S J0 | max abs error ≈ **7.3e-12 fA/cm²** | validated |

Current pair values include HighPower `teff.SS=280.94342922609 µs`, `teff.SS Max=893.70740338579 µs`, Basore J0 `199.548389124001 fA/cm²`, K-S J0 `128.40923475899 fA/cm²`; LowPower `teff.SS=236.991629 µs`, `teff.SS Max=1984.29119677534 µs`, Basore/Δn unavailable and K-S J0 `863.446682273861 fA/cm²`.

Run:

```bash
npm run validate:dual-qss-runtime-results -- <case-dir> [<case-dir> ...]
```

The 100-case harness adds five nonempty Dual QSS final-result rows beyond the original two-pair regression. Three OnePoint rows remain compatible with the established non-Auger Back/Back calculation family. One of them has `CalculateJZeroParams=false`: PV-2000 exports finite teff.d/teff.SS/Δn/Smax/Voc but `Ud.` for `teff.SS Max` and maximum-Smax. The runtime now preserves that quantity-level unavailability instead of exposing internally computable maxima.

Two historical `FixedPointsPattern + PseudoSquareCell` rows give conflicting calculation evidence: one is close to the current reconstruction, while the other differs materially (for example ≈0.43 µs teff.SS, ≈10.16 µs teff.SS Max and ≈1.30 fA/cm² Basore J0). They remain diagnostic and do not widen the OnePoint calculation gate.

The modernized 100-case result validator now reports **3 numeric PASS + 7 diagnostics**: four zero-result acquisitions, one legacy Laser-Power/Lifetime-only branch and the two conflicting FixedPoints rows are explicitly non-promoting diagnostics. The three PASS rows include two RoundWafer targets and one SquareCell target; all resolve through `GEOM-ONEPOINT-CENTER-001`.

The validator is a development regression gate only; runtime remains XML-only. This validation does **not** cover Auger correction, alternate source selections, a sweep crossing 1000 mSun without an exact 1000-mSun sample, or the conflicting historical FixedPoints result branch.


## Emitter J0 map — calculation / geometry / quantity regression

The original 5017-site `JZeroMeasurement` XML + PV-2000 CSV pair established the two-intensity result path. The 100-case private harness corpus adds **eight successful numeric JZero exports** spanning OnePoint, SquareRegion, HighDensity and Map geometries. The current validator resolves geometry independently, validates the shared two-iteration calculation quantities across all eight pairs, and treats Implied Voc as a narrower quantity profile.

| Quantity / behavior | 100-case regression result | Status |
|---|---:|---|
| geometry | 8 / 8 pairs resolve through shared geometry profiles | validated independently |
| X/Y | max Euclidean error ≈ **4.97e-14 mm** | validated |
| τeff.d, first/second QSS | max abs error ≈ **5.12e-13 µs** | `JZERO-CALC-001` validated |
| Smax, first/second QSS | max abs error ≈ **4.77e-12 cm/s** | `JZERO-CALC-001` validated |
| Basore J0 | max abs error ≈ **4.73e-11 fA/cm²** | `JZERO-CALC-001` validated |
| Implied Voc on `MapPattern + PseudoSquareCell` | two numeric pairs; max abs error ≈ **0.850 mV** | `JZERO-VOC-MAP-PSEUDOSQUARE-001`, reproduced at displayed precision |
| Implied Voc on the other paired geometries | observed max errors ≈ **18.7–21.1 mV** | diagnostic / inferred; not promoted |
| one-site summary Stdev | vendor exports `NaN` | preserved as unavailable |

The original 5017-site reference remains the strongest exact geometry instance: a 156 × 156 mm pseudo-square with 205 mm diameter mask, 7 mm EdgeExclusion and 2 mm pitch, yielding 5017 X-fast, ascending-Y sites from (-64, -70) to (64, 70) mm. Its two Implied-Voc channels reproduce within approximately 0.061 and 0.066 mV. A second 1221-site `MapPattern + PseudoSquareCell` pair extends the same quantity profile to approximately 0.850 mV maximum error.

The broader corpus demonstrates why validation axes are separate. Direct XML lifetime, `Smax = W/(2τ)` and the Basore-Hansen J0 compatibility equation remain stable across the paired geometry families, while the current JZero Implied-Voc calibration does not generalize to the older OnePoint/SquareRegion/HighDensity result paths. Runtime therefore keeps those Voc quantities inferred instead of widening the compatibility claim.

Run:

```bash
npm run validate:jzero
```

The validator looks for matching private pairs under `private/reference/jzero/` or accepts explicit XML paths. Runtime remains XML-only; vendor CSVs are regression evidence only.

## DIT reference

Private references include W1 XML, PV-2000 summary/raw exports, group MATLAB code and COCOS documents. The pre-unification Standard COCOS regression established approximately 2.6% mean error for Qtot and minimum Dit. The default Si model uses the legacy MATLAB midgap `ni = 9.65e9 cm^-3` consistently in both the midgap target and Qsc with `εr = 11.68`, replacing the rounded `1.00e10 cm^-3` previously used only in Qsc. Because that was an intentional numerical-model change, the private W1 regression must be re-run before treating the old 2.6% figures as the exact post-change result.

The Analysis controls expose **Material: Silicon (Si) / Germanium (Ge)** as an Analyzer-level semiconductor-model choice. Ge restores the legacy MATLAB compatibility constants `ni = 2e13 cm^-3` and `εr = 16.2`; the selection feeds Qsc, variation/Minimum Dit, the flatband semiconductor-capacitance criterion/Qtot, and Midgap Dit targeting. PV-2000 itself has no Si/Ge material selector, so Ge-sample exports are numerical comparison references rather than evidence for a PV-2000 Ge mode.

### Standard COCOS

Status: **validated against the available W1 export to the documented approximate error level**.

The normal Follow XML path resolves `UseCocosII=false` to Standard COCOS and preserves the measured dark/light path. Standard Vsb is doping-aware and signed: P-type uses `F*(VDark-VLight)`, while N-type reverses that sign. The reference family is unchanged, but exact post-change numerical parity is pending re-run of the private W1 regression after the ni unification.

### DIT NinePointPattern geometry

Status: **inferred**.

The XML coefficient values are dimensionless/target-relative for the current nine-site family. The shared geometry resolver scales them to the scheduled RoundWafer radius `Diameter/2 - EdgeExclusion`. For a 100 mm wafer with 4 mm EdgeExclusion, `0.632455532 × 46 ≈ 29.09 mm`.

A regression test prevents these coefficients from being displayed directly as ±0.632 mm. Paired PV-2000 X/Y output is still required to validate the exact scaling convention.

### OnePointPattern / circular-substrate regression

Nine private one-point DIT XMLs have matching PV-2000 Raw COCOS CSV exports. All use a center-only `OnePointPattern`; nominal geometry is stored as `Substrate/SubstrateShape xsi:type="Circle"` with 50 mm radius and measurement-level 4 mm edge exclusion. The display therefore uses the real nominal substrate and center measurement position.

Across 275 process rows, XML dark means after offset subtraction match exported `Vcpd Dark` with about **0.310 mV MAE** and **1.11 mV max absolute error**. The exported `Vcpd Light` is an almost straight processed branch and does not equal the saved measured-light means despite `UseCocosII=false`. The extra reprocessing state is not uniquely encoded in the XML and is not guessed at runtime.

An expanded, read-only audit uses `scripts/validate_dit_raw_reference.py` to compare exact-name XML/raw-CSV candidates while treating comma- and semicolon-separated duplicate exports as one only when all exported numeric columns agree. Of 223 XMLs in that private collection, 178 have a matching raw CSV; 176 are row-aligned Standard COCOS OnePoint pairs, two have truncated/different row counts, and 45 XMLs are unpaired. Across the 176 aligned pairs, all **11,575 Qc positions** match the XML charge schedule exactly. **168/176** pairs keep the exported dark-channel maximum error within 2 mV; the other eight diverge, so the full collection is **not** a blanket validated profile. The median per-pair dark MAE is about 0.301 mV. Exported light/Vsb values generally differ from the saved measured-light branch, and 4,982 raw-export Dit cells are blank. No vendor Dit/Ge material parity is claimed from this audit.

Run the diagnostic with `npm run validate:dit -- --xml-dir <local XML directory> --csv-dir <local raw CSV directory>`; repeat `--csv-dir` for additional locations. `--max-dark-error-mv 2` additionally requires every XML in the selected directory to pair and every dark row to stay within 2 mV. A focused eight-pair subset passes that gate (520 rows, 1.60 mV maximum dark error); the entire mixed corpus does not.

### Final-result direct/bookkeeping quantities

Status: **paired validation for VDark, corrected final-result VLight/Vsb and Initial Qc**.

The 100-case private corpus contains **13 successful DIT final-result XML/vendor-CSV pairs (43 sites)** plus one XML whose vendor harness export fails with `ArgumentOutOfRangeException`. The paired results span OnePoint, SquareRegion and FivePoint geometries, plus one FixedPoints case whose geometry remains unresolved.

For the 13 successful pairs:

- initial `VDark` reconstructed directly from `InitialVcpdDark` and the stored offset agrees to a maximum absolute error of **3.55e-15 V**;
- final-result `VLight` is deterministically reconstructed as `VDark - F × (VDark - VLight_measured)` using the XML `VsbCorrectionFactor`; all **43 sites** match to floating-point precision, with maximum absolute error about **3.8e-15 V**. The previously reported **83.1 mV** difference is therefore a real corrected-light result semantic, not unexplained drift;
- final-result `Vsb = VDark - VLight_result = F × (VDark - VLight_measured)`. Recovered `CreateDataValues()` IL shows this direct sign is exported for both doping types, while `StartDitCalculation()` separately negates the N-type analysis arrays. The result-table quantity and Standard-COCOS analysis quantity are therefore distinct rather than contradictory; all **43 sites** pass with maximum absolute Vsb error **8.04e-16 V**;
- PV-2000 `Initial Qc` is **one preprocess charge step beyond the number of stored PreProcess dark vectors**: `(N_preprocess + 1) × CoronaCharge`; all **43 sites** match vendor output exactly after this correction;
- 12/13 cases resolve through existing shared geometry profiles, with maximum X/Y error about **3.58e-14 mm**; the single FixedPoints/RoundWafer case remains a geometry diagnostic rather than widening geometry support.

### Current-DLL Standard COCOS downstream final-result quantities

Status: **paired validation — `DIT-RESULT-STANDARD-DLL-002`**.

This explicitly version-scoped profile reconstructs the **current managed-DLL Standard COCOS final-result path** for downstream Vfb/Qsc/Qtot/Qit/Minimum-Dit quantities. Across the same 13 paired files / 43 sites, browser-runtime comparison has **zero availability mismatches**. Maximum absolute errors are about **1.03e-13 V (Vfb)**, **5.49e-4 cm^-2 (Qsc)**, **3.47e-2 cm^-2 (Qtot)**, **3.81e-1 cm^-2 eV^-1 (Minimum Dit)** and **2.93e-3 cm^-2 (Qit)**.

This downstream profile is kept separate from the Analyzer's configurable Standard COCOS scientific path because the recovered vendor implementation uses its own silicon constants, preprocessing and availability rules. It also does not widen COCOS-II or the Analyzer-only Ge model.

Run the narrow direct/bookkeeping final-result validator with:

```bash
python scripts/validate_dit_result_reference.py <result.xml> <vendor-result.csv>
```

This validator is intentionally separate from `validate_dit_raw_reference.py`, which remains the stronger raw-process-row audit.

### PV2000 COCOS-II (inferred)

Status: **inferred**, not vendor-exact.

A read-only inventory of the supplied historical backup (5,710 XMLs, including 2,659 `DITMeasurement` files), the supplied software data archive (62 DIT XMLs), and the private Ge/COCOS measurement collection (220 DIT XMLs) found no DIT file with `UseCocosII=true`. These datasets therefore cannot upgrade the XML-driven COCOS-II path to validated, irrespective of the software-package or folder name.

The current default COCOS-II path is derived from a same-raw-data adjustment series rather than a vendor algorithm disclosure. The supplied reprocessed exports established these behavioral constraints:

- vendor EOT value 100 is consistent with 100 Å (10 nm): the corresponding synthetic-line slope is ~0.464 V per 1e12 q/cm²;
- changing COCOS-II Min/Max Vsb affected reported Dit but did not alter exported VDark, VLight, summary Vsb, Vfb, Qsc, Qtot or Qit;
- the observed transition behavior is consistent with Min/Max acting late in Dit selection rather than in Vcpd reconstruction;
- Back Surface Shift True/False produced identical supplied exports for this dataset.

The implementation therefore labels this path **inferred**. Its Min/Max rule is the current best-fit model and should be tightened if a pointwise vendor Dit-Vsb export or a dataset where Back Surface Shift is active becomes available.

Follow XML setting now resolves `UseCocosII=true` to this inferred path. That routing choice is intentional: it reflects the strongest available same-raw-data evidence. It does **not** upgrade the algorithm's validation label.

### UI / control regression expectations

The Analysis controls panel must remain open after Apply/recalculation. Method-specific parameters are shown contextually and compactly, with the label/help icon and its input on one row:

- Material selector is present in Analysis controls, defaults to Si, and offers Ge without inferring material from sample/substrate names;
- Standard COCOS: no COCOS-II EOT or Min/Max inputs;
- PV2000 COCOS-II (inferred): EOT, Min Vsb and Max Vsb are exposed;
- no legacy/guide-based COCOS-II user path remains;
- Flatband accumulation points remain shared;
- **Optional Midgap Dit (PCHIP)** is always visible with a default-on checkbox;
- disabling that checkbox must remove the PCHIP curve/Midgap Dit result without changing Minimum Dit (PV2000-style);
- the method selector exposes **Median-binned PCHIP** and **PCHIP (original)**;
- Median-binned PCHIP is the default with a 10 mV Vsb bin width, and that width is user-adjustable;
- LOG10 / Linear remain shared interpolation-scale choices for both methods;
- PCHIP outlier limit is displayed in uppercase-E scientific notation.

The primary **Minimum Dit (PV2000-style)** must remain unchanged when only PCHIP method, median width, interpolation scale, outlier threshold, or enabled state changes. Those settings may change Midgap Dit and the fitted curve only. The 10 mV default is an analyzer behavior selected from the supplied raw Dit–Vsb comparison, not a claim about PV-2000's proprietary fitting algorithm.

COCOS-II parameter validation must not silently fall back to Standard COCOS. Missing numeric XML settings must use their fallback/NaN semantics rather than being parsed as numeric zero. The current-site COCOS-II diagnostics should expose accepted interval count and minimum-Dit Vsb.

In multi-column layouts, the left functional sidebar is independently scrollable/sticky within the viewport. Sidebar children must not flex-shrink to fit the viewport; they remain intrinsic-height blocks so overflow is real and the sidebar scroll container can scroll. Scrolling it must not move the plot columns. Fine-pointer desktop zoom must not trigger the portrait/mobile fallback merely because the viewport becomes taller than wide; the portrait/tablet fallback requires coarse-pointer input, while <=700 px remains the true narrow-width fallback. Dit Results summary must not require horizontal scrolling: parameter, valid-site mean and current-site values are rendered as responsive cards.



## ISC — XML + raw PV-2000 export

The original ISC pair plus nine new paired XML/vendor CSV exports establish `ISC-CALC-001` independently of geometry. The new cases cover 1860 sites across Map/RoundWafer, Map/SquareCell and SquareRegion/SquareCell. The manual identifies Vcpd Dark, Vcpd Light and VSB as the three ISC data-view quantities.

For each site, with raw dark/light means `D` / `L`, XML offset `O`, and XML VSB correction factor `F`, the vendor output is reproduced by:

```text
Vcpd Dark  = D - O
Vsb        = F * (D - L)
Vcpd Light = Vcpd Dark - Vsb
```

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| `ISCMeasurement` dispatch | unit tested | tested |
| point count | 169 XML = 169 export | validated |
| repeated readings | 24 dark + 24 light readings/site | validated for reference |
| X/Y coordinates | max abs error 0 mm | validated |
| Vcpd Dark | max abs error ~3.55e-15 V | validated |
| Vcpd Light | max abs error ~3.55e-15 V | validated |
| Vsb | max abs error ~7.49e-16 V | validated |
| Average / Median / sample Stdev / Min / Max | max abs error ~3.33e-15 | validated |

The original validated coordinate path uses `MapPattern + SquareCell`: scheduled half-extent is `Size/2 - EdgeExclusion`, with an X-fast centered lattice at XML pitch. The new paired corpus adds independent RoundWafer Map and SquareCell SquareRegion coordinate evidence. All nine new calculation and coordinate comparisons pass; the largest result difference is **4.44e-14 V** and the largest coordinate difference is below **6e-15 mm**.

Run:

```bash
npm run validate:isc
```

Matching private references use the same basename under `private/reference/isc/`, or can be provided as explicit paths to `scripts/validate_isc_reference.py`. The validator checks the calculation/quantity values and resolves geometry through the shared JavaScript geometry layer. Runtime remains XML-only. A new raw/result path remains a calculation profile; new coordinate scheduling requires its own paired geometry evidence.


## VCPD — XML + PV-2000 export

The original VCPD pair plus three new numeric pairs establish `VCPD-CALC-001` across one, four and sixteen readings per site. One additional empty XML/CSV pair has no acquired sites and provides no numeric validation. The family remains separate from ISC.

For these paired references, `LightOn=false`, iteration-level `VcpdOffset=0 V` and every acquired `VcpdDataItem` contains the configured number of readings. The vendor result is reproduced by:

```text
Vcpd Dark = arithmetic mean(XML Readings at the site)
```

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| `VcpdMeasurement` dispatch | unit tested | tested |
| point count | 1649 XML = 1649 export | validated |
| readings | 1 reading/site | validated for reference |
| target / schedule | 200 mm RoundWafer, 8 mm exclusion, 4 × 4 mm pitch | validated for reference |
| X/Y coordinates | all 1649 pairs exact | validated |
| Vcpd Dark | max abs error 0 V | validated |
| Average / Median / sample Stdev / Min / Max | floating-point parity with vendor summary | validated |
| non-zero VcpdOffset | no paired reference | NEW PROFILE |
| LightOn=true | no paired reference | NEW PROFILE |
| multiple readings/site | 4 and 16 readings/site paired; maximum new result error ≈ 4.44e-16 V | validated for paired path |

The three new numeric exports cover **1283 sites**; all coordinates reproduce independently through Map/RoundWafer, HighDensity/PseudoSquareCell and OnePoint/RoundWafer shared geometry profiles (maximum coordinate difference below **7e-14 mm**). Their summaries agree within **5e-15 V**, including the one-site unavailable Stdev. `LightOn=true`, non-zero offset and inconsistent reading counts remain outside the validated calculation path.

The strict circular schedule uses `r = Diameter/2 - EdgeExclusion` and keeps lattice points satisfying `x²+y²<r²` in X-fast row-major order. For the reference, `r=92 mm`, the first coordinate is `(-24,-88) mm`, and the last is `(24,88) mm`.

Run:

```bash
npm run validate:vcpd
```

Matching private references use the same basename under `private/reference/vcpd/`. Runtime remains XML-only; the CSV is never consulted during user analysis.

## LBIC raster — paired XML + PV-2000 export/display regression

Historical composite evidence is retained under `LBIC-SINGLE-001`, `LBIC-MULTI-002` and `LBIC-REFLECTANCE-003`. Current validation also exposes the calculation axis independently:

- `LBIC-CALC-CURRENT-DIRECT-SCATTERED-001`: active Current + Direct + Scattered → Current / Reflectivity / IQE;
- `LBIC-CALC-CURRENT-SCATTERED-002`: active Current + Scattered, Direct disabled → Current / Reflectivity / IQE;
- `LBIC-CALC-CURRENT-ONLY-003`: active Current only;
- `LBIC-CALC-REFLECTANCE-ONLY-004`: Current disabled with zero placeholder, Direct + Scattered active → Reflectivity only.

The older current-enabled references contain four 51×51/101×101 single-beam rasters plus one **54,449-point** four-beam direct+scattered reference. The 100-case corpus adds **nine numeric XML/CSV pairs** and **two zero-site diagnostics**. Eight numeric pairs exercise `LBIC-CALC-CURRENT-SCATTERED-002` across OnePoint/SquareCell, Map/SquareCell, SquareRegion/RoundWafer and SquareRegion/SquareCell for **27,376 sites**; one five-site FivePoint/SquareCell pair exercises `LBIC-CALC-CURRENT-DIRECT-SCATTERED-001`. Calculation and geometry are validated independently.

The reflectance-only corpus contains **62 XML files**. All 62 use `MeasureCurrent=false`, `MeasureDirectReflectance=true`, `MeasureScatteredReflectance=true`; their BeamData still include `Current`, but every supplied Current value is exactly zero. **44** of those XMLs have **60 matching PV-2000 XPS result printouts** because several measurements were printed at more than one display color scale.

The full-corpus inventory check reports **44 PASS** with matching XPS summaries, **17 UNPAIRED** complete XMLs without a matching vendor printout, **1 INFERRED** partial acquisition (2814/3721 points), and **0 FAIL**. `UNPAIRED` confirms the XML fits the known structural path but does not claim result parity for that instance. The validator is strict by default; `--allow-unpaired` is for a mixed corpus inventory and never labels missing vendor evidence as `PASS`.

A browser smoke sweep of the built analyzer imported **all 62 XMLs**. For every file, the selected quantity was Reflectivity (marked inferred for the partial acquisition), Results summary and Selected pixel contained Reflectivity values, and raster map, distribution, X profile and Y profile canvases all had plotted pixels. There were no import dialogs or runtime exceptions. Visual inspection of a complete file and the partial file confirmed the expected map shapes. This verifies display operation, not vendor parity for the 17 unpaired files or the partial coordinate schedule.

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| `LBICMeasurement` dispatch | unit tested | tested |
| SquareRegionPattern coordinates, complete scans | pointwise max error 0 mm in paired CSV references | validated |
| PseudoSquareCell schedule | 54,449 reconstructed = 54,449 export rows | validated |
| PseudoSquare X/Y | pointwise max error 0 mm | validated |
| Current | nonnegative raw XML vs CSV pointwise when active; negative stored Current becomes vendor `Ud.` while its signed XML value remains in Advanced | validated for observed paths |
| 100-case current+scattered expansion | 8 numeric pairs / 27,376 sites; Current exact, Reflectivity exact to roundoff, IQE max error ≈9.95e-14 %-point; availability masks agree | validated calculation path across independently resolved geometries |
| 100-case direct+scattered expansion | 5-site FivePoint/SquareCell; X/Y max ≈7.11e-15 mm; Current exact; Reflectivity/IQE max error ≈4.26e-14 %-point | validated calculation + independent geometry evidence |
| zero-site LBIC exports | 2 paired files with zero DataItems / zero vendor rows | diagnostic only; no numeric profile promoted |
| disabled Current placeholder | reflectance-only corpus: Current=0 everywhere but `MeasureCurrent=false`; suppressed from measured results | validated semantic handling |
| displayed Reflectivity | `clamp(DirectReflection + ScatteredReflection, 0, 100)` | validated |
| reflectance-only XPS summaries | 60 XPS Average / Median / sample Stdev / Min / Max comparisons; max discrepancy <0.005 %-point | validated to XPS display rounding |
| negative reflectivity display edge | four 656 nm sites clamp to 0% in current-enabled multi-beam reference | validated |
| compatibility charge constant | `q = 1.602e-19 C` | validated for current-enabled IQE path |
| IQE denominator | uses the **unclamped raw optical sum**; retains finite `0–100%` results, including the paired negative-current / >100%-reflection corner | validated for observed paths |
| IQE finite values | ~1e-12 %-point for single-beam refs; ~1e-13 %-point for multi-beam ref | validated |
| reflectance-only EQE/IQE | not synthesized because current measurement is disabled | validated semantic handling |
| vendor unavailable IQE | blank / `Ud.` represented as unavailable and excluded from summaries | validated |
| summary Stdev | sample standard deviation, finite values only | validated |
| independent multi-beam switching | four-beam paired reference | validated |
| incomplete SquareRegion acquisition | one 61×61 recipe contains 2814/3721 points; leading schedule prefix is displayed | partial / inferred |
| EQE as standalone vendor output | vendor CSV does not expose it | inferred intermediate |
| calculated diffusion length (DL) | four additional private XML/CSV pairs: one 961-point numeric map plus three all-`Ud.` one/five-point cases; 956/956 finite values agree to ≤1.66e-11 µm and all 12 unavailable sites agree | validated for current-plus-scattered cross-beam path; direct-plus-scattered finite DL unvalidated |

For the multi-beam reference, the XML geometry is Target Size 125 × 125 mm, Diameter 150 mm, EdgeExclusion 3 mm and Pitch 0.5 × 0.5 mm. The scheduled lattice uses halfWidth = halfHeight = 59.5 mm and radius = 72 mm; it is X-fast with ascending Y. First/last sites are (-40.5, -59.5) and (40.5, 59.5) mm.

For the reflectance-only family, one representative XML→XPS pair gives Average 30.8180159→30.82%, Median 8.5744989→8.57%, Stdev 32.2960455→32.30%, Min 0.2193933→0.22% and Max 83.0026011→83.00%.

Run:

```bash
npm run validate:lbic
```

Current-enabled private references use same-basename XML/CSV pairs under `private/reference/lbic/`. Reflectance-only cases may use matching Reflectivity XPS printouts; the validator matches them by normalized XML-result-name prefix and checks the five vendor summary statistics at display precision.

For a private reflectance folder inventory, pass `--allow-unpaired` followed by its XML paths to `scripts/validate_lbic_reference.py` through the Node Python wrapper. Omit the option when every supplied XML must have a matching vendor result.

Numeric changes such as wavelength, power, finite FluxCache, raster size/pitch and, within `LBIC-MULTI-002`, the number of independent beam keys do not by themselves create a new profile. A different coordinate encoding, target scheduling rule, active measurement-flag combination, raw channel set, unit convention, coupled cross-beam calculation, iteration path, or vendor result/validity behavior remains **NEW PROFILE**. Incomplete acquisition ordering is not promoted to validated parity without matching vendor coordinate evidence.

Runtime remains XML-only. CSV/XPS references are never consulted when a user imports an XML.

### Independent geometry expansions from the 100-case private corpus

The shared resolver and separate geometry registry now include four more Pattern/Target combinations, each checked point-by-point against a real paired vendor export:

| Geometry profile | Paired sites | Maximum X/Y Euclidean error |
|---|---:|---:|
| `GEOM-SQUAREREGION-ROUND-001` | 400 | 7.54e-15 mm |
| `GEOM-NINEPOINT-ROUND-001` | 9 | 2.01e-14 mm |
| `GEOM-FIVEPOINT-SQUARE-001` | 5 | 7.11e-15 mm |
| `GEOM-HIGHDENSITY-PSEUDOSQUARE-001` | 176 | 2.01e-14 mm |

The HighDensity/PseudoSquare case uses 225 XML coefficients, a circular scheduled boundary and three target exclusion polygons; these leave 176 exported sites in vendor order. The polygons are physical millimetre shapes and are applied after target-relative coefficient scaling. These four checks validate **coordinates** for their named geometry paths. SPV enhanced mode, other calculation branches and any incomplete acquisition keep their independent scientific evidence boundaries. Reproduce a paired geometry check with `python scripts/validate_geometry_profiles.py private/result.xml private/result.csv GEOM-...`.
