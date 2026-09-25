# PV-2000 Analyzer

<p align="center">
  <a href="https://xiaolong-6.github.io/PV-2000-Analyzer/"><img alt="Open live analyzer" src="https://img.shields.io/badge/OPEN-LIVE%20ANALYZER-2da44e?style=for-the-badge&logo=githubpages&logoColor=white"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/wiki"><img alt="Guide" src="https://img.shields.io/badge/GUIDE-WIKI-0969da?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer"><img alt="Source" src="https://img.shields.io/badge/SOURCE-GITHUB-24292f?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/blob/main/CONTRIBUTING.md"><img alt="Contribute" src="https://img.shields.io/badge/CONTRIBUTE-GUIDE-0969da?style=for-the-badge&logo=git&logoColor=white"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/issues/new?template=share-pv2000-data.yml"><img alt="Share PV-2000 data" src="https://img.shields.io/badge/SHARE-PV--2000%20DATA-8250df?style=for-the-badge&logo=github&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Xiaolong-6/PV-2000-Analyzer/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License AGPL-3.0" src="https://img.shields.io/badge/LICENSE-AGPL--3.0-663399?style=flat-square&logo=gnu&logoColor=white"></a>
  <a href="COMMERCIAL_LICENSE.md"><img alt="Commercial license available" src="https://img.shields.io/badge/COMMERCIAL%20LICENSE-AVAILABLE-b8860b?style=flat-square"></a>
</p>

PV-2000 Analyzer is a local, browser-based viewer and analysis tool for Semilab PV-2000 XML result files. Import one XML and the application detects `Measurement/@xsi:type`, selects a dedicated analyzer when one exists, and falls back to a Generic XML Inspector for unknown types.

**Runtime is XML-only.** Matching PV-2000 CSV/XPS exports are regression evidence used during development; they are never required to analyze a user file.

## Supported analyzers

| XML type | Analyzer | Main outputs | Current evidence boundary |
|---|---|---|---|
| `DITMeasurement` | Dit / COCOS | Vcpd/Vsb, Minimum Dit, optional Midgap Dit, Qsc, Qtot, Cox/EOT | `DIT-RESULT-INITIAL-001` validates direct/bookkeeping result fields; `DIT-RESULT-STANDARD-DLL-002` validates current-DLL Standard-COCOS Vfb/Qsc/Qtot/Qit/Minimum-Dit separately from configurable Analyzer outputs; COCOS-II remains inferred |
| `QssUpcdMeasurement` | QSS-µPCD | lifetime, Smax, implied Voc, optional Analyzer SRV | lifetime/Smax + sentinel semantics validated across paired geometries; `QSS-CALC-IMPLIED-VOC-002` validates current-DLL simple-map Implied Voc independently of geometry; Physical Si/Ge and SRV remain Analyzer-side |
| `DualQssMeasurement` | QSS Injection | injection sweep, stored transients, profile-scoped teff.d/teff.SS/Δn/Smax/Voc/Basore J0/K-S J0 result table | raw path validated; two real XML+CSV pairs validate the complete non-Auger Back/Back scalar result path |
| `JZeroMeasurement` | Emitter J0 | two lifetime/Smax/Voc channels and Basore J0 | `JZERO-CALC-001` validated across paired OnePoint/SquareRegion/HighDensity/Map geometries; Voc remains quantity-scoped |
| `ISCMeasurement` | ISC | Vcpd Dark, Vcpd Light, VSB | paired map profile validated |
| `VcpdMeasurement` | VCPD | Vcpd Dark | paired map profile validated |
| `CETMeasurement` | CET / EOT | EOT, Cd, R² | `CET-CALC-001` calculation + `GEOM-NINEPOINT-SQUARE-001` paired geometry; historical evidence bundle `CET-9PT-SQUARE-001` |
| `LBICMeasurement` | LBIC | Current, Reflectivity, IQE, cross-beam DL plus active raw channels | decoupled direct+scattered/current+scattered/current-only/reflectance-only calculation profiles across shared geometries; finite DL validated only for current+scattered |
| `SPVMeasurement` | SPV / Diffusion Length | DL, Tau, SPV8, SPV6 | standard P-type profiles plus paired `SPV-CALC-ENHANCED-N-003` finite-wafer/back-surface Enhanced N-type path |
| `LeakageMeasurement` | Leakage | VSASS+, VSASS-, LI | paired one-point paths validate natural-cubic VSASS extraction; positive-only availability is preserved |
| other | Generic XML Inspector | XML structure and stored values | fallback only; no scientific result claim |

The project-level vendor-version validation boundary is currently anchored to paired files produced by **Semilab PV-2000 v1.3.0.5**. Other releases may load when schemas are compatible, but are not version-validated unless recorded in the reference-profile documentation.

## Use

Open the [live analyzer](https://xiaolong-6.github.io/PV-2000-Analyzer/), then drop or select a PV-2000 XML file. Processing stays in the browser.

For repeated files from one directory, authorize the folder once with **Folder**. The `←` / `→` buttons then load adjacent XML files directly; the arrows do not open a picker.

For offline use, choose **Download Offline HTML** on the landing page and open the downloaded self-contained HTML locally.

The [project Wiki](https://github.com/Xiaolong-6/PV-2000-Analyzer/wiki) is the user guide and scientific reference. It covers the common UI, supported analyzers, equations, provenance, assumptions and validation vocabulary.

## Development

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run check
npm run build
```

The build writes `dist/index.html` and `dist/PV-2000-Analyzer.html`; `dist/` is generated and not committed.

Repository documentation is indexed in [docs/README.md](docs/README.md). Exact validation envelopes and numerical evidence live in [docs/REFERENCE_PROFILES.md](docs/REFERENCE_PROFILES.md) and [docs/VALIDATION.md](docs/VALIDATION.md).

## Contributing data or code

New scientific analyzer/result support requires at least one **real XML plus its matching numeric PV-2000 export**. XML-only material can support parsing, raw inspection or an explicitly inferred profile, but is not enough to establish a new calculated result path.

A data-only contribution is welcome. See [CONTRIBUTING.md](CONTRIBUTING.md), [reference_data/README.md](reference_data/README.md), and the **Share PV-2000 data** issue template.

Public reference data must satisfy [REFERENCE_DATA_LICENSE.md](REFERENCE_DATA_LICENSE.md). Confidential, proprietary or uncleared material belongs outside the public repository.

## Licensing

Source code is available under [AGPL-3.0-only](LICENSE), with a separate [commercial licensing](COMMERCIAL_LICENSE.md) path. Contributions are subject to the project [CLA](CLA.md).

PV-2000 Analyzer is an independent analysis utility and is not affiliated with or endorsed by Semilab.
