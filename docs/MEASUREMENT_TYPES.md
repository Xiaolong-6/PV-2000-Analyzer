# PV-2000 measurement types

This page is the repository-level index of dedicated analyzer support. “Implemented” means the XML type has a measurement-specific runtime path; validation remains scoped to the profiles listed in `REFERENCE_PROFILES.md`.

## Dedicated analyzers

| XML type | Analyzer | Runtime scope | Evidence boundary |
|---|---|---|---|
| `DITMeasurement` | Dit / COCOS | Vcpd/Vsb curves, discrete Minimum Dit, optional Midgap Dit, Qsc, Qtot, Cox/EOT, site filtering and spatial context | Standard-COCOS-related evidence is profile-scoped; COCOS-II remains inferred |
| `QssUpcdMeasurement` | QSS-µPCD | lifetime map, Smax, PV-2000-compatible implied Voc, optional physical Si/Ge estimate, optional Analyzer SRV, filtering/maps/distribution/profiles | paired map profiles; sentinel and geometry boundaries are explicit |
| `DualQssMeasurement` | QSS Injection | one-point injection sweep, canonical raw lifetime, stored transients, LP/HP/repeat overlays, exports, validated teff.d (1 Sun) result rule | 273 raw XML/CSV pairs / 5833 points plus `QSS-INJ-RESULT-001`; teff.SS, implied Voc and J0 remain unsupported in runtime |
| `JZeroMeasurement` | Emitter J0 | two lifetime/Smax/Voc channels, Basore J0, map/distribution/filter/export; incomplete acquisitions degrade per quantity | paired two-intensity pseudo-square path validated; alternate/incomplete geometry remains profile-scoped |
| `ISCMeasurement` | ISC | Vcpd Dark, Vcpd Light, VSB, repeated-reading inspection, map/distribution/filter/export | paired `MapPattern + SquareCell` path validated |
| `VcpdMeasurement` | VCPD | Vcpd Dark, map/distribution/filter/export | paired `MapPattern + RoundWafer` path validated |
| `CETMeasurement` | CET / EOT | EOT, Cd, R², fixed-point geometry, Vcpd-light/Qc fit, filter/map/distribution/export | `CET-9PT-SQUARE-001` validates the current NinePointPattern + SquareCell path |
| `LBICMeasurement` | LBIC | dynamic beam/channel analysis, Current/Reflectivity/IQE where applicable, map/distribution/X/Y profiles/filter/export | `LBIC-SINGLE-001`, `LBIC-MULTI-002`, `LBIC-REFLECTANCE-003` |

Unknown XML types are routed to the **Generic XML Inspector**. The fallback is useful for stored-value inspection but is not a scientific analyzer and does not imply support for that measurement family.

## Known families without a dedicated scientific analyzer

The project contains scientific/reference knowledge for additional PV-2000 families, but current runtime support must not be implied from that documentation.

- CV acquisition/process history — documented because CET reuses related corona/Kelvin-probe concepts; no dedicated `CVMeasurement` analyzer.
- SPV / Diffusion Length.
- Frequency Scan.
- Voc / Voc Mapping / pseudo-I–V.
- Leakage.
- Fe / LID / ALID.
- Surface Passivation.
- Junction Lifetime.
- Sheet Resistance.
- Eddy / resistivity.
- Height / displacement.
- Other XML families not listed in the dedicated-analyzer table.

## Gate for expanding scientific support

A new scientific analyzer or a new calculated result path requires:

1. at least one real PV-2000 XML;
2. its matching numeric PV-2000 result export;
3. an explicit semantic profile definition;
4. regression coverage for values, availability/blanking and geometry where applicable;
5. a documented status boundary in `REFERENCE_PROFILES.md` and `VALIDATION.md`;
6. visual inspection of at least one representative real XML after implementation.

XML-only files may justify parser work, raw-value display or an explicitly **inferred** geometry/path. They are not enough to claim reproduction of a vendor-derived scientific result.

## Current high-value validation gaps

- Dual QSS: establish the XML→teff.SS / teff.SS Max transformation on additional paired numeric cases before exposing it; implied Voc and J0 follow only after that lifetime path is pointwise reproduced.
- LBIC: calculated diffusion length remains unsupported until the vendor DL transformation is established from matching real output.
- JZero/CET/other implemented families: expand categorical geometry/result envelopes only when matching vendor output exercises the new path.
- New families: implement directly on the current measurement-domain architecture only after the real XML + numeric-export gate is met.

Do not alias a new XML type to an existing analyzer merely because its displayed quantities look similar. Dispatch and validation follow the actual `Measurement/@xsi:type`, schema and semantic result path.
