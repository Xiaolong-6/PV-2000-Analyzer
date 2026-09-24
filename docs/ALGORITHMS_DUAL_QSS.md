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

Two **real, matching DualQssMeasurement XML + numeric PV-2000 final-result CSV pairs** establish the current vendor-compatible result path for `OnePointPattern + RoundWafer`, `ProbeSelection=Back`, `QssBiasSelection=Back`, with `UseAugerCorrection=false`.

The browser reconstructs the result table from XML only. The CSV is used only by the private regression workflow.

### QDC reconstruction

For every stored transient in both pairs, the runtime reproduces the reference-build QDC calculation:

1. mean of the first 10 transient Y samples is the baseline;
2. transient polarity is selected from the larger absolute Y extremum;
3. samples before the selected extremum are removed and the baseline is subtracted;
4. the vendor `MinPack.DoSmoothing(..., SM=1)` path is reproduced;
5. smoothed amplitude is inverted to time with clamped linear interpolation;
6. times at `A`, `A/2`, and `A/4` are evaluated;
7. `QDC = (t(A/4)-t(A/2)) / (t(A/2)-t(A))`.

Against the original DLL internal QDC arrays, maximum absolute error is approximately **7.92e-11** for the 25-point HighPower pair and **2.67e-12** for the 16-point LowPower pair.

The configured `ValidQdcRange` is then applied exactly as a **contiguous first-valid through last-valid interval**, not as an independent point mask.

### Steady-state lifetime reconstruction

When the bias source is Back and the QDC-filtered measured curve contains at least six points:

1. transform intensity and measured lifetime to natural-log coordinates;
2. densify by a factor of 10,000 with the reference-build **Akima spline** path;
3. locate the local lifetime extremum and retain the dense curve from that intensity onward;
4. trapezoidally integrate the dense curve;
5. evaluate
   `tauSS_i = (Integral_i + tau_i * I_start) / I_i`;
6. linearly interpolate the corrected lifetime over the corrected domain;
7. set corrected acquired points outside that domain to zero;
8. recompute excess carrier density from the corrected lifetime.

The class name in the vendor assembly is `CubicSplineInterpolator`, but managed IL shows that it calls ALGLIB `buildakimaspline`; the implemented compatibility path is therefore specifically **log-log Akima**, not a generic cubic spline.

The base path evaluates `teff.d (1 Sun)` from XML `Values` using the vendor clamped linear interpolation rule. The Dual QSS path overwrites `teff.SS (1 Sun)` only when 1000 mSun lies inside the corrected steady-state domain. Otherwise the base clamped value remains. This reproduces both current real pairs without sample-name-specific logic.

### Final scalar parity

The two paired exports contain nine vendor result quantities. The XML-only runtime now reproduces all nine, including quantity-specific undefined state:

| Quantity | HighPower pair | LowPower pair | Current regression |
|---|---:|---:|---|
| teff.d (1 Sun) [µs] | 188.5463167 | 236.991629 | exact in both pairs |
| teff.SS (1 Sun) [µs] | 280.94342922609 | 236.991629 | max abs error ≈ **2.3e-13 µs** |
| teff.SS Max [µs] | 893.70740338579 | 1984.29119677534 | max abs error ≈ **9.1e-13 µs** |
| Basore Emitter J0 [fA/cm²] | 199.548389124001 | Ud. | finite value + undefined state reproduced |
| Δn (1 Sun) [cm⁻³] | 1.91041531873741e15 | Ud. | finite value + undefined state reproduced |
| Smax (1 Sun) [cm/s] | 62.2901202858062 | 73.8422706061065 | floating-point parity |
| Smax at max teff.SS [cm/s] | 19.5813528384141 | 8.81927008920825 | floating-point parity |
| Implied Voc (1 Sun) [V] | 0.596218597067025 | 0.588201537608459 | max abs error ≈ **4.4e-16 V** |
| K-S Emitter J0 [fA/cm²] | 128.40923475899 | 863.446682273861 | max abs error ≈ **7.3e-12 fA/cm²** |

Basore uses the configured `JZeroIntensity` range and the raw XML `Values` lifetime path. K-S J0 uses the corrected steady-state lifetime / Δn path and the configured `DefaultDeltaN` window. Vendor-zero/undefined behavior is preserved for the paired profile.

The current runtime deliberately rejects this compatibility result path when `UseAugerCorrection=true`; the Auger branch is reverse-engineered but has no real paired numeric result case yet.

Run the public validator launcher with:

```bash
npm run validate:dual-qss-runtime-results -- <case-dir> [<case-dir> ...]
```

Each private case directory contains `result.xml` and its matching `result.csv`. The browser itself never reads the CSV.

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

For `QSS-INJ-RESULT-001`, Results summary exposes the paired-validated final result quantities that are available for the imported XML, and the result-table export preserves vendor-compatible units plus `Ud.` availability semantics. Outside that profile, the analyzer keeps the raw XML/transient views without inventing vendor results.

Logarithmic X is the default because the supplied schedules span orders of magnitude. Clicking a curve point opens the corresponding stored transient and marks `TimeCursor`. Additional `DualQssMeasurement` XMLs can be loaded locally for LP/HP or repeat overlays; this overlay is an analyzer feature, not a claimed vendor stitching algorithm.

## Supplemental J0-requesting examples

Six additional `OnePointPattern` XMLs exercise high-range injection schedules with `CalculateJZeroParams=true`, `IncludeKSJ0=true`, `UseAugerCorrection=false` and `DefaultDeltaN=5e16`. They confirm that these recipe requests occur on the same raw Dual QSS schema and that the one-point geometry remains meaningful context.

No matching PV-2000 result-table export was supplied for these six measurements. They expand runtime/metadata coverage only. The two-pair `QSS-INJ-RESULT-001` validates the full non-Auger Back/Back result path only for its two real paired cases; these six XML-only files do not widen that validation envelope.

## Remaining compatibility boundaries

The XML exposes `CalculateJZeroParams`, `IncludeKSJ0`, `UseAugerCorrection`, `DeltaTauLimitForJ0Calc`, `DefaultDeltaN` and `DefaultDeltaNRangeInPercentage`.

Still outside the validated browser compatibility envelope:

- `UseAugerCorrection=true`;
- source selections other than the paired Back/Back path;
- a sweep that crosses 1000 mSun without an acquired 1000-mSun point;
- multi-iteration or structurally different Dual QSS XML;
- generalization of the scalar result path to the broader 273-pair raw-export corpus;
- vendor LP/HP stitching semantics, if any.

The raw 273-pair corpus and the two-pair numeric result profile remain separate evidence sets. New categorical branches require their own real XML + matching numeric PV-2000 CSV before the runtime profile is widened.
