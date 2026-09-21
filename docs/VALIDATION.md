# Validation record

The central registry of validated reference envelopes is `docs/REFERENCE_PROFILES.md`. This file contains detailed regression evidence. Any materially new data/configuration outside a recorded envelope is a **NEW PROFILE** until its actual XML + matching PV-2000 output are regressed.

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

The validator also verifies coordinate acquisition order. Real references remain ignored and are not required for the shipped browser application.

### Valid-data filtering

The new valid-range UI is an analyzer feature rather than a vendor-output replication. Tests verify range masking; users must choose limits appropriate to the sample geometry/data distribution. This is especially important for quarter wafers/coupons where geometrically scheduled sites outside the sample would otherwise corrupt the summary.

## DIT reference

Private references include W1 XML, PV-2000 summary/raw exports, group MATLAB code and COCOS documents. Existing Standard COCOS regression established approximately 2.6% mean error for Qtot and minimum Dit. The richer modular Dit UI must preserve that baseline.

### Standard COCOS

Status: **validated against the available W1 export to the documented approximate error level**.

The normal Follow XML path resolves `UseCocosII=false` to Standard COCOS, preserving the measured dark/light path and existing regression behavior.

### PV2000 COCOS-II (inferred)

Status: **inferred**, not vendor-exact.

The current default COCOS-II path is derived from a same-raw-data adjustment series rather than a vendor algorithm disclosure. The supplied reprocessed exports established these behavioral constraints:

- vendor EOT value 100 is consistent with 100 Å (10 nm): the corresponding synthetic-line slope is ~0.464 V per 1e12 q/cm²;
- changing COCOS-II Min/Max Vsb affected reported Dit but did not alter exported VDark, VLight, summary Vsb, Vfb, Qsc, Qtot or Qit;
- the observed transition behavior is consistent with Min/Max acting late in Dit selection rather than in Vcpd reconstruction;
- Back Surface Shift True/False produced identical supplied exports for this dataset.

The implementation therefore labels this path **inferred**. Its Min/Max rule is the current best-fit model and should be tightened if a pointwise vendor Dit-Vsb export or a dataset where Back Surface Shift is active becomes available.

Follow XML setting now resolves `UseCocosII=true` to this inferred path. That routing choice is intentional: it reflects the strongest available same-raw-data evidence. It does **not** upgrade the algorithm's validation label.

### Legacy COCOS-II (guide-based)

Status: **legacy / development comparison**.

The older guide-based synthetic-light implementation remains available only under Advanced / legacy methods. It is no longer the default for `UseCocosII=true` and must not be described as the normal PV-2000 COCOS-II implementation.

### UI / control regression expectations

The Analysis controls panel must remain open after Apply/recalculation. Method-specific parameters are shown contextually and compactly, with the label/help icon and its input on one row:

- Standard COCOS: no COCOS-II EOT or Min/Max inputs;
- PV2000 COCOS-II (inferred): EOT, Min Vsb and Max Vsb are exposed;
- Legacy guide-based path: accessible only through Advanced / legacy methods;
- Flatband accumulation points remain shared;
- PCHIP outlier limit and interpolation scale live only under **Optional Midgap Dit (PCHIP)**.

The primary **Minimum Dit (PV2000-style)** must remain unchanged when only PCHIP settings change. PCHIP settings may change Midgap Dit and the fitted curve only.

COCOS-II parameter validation must not silently fall back to Standard COCOS. Missing numeric XML settings must use their fallback/NaN semantics rather than being parsed as numeric zero. The current-site COCOS-II diagnostics should expose accepted interval count and minimum-Dit Vsb.

In multi-column layouts, the left functional sidebar is independently scrollable/sticky within the viewport. Scrolling it must not move the plot columns. Browser zoom must not disable the scroll container when the CSS viewport crosses 900 px; only the true single-column/mobile breakpoint returns it to normal page flow.



## LBIC raster — paired XML + PV-2000 export regression

Four supplied private XML/CSV pairs establish a validated **single-beam algorithm family**: SquareRegionPattern, µA Current + DirectReflection + ScatteredReflection, finite positive photon FluxCache, and vendor Current / Reflectivity / IQE outputs. The four concrete reference instances all happen to use 984 nm, power 0.6 and the same FluxCache, but those numeric values are not validation whitelist keys.

| Quantity / behavior | Regression result | Status |
|---|---:|---|
| `LBICMeasurement` dispatch | unit tested | tested |
| 51×51 / 101×101 point counts | XML = CSV | validated |
| X-fast / row-major coordinate order | pointwise CSV match | validated |
| Y coordinate | `Region.Y + row × dy`; max error 0 mm | validated |
| Current | raw XML vs CSV pointwise | validated |
| Reflectivity | DirectReflection + ScatteredReflection | validated |
| compatibility charge constant | `q = 1.602e-19 C` required for vendor IQE parity | validated for algorithm family |
| IQE | `EQE/(1-R)`; calculated >100% or non-computable becomes blank | validated |
| IQE finite values | reproduced to ~1e-12 %-point scale | validated |
| summary Stdev | sample standard deviation, finite values only | validated |
| EQE as standalone output | vendor CSV does not expose it | inferred intermediate |
| multiple beam/wavelength data model | implemented, no real paired reference yet | unvalidated |
| calculated diffusion length | no paired vendor reference | unsupported |

Run:

```bash
npm run validate:lbic
```

Matching private references must use the same basename under `private/reference/lbic/`:

```
sample.xml
sample.csv
```

The validator is intentionally **semantic-profile gated**. Numeric changes in wavelength, laser power, finite FluxCache, Region origin/size, pitch or grid dimensions remain inside the validated family when the same input/output path is used. A categorical change — such as another pattern type/coordinate encoding, multiple-beam semantics, another unit convention, a different raw channel set, or a different vendor result/blanking path — reports **NEW PROFILE** and requires inspection of the actual XML plus matching PV-2000 output.

Runtime remains XML-only. The CSV is never consulted when a user imports an XML.

