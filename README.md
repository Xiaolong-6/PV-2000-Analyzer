# Semilab PV-2000 Analyzer

Local, browser-based analysis of Semilab PV-2000 XML result files. The user imports one XML; the app detects `Measurement/@xsi:type` and dispatches it to a measurement-specific analyzer.

Current modules:

- `DITMeasurement` — COCOS / Dit analysis with wafer map, log Dit plot, PCHIP midgap evaluation, flatband/Qtot/Cox/EOT extraction, XML metadata and COCOS-II-aware processing.
- `QssUpcdMeasurement` — QSS-µPCD map analysis with lifetime, Smax, implied Voc, valid-data filtering, map/distribution/acquisition views and CSV export.
- Unknown types — Generic XML Inspector rather than a hard failure.

## Run

Open `dist/index.html` directly. No server or installation is required.

Development:

```bash
npm test
npm run build
npm run validate:qss
```

`npm run validate:qss` uses ignored local XML/CSV reference files under `private/reference/` when present.

## Runtime/data rule

PV-2000 XML is the runtime input. Vendor/user CSV/XPS exports are regression references only. Real result files, manuals, screenshots and group code are excluded from Git by `.gitignore`; keep them under `private/` and never force-add them.

## UI principles

The shared shell follows the operating-system light/dark theme and provides a manual theme toggle. Measurement-specific controls live inside the corresponding analyzer; there is no global legacy Settings button. Keep the three-column responsive layout and preserve measurement-specific functionality when adding new result types.

See `docs/HANDOFF.md`, `docs/VALIDATION.md` and the algorithm notes for current validation status.

This is an independent analysis utility and is not affiliated with or endorsed by Semilab.
