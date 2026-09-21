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

Private references include W1 XML, PV-2000 summary/raw exports, group MATLAB code and COCOS documents. Existing regression established approximately 2.6% mean error for Qtot and minimum Dit. The richer modular Dit UI must preserve that baseline.

COCOS-II processing is now implemented when XML `UseCocosII=true`, but is currently **guide-derived / not vendor-export validated** because the available W1 reference explicitly has `UseCocosII=false`. A COCOS-II-on XML plus PV-2000 export is the next required reference for that branch.


## PV2000 COCOS-II reverse-engineering

The selectable `PV2000 COCOS-II (reverse-engineered)` path is **inferred** from a same-raw-data adjustment series rather than a raw vendor algorithm disclosure. The supplied reprocessed exports established these behavioral constraints:

- the vendor EOT value 100 is consistent with 100 Å (10 nm): the corresponding synthetic-line slope is ~0.464 V per 1e12 q/cm²;
- changing COCOS-II Min/Max Vsb affected reported Dit but did not alter exported VDark, VLight, summary Vsb, Vfb, Qsc, Qtot or Qit;
- the observed transition behavior is consistent with Min/Max acting late in Dit selection rather than in Vcpd reconstruction;
- Back Surface Shift True/False produced identical supplied exports for this dataset.

The implementation therefore labels this branch **inferred**. Its Min/Max rule is the current best-fit model and should be tightened if a pointwise vendor Dit-Vsb export or a dataset where Back Surface Shift is active becomes available.
