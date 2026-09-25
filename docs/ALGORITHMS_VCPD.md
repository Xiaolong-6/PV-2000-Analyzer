# VCPD algorithm notes

## Scope

The shared ISC/VCPD analyzer also handles PV-2000 `VcpdMeasurement` XML results. This is a separate XML measurement type and a separate validated result profile from `ISCMeasurement`, even though both use the Kelvin-probe/VCPD map infrastructure.

The browser runtime remains XML-only. Matching PV-2000 CSV exports are used only for development regression.

## Validated scalar path

The original pair and three new numeric `VcpdMeasurement` XML + PV-2000 CSV exports establish the calculation profile across one, four and sixteen readings/site.

The XML structure is:

```text
Measurement xsi:type="VcpdMeasurement"
  MeasurementData
    IterationData
      Iteration xsi:type="VcpdIterationData"
        Data
          DataItem xsi:type="VcpdDataItem"
            Readings
              double
        VcpdOffset
  Pattern xsi:type="MapPattern"
  Target xsi:type="RoundWafer"
  LightOn
  NumberOfReadings
```

For the current paired reference:

- `NumberOfReadings = 1`, `4` or `16` in the paired references;
- `LightOn = false`;
- iteration-level `VcpdOffset = 0 V`;
- each site contains that many finite `Readings/double` values;
- the vendor CSV contains one result quantity: **Vcpd Dark [V]**.

The paired data establish:

```text
Vcpd Dark = arithmetic mean(XML Readings at the site)
```

point-by-point for the original 1649 sites and 1283 new measured sites. The maximum new result error is below `4.45e-16 V`.

The paired four- and sixteen-reading cases now establish the runtime mean path for those counts. A non-zero VcpdOffset is not applied or guessed and remains a new calculation profile.

## Validated map geometry

The paired reference uses:

- `Pattern/@xsi:type = MapPattern`;
- `Target/@xsi:type = RoundWafer`;
- Diameter = 200 mm;
- EdgeExclusion = 8 mm;
- Pitch = 4 × 4 mm.

The scheduled radius is:

```text
r = Diameter / 2 - EdgeExclusion = 92 mm
```

The coordinate schedule is the same strict circular lattice used elsewhere in the analyzer:

```text
x = ix * PitchX
y = iy * PitchY
keep point when x² + y² < r²
```

with X-fast row-major ordering. This produces exactly 1649 sites, from `(-24, -88)` at the first row to `(24, 88)` at the last row. All 1649 X/Y pairs match the vendor CSV exactly.

Three new numeric pairs independently validate shared HighDensity/PseudoSquareCell, Map/RoundWafer and OnePoint/RoundWafer coordinates. A fourth pair has no acquired data and does not validate a numeric or geometry path.

## Statistics

The paired export reports Average, Median, Stdev, Min and Max for Vcpd Dark. The analyzer reproduces these using finite-site statistics and **sample standard deviation**:

- Average = 0.40415552129527 V;
- Median = 0.431620389 V;
- Stdev = 0.292987392588935 V;
- Min = -3.43040323 V;
- Max = 2.16074562 V.

The values reproduce the vendor summary to floating-point precision.

## Shared UI

`VcpdMeasurement` intentionally reuses the ISC/Kelvin-probe map, distribution, geometry, zoom, manual-axis and export infrastructure. Its result set remains type-specific:

- VCPD mode exposes only **Vcpd Dark**;
- ISC mode exposes **Vcpd Dark / Vcpd Light / VSB**.

VCPD selected-site inspection shows the direct XML `Readings` values. It does not display ISC-only VSB correction controls or illuminated results.

VCPD also uses the shared **Valid-data filter**. Because the current VCPD profile exposes only Vcpd Dark, that is the filter quantity. Lower/upper bounds create a site-level active mask used consistently by summary statistics, map rendering, distribution counts and map export. Raw XML `Readings` are never removed or rewritten by filtering, and excluded sites remain available for selected-site inspection. `Reset` restores the full available Vcpd Dark range; `1–99%` is an analyzer convenience range rather than PV-2000 processing.

## Validation boundary

The current validated VCPD calculation family is defined by the paired result semantics:

- `VcpdMeasurement`;
- one iteration;
- one, four or sixteen readings/site with the XML count matching each site's raw readings;
- `LightOn=false`;
- iteration-level `VcpdOffset=0`;
- vendor output `Vcpd Dark [V]`.

The following require a new paired reference before the validated claim expands:

- non-zero VcpdOffset;
- `LightOn=true`;
- a different raw-reading/result path;
- a new pattern/target schedule without paired coordinate evidence (geometry validation only);
- multiple iterations;
- another unit convention;
- additional vendor result quantities.
