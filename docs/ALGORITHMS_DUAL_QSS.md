# Dual QSS injection-sweep algorithm notes

## Scope

`DualQssMeasurement` is a separate result family from the spatial `QssUpcdMeasurement` map analyzer. Runtime remains XML-only. Matching PV-2000 raw CSV exports are used only for regression and for determining which quantities are already established versus still unresolved.

The supplied private corpus contains **72 XML files**. **57** of them have same-basename PV-2000 raw CSV exports, giving **1003 paired injection points**. The remaining 15 XML files still exercise the same observed raw schema but have no paired CSV.

## XML data model

The current family is:

```text
DualQssMeasurement
  Pattern: OnePointPattern
  MeasurementData / IterationData / Iteration / Data
    DataItem xsi:type="QssDataItem"
      Values
      Intensity
      Power
      Transients
        TransientInfo
          @LifeTime
          @Evaluation
          @Delta
          @PreTrigger
          @AutoCursor
          @TimeCursor
          @Average
          @Amplitude
          @Microwave
          @LaserPower
          @Voltage
          @Offset
          @TimeBase
          Transient
            SmallPoint @X @Y
```

The analyzer aligns `Values`, `Intensity`, `Power` and `TransientInfo` by vector index.

## What the paired raw CSV establishes

Across all 57 XML+CSV pairs:

- top-table QSS intensity equals the XML `Intensity` vector exactly;
- top-table laser power equals the XML `Power` vector exactly;
- the CSV raw-data `LifeTime [μs]` row matches XML `Values` / `TransientInfo@LifeTime` to export rounding, with maximum absolute difference about **0.0050414 µs**;
- each XML transient stores 2000 `SmallPoint` samples;
- the raw CSV exports the first 1999 samples of each transient (0 through 9990 µs in the current 5 µs-step examples), omitting the final XML sample;
- all **2,004,997** paired CSV transient Time/Voltage samples checked against XML match exactly at exported precision;
- non-positive raw XML lifetimes can occur and are retained for diagnosis.

Therefore the runtime plot is explicitly a **raw/XML transient-lifetime** plot.

## Important distinction: vendor result-table Lifetime

The top result table in the same CSVs contains:

```text
QSS Intensity[mSun], Laser Power e11[], Lifetime[us], dn[cm-3], Implied Voc[V], QDC
```

That `Lifetime[us]` is **not** the same quantity as XML `Values` / raw `LifeTime [μs]`. Across the paired corpus the two can differ materially, and the vendor result table also blanks/zeros some Lifetime and dn rows even while a finite raw transient lifetime is stored.

Current paired counts:

- **1003** vendor result rows;
- **775** rows with positive vendor result-table Lifetime;
- **228** rows with result-table Lifetime = 0.

The transformation from raw transient lifetime to vendor result-table Lifetime is not yet reproduced, so the analyzer must not label its XML curve simply as the PV-2000 result-table Lifetime.

## Established Δn relation, conditional on vendor Lifetime

For rows where the vendor result-table Lifetime is positive, the exported `dn` follows the existing PV-2000 generation relation to CSV rounding:

```text
G = 2.38e17 * I[suns] / W[cm] * OpticalFactor
dn = G * Lifetime
```

Using XML wafer thickness and optical factor, the maximum relative difference against the rounded CSV `dn` values in the current 57-pair corpus is below about **0.5%**. This validates the Lifetime→dn step once the vendor Lifetime is known; it does **not** establish how vendor Lifetime is obtained from the raw transient path.

`Implied Voc` also remains outside the current runtime path because the paired exports show vendor validity/processing behavior that cannot be inferred safely from the raw XML lifetime alone.

The QDC column in these supplied result tables is textual `QDC`, not a numeric per-row value.

## Runtime behavior

Every finite stored XML lifetime remains visible and exportable. For summary statistics, the analyzer currently treats finite positive raw lifetimes as valid and retains non-positive points as diagnostics. This is an analyzer convention for the raw XML viewer, not a claim about the vendor result-table acceptance rule.

The main plot uses QSS intensity on X and raw/XML transient lifetime on Y. Logarithmic X is the default because the supplied schedules span orders of magnitude. Clicking a curve point opens the corresponding stored transient and marks `TimeCursor`.

Additional `DualQssMeasurement` XML files can be loaded locally for LP/HP or repeat-measurement overlay. Overlay is an analyzer feature; no automatic vendor-style stitching rule is claimed.

## J0 and unresolved post-processing

The XML exposes fields including `CalculateJZeroParams`, `IncludeKSJ0`, `UseAugerCorrection`, `DeltaTauLimitForJ0Calc`, `DefaultDeltaN` and `DefaultDeltaNRangeInPercentage`. These fields are preserved as metadata.

The current paired CSVs establish the existence and output layout of the post-processed Lifetime/dn/Implied-Voc path, but do not yet establish:

- the raw-transient → result-table Lifetime transformation;
- the vendor zero/blank acceptance rule;
- Basore-Hansen J0;
- Kane-Swanson J0;
- LP/HP stitching semantics, if any.

Do not inherit the spatial QSS-map lifetime or implied-Voc path automatically. Reproduce the paired result-table Lifetime first, then validate downstream quantities point-by-point.
