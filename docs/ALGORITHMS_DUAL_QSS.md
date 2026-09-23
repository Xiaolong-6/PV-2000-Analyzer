# Dual QSS injection-sweep algorithm notes

## Scope

`DualQssMeasurement` is a separate result family from the spatial `QssUpcdMeasurement` map analyzer. Runtime remains XML-only. Matching PV-2000 raw/final-result CSV exports are private regression evidence only. New calculated result paths are added only when a real XML and its matching numeric PV-2000 CSV establish the behavior.

The expanded private corpus contains **330 XML files**. **273** have exact-basename PV-2000 raw CSV exports, giving **5833 paired injection points**. The remaining 57 XML files have no exact-basename CSV in this corpus; 10 CSV files likewise have no exact-basename XML and are not auto-paired by filename guesswork.

## XML data model

```text
DualQssMeasurement
  Pattern: OnePointPattern
  Target: RoundWafer
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

All 330 supplied XMLs use this same observed structure. `Values`, `Intensity`, `Power` and `TransientInfo` counts align in every file, and every stored transient contains 2000 `SmallPoint` samples.

## Validated raw lifetime semantics

The expanded corpus establishes that two lifetime fields in the XML must remain distinct:

- **PV-2000 raw `LifeTime`** is `TransientInfo@LifeTime`. Across all 273 exact pairs / 5833 points, the CSV raw-data `LifeTime [μs]` row matches `TransientInfo@LifeTime` exactly at exported precision (maximum absolute error **0 µs**).
- **XML `Values` lifetime** is a separate XML vector. It is usually very close to `TransientInfo@LifeTime`, but it is not guaranteed identical. Across the paired corpus the maximum observed absolute difference is **0.020593307 µs**, with one point above 0.006 µs.

The runtime uses `TransientInfo@LifeTime` as the canonical XML lifetime, falling back to XML `Values` only when that field is unavailable. The two XML fields remain distinguishable in development validation/export diagnostics, while the user-facing curve has one Lifetime source. PV-2000 CSV/raw exports are development evidence only and are never runtime inputs. Neither XML field is the vendor result-table `Lifetime[us]` described below.

Other raw-path regression results:

- top-table QSS intensity equals XML `Intensity` exactly;
- top-table laser power equals XML `Power` exactly;
- each XML transient stores 2000 samples;
- every paired raw CSV contains the first 1999 samples and omits the final XML sample;
- **11,660,167** paired Time/Voltage samples match XML exactly at exported precision;
- non-positive raw lifetimes are retained for diagnosis.

## Paired numeric result profile — QSS-INJ-RESULT-001

Two additional **real, matching DualQssMeasurement XML + numeric PV-2000 result CSV pairs** establish a narrow final-result path for `OnePointPattern + RoundWafer`, `ProbeSelection=Back`, `QssBiasSelection=Back`.

The final vendor scalar **teff.d (1 Sun)** is taken from the XML `Values` vector, not from the rounded `TransientInfo@LifeTime` field:

- in the paired high-range case, 1000 mSun is acquired explicitly and XML `Values` at 1000 mSun reproduces the vendor scalar exactly;
- in the paired low-range case, acquisition ends at 681 mSun and PV-2000 reports the **last acquired XML `Values` element** as teff.d (1 Sun), again exactly.

These two cases validate only those target-placement rules. If an acquired sweep spans 1000 mSun without an exact 1000 mSun sample, the analyzer does **not** invent an interpolation rule; that scalar remains unavailable until another matching XML+CSV pair exercises the case. Left-side clamping is likewise not generalized.

The paired numeric exports also establish the following dependent relationships:

```text
Smax (1 Sun) [cm/s] = 50 * W_um / teff.SS_1sun_us
Smax at max teff.SS [cm/s] = 50 * W_um / teff.SS_max_us
```

Both pairs reproduce these relations to floating-point precision. In the pair where vendor Δn (1 Sun) is available,

```text
Δn = 2.38e12 * I_mSun * OpticalFactor * teff.SS_us / W_um
```

at 1000 mSun also reproduces the numeric export to floating-point precision. This confirms the **teff.SS → Smax/Δn** steps; it does not reconstruct teff.SS itself.

The two CSVs additionally expose teff.SS, teff.SS Max, Implied Voc, K-S J0 and Basore J0/undefined state. A private reference-build replay reproduces those exported values and undefined flags, confirming that the files are internally paired. Browser-side reconstruction of those quantities remains unsupported until their XML→result transformations are independently reproduced point-by-point.

Run the paired numeric validator with:

```bash
npm run validate:dual-qss-results -- <case-dir> [<case-dir> ...]
```

Each case directory contains `result.xml` and its matching `result.csv`. The browser never reads the CSV.

## Vendor result-table Lifetime remains separate

The same CSVs contain:

```text
QSS Intensity[mSun], Laser Power e11[], Lifetime[us], dn[cm-3], Implied Voc[V], QDC
```

That top-table `Lifetime[us]` is a post-processed quantity and is not the raw `TransientInfo@LifeTime` or XML `Values` field. Across the 5833 paired result rows, **4628** have positive vendor result-table Lifetime and **1205** are zero.

The expanded corpus strongly constrains the behavior, but it still does not reproduce the vendor raw-lifetime → result-table-Lifetime transformation or its acceptance/zeroing rule point-by-point. The runtime therefore does not synthesize this quantity.

## Established Δn relation, conditional on vendor Lifetime

For rows where the vendor result-table Lifetime is positive, exported `dn` follows:

```text
G = 2.38e17 * I[suns] / W[cm] * OpticalFactor
dn = G * Lifetime
```

Using XML wafer thickness and optical factor, the maximum relative discrepancy against rounded CSV `dn` values is about **0.509%** across the 273 exact pairs. This validates the Lifetime→dn step once vendor Lifetime is known; it does not establish how vendor Lifetime is derived.

`Implied Voc` remains outside the validated runtime path because its vendor validity/processing behavior has not been reproduced from XML alone. The QDC column in this corpus is textual `QDC`, not a numeric per-row value.

## Runtime behavior

The injection curve uses **PV-2000 raw** `TransientInfo@LifeTime`, falling back to XML `Values` only when the transient lifetime is unavailable. CSV export preserves both XML lifetime fields explicitly.

For `QSS-INJ-RESULT-001`, Results summary also shows the paired-validated **teff.d (1 Sun)** scalar when the imported XML exercises one of the two validated target-placement rules above. Other final-result quantities remain absent rather than being guessed.

Logarithmic X is the default because the supplied schedules span orders of magnitude. Clicking a curve point opens the corresponding stored transient and marks `TimeCursor`. Additional `DualQssMeasurement` XMLs can be loaded locally for LP/HP or repeat overlays; this overlay is an analyzer feature, not a claimed vendor stitching algorithm.

## Supplemental J0-requesting examples

Six additional `OnePointPattern` XMLs exercise high-range injection schedules with `CalculateJZeroParams=true`, `IncludeKSJ0=true`, `UseAugerCorrection=false` and `DefaultDeltaN=5e16`. They confirm that these recipe requests occur on the same raw Dual QSS schema and that the one-point geometry remains meaningful context.

No matching PV-2000 result-table export was supplied for these six measurements. They expand runtime/metadata coverage only. The separate two-pair `QSS-INJ-RESULT-001` evidence validates the narrow teff.d (1 Sun) scalar path described above, but does not validate browser-side Basore-Hansen J0, Kane-Swanson J0, teff.SS, Implied Voc or general Δn availability.

## J0 and unresolved post-processing

The XML exposes `CalculateJZeroParams`, `IncludeKSJ0`, `UseAugerCorrection`, `DeltaTauLimitForJ0Calc`, `DefaultDeltaN` and `DefaultDeltaNRangeInPercentage`. These remain metadata.

Still unsupported as vendor-compatible derived results:

- XML/raw lifetime → teff.SS curve/transformation;
- teff.SS Max reconstruction;
- general Δn availability outside the paired finite case;
- Implied Voc processing;
- Basore-Hansen J0;
- Kane-Swanson J0;
- vendor LP/HP stitching semantics, if any.

The validated teff.d (1 Sun) scalar must remain separate from these unresolved paths.

Do not substitute the spatial QSS-map formulas or a plausible integration approximation for these result-table quantities without pointwise regression.
