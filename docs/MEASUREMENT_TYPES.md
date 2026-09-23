# PV-2000 measurement types and roadmap

The supplied PV-2000A manual documents data-viewing modes for diffusion length, Fe, ALID, surface-passivation indicator, junction lifetime, frequency scan, initial surface charge, Dit, EOT, IV, QSS-µPCD, emitter J0 map, QSS-µPCD Scan/J0, sheet resistance and eddy resistivity.

Current implementation:

| XML type | Analyzer | Status |
|---|---|---|
| `DITMeasurement` | COCOS / Dit | implemented; core quantities retained from previous standalone analyzer |
| `QssUpcdMeasurement` | QSS-µPCD map | implemented with raw-lifetime preservation, non-positive-sentinel-aware scientific validity, Smax, PV-2000-compatible Implied Voc, explicit Physical Si/Ge estimates, configurable lifetime→SRV post-processing, map/distribution/profile views and CSV export; the expanded 96-XML RoundWafer corpus is fully import-smoked |
| `DualQssMeasurement` | QSS injection sweep | implemented with validated PV-2000 raw `LifeTime` (`TransientInfo@LifeTime`), separate XML `Values` diagnostics, stored transients, local overlays and exports; 273 exact XML/CSV pairs validate 5833 raw injection points, while vendor result-table Lifetime/Δn/Implied Voc/J0 post-processing remains pending |
| `JZeroMeasurement` | Emitter J0 map | implemented as a dedicated two-QSS map analyzer; one 5017-site paired XML/CSV reference validates PseudoSquareCell coordinates, both lifetime channels, both Smax channels and Basore J0 point-by-point; Implied Voc is compatibility-regressed to <0.07 mV |
| `ISCMeasurement` / `VcpdMeasurement` | ISC / Kelvin-probe VCPD | implemented as separate result profiles on shared Kelvin-probe infrastructure; paired references validate ISC and VCPD map paths independently |
| `LBICMeasurement` | LBIC raster | implemented; `LBIC-SINGLE-001` validates current-enabled single-beam SquareRegionPattern, `LBIC-MULTI-002` validates independent current-enabled multi-beam MapPattern + PseudoSquareCell, and `LBIC-REFLECTANCE-003` validates reflectance-only SquareRegionPattern (`MeasureCurrent=false`) with Direct/Scattered → Reflectivity |
| other | Generic Inspector | detected and displayed, no scientific calculations |

Recommended next modules / validation work:

1. Reverse-engineer the `DualQssMeasurement` vendor result-table transformation already exposed by the paired CSVs: post-processed Lifetime, Δn/Implied Voc validity behavior, and any J0 result path. Keep the validated raw transient path separate from this unresolved post-processing.
2. Extend LBIC only when a categorical input/output path changes beyond the recorded current-enabled single-beam, current-enabled multi-beam pseudo-square, and reflectance-only SquareRegion families; add diffusion length only after the vendor DL algorithm is established from matching real output.
3. Expand `JZeroMeasurement` only when another real pattern/target/result path is paired with vendor output; keep the current two-intensity PseudoSquareCell envelope explicit.
4. EOT.
5. IV.
6. Sheet resistance / eddy resistivity.

Do not map a new XML type to an existing module just because the output looks similar; use its actual `xsi:type` and inspect its data schema first.