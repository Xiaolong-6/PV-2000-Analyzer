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

### Valid-data filtering

The new valid-range UI is an analyzer feature rather than a vendor-output replication. Tests verify range masking; users must choose limits appropriate to the sample geometry/data distribution. This is especially important for quarter wafers/coupons where geometrically scheduled sites outside the sample would otherwise corrupt the summary.

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


## LBIC raster — paired XML + PV-2000 export regression

Five paired XML/CSV references now establish two validated LBIC families:

- `LBIC-SINGLE-001`: one beam, `SquareRegionPattern`, Current + DirectReflection + ScatteredReflection → Current / Reflectivity / IQE;
- `LBIC-MULTI-002`: multiple independent beams, `MapPattern + PseudoSquareCell`, the same per-beam raw/result path.

The four single-beam references use 51×51 or 101×101 rectangular rasters. The multi-beam reference contains **54,449** points and four beams (984, 952, 855 and 656 nm).

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| `LBICMeasurement` dispatch | unit tested | tested |
| SquareRegionPattern coordinates | pointwise max error 0 mm | validated |
| PseudoSquareCell schedule | 54,449 reconstructed = 54,449 export rows | validated |
| PseudoSquare X/Y | pointwise max error 0 mm | validated |
| Current | raw XML vs CSV pointwise, all validated beams | validated |
| displayed Reflectivity | `clamp(DirectReflection + ScatteredReflection, 0, 100)` | validated |
| negative reflectivity display edge | four 656 nm sites clamp to 0% | validated |
| compatibility charge constant | `q = 1.602e-19 C` | validated |
| IQE denominator | uses the **unclamped raw optical sum**; `Rraw >= 100%` is unavailable | validated |
| IQE finite values | ~1e-12 %-point for single-beam refs; ~1e-13 %-point for multi-beam ref | validated |
| vendor unavailable IQE | blank / `Ud.` represented as unavailable and excluded from summaries | validated |
| summary Stdev | sample standard deviation, finite values only | validated |
| independent multi-beam switching | four-beam paired reference | validated |
| EQE as standalone vendor output | vendor CSV does not expose it | inferred intermediate |
| calculated diffusion length (DL) | CSV contains DL but XML does not expose a raw DL channel and the vendor algorithm is not established | unsupported |

For the multi-beam reference, the XML geometry is Target Size 125 × 125 mm, Diameter 150 mm, EdgeExclusion 3 mm and Pitch 0.5 × 0.5 mm. The scheduled lattice uses halfWidth = halfHeight = 59.5 mm and radius = 72 mm; it is X-fast with ascending Y. First/last sites are (-40.5, -59.5) and (40.5, 59.5) mm.

Run:

```bash
npm run validate:lbic
```

Matching private references use same-basename XML/CSV pairs under `private/reference/lbic/`. The validator recognizes both documented semantic families. Numeric changes such as wavelength, power, finite FluxCache, raster size/pitch and, within `LBIC-MULTI-002`, the number of independent beam keys do not by themselves create a new profile. A different coordinate encoding, target scheduling rule, raw channel set, unit convention, coupled cross-beam calculation, iteration path, or vendor result/validity behavior remains **NEW PROFILE**.

Runtime remains XML-only. The CSV is never consulted when a user imports an XML.

