# PV-2000 measurement types and roadmap

The supplied PV-2000A manual documents data-viewing modes for diffusion length, Fe, ALID, surface-passivation indicator, junction lifetime, frequency scan, initial surface charge, Dit, EOT, IV, QSS-µPCD, emitter J0 map, QSS-µPCD Scan/J0, sheet resistance and eddy resistivity.

Current implementation:

| XML type | Analyzer | Status |
|---|---|---|
| `DITMeasurement` | COCOS / Dit | implemented; core quantities retained from previous standalone analyzer |
| `QssUpcdMeasurement` | QSS-µPCD map | implemented through lifetime/Smax/implied-Voc map analysis |
| `DualQssMeasurement` | QSS injection sweep | implemented for raw XML transient-lifetime curves, stored transients, local overlays and exports; 57 paired raw CSV exports validate the raw path, while vendor result-table Lifetime/Δn/Implied Voc/J0 post-processing remains pending |
| `ISCMeasurement` | Initial Surface Charge | implemented with vendor-regressed Vcpd Dark / Vcpd Light / VSB maps and raw-reading inspection |
| `LBICMeasurement` | LBIC raster | implemented; four paired reference instances validate the single-beam SquareRegionPattern Current/Direct/Scattered → Current/Reflectivity/IQE algorithm family; ordinary numeric wavelength/power/flux/grid changes stay in-family |
| other | Generic Inspector | detected and displayed, no scientific calculations |

Recommended next modules / validation work:

1. Extend LBIC with actual XML + matching PV-2000 exports when a categorical input/output path changes (for example multi-beam or different channels/results); add diffusion length only after a real multi-wavelength DL reference is available.
2. Reverse-engineer the `DualQssMeasurement` vendor result-table transformation already exposed by the paired CSVs: post-processed Lifetime, Δn/Implied Voc validity behavior, and any J0 result path. Keep the validated raw transient path separate from this unresolved post-processing.
3. Emitter J0 Map.
4. EOT.
5. IV.
6. Sheet resistance / eddy resistivity.

Do not map a new XML type to an existing module just because the output looks similar; use its actual `xsi:type` and inspect its data schema first.
