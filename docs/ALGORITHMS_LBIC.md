# LBIC analyzer algorithm and validation status

## Scope

The `LBICMeasurement` module is an XML-only spatial raster viewer. Runtime data come only from the imported PV-2000 XML. Vendor CSV exports are private development/regression references and are never required by the browser application.

The internal model remains **raster position × iteration × beam/wavelength × channel**. Numeric `BeamData` attributes are discovered dynamically so future XMLs are not forced into the schema of the current reference set.

## Raw data and provenance

Raw XML values always take priority over calculated quantities. Known numeric attributes are mapped to canonical concepts for display; unknown numeric attributes are preserved and exported under their XML names.

Laser metadata are joined by:

```
BeamData Item/@Key == LaserSettings/LBICLaserSetting/Index == FluxCache key
```

The paired references currently establish three LBIC algorithm families. `LBIC-SINGLE-001` is the original single-beam rectangular-raster family:

- one iteration;
- one beam;
- `SquareRegionPattern`;
- current unit µA;
- finite positive photon FluxCache associated with the beam;
- raw channels `Current`, `DirectReflection`, `ScatteredReflection`;
- vendor result path Current → Reflectivity → IQE.

The four `LBIC-SINGLE-001` reference instances happen to use 984 nm, power 0.6 and the same FluxCache value. Those are evidence values, not profile keys. Different wavelength, power, finite photon flux, Region origin/size or raster dimensions remain inside that family when the same input/output path applies. A separate paired 54,449-point four-beam reference establishes `LBIC-MULTI-002`. A third private corpus of 62 reflectance-only XMLs, with 60 matching PV-2000 XPS printouts covering 44 measurements, establishes `LBIC-REFLECTANCE-003`.

## Rectangular raster reconstruction

For the validated `SquareRegionPattern` references, geometry is read from structured `Region` and `Dimension` fields. `Pattern/Name` is display metadata only and is never parsed for coordinates.

For Dimension `nx × ny` and Region `(x0, y0, width, height)`:

```
dx = width  / (nx - 1)
dy = height / (ny - 1)
index = row * nx + col
x = x0 + col * dx
y = y0 + row * dy
```

The four matching CSV exports establish:

- X-fast, row-major acquisition order;
- Y coordinate increases from `Region.Y` toward `Region.Y + Height`;
- all exported X/Y coordinates match this reconstruction exactly;
- 51×51 references use 0.1 mm pitch;
- 101×101 references use 0.05 mm pitch.

Status: **validated for the SquareRegionPattern coordinate rule used by this single-beam family**. The reference instances exercise two raster resolutions and two origins. New numeric grid dimensions (for example 4×4 or 5×5) use the same rule and are not automatically a NEW PROFILE.

The on-screen heat map uses the reconstructed physical coordinates with conventional Cartesian orientation (+Y upward). Coordinate values/order are vendor-regressed; palette/interpolation appearance is an analyzer presentation choice.

For an incomplete SquareRegionPattern acquisition, the runtime may receive fewer DataItems than `Dimension.X × Dimension.Y`. The analyzer preserves the known X-fast / ascending-Y schedule and assigns the available DataItems to the leading schedule prefix so that partial data remain viewable. This incomplete-prefix interpretation is labelled **partial / inferred**; it is deliberately excluded from validated profile matching until a vendor coordinate export confirms incomplete-scan ordering.

## Multi-beam PseudoSquareCell raster reconstruction

The validated `LBIC-MULTI-002` reference uses `MapPattern + PseudoSquareCell`. Geometry is read from the structured target and pitch fields rather than from `Pattern/Name`:

```
halfWidth  = Target.Size.Width  / 2 - EdgeExclusion
halfHeight = Target.Size.Height / 2 - EdgeExclusion
radius     = Target.Diameter / 2 - EdgeExclusion
```

A centered lattice is generated at `Pattern/Pitch/X,Y` with X-fast, ascending-Y acquisition order. A point is retained only when it lies inside both the adjusted rectangle and adjusted circle. The supplied 125 × 125 mm, 150 mm-diameter, 3 mm-edge-exclusion, 0.5 mm-pitch reference therefore uses halfWidth = halfHeight = 59.5 mm and radius = 72 mm, yielding exactly **54,449** points. All reconstructed X/Y coordinates match the paired PV-2000 CSV exactly.

The browser map displays the nominal pseudo-square outline, a dashed EdgeExclusion-adjusted scheduled boundary, equal physical X/Y scale with +Y upward, and clips raster cells to the scheduled shape. X/Y profiles are extracted by matching the selected point's physical Y or X coordinate, respectively; they do not assume a dense rectangular `row * nx + col` layout.

Status: **validated for the MapPattern + PseudoSquareCell coordinate rule in LBIC-MULTI-002**.

## PV-2000-compatible quantities

### Current

`Current` is read directly from XML only when the XML measurement flags indicate that current measurement is active. In the validated reflectance-only corpus, `MeasureCurrent=false` while every BeamData row still contains `Current=0`; that attribute is an inactive placeholder and is suppressed from measured-result UI/export semantics.

Status: **raw XML when active; pointwise reproduced by the supplied current-enabled PV-2000 CSV exports**. Disabled placeholder Current is not treated as measured data.

### Reflectivity

For the validated profile, PV-2000 `Reflectivity [%]` is reproduced point-by-point by:

```
Rraw[%] = DirectReflection[%] + ScatteredReflection[%]
Reflectivity_display[%] = clamp(Rraw, 0, 100)
```

The browser therefore presents **Reflectivity** as the primary quantity and keeps the two component channels under Advanced raw/intermediate channels.

One 51×51 reference contains a point where Direct + Scattered = 100.0179668%, while the PV-2000 export reports Reflectivity = 100%, establishing the upper cap. The multi-beam reference additionally contains four 656 nm points with negative raw optical sums; the vendor export displays Reflectivity = 0% at those points, establishing the lower display cap.

Status: **validated for all three recorded Direct+Scattered → Reflectivity families**: `LBIC-SINGLE-001`, `LBIC-MULTI-002` and `LBIC-REFLECTANCE-003`. For `LBIC-REFLECTANCE-003`, 60 PV-2000 XPS printouts reproduce Average / Median / sample Stdev / Min / Max within the vendor's two-decimal display rounding (maximum discrepancy <0.005 percentage point).

If a future XML already contains a raw total-reflectance/reflectivity channel, the raw XML value wins.

### EQE intermediate

The vendor-compatible intermediate required to reproduce IQE is:

```
EQE[%] = (Current[µA] × 1e-6 / q_PV2000 / photonFlux) × 100
q_PV2000 = 1.602e-19 C
```

The compatibility constant is intentionally the value required by the PV-2000 exports, not the current exact SI elementary-charge value.

The supplied current-enabled vendor CSVs do not expose an EQE output column. EQE is therefore shown only under Advanced raw/intermediate channels and remains labelled **inferred**, even though the same intermediate is constrained by exact IQE regression. When `MeasureCurrent=false`, no EQE is synthesized from the inactive `Current=0` placeholder.

### IQE

For the validated profile:

```
IQE_raw[%] = EQE[%] / (1 - Rraw[%] / 100)
```

PV-2000 output behavior observed in all four references is:

```
if Rraw >= 100%:
    IQE = blank
else if IQE_raw > 100%:
    IQE = blank
else:
    IQE = IQE_raw
```

Using `q_PV2000 = 1.602e-19 C`, the finite IQE values reproduce the vendor exports to approximately 1e-12 percentage-point scale. Exported blank IQE points are also reproduced by the >100%/non-computable rule.

In `LBIC-MULTI-002`, the vendor's displayed Reflectivity is clamped to 0–100%, but IQE still uses the **unclamped raw optical sum** `Rraw` in the denominator. This distinction is required by four 656 nm points where `Rraw < 0`: PV-2000 displays Reflectivity = 0% while its IQE matches the negative raw sum.

Status: **validated for the recorded Current / raw-optical-sum → IQE families**. The multi-beam reference reproduces finite IQE values to approximately 1e-13 percentage-point scale; vendor `Ud.` cells correspond to unavailable/non-retained IQE values.

The behavior exactly at a mathematically calculated IQE of 100.000...% is not separately represented by a boundary reference point; the implementation accepts values `<= 100%`. IQE is not synthesized for `LBIC-REFLECTANCE-003` because current measurement is disabled.

## Summary statistics

PV-2000 summary statistics use finite/valid output values only. Standard deviation is sample standard deviation:

```
s = sqrt(sum((x - mean)^2) / (N - 1))
```

Thus IQE points blanked by the vendor-compatible validity rule do not contribute to Average, Median, Stdev, Min or Max.

## Analyzer valid-data filter

LBIC uses the shared site-selection contract for analyzer-side range filtering. The filter is scoped to the **current iteration and beam/wavelength** because each beam can have different active quantities and numerical ranges. Within that context, the user may choose any quantity currently exposed by the View mode as the filter metric and set lower/upper bounds.

The resulting site-level active mask is shared across all visible LBIC quantities for that iteration/beam. Summary statistics, raster-map fill, Distribution counts and both X/Y line profiles consume the same active mask; each displayed quantity's finite-value availability is applied after that mask. Changing only the displayed quantity does not silently change the filter quantity.

Filtering never rewrites raw XML or derived result arrays. A filtered pixel remains selectable and its raw/current values remain available for inspection and export. Map export writes all sites together with metric availability, active-filter pass state, displayed state, filter metric and active limits. Histogram/profile exports contain only the plotted active population and record the filter provenance. **Export all** continues to preserve every channel value and adds the current filter context/pass state rather than deleting excluded rows.

`Reset` expands to the full finite range of the selected filter quantity. `1–99%` is only a convenience percentile range in the analyzer; it is not a PV-2000 algorithm, validity criterion or validation claim. Switching iteration or beam resets the filter to that new context. Advanced mode may add raw/intermediate channels as filter candidates; hiding Advanced never promotes those channels to primary results.

## Default versus Advanced UI

The default quantity selector follows the active measurement/result path instead of blindly exposing every numeric BeamData attribute.

For current-enabled `LBIC-SINGLE-001` / `LBIC-MULTI-002`:

- Current;
- Reflectivity;
- IQE.

For reflectance-only `LBIC-REFLECTANCE-003`:

- Reflectivity only.

Advanced raw/intermediate channels expose active Direct/Scattered reflectance, EQE where current is active, and unknown numeric XML channels. Numeric attributes belonging to explicitly disabled XML measurement flags are not presented as measured channels.

This separation prevents placeholders and diagnostic/internal channels from being presented as if PV-2000 exported them as primary results.

## Validation envelope and future reference profiles

Validation follows the **algorithm family**, not exact numeric settings. Ordinary changes in wavelength, power, finite FluxCache, Region origin/size, pitch or complete grid dimensions do not create a new profile when the same current-enabled single-beam path is used. Likewise, 656/855/984 nm and ordinary complete SquareRegionPattern geometry changes remain inside `LBIC-REFLECTANCE-003` when the flags stay `MeasureCurrent=false`, Direct=true, Scattered=true and the vendor output path remains Reflectivity.

Treat a case as **NEW PROFILE** when the categorical input/output path changes, for example:

- another pattern type or coordinate encoding;
- multiple beams or iteration semantics that change result interpretation;
- another unit convention;
- a different raw channel set, including raw Reflectivity/EQE/IQE;
- a different vendor result combination or blanking/validity rule.

For every NEW PROFILE:

1. obtain the real PV-2000 XML;
2. obtain its matching PV-2000 export/result;
3. compare coordinates, raw channels, derived quantities, blanks/validity rules and summary statistics point-by-point;
4. revise parser/calculation/UI logic if the new pair behaves differently;
5. extend the regression validator only after the behavior is established.

Runtime may still calculate physically plausible candidates for genuinely new profiles, but their status must remain **inferred** until paired vendor regression. The independently validated multi-beam `MapPattern + PseudoSquareCell` path is recorded separately as `LBIC-MULTI-002`; reflectance-only SquareRegionPattern handling is recorded as `LBIC-REFLECTANCE-003`.

## Multi-wavelength support

The internal data model accepts arbitrary beam keys and joins each beam to its laser/FluxCache metadata. The UI can switch beams and the full export emits all discovered channels.

The 54,449-point four-beam `LBIC-MULTI-002` pair validates **independent per-beam** Current / Reflectivity / IQE handling for 984, 952, 855 and 656 nm within one measurement. Beam count, wavelength, power and finite FluxCache values may vary inside this family when every beam follows the same independent channel/result path.

Status: **validated for the independent multi-beam `MapPattern + PseudoSquareCell` family**. Coupled cross-beam calculations remain outside that validation envelope.

## Diffusion length

The manual indicates that LBIC measurements at different penetration depths can be used to determine minority-carrier diffusion length. This project deliberately does not invent that vendor algorithm.

Status: **unsupported for calculated diffusion length** unless XML contains a raw vendor channel.

To implement it later, require:

1. a real multi-wavelength LBIC XML where the relevant measurement is enabled;
2. the matching PV-2000 diffusion-length map/export;
3. wavelength/beam/flux metadata;
4. any recipe fields that affect optical correction or penetration depth.

Reverse-engineer the actual pair, add pointwise regression, then expose the calculation.

## Private regression command

Store matching private references together. Current-enabled families use same-basename XML + CSV. Reflectance-only cases may use the matching PV-2000 Reflectivity XPS printout(s); the validator matches XPS files by normalized XML-result-name prefix.

```
private/reference/lbic/example.xml
private/reference/lbic/example.csv

private/reference/lbic/reflectance_example.xml
private/reference/lbic/reflectance_example ... Reflectivity.xps
```

Run:

```bash
npm run validate:lbic
```

The validator checks current-enabled families pointwise against CSV for geometry, Current, Reflectivity, IQE blanking and summary statistics. For `LBIC-REFLECTANCE-003`, it checks the XML Direct+Scattered Reflectivity summary against matching XPS Average / Median / sample Stdev / Min / Max at vendor display precision. Numeric wavelength/power/flux/geometry values may vary. It reports NEW PROFILE only when the semantic input/output path changes; incomplete SquareRegion acquisitions remain partial/inferred rather than validated.
