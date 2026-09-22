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
- `LBICMeasurement` — rectangular LBIC raster analysis with dynamic beam/wavelength channels. Four paired 984 nm reference instances validate the single-beam SquareRegionPattern Current/Direct/Scattered → Current/Reflectivity/IQE algorithm family; numeric wavelength/power/flux/raster-size changes do not by themselves create a new profile. The default view mirrors Current / Reflectivity / IQE, while raw Direct/Scattered reflection, EQE and unknown channels are under Advanced.
- Unknown types — Generic XML Inspector rather than a hard failure.

## Run

Open `dist/index.html` directly. No server or installation is required.

Development:

```bash
npm test
npm run build
npm run validate:qss
npm run validate:lbic
```

`npm run validate:qss` uses ignored local XML/CSV reference files under `private/reference/` when present. `npm run validate:lbic` uses same-basename ignored XML/CSV pairs under `private/reference/lbic/` for pointwise vendor regression. The LBIC validator allows ordinary numeric wavelength/power/flux/geometry changes within the validated algorithm family and reserves NEW PROFILE for categorical input/output-path changes.

## Licensing

The community edition is licensed under **AGPL-3.0-only**. Commercial use under the AGPL is allowed when its terms are followed. Separate commercial licensing is available for organizations that need negotiated terms for proprietary integration, closed-source/OEM distribution, or other uses that are incompatible with their desired AGPL compliance model.

External contributions require agreement to the project [CLA](CLA.md), which lets contributors keep their copyright while granting the Project Owner the rights needed to continue dual licensing. See [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) for the commercial-licensing route.

Copyright © 2026 Xiaolong Liu. The full community license is in [LICENSE](LICENSE).

## Runtime/data rule

PV-2000 XML is the runtime input. Vendor/user CSV/XPS exports are regression references only and are never runtime dependencies.

Existing local or confidential reference material belongs under ignored `private/`. Publicly contributed regression cases may instead live under `reference_data/` when the contributor intentionally publishes the XML, matching PV-2000 export and, preferably, a PV-2000 screenshot and confirms they have the right to share them. Vendor manuals, group code and confidential customer/sample material must not be published.

## Contributing new PV-2000 support

Anyone using PV-2000 can help expand the supported measurement/result combinations. A **data-only pull request is welcome**: submit the raw XML plus the matching PV-2000 exported CSV/XPS and preferably a screenshot showing the selected PV-2000 result/settings. No code is required.

Developers may instead branch from current `main`, implement support, include the matching reference case and regression coverage, and request merge. Validation follows semantic input→output profile families rather than exact numeric settings such as raster size, wavelength, power or FluxCache values.

Use the **Share PV-2000 data** shortcut above for a guided issue, or see `CONTRIBUTING.md`, `reference_data/README.md` and `docs/REFERENCE_PROFILES.md` before submitting data or code.

## UI principles

The shared shell follows the operating-system light/dark theme and provides a manual theme toggle. The landing page advertises the currently supported analyzers (Dit / COCOS, QSS-µPCD, LBIC, Generic XML inspector). Measurement-specific controls live inside the corresponding analyzer; there is no global legacy Settings button. Controls should be contextual: selecting an analysis method should reveal only parameters relevant to that method plus genuinely shared extraction settings. Re-rendering an analysis must preserve the user's open/closed control-panel state. In multi-column layouts, the left functional sidebar has its own viewport-height scroll container so long metadata/control stacks can always be reached without moving the plot columns. Fine-pointer desktop browser zoom must not be mistaken for a portrait/mobile layout: the portrait/tablet fallback requires coarse-pointer input, while <=700 px remains the true narrow-width fallback. Dit result summaries use responsive cards rather than a fixed nowrap table so valid-site mean/current-site values stay readable at narrow sidebar widths. Every scientific plot supports mouse-wheel zoom: wheel inside the plot zooms both axes, wheel over an axis zooms only that direction, and double-click restores auto scale. Long scientific explanations belong in hover help rather than persistent prose.

See `docs/REFERENCE_PROFILES.md` for the central validation envelope, plus `docs/VALIDATION.md`, `docs/HANDOFF.md` and the algorithm notes for detailed evidence.

This is an independent analysis utility and is not affiliated with or endorsed by Semilab.
