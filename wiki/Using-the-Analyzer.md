# Using the Analyzer

Dedicated analyzers share a common interaction model where the measurement science allows it. Individual families keep specialized plots and controls when forcing a uniform layout would hide important meaning.

## Sidebar information order

A typical analyzer presents these sections in roughly this order:

1. **Measurement** — XML measurement type and core recipe/acquisition identity.
2. **Current dataset** — active iteration, beam, injection condition or other current context.
3. **Analysis controls** — Analyzer-side interpretation/calculation choices.
4. **Valid-data filter** — user-selected range applied after intrinsic support/availability.
5. **Results summary** — statistics for the active supported/filter-selected population.
6. **Selected site / pixel** — detailed values or raw readings for the current point.
7. **Full metadata** — lower-priority XML/acquisition details.

A family can omit sections that do not apply. The Generic XML Inspector is a fallback and is not required to follow the scientific-analyzer hierarchy.

## Raw data, scientific validity and user filtering

These are separate layers.

**Raw/stored data** preserves what the XML contains, including diagnostic sentinels when relevant.

**Intrinsic support/availability** answers whether a scientific result is defined for a point.

**Valid-data filter** is user analysis state. It can narrow the supported population but does not rewrite raw values or retroactively change the scientific calculation.

Accordingly:

- **UNAVAILABLE** means the result itself is not defined/supported at that point;
- **FILTERED** means a finite supported result exists but lies outside the active user range.

Family pages describe any additional availability rules.

## Results summary

Summary statistics use the family’s active supported population and current user filter where that analyzer supports filtering.

Do not interpret a reduced Count as deleted data. Raw rows remain available for audit/export where the family export provides them.

## Maps and measurement position

Spatial analyzers distinguish:

- the nominal target/sample outline;
- the EdgeExclusion-adjusted scheduled region;
- actual acquired points;
- any interpolation/smoothing support.

A one-point measurement is shown as a **measurement position** in target context rather than converted into a meaningless heatmap.

Incomplete/terminated acquisitions can have a partially reconstructed geometry. When the acquisition-order rule lacks matching vendor coordinate evidence, the analyzer labels that geometry as inferred rather than silently treating it as validated.

## Distribution

Distribution plots summarize the current quantity over the active population.

Where **Swap axes** is available, it changes presentation only. It does not change the selected filter quantity, valid population or numerical values.

Bin controls change histogram presentation rather than the underlying data.

## Axes and zoom

Plots use compact **Axes** controls for manual limits where supported.

Common interactions include:

- wheel/pointer zoom;
- axis-specific zoom when interacting near an axis;
- double-click **Auto** reset;
- equal physical X/Y scale on wafer/cell maps where geometry is spatial.

These controls are visualization state, not scientific processing.

## Selected-site plots

Family-specific inspection remains available even when a site is filtered from population statistics, when scientifically meaningful.

Examples include:

- DIT Vcpd–Qc, Vsb–Qc and Dit–Vsb curves;
- QSS acquisition/profile diagnostics;
- Dual QSS stored transient traces;
- ISC repeated dark/light readings;
- CET Vcpd-light versus Qc fit;
- LBIC selected-pixel channel details.

## Export

Exports are analyzer-specific. A map/site export may preserve every acquired row and include columns describing availability and filter state rather than physically deleting excluded sites.

CSV/XPS files used by the project for regression are **not** runtime dependencies. A user analysis is computed from the imported XML alone.

## Validation labels in the UI

A validation label applies to a semantic path, not to the entire PV-2000 product or every XML with the same broad family name.

For example, a result formula may be validated for one geometry/channel profile while an alternate geometry remains inferred. Exact boundaries are recorded in the repository validation documents.

## Where to go next

- [Measurement Families](Measurement-Families)
- [Scientific Foundations](Scientific-Foundations)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
