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

The four paired references validate a **single-beam algorithm family**, not four frozen numeric configurations:

- one iteration;
- one beam;
- `SquareRegionPattern`;
- current unit µA;
- finite positive photon FluxCache associated with the beam;
- raw channels `Current`, `DirectReflection`, `ScatteredReflection`;
- vendor result path Current → Reflectivity → IQE.

All current reference instances happen to use 984 nm, power 0.6 and the same FluxCache value. Those are evidence values, not profile keys. Different wavelength, power, finite photon flux, Region origin/size or raster dimensions remain inside the family when the same input/output path applies.

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

The on-screen heat map follows acquisition row order. This coordinate validation does not separately claim that the browser's screen orientation matches every PV-2000 map display convention.

## PV-2000-compatible quantities

### Current

`Current` is read directly from XML and exported/displayed as a primary result.

Status: **raw XML; pointwise reproduced by the supplied PV-2000 CSV exports**.

### Reflectivity

For the validated profile, PV-2000 `Reflectivity [%]` is reproduced point-by-point by:

```
Reflectivity[%] = DirectReflection[%] + ScatteredReflection[%]
```

The browser therefore presents **Reflectivity** as the primary quantity and keeps the two component channels under Advanced raw/intermediate channels.

Status: **validated for the current single-beam Direct+Scattered → Reflectivity family**, based on four paired reference instances.

If a future XML already contains a raw total-reflectance/reflectivity channel, the raw XML value wins.

### EQE intermediate

The vendor-compatible intermediate required to reproduce IQE is:

```
EQE[%] = (Current[µA] × 1e-6 / q_PV2000 / photonFlux) × 100
q_PV2000 = 1.602e-19 C
```

The compatibility constant is intentionally the value required by the PV-2000 exports, not the current exact SI elementary-charge value.

The supplied vendor CSVs do not expose an EQE output column. EQE is therefore shown only under Advanced raw/intermediate channels and remains labelled **inferred**, even though the same intermediate is constrained by exact IQE regression.

### IQE

For the validated profile:

```
IQE_raw[%] = EQE[%] / (1 - Reflectivity[%] / 100)
```

PV-2000 output behavior observed in all four references is:

```
if Reflectivity >= 100%:
    IQE = blank
else if IQE_raw > 100%:
    IQE = blank
else:
    IQE = IQE_raw
```

Using `q_PV2000 = 1.602e-19 C`, the finite IQE values reproduce the vendor exports to approximately 1e-12 percentage-point scale. Exported blank IQE points are also reproduced by the >100%/non-computable rule.

Status: **validated for the current single-beam Current/Reflectivity → IQE family**, based on four paired reference instances.

The behavior exactly at a mathematically calculated IQE of 100.000...% is not separately represented by a boundary reference point; the implementation accepts values `<= 100%`.

## Summary statistics

PV-2000 summary statistics use finite/valid output values only. Standard deviation is sample standard deviation:

```
s = sqrt(sum((x - mean)^2) / (N - 1))
```

Thus IQE points blanked by the vendor-compatible validity rule do not contribute to Average, Median, Stdev, Min or Max.

## Default versus Advanced UI

The default quantity selector mirrors the currently validated PV-2000 exports:

- Current;
- Reflectivity;
- IQE.

Advanced raw/intermediate channels expose:

- Direct reflectance;
- Scattered reflectance;
- EQE;
- any unknown numeric XML channels.

This separation prevents diagnostic/internal channels from being presented as if PV-2000 exported them as primary results.

## Validation envelope and future reference profiles

Validation follows the **algorithm family**, not exact numeric settings. Ordinary changes in wavelength, power, finite FluxCache, Region origin/size, pitch or grid dimensions do not create a new profile when the same single-beam SquareRegionPattern + Current/Direct/Scattered → Current/Reflectivity/IQE path is used.

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

Runtime may still calculate physically plausible candidates for genuinely new profiles, but their status must remain **inferred** until paired vendor regression.

## Multi-wavelength support

The internal data model accepts arbitrary beam keys and joins each beam to its laser/FluxCache metadata. The UI can switch beams and the full export emits all discovered channels.

However, the supplied reference pairs are single-beam only.

Status: **implemented structurally, not vendor-validated for a real multi-wavelength profile**.

A real multi-wavelength XML plus its matching PV-2000 export must be treated as a new profile and may require redesign of channel/result logic.

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

Store matching private references using the same basename:

```
private/reference/lbic/example.xml
private/reference/lbic/example.csv
```

Run:

```bash
npm run validate:lbic
```

The validator checks the validated algorithm-family structure, point count, X/Y, Current, Reflectivity, IQE blanking and summary statistics. Numeric wavelength/power/flux/geometry values may vary. It reports NEW PROFILE only when the semantic input/output path changes.
