# Architecture

## Runtime pipeline

```text
Open XML
  -> DOM parse
  -> read Measurement/@xsi:type
  -> measurement registry
      -> DITMeasurement      -> Dit module
      -> QssUpcdMeasurement  -> QSS-µPCD module
      -> unknown             -> Generic Inspector
  -> module.parse()
  -> module.analyze()
  -> module.render()
```

The user imports one XML file. A PV-2000 export is never required at runtime.

## Source layout

- `src/core/xml.js` — namespace-tolerant XML helpers and common result metadata.
- `src/core/stats.js` — mean, median, sample standard deviation, histogram.
- `src/core/geometry.js` — PV wafer/grid geometry.
- `src/core/export.js` — CSV download.
- `src/core/theme.js` — system theme + explicit light/dark override.
- `src/core/registry.js` — measurement-module registry.
- `src/modules/dit.js` — COCOS/DIT parser, calculations, UI.
- `src/modules/qss-upcd.js` — QSS-µPCD map parser, calculations, UI.
- `src/modules/generic.js` — fallback inspection for unimplemented types.
- `src/app.js` — file opening, dispatch, shared shell.

## Build model

Source remains modular. `scripts/build.js` concatenates the CSS and JS into `dist/index.html`, preserving the convenient single-file release while avoiding a single-file development codebase.

No npm runtime dependencies are required.

## Extension contract

A measurement module registers an object:

```js
{
  types: ['SomeMeasurementType'],
  parse(parsedXml) {},
  analyze(data) {},
  render(host, data, analysis, appContext) {}
}
```

Add the module before `generic.js` in `scripts/build.js` and register it through `PV2000.registry.register()`.
