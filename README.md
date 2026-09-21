# Semilab PV-2000 Analyzer

Local, browser-based analysis of Semilab PV-2000 XML result files. The user imports one XML; the app detects `Measurement/@xsi:type` and dispatches it to a measurement-specific analyzer.

Current modules:

- `DITMeasurement` — COCOS / Dit analysis with wafer map, PV2000-style discrete minimum Dit, optional PCHIP midgap Dit, flatband/Qtot/Cox/EOT extraction, XML metadata and contextual analysis-method routing. `Follow XML setting` resolves standard XMLs to Standard COCOS and `UseCocosII=true` XMLs to the inferred PV2000 COCOS-II path; the older guide-based path is kept under Advanced / legacy methods. COCOS-II exposes data-derived parameter suggestions without silently overriding the XML/user values.
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

The shared shell follows the operating-system light/dark theme and provides a manual theme toggle. Measurement-specific controls live inside the corresponding analyzer; there is no global legacy Settings button. Controls should be contextual: selecting an analysis method should reveal only parameters relevant to that method plus genuinely shared extraction settings. Re-rendering an analysis must preserve the user's open/closed control-panel state. On desktop, the left functional sidebar scrolls independently inside the viewport so long metadata/control stacks do not move the plot columns; responsive/mobile layouts revert to normal page flow. Keep the three-column responsive layout and preserve measurement-specific functionality when adding new result types.

See `docs/HANDOFF.md`, `docs/VALIDATION.md` and the algorithm notes for current validation status.

This is an independent analysis utility and is not affiliated with or endorsed by Semilab.
