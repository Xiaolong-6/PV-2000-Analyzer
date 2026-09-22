# Architecture

## Runtime pipeline

```text
Open XML
  -> DOM parse
  -> read Measurement/@xsi:type
  -> measurement registry
      -> DITMeasurement      -> Dit module
      -> QssUpcdMeasurement  -> QSS-µPCD module
      -> LBICMeasurement      -> LBIC raster module
      -> unknown              -> Generic Inspector
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
- `src/core/plot.js` — shared axis-aware wheel zoom and double-click auto-scale behavior for canvas/SVG plots.
- `src/core/registry.js` — measurement-module registry.
- `src/modules/dit.js` — COCOS/DIT parser, calculations, UI.
- `src/modules/qss-upcd.js` — QSS-µPCD map parser, calculations, UI.
- `src/modules/lbic.js` — LBIC raster parser, beam/channel normalization, inferred optical/electrical fallbacks and UI.
- `src/modules/generic.js` — fallback inspection for unimplemented types.
- `src/app.js` — file opening, dispatch, shared shell.

## Build model

Source remains modular. `scripts/build.js` concatenates the CSS and JS into `dist/index.html`, preserving the convenient single-file release while avoiding a single-file development codebase.

No npm runtime dependencies are required.

## UI layout contract

In every multi-column layout the left functional sidebar stays sticky beneath the toolbar and uses an explicit viewport-height vertical scroll container. This prevents long control/metadata stacks from scrolling the plot columns and remains usable when browser zoom changes the CSS viewport width. Fine-pointer desktop layouts keep a dedicated sidebar column at intermediate widths; portrait/tablet fallback requires coarse-pointer input. The sidebar returns to normal document flow at <=700 px or on coarse-pointer portrait/tablet layouts. Dit sidebar summaries use responsive cards rather than fixed-width nowrap tables.

Analyzer controls should expose only parameters relevant to the selected method. Derived/optional analysis controls such as Dit PCHIP midgap fitting belong in nested disclosures rather than the primary method controls. Persistent instructional paragraphs should be avoided; put scientific/context explanations in hover help.

Plot interaction is shared: wheel in the plotting area zooms X+Y, wheel over an axis zooms only that axis, and double-click restores automatic ranges. Manual Axes controls live in each chart header immediately before export. Distribution plots default to Count on X; Swap axes belongs in the Axes action row beside Auto/Apply, while Bins remains a separate compact header control. Header popovers must be allowed to overflow chart panels so adjacent plots cannot clip them. Chart wrappers should follow the rendered canvas height rather than enforcing a fixed minimum that creates empty space in narrow columns.

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
