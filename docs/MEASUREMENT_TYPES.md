# PV-2000 measurement types and roadmap

The supplied PV-2000A manual documents data-viewing modes for diffusion length, Fe, ALID, surface-passivation indicator, junction lifetime, frequency scan, initial surface charge, Dit, EOT, IV, QSS-µPCD, emitter J0 map, QSS-µPCD Scan/J0, sheet resistance and eddy resistivity.

Current implementation:

| XML type | Analyzer | Status |
|---|---|---|
| `DITMeasurement` | COCOS / Dit | implemented; core quantities retained from previous standalone analyzer |
| `QssUpcdMeasurement` | QSS-µPCD map | implemented through lifetime/Smax/implied-Voc map analysis |
| `LBICMeasurement` | LBIC raster | implemented for dynamic beam/channel maps; derived Total R/EQE/IQE remain inferred pending vendor parity |
| other | Generic Inspector | detected and displayed, no scientific calculations |

Recommended next modules / validation work:

1. Validate LBIC coordinate orientation and derived Total R/EQE/IQE against matching PV-2000 exports; add diffusion length only after a multi-wavelength DL reference is available.
2. QSS-µPCD Scan / J0 — intensity/laser-power scans, QDC, integrated steady-state lifetime, injection level, Basore-Hansen J0, Kane-Swanson J0.
3. Emitter J0 Map.
4. EOT.
5. IV.
6. ISC.
7. Sheet resistance / eddy resistivity.

Do not map a new XML type to an existing module just because the output looks similar; use its actual `xsi:type` and inspect its data schema first.
