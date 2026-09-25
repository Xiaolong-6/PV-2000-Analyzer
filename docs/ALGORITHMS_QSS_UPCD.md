# QSS-µPCD map algorithm notes

## XML and coordinate order

Paired PV-2000 coordinate evidence now covers three QSS map paths: MapPattern + RoundWafer, SquareRegionPattern + SquareCell, and HighDensityPattern + RoundWafer.

**QSS-MAP-001 — MapPattern + RoundWafer.** Coordinates are generated in XML acquisition order: ascending Y, then ascending X within each row. The scheduled radius is `Diameter / 2 - EdgeExclusion` when `EdgeExclusion` is present, and only lattice points strictly inside that effective circle are retained (`x²+y² < Rmap²`). A 100 mm target with 3 mm edge exclusion and 2 mm pitch therefore schedules 1741 sites rather than the 1941 sites produced by the nominal 50 mm radius. The original 305-point paired reference confirms this order exactly. A later private 96-XML corpus exercises the same family across 100 mm / 305-site and 125 mm / 489-site RoundWafer maps at 5 mm pitch; nine matching CSV exports again reproduce all X/Y coordinates exactly. These are numeric geometry changes inside the same coordinate rule, not new profiles.

**QSS-MAP-002 — SquareRegionPattern + SquareCell.** The raster is read from `Pattern/Region` plus `Pattern/Dimension`. The paired 35 × 30 reference uses Region (-40, -30) mm with Width 70 mm and Height 60 mm, giving 1050 sites. PV-2000 export order is X-fast row-major with both axes increasing: X runs -40 → +30 within each row, then Y advances -30 → +30. With no explicit `Pitch` node, effective spacing is derived as `Width/(Nx-1)` and `Height/(Ny-1)`. All 1050 reconstructed X/Y coordinates match the paired export to floating-point precision.

For SquareRegionPattern, the nominal SquareCell outline and explicit measured Region are distinct. The Region is used as the raster/smoothing support; the target remains the nominal sample boundary. Runtime remains XML-only: current point/coordinate counts are diagnostics, and importing another XML does not imply that a vendor export was compared at runtime.

**HighDensityPattern — profile-scoped coordinate support.** QSS XML may store an explicit full-grid `Pattern/Coefficients` array with normalized X/Y values in `[-1, 1]` and a scalar `Dimension`. For `SquareCell`, normalized coordinates are scaled independently to the EdgeExclusion-adjusted half-width/half-height. For `RoundWafer`, the full coefficient template is restricted to the strict normalized unit circle (`x²+y² < 1`) in XML order and then scaled by the EdgeExclusion-adjusted radius `Rmap`. The 100-case paired corpus now validates the RoundWafer path directly: 145-site 15×15 and 276-site 20×20 cases match vendor X/Y to about `7.03e-14 mm`. Other HighDensity target combinations keep their separate geometry-profile evidence; this RoundWafer result does not widen them automatically. The shared geometry resolver preserves raw coefficients separately from physical `pointsMm`.\n\n## Availability, statistics and valid-point filtering

PV-2000 `Stdev` is sample standard deviation (`N-1`). The controller may store **`-1 µs` as a raw XML lifetime sentinel**. The 100-case paired result exports establish a separate final-result convention: at 39 such sites, lifetime is `Ud.`, Smax is `0`, and Implied Voc is `0`. The analyzer keeps XML `-1` unchanged for provenance, but its PV-2000-compatible result quantities use the paired placeholders. The raw inspection mode is therefore labelled **Raw XML/controller values**, not vendor-result values.

For scientific analysis, the default is stricter: non-positive lifetime is intrinsically **unavailable**. Such sites are excluded before the user-controlled **Valid-data filter** is applied. This prevents `-1 µs` from dominating map color ranges, distributions, SRV conversion or filtered statistics, while retaining the exact raw value in exported rows. Plot tooltips distinguish **UNAVAILABLE** from a finite site that is merely **FILTERED** by the user's lower/upper limits.

The user can then choose a filter metric and lower/upper limits after inspecting the distribution. The resulting mask is applied consistently to summary statistics, maps, distributions and exports. Excluded sites remain diagnosable in point/profile views but are not used in smooth interpolation. Smooth-map interpolation is distance-limited to the neighborhood of valid measured sites to avoid painting an unmeasured quarter/coupon across the full nominal wafer.

### Shared filter architecture

QSS uses `PV2000.selection.createFilter()` and the shared filter UI contract used across the migrated site-level analyzers. This is an architecture migration only: the QSS filter metric, default lifetime filter, full-range initialization, inclusive lower/upper bounds, `1–99%`, Reset and Apply behavior are preserved.

The scientific/intrinsic lifetime support mask remains a separate concept. In the default mode, finite `τ <= 0` sentinel values are excluded by `intrinsicLifetimeMask()` before the shared user filter is evaluated. In **Raw / PV-2000 style**, finite non-positive values can remain intrinsically supported. The shared controller receives this mask as `intrinsicMask`; user range filtering cannot convert an intrinsically unavailable point into an available one. Conversely, a finite supported point outside the user range is **FILTERED**, not invalid or unavailable.

When Analysis controls change the lifetime-validity mode or recalculate derived Voc/SRV values, QSS rebuilds the shared controller using the new metric arrays and intrinsic support while preserving the currently selected filter metric. Matching the historical behavior, the numeric filter range resets to the full supported range of that metric after Apply analysis.

The same shared active mask is passed to Results summary, map, Distribution, acquisition profile and CSV validity flags. QSS deliberately retains the separate intrinsic support mask in map/profile/histogram rendering so tooltips and diagnostics can continue to distinguish **UNAVAILABLE** from **FILTERED**. Histogram `Filter-excluded count` semantics and the existing CSV column layout are unchanged by this migration.

The Distribution histogram follows the selected map metric (lifetime by default). The plotted Count is the number of valid available points only; filter-excluded points do not add to bar height, and intrinsically unavailable sentinel sites are outside the scientific histogram unless Raw / PV-2000 style is selected. Yellow lines mark the active lower/upper filter bounds. Swap axes changes only presentation and never changes validity.

## Smax

The PV-2000 manual defines:

```text
Smax = W / (2 * tau_eff)
```

with W in cm and lifetime in seconds. The original 305-row CSV reference validates the implementation point-by-point to floating-point precision. Nine additional paired exports in the expanded RoundWafer corpus again reproduce Smax from XML lifetime and thickness to export rounding. Raw non-positive sentinels remain raw in the PV-2000-compatible path; they are unavailable by default for scientific analysis.

## Implied Voc

The manual gives:

```text
G = 2.38e17 * I[suns] / W[cm] * OF
Delta_n = G * tau
Voc = (kT/q) * ln(Delta_n * (Nbase + Delta_n) / ni(T)^2)
```

The analyzer uses XML chuck temperature when available. The original 305-point export does not match the manual's revised example `ni=1.02e10 cm^-3 at 300 K`; it is matched closely by the existing PV-2000-compatible silicon-style `ni(T)` scaling anchored at `ni(300 K)=1.517791063e10 cm^-3` with Varshni band-gap temperature dependence. That **specific reference instance** remains within 0.1 mV.

The expanded nine-pair RoundWafer corpus reaches approximately **1.94 mV maximum absolute error**. The later seven-pair cross-geometry 100-case audit extends the observed range to approximately **4.918 mV**, driven by SquareRegion examples; HighDensity/RoundWafer examples remain below about 0.95 mV in that audit. Therefore <0.1 mV must not be presented as a family-wide guarantee, and Implied Voc remains an inferred compatibility quantity outside the tightly regressed reference instance.

### PV-2000 compatibility versus physical material model

The supplied QSS XML schema contains no trustworthy semiconductor-material field. In particular, material must **not** be inferred from result names, filenames or substrate identifiers.

The default Implied-Voc mode remains **PV-2000 compatible**, because that is the path to compare with vendor output even when a sample name happens to contain `Ge`. The analyzer also exposes explicit optional **Physical Si** and **Physical Ge** estimates. These use material-specific intrinsic-carrier models; the Ge path is anchored at approximately `ni(300 K)=2e13 cm^-3`. They are analyzer-side physical estimates, not claims that PV-2000 used those material models, and they are not vendor-regressed by this corpus.

## Surface recombination velocity (SRV)

The analyzer adds a separate lifetime-to-SRV post-processing path. It is user analysis, not a PV-2000 result replication.

For a planar sample:

```text
SRV = W/2 * (1/tau_eff - 1/tau_bulk)
```

For a textured / black surface with a separately known planar-reference SRV:

```text
SRV = W * (1/tau_eff - 1/tau_bulk) - SRV_planar_reference
```

SRV is exposed as a separate **Additional SRV analysis** section because it is Analyzer-only post-processing, not a PV-2000 recipe setting or vendor result. It is disabled by default. When enabled, the default geometry is **Planar**; **Textured / black** must be chosen explicitly. Bulk lifetime is optional (blank = infinity). The planar-reference SRV field is shown only for the Textured / black model, where that correction is actually used. An optional minimum lifetime threshold remains available. Non-positive lifetime is unavailable, and negative calculated SRV is clamped to zero rather than displayed as a physical negative recombination velocity.

## QSS control provenance

The sidebar deliberately separates PV-2000/XML metadata from Analyzer controls. PV-2000-origin settings such as QSS intensity, laser power, averaging/evaluation mode, wafer thickness, doping, optical factor, probe/bias and QSS range are displayed under Measurement / Full metadata and are read from XML.

The **Analysis controls** panel contains Analyzer interpretation choices: scientific lifetime handling versus raw vendor values, plus the Implied-Voc calculation model. `PV-2000 compatible` is the vendor-comparison path; `Physical Si` and `Physical Ge` are Analyzer-only estimates. The count of raw non-positive lifetime sentinels is dataset audit information and belongs under Current dataset rather than beside editable controls.

## Interpretation

Lifetime is the measured XML quantity. Smax is the vendor-compatible upper-bound calculation. SRV is optional user post-processing that can include bulk recombination and a planar-reference correction. Implied Voc can either follow the vendor-compatibility path or an explicitly selected physical Si/Ge estimate. The physical relevance of every derived quantity depends on the sample, material and assumptions selected by the user.
