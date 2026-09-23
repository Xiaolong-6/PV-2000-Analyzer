# Validation record

The central registry of validated reference envelopes is `docs/REFERENCE_PROFILES.md`. This file contains detailed regression evidence. Any materially new data/configuration outside a recorded envelope is a **NEW PROFILE** until its actual XML + matching PV-2000 output are regressed.

## Reference data locations

- `private/reference/` — ignored local/confidential validation material. It must never be committed.
- `reference_data/` — intentionally public contributor-supplied regression cases. Each case must pair the raw PV-2000 XML with its matching vendor export and should include a PV-2000 screenshot plus a short case README.

Public reference data do not change the runtime contract: the analyzer still consumes XML only. CSV/XPS/screenshots are test and reverse-engineering evidence. A public dataset also does not by itself prove the PV-2000 internal algorithm; the validation label applies only to the observed input→output envelope.

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

### HighDensityPattern compatibility

Status: **inferred coordinate reconstruction**, not vendor-validated.

Older QSS XMLs in the current development set use `HighDensityPattern` with explicit normalized `Coefficients` and a scalar `Dimension`. Observed examples include 15 × 15 and 20 × 20 grids on a 100 mm RoundWafer with 7 mm edge exclusion, and a 35 × 35 grid on a 156 × 156 mm SquareCell with 7 mm edge exclusion. Runtime now requires coefficient count to equal measured-value count and preserves coefficient order.

For SquareCell, coefficients are scaled to the EdgeExclusion-adjusted rectangle. For RoundWafer, the full normalized coefficient template is filtered with `x²+y² < 1` before scaling by `Diameter/2 - EdgeExclusion`. This exactly reproduces the observed XML point counts: 145 from a 15×15 template and 276 from a 20×20 template. A matching PV-2000 X/Y export is still required before this path can be marked validated.

### Valid-data filtering

The new valid-range UI is an analyzer feature rather than a vendor-output replication. Tests verify range masking; users must choose limits appropriate to the sample geometry/data distribution. This is especially important for quarter wafers/coupons where geometrically scheduled sites outside the sample would otherwise corrupt the summary.

## Dual QSS injection sweep — paired raw XML/CSV regression

The supplied private corpus contains **72 `DualQssMeasurement` XML files**. **57** have matching PV-2000 raw CSV exports, yielding **1003 paired injection points**.

Regression results:

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| XML/CSV paired files | 57 | validated evidence set |
| paired injection rows | 1003 | exact count match |
| QSS intensity | max abs error 0 mSun | validated raw path |
| laser power vector | max abs error 0 | validated raw path |
| XML `Values` vs CSV raw `LifeTime [μs]` | max abs error ≈ 0.0050414 µs | validated to export rounding |
| XML transient samples | 2000 per current transient | established XML structure |
| CSV raw transient samples | first 1999 samples | vendor export behavior |
| paired raw Time/Voltage samples | 2,004,997 compared; max abs error 0 at export precision | validated raw path |
| vendor result-table Lifetime | 775 positive / 228 zero | observed, transformation unresolved |
| vendor `dn` given positive vendor Lifetime | generation formula matches within <0.5% relative at rounded CSV precision | validated downstream step |
| Implied Voc / J0 | output path not yet reproduced | inferred / unsupported |

A critical semantic distinction is now locked in: **XML `Values` / `TransientInfo@LifeTime` are the raw transient-lifetime path, while CSV top-table `Lifetime[us]` is a different post-processed result.** The runtime therefore labels its curve as XML/transient lifetime and does not claim to reproduce the vendor result-table Lifetime.

The analyzer remains XML-only at runtime. Paired CSVs are regression evidence and are not loaded by users.

See `docs/ALGORITHMS_DUAL_QSS.md` and `docs/REFERENCE_PROFILES.md`.


## Emitter J0 map — paired XML/CSV regression

One private `JZeroMeasurement` XML + matching PV-2000 CSV export establishes the current two-intensity Emitter J0 reference path. The XML stores two 5017-point `UpcdIterationData` lifetime arrays at 1000 and 3000 mSun; the vendor export contains Basore J0, both τeff.d channels, both Smax channels, both Implied Voc channels, X/Y coordinates and summary statistics.

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| point count | 5017 paired sites | validated |
| `MapPattern + PseudoSquareCell` X/Y | max abs error 0 mm | validated |
| τeff.d, first/second QSS | max abs error ≈ 5.2e-13 µs | validated |
| Smax, first/second QSS | max abs error ≈ 5e-13 cm/s | validated |
| Basore J0 | max abs error ≈ 9.1e-13 fA/cm² | validated |
| Implied Voc, first QSS | max abs error ≈ 0.061 mV | compatibility-regressed |
| Implied Voc, second QSS | max abs error ≈ 0.066 mV | compatibility-regressed |
| Average / Median / sample Stdev / Min / Max | regressed for all seven quantities | validated within the quantity tolerances above |

The reference geometry is a 156 × 156 mm pseudo-square with 205 mm diameter mask, 7 mm EdgeExclusion and 2 mm pitch. The scheduled region is the intersection of the adjusted 71 × 71 mm half-extents and 95.5 mm radius, yielding exactly 5017 X-fast, ascending-Y sites from (-64, -70) to (64, 70) mm.

Basore J0 is derived from the two-intensity slope of inverse small-perturbation lifetime squared versus generation rate. The compatibility constant reproduces this reference to floating-point precision. JZero Implied Voc intentionally uses a separate compatibility calibration from the general QSS-map analyzer because the general QSS `ni(T)` model produces a systematic offset on this result family. These compatibility constants are regression models for the observed vendor output, not claims about undisclosed internal PV-2000 constants.

Run:

```bash
npm run validate:jzero
```

The validator looks for matching private pairs under `private/reference/jzero/` and skips cleanly when they are absent. Runtime remains XML-only.

## DIT reference

Private references include W1 XML, PV-2000 summary/raw exports, group MATLAB code and COCOS documents. The pre-unification Standard COCOS regression established approximately 2.6% mean error for Qtot and minimum Dit. The default Si model uses the legacy MATLAB midgap `ni = 9.65e9 cm^-3` consistently in both the midgap target and Qsc with `εr = 11.68`, replacing the rounded `1.00e10 cm^-3` previously used only in Qsc. Because that was an intentional numerical-model change, the private W1 regression must be re-run before treating the old 2.6% figures as the exact post-change result.

The Analysis controls now also expose **Material: Silicon (Si) / Germanium (Ge)**. Ge restores the legacy MATLAB compatibility constants `ni = 2e13 cm^-3` and `εr = 16.2`. The material selection feeds Qsc, variation/Minimum Dit, the flatband semiconductor-capacitance criterion/Qtot, and Midgap Dit targeting. The Ge path is **implemented but unvalidated against PV-2000 Ge output**; a real Ge XML + matching vendor export/display is required before expanding the validated envelope.

### Standard COCOS

Status: **validated against the available W1 export to the documented approximate error level**.

The normal Follow XML path resolves `UseCocosII=false` to Standard COCOS and preserves the measured dark/light path. The reference family is unchanged, but exact post-change numerical parity is pending re-run of the private W1 regression after the ni unification.

### PV2000 COCOS-II (inferred)

Status: **inferred**, not vendor-exact.

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

One paired ISC XML + PV-2000 CSV export establishes the current `ISCMeasurement + MapPattern + SquareCell` reference family. The manual identifies Vcpd Dark, Vcpd Light and VSB as the three ISC data-view quantities and states that the ISC raw export contains the per-point voltage readings.

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

The validated coordinate path uses `MapPattern + SquareCell`: scheduled half-extent is `Size/2 - EdgeExclusion`, with an X-fast centered lattice at the XML X/Y pitch. The reference is 100 × 100 mm with 30 mm EdgeExclusion and 3 × 3 mm pitch, yielding a 13 × 13 grid from -18 to +18 mm.

Run:

```bash
npm run validate:isc
```

Matching private references use the same basename under `private/reference/isc/`. Runtime remains XML-only; the CSV is never consulted during user analysis. Alternate ISC pattern/target/raw/result paths remain outside this validated envelope until paired vendor output is supplied.


## VCPD — XML + PV-2000 export

One paired VCPD XML + PV-2000 CSV export establishes the current `VcpdMeasurement + MapPattern + RoundWafer` reference family. It is implemented in the shared ISC/Kelvin-probe analyzer but retains a separate result path and validation boundary.

For the paired reference, every `VcpdDataItem` contains one `Readings/double`, `LightOn=false`, and iteration-level `VcpdOffset=0 V`. The vendor result is reproduced by:

```text
Vcpd Dark = XML Reading
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
| multiple readings/site | no paired reference | NEW PROFILE |

The strict circular schedule uses `r = Diameter/2 - EdgeExclusion` and keeps lattice points satisfying `x²+y²<r²` in X-fast row-major order. For the reference, `r=92 mm`, the first coordinate is `(-24,-88) mm`, and the last is `(24,88) mm`.

Run:

```bash
npm run validate:vcpd
```

Matching private references use the same basename under `private/reference/vcpd/`. Runtime remains XML-only; the CSV is never consulted during user analysis.

## LBIC raster — paired XML + PV-2000 export/display regression

The current evidence establishes three validated LBIC families:

- `LBIC-SINGLE-001`: one beam, `SquareRegionPattern`, active Current + DirectReflection + ScatteredReflection → Current / Reflectivity / IQE;
- `LBIC-MULTI-002`: multiple independent beams, `MapPattern + PseudoSquareCell`, the same active per-beam raw/result path;
- `LBIC-REFLECTANCE-003`: one beam, `SquareRegionPattern`, `MeasureCurrent=false`, Direct/Scattered active → Reflectivity only.

The current-enabled set contains five paired XML/CSV references: four 51×51/101×101 single-beam rasters plus one **54,449-point** four-beam reference (984, 952, 855 and 656 nm).

The reflectance-only corpus contains **62 XML files**. All 62 use `MeasureCurrent=false`, `MeasureDirectReflectance=true`, `MeasureScatteredReflectance=true`; their BeamData still include `Current`, but every supplied Current value is exactly zero. **44** of those XMLs have **60 matching PV-2000 XPS result printouts** because several measurements were printed at more than one display color scale.

The full-corpus inventory check reports **44 PASS** with matching XPS summaries, **17 UNPAIRED** complete XMLs without a matching vendor printout, **1 INFERRED** partial acquisition (2814/3721 points), and **0 FAIL**. `UNPAIRED` confirms the XML fits the known structural path but does not claim result parity for that instance. The validator is strict by default; `--allow-unpaired` is for a mixed corpus inventory and never labels missing vendor evidence as `PASS`.

A browser smoke sweep of the built analyzer imported **all 62 XMLs**. For every file, the selected quantity was Reflectivity (marked inferred for the partial acquisition), Results summary and Selected pixel contained Reflectivity values, and raster map, distribution, X profile and Y profile canvases all had plotted pixels. There were no import dialogs or runtime exceptions. Visual inspection of a complete file and the partial file confirmed the expected map shapes. This verifies display operation, not vendor parity for the 17 unpaired files or the partial coordinate schedule.

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| `LBICMeasurement` dispatch | unit tested | tested |
| SquareRegionPattern coordinates, complete scans | pointwise max error 0 mm in paired CSV references | validated |
| PseudoSquareCell schedule | 54,449 reconstructed = 54,449 export rows | validated |
| PseudoSquare X/Y | pointwise max error 0 mm | validated |
| Current | raw XML vs CSV pointwise when `MeasureCurrent` is active | validated |
| disabled Current placeholder | reflectance-only corpus: Current=0 everywhere but `MeasureCurrent=false`; suppressed from measured results | validated semantic handling |
| displayed Reflectivity | `clamp(DirectReflection + ScatteredReflection, 0, 100)` | validated |
| reflectance-only XPS summaries | 60 XPS Average / Median / sample Stdev / Min / Max comparisons; max discrepancy <0.005 %-point | validated to XPS display rounding |
| negative reflectivity display edge | four 656 nm sites clamp to 0% in current-enabled multi-beam reference | validated |
| compatibility charge constant | `q = 1.602e-19 C` | validated for current-enabled IQE path |
| IQE denominator | uses the **unclamped raw optical sum**; `Rraw >= 100%` is unavailable | validated for current-enabled families |
| IQE finite values | ~1e-12 %-point for single-beam refs; ~1e-13 %-point for multi-beam ref | validated |
| reflectance-only EQE/IQE | not synthesized because current measurement is disabled | validated semantic handling |
| vendor unavailable IQE | blank / `Ud.` represented as unavailable and excluded from summaries | validated |
| summary Stdev | sample standard deviation, finite values only | validated |
| independent multi-beam switching | four-beam paired reference | validated |
| incomplete SquareRegion acquisition | one 61×61 recipe contains 2814/3721 points; leading schedule prefix is displayed | partial / inferred |
| EQE as standalone vendor output | vendor CSV does not expose it | inferred intermediate |
| calculated diffusion length (DL) | CSV contains DL but XML does not expose a raw DL channel and the vendor algorithm is not established | unsupported |

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

