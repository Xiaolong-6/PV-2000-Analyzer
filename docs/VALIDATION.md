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



## LBIC raster — paired XML+CSV regression

Four paired XML+CSV references are available. Validation is defined by **input/result combination and units**, not by an exact recipe tuple. The observed fixture wavelength, laser power and FluxCache values document the references; they are not equality checks that gate the algorithm.

Current status:

| Quantity / behavior | Status |
|---|---|
| `LBICMeasurement` dispatch | tested |
| `SquareRegionPattern` Region/Dimension → X/Y coordinates | vendor-validated on paired references |
| X-fast, row-major, downward-Y ordering | vendor-validated on paired references |
| dynamic BeamData numeric-channel discovery | tested |
| raw-channel precedence | tested |
| Total R = DirectReflection + ScatteredReflection | vendor-validated for percent reflectance channels |
| current / FluxCache photon normalization using µA current | vendor-validated as part of the QE/IQE chain |
| IQE = EQE / (1-Rtotal), including blanking at Rtotal >= 100% | vendor-validated |
| exact wavelength / laser power / FluxCache numeric value | fixture metadata, **not** a validation boundary |
| multiple beam/wavelength data model | implemented, not yet vendor-regressed with a real multi-beam file |
| calculated diffusion length | unsupported |

The four references include 51×51 and 101×101 rasters and currently happen to use a single 984 nm beam, power 0.6 and the same calibrated FluxCache. A different wavelength, power or nearby/different FluxCache remains inside the validated calculation domain when the same XML concepts and units apply. What requires a new regression is a change in **semantics**: e.g. current no longer in µA, reflectance no longer expressed in percent, FluxCache no longer representing calibrated photon flux, a new acquisition ordering, or a different pattern type.

Run:

```bash
npm run validate:lbic
```

The tracked validator checks XML structure. The paired private CSV regressions are the numerical evidence and remain outside the repository.

For multi-beam support, add at least one real multi-wavelength paired reference. For diffusion length, provide a multi-wavelength LBIC XML and matching PV-2000 DL output; see `ALGORITHMS_LBIC.md`.
