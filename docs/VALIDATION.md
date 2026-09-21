# Validation record

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

In multi-column layouts, the left functional sidebar is independently scrollable/sticky within the viewport. Scrolling it must not move the plot columns. Fine-pointer desktop zoom must not trigger the portrait/mobile fallback merely because the viewport becomes taller than wide; the portrait/tablet fallback is limited to coarse-pointer devices, while <=700 px remains the true narrow-width fallback. Dit Results summary must not require horizontal scrolling: parameter, valid-site mean and current-site values are rendered as responsive cards.



## LBIC raster — structural validation only

Private LBIC XML examples inspected during development cover 51×51 (2601 point) and 101×101 (10201 point) `SquareRegionPattern` rasters. The current module discovers `BeamData` numeric attributes dynamically and joins beam keys to `LaserSettings` / `FluxCache`.

Current status:

| Quantity / behavior | Status |
|---|---|
| `LBICMeasurement` dispatch | tested |
| Region + Dimension point count | structurally validated on supplied examples |
| dynamic BeamData numeric-channel discovery | tested |
| raw-channel precedence | tested |
| multiple beam/wavelength data model | implemented, not yet exercised by supplied examples |
| X-fast / row-major coordinate order | inferred |
| Y direction from Region.Y downward | inferred |
| Total R = direct + diffuse | inferred; no vendor export parity yet |
| EQE from Current / FluxCache photon flux | inferred; no vendor export parity yet |
| IQE from EQE / (1-Rtotal) | inferred; no vendor export parity yet |
| calculated diffusion length | unsupported |

Run:

```bash
npm run validate:lbic
```

with private XMLs under `private/reference/lbic/`. The validator checks structure only and deliberately does not upgrade inferred algorithms to validated.

To validate coordinates, provide one matching LBIC X/Y export or an orientation-known PV-2000 map. To validate Total R/EQE/IQE, provide matching vendor values. To implement diffusion length, provide a multi-wavelength LBIC XML and matching PV-2000 DL output; see `ALGORITHMS_LBIC.md`.
