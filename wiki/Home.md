# PV-2000 Analyzer Wiki

This Wiki is the **user guide and scientific reference** for PV-2000 Analyzer. It explains how to work with PV-2000 XML files, what each dedicated analyzer displays, where calculated quantities come from, and how strongly each result path has been validated.

**Open the analyzer:** https://xiaolong-6.github.io/PV-2000-Analyzer/

## Start here

1. [Getting Started](Getting-Started) — open a file, use folder navigation, understand local/offline processing.
2. [Using the Analyzer](Using-the-Analyzer) — common sidebar, filters, maps, distributions, plots and exports.
3. [Measurement Families](Measurement-Families) — which XML types have dedicated analyzers and which remain unsupported.
4. [Validation and Reference Profiles](Validation-and-Reference-Profiles) — what “validated”, “inferred” and “unsupported” mean.

## Dedicated analyzers

| Analyzer | XML type | Main purpose |
|---|---|---|
| [DIT / COCOS](DIT) | `DITMeasurement` | surface band bending, Dit, Qtot, Qsc, Cox/EOT |
| [QSS-µPCD](QSS-uPCD) | `QssUpcdMeasurement` | lifetime maps, Smax, implied Voc, optional Analyzer SRV |
| [QSS Injection](Dual-QSS) | `DualQssMeasurement` | injection-dependent lifetime and stored transient inspection |
| [Emitter J0](Emitter-J0) | `JZeroMeasurement` | two-intensity lifetime/Smax/Voc maps and Basore J0 |
| [ISC / VCPD](ISC-and-VCPD) | `ISCMeasurement`, `VcpdMeasurement` | Kelvin-probe surface-potential results |
| [CET / EOT](CV-and-CET) | `CETMeasurement` | contactless capacitance, EOT and fit quality |
| [LBIC](LBIC) | `LBICMeasurement` | photocurrent, reflectivity and IQE mapping |

Unknown XML types open in the **Generic XML Inspector**. That fallback exposes stored structure/data; it does not mean the measurement has a dedicated scientific analyzer.

## How to read scientific results

PV-2000 Analyzer keeps result provenance explicit. A value can be:

- stored directly in XML;
- evaluated by the instrument/controller before export;
- corrected from stored readings;
- derived by a scientific model in the analyzer;
- calculated by a profile-specific compatibility model;
- an optional Analyzer-only estimate.

See [Scientific Foundations](Scientific-Foundations) for shared equations and [Validation and Reference Profiles](Validation-and-Reference-Profiles) for evidence terminology.

## Validation boundary

Current version-level vendor validation is anchored to matching PV-2000 files/exports produced by **Semilab PV-2000 v1.3.0.5**. Other versions may load when their schemas are compatible, but they are not automatically version-validated.

Validation is always scoped to a particular input→output path. A family can contain a validated geometry path and an inferred optional result at the same time.

## Documentation source

The reviewed Wiki source lives in the main repository under `wiki/` and is synchronized to the published GitHub Wiki. Exact profile IDs and numerical regression evidence remain in the repository documentation.

- Repository: https://github.com/Xiaolong-6/PV-2000-Analyzer
- Validation profiles: https://github.com/Xiaolong-6/PV-2000-Analyzer/blob/main/docs/REFERENCE_PROFILES.md
- Numerical evidence: https://github.com/Xiaolong-6/PV-2000-Analyzer/blob/main/docs/VALIDATION.md
