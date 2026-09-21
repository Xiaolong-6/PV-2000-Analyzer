# Semilab PV-2000 Analyzer

Local, browser-based analysis of Semilab PV-2000 XML result files. The user imports one XML; the app detects `Measurement/@xsi:type` and dispatches it to a measurement-specific analyzer.

Current modules:

- `DITMeasurement` — COCOS / Dit analysis with wafer map, PV2000-style discrete minimum Dit, optional PCHIP midgap Dit, flatband/Qtot/Cox/EOT extraction, XML metadata and contextual analysis-method routing. `Follow XML setting` resolves standard XMLs to Standard COCOS and `UseCocosII=true` XMLs to the inferred PV2000 COCOS-II path; the older guide-based path is kept under Advanced / legacy methods. COCOS-II exposes data-derived parameter suggestions without silently overriding the XML/user values.
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

## Runtime/data rule

PV-2000 XML is the runtime input. Vendor/user CSV/XPS exports are regression references only. Real result files, manuals, screenshots and group code are excluded from Git by `.gitignore`; keep them under `private/` and never force-add them.

## UI principles

The shared shell follows the operating-system light/dark theme and provides a manual theme toggle. Measurement-specific controls live inside the corresponding analyzer; there is no global legacy Settings button. Controls should be contextual: selecting an analysis method should reveal only parameters relevant to that method plus genuinely shared extraction settings. Re-rendering an analysis must preserve the user's open/closed control-panel state. In multi-column layouts, the left functional sidebar has its own viewport-height scroll container so long metadata/control stacks can always be reached without moving the plot columns. Browser zoom must not disable that scroll behavior merely by crossing the 900 px layout breakpoint. Only the true single-column/mobile layout returns the sidebar to normal page flow. Keep the three-column responsive layout and preserve measurement-specific functionality when adding new result types.

See `docs/REFERENCE_PROFILES.md` for the central validation envelope, plus `docs/VALIDATION.md`, `docs/HANDOFF.md` and the algorithm notes for detailed evidence.

This is an independent analysis utility and is not affiliated with or endorsed by Semilab.
