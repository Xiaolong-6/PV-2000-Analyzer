# PV-2000 measurement types and roadmap

The supplied PV-2000A manual documents data-viewing modes for diffusion length, Fe, ALID, surface-passivation indicator, junction lifetime, frequency scan, initial surface charge, Dit, EOT, IV, QSS-µPCD, emitter J0 map, QSS-µPCD Scan/J0, sheet resistance and eddy resistivity.

Current implementation:

| XML type | Analyzer | Status |
|---|---|---|
| `DITMeasurement` | COCOS / Dit | implemented; core quantities retained from previous standalone analyzer |
| `QssUpcdMeasurement` | QSS-µPCD map | implemented through lifetime/Smax/implied-Voc map analysis |
| `DualQssMeasurement` | QSS injection sweep | implemented for raw XML transient-lifetime curves, stored transients, local overlays and exports; 57 paired raw CSV exports validate the raw path, while vendor result-table Lifetime/Δn/Implied Voc/J0 post-processing remains pending |
| `ISCMeasurement` / `VcpdMeasurement` | ISC / Kelvin-probe VCPD | implemented as separate result profiles on shared Kelvin-probe infrastructure; paired references validate ISC and VCPD map paths independently |
| `LBICMeasurement` | LBIC raster | implemented; `LBIC-SINGLE-001` validates single-beam SquareRegionPattern and `LBIC-MULTI-002` validates independent multi-beam MapPattern + PseudoSquareCell Current/Direct/Scattered → Current/Reflectivity/IQE paths |
| other | Generic Inspector | detected and displayed, no scientific calculations |

Recommended next modules / validation work:

1. Reverse-engineer the `DualQssMeasurement` vendor result-table transformation already exposed by the paired CSVs: post-processed Lifetime, Δn/Implied Voc validity behavior, and any J0 result path. Keep the validated raw transient path separate from this unresolved post-processing.
2. Emitter J0 Map / `JZeroMeasurement`.
3. Extend LBIC only when a categorical input/output path changes beyond the recorded single-beam rectangular and independent multi-beam pseudo-square families; add diffusion length only after the vendor DL algorithm is established from matching real output.
4. EOT.
5. IV.
6. Sheet resistance / eddy resistivity.

Do not map a new XML type to an existing module just because the output looks similar; use its actual `xsi:type` and inspect its data schema first.