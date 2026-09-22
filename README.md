# PV-2000 Analyzer

<p align="center">
  <a href="https://xiaolong-6.github.io/PV-2000-Analyzer/"><img alt="Open live analyzer" src="https://img.shields.io/badge/OPEN-LIVE%20ANALYZER-2da44e?style=for-the-badge&logo=githubpages&logoColor=white"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer"><img alt="Source" src="https://img.shields.io/badge/SOURCE-GITHUB-24292f?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/blob/main/CONTRIBUTING.md"><img alt="Contribute" src="https://img.shields.io/badge/CONTRIBUTE-GUIDE-0969da?style=for-the-badge&logo=git&logoColor=white"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/issues/new?template=share-pv2000-data.yml"><img alt="Share PV-2000 data" src="https://img.shields.io/badge/SHARE-PV--2000%20DATA-8250df?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/issues/new"><img alt="Report issue" src="https://img.shields.io/badge/REPORT-ISSUE-d73a49?style=for-the-badge&logo=github&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Xiaolong-6/PV-2000-Analyzer/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/Xiaolong-6/PV-2000-Analyzer/actions/workflows/pages.yml"><img alt="GitHub Pages" src="https://github.com/Xiaolong-6/PV-2000-Analyzer/actions/workflows/pages.yml/badge.svg"></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License AGPL-3.0" src="https://img.shields.io/badge/LICENSE-AGPL--3.0-663399?style=flat-square&logo=gnu&logoColor=white"></a>
  <a href="COMMERCIAL_LICENSE.md"><img alt="Commercial license available" src="https://img.shields.io/badge/COMMERCIAL%20LICENSE-AVAILABLE-b8860b?style=flat-square"></a>
  <a href="CLA.md"><img alt="CLA required" src="https://img.shields.io/badge/CONTRIBUTIONS-CLA%20REQUIRED-1f6feb?style=flat-square"></a>
</p>

Local, browser-based analysis of Semilab PV-2000 XML result files. The user imports one XML; the app detects `Measurement/@xsi:type` and dispatches it to a measurement-specific analyzer.

Current modules:

- `DITMeasurement` — COCOS / Dit analysis with wafer map, PV2000-style discrete minimum Dit, optional Midgap Dit with default 10 mV median-binned PCHIP or original PCHIP, flatband/Qtot/Cox/EOT extraction, XML metadata and contextual analysis-method routing. `Follow XML setting` resolves standard XMLs to Standard COCOS and `UseCocosII=true` XMLs to the inferred PV2000 COCOS-II path. The obsolete guide-based COCOS-II path has been removed. COCOS-II exposes data-derived parameter suggestions without silently overriding the XML/user values.
- `QssUpcdMeasurement` — QSS-µPCD map analysis with lifetime, Smax, implied Voc, valid-data filtering, map/distribution/acquisition views and CSV export.
- `DualQssMeasurement` — single-point injection-intensity sweep analysis with the raw XML transient-lifetime curve, per-injection stored transient inspection, local LP/HP/repeat overlay and CSV export. Fifty-seven matching PV-2000 raw CSV exports validate the raw XML intensity/power/lifetime/transient path. The vendor result-table `Lifetime`, Δn and Implied Voc are a distinct post-processing path and remain intentionally unimplemented until that transformation is reproduced point-by-point.
- `JZeroMeasurement` — dedicated Emitter J0 map analyzer. The paired 5017-site `MapPattern + PseudoSquareCell` reference validates two QSS lifetime maps, pseudo-square coordinates, Smax and Basore-Hansen J0 point-by-point; Implied Voc is reproduced with a separately documented JZero compatibility calibration to <0.07 mV.
- `ISCMeasurement` / `VcpdMeasurement` — shared Kelvin-probe/VCPD analyzer. ISC exposes Vcpd Dark / Vcpd Light / VSB with repeated-reading reconstruction; VCPD exposes direct Vcpd Dark maps from its own `Readings` schema. Separate paired XML/CSV profiles validate ISC `MapPattern + SquareCell` and VCPD `MapPattern + RoundWafer` paths point-by-point.
- `LBICMeasurement` — spatial LBIC raster analysis with dynamic beam/wavelength channels and XML measurement-flag semantics. Paired references validate current-enabled single-beam `SquareRegionPattern` (`LBIC-SINGLE-001`), independent current-enabled multi-beam `MapPattern + PseudoSquareCell` (`LBIC-MULTI-002`), and reflectance-only `SquareRegionPattern` with `MeasureCurrent=false` (`LBIC-REFLECTANCE-003`). Reflectance-only files suppress zero Current placeholders, default to Reflectivity, and do not synthesize EQE/IQE; calculated diffusion length remains unsupported.
- Unknown types — Generic XML Inspector rather than a hard failure.

## Use

The normal entry point is the [live analyzer](https://xiaolong-6.github.io/PV-2000-Analyzer/). For offline use, choose **Download Offline** on the landing page and open the downloaded self-contained HTML locally. Processing stays in the browser.

In the analyzer toolbar, `←` / `→` load the previous or next XML directly from an already authorized folder; clicking an arrow never opens a file/folder picker. Browsers do not expose arbitrary sibling files after a normal single-file selection, so folder authorization is a separate explicit action.

For local development:

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run check
npm run build
```

The build writes `dist/index.html` and `dist/PV-2000-Analyzer.html`; `dist/` is generated and is not committed. Reference validators and implementation workflow live in [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/VALIDATION.md](docs/VALIDATION.md).

Licensing details are kept in [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) and [CLA.md](CLA.md).

## Runtime/data rule

PV-2000 XML is the runtime input. Vendor/user CSV/XPS exports are regression references only and are never runtime dependencies.

Existing local or confidential reference material belongs under ignored `private/`. Publicly contributed regression cases may instead live under `reference_data/` only under [REFERENCE_DATA_LICENSE.md](REFERENCE_DATA_LICENSE.md). Prefer XML + numeric CSV; full XPS/vendor reports and full-interface screenshots remain private by default. Vendor manuals, proprietary binaries/debug symbols/decompiled source, group code and confidential customer/sample material must not be published.

## Contributing new PV-2000 support

Anyone using PV-2000 can help expand the supported measurement/result combinations. A **data-only pull request is welcome**: submit the raw XML plus the matching PV-2000 exported CSV/XPS and preferably a screenshot showing the selected PV-2000 result/settings. No code is required.

Developers may instead branch from current `main`, implement support, include the matching reference case and regression coverage, and request merge. Validation follows semantic input→output profile families rather than exact numeric settings such as raster size, wavelength, power or FluxCache values.

Use the **Share PV-2000 data** shortcut above for a guided issue, or see `CONTRIBUTING.md`, `reference_data/README.md` and `docs/REFERENCE_PROFILES.md` before submitting data or code.

See `docs/ARCHITECTURE.md` for the maintained UI/runtime contract and `docs/REFERENCE_PROFILES.md` for the central validation envelope, plus `docs/VALIDATION.md`, `docs/HANDOFF.md` and the algorithm notes for detailed evidence.

This is an independent analysis utility and is not affiliated with or endorsed by Semilab.
