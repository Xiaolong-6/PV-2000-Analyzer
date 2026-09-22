# QSS-µPCD map algorithm notes

## XML and coordinate order

Two QSS map coordinate families currently have paired PV-2000 export evidence.

**QSS-MAP-001 — MapPattern + RoundWafer.** Coordinates are generated in XML acquisition order: ascending Y, then ascending X within each row. The scheduled radius is `Diameter / 2 - EdgeExclusion` when `EdgeExclusion` is present, and only lattice points strictly inside that effective circle are retained (`x²+y² < Rmap²`). A 100 mm target with 3 mm edge exclusion and 2 mm pitch therefore schedules 1741 sites rather than the 1941 sites produced by the nominal 50 mm radius. The supplied 305-point PV-2000 CSV reference confirms its reconstructed X/Y coordinates exactly.

**QSS-MAP-002 — SquareRegionPattern + SquareCell.** The raster is read from `Pattern/Region` plus `Pattern/Dimension`. The paired 35 × 30 reference uses Region (-40, -30) mm with Width 70 mm and Height 60 mm, giving 1050 sites. PV-2000 export order is X-fast row-major with both axes increasing: X runs -40 → +30 within each row, then Y advances -30 → +30. With no explicit `Pitch` node, effective spacing is derived as `Width/(Nx-1)` and `Height/(Ny-1)`. All 1050 reconstructed X/Y coordinates match the paired export to floating-point precision.

For SquareRegionPattern, the nominal SquareCell outline and explicit measured Region are distinct. The Region is used as the raster/smoothing support; the target remains the nominal sample boundary. Runtime remains XML-only: current point/coordinate counts are diagnostics, and importing another XML does not imply that a vendor export was compared at runtime.

## Statistics and valid-point filtering

PV-2000 `Stdev` is sample standard deviation (`N-1`). The analyzer adds an independent **Valid-data filter** because the nominal map geometry can exceed the actual sample area (quarter wafer, coupon, broken/partial sample, etc.). The user chooses a filter metric and lower/upper limits after inspecting the distribution. One Boolean mask is then applied to every metric, summary statistic, map and export.

Excluded sites remain visible in point/profile views, but are not used in statistics or smooth interpolation. Smooth-map interpolation is also distance-limited to the neighborhood of valid measured sites to avoid painting an unmeasured quarter/coupon across the full nominal wafer.

The Distribution histogram follows the selected map metric (lifetime by default) and uses the same validity mask. The plotted Count is the number of **valid** points only; excluded points do not add to bar height. Yellow lines mark the active lower/upper filter bounds. Swap axes changes only presentation, placing metric on the vertical axis and Count on the horizontal axis; it does not change the filter mask or counts. The histogram CSV keeps both valid and excluded diagnostic counts regardless of axis orientation.

In smooth mode, the area nearest to each excluded scheduled site is left uncolored, even if valid neighboring sites could otherwise interpolate across it. The excluded site's diagnostic marker remains visible.

## Smax

The PV-2000 manual defines:

```text
Smax = W / (2 * tau_eff)
```

with W in cm and lifetime in seconds. The supplied 305-row CSV export validates the implementation point-by-point; maximum absolute difference is ~5e-12 cm/s (floating-point noise).

## Implied Voc

The manual gives:

```text
G = 2.38e17 * I[suns] / W[cm] * OF
Delta_n = G * tau
Voc = (kT/q) * ln(Delta_n * (Nbase + Delta_n) / ni(T)^2)
```

The analyzer uses XML chuck temperature when available. The supplied PV-2000 export does not match the manual's revised example `ni=1.02e10 cm^-3 at 300 K`; it is matched closely by an older PV-2000-compatible silicon `ni(T)` scaling anchored at `ni(300 K)=1.517791063e10 cm^-3` with Varshni band-gap temperature dependence. On the reference export, maximum pointwise Voc error is <0.1 mV.

This compatibility model is validated only against the supplied map export. If a future PV-2000 version or temperature range disagrees, preserve the export as a regression reference and revise the compatibility model rather than hard-coding a single sample's numbers.

## Interpretation

The analyzer reproduces the calculation implied by the XML/settings. Smax is an upper-bound surface-recombination estimate when bulk recombination is neglected; Implied Voc is a derived semiconductor quantity. Their physical relevance still depends on the sample and recipe being appropriate for the PV-2000 model assumptions.
