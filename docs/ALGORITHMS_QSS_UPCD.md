# QSS-µPCD map algorithm notes

## XML and coordinate order

The reference result is `QssUpcdMeasurement`, with 305 `UpcdDataItem/Value` lifetime values, a 5 mm `MapPattern`, 100 mm round target, 300 µm thickness, optical factor 0.708, n-type doping 1e14 cm^-3 and QSS intensity 30 mSun.

For a round map, coordinates are generated in XML acquisition order: ascending Y, then ascending X within each row. The scheduled radius is `Diameter / 2 - EdgeExclusion` when `EdgeExclusion` is present, and only lattice points strictly inside that effective circle are retained (`x²+y² < Rmap²`). This matters for dense maps: a 100 mm target with 3 mm edge exclusion and 2 mm pitch schedules 1741 sites, whereas using the nominal 50 mm radius would incorrectly generate 1941. The supplied 305-point PV-2000 CSV reference still confirms its reconstructed X/Y coordinates exactly.

The UI labels this comparison as fixed algorithm-validation evidence for the 305-point reference. The current XML's point count, generated-coordinate count and valid-data count are reported separately. Importing another XML does not establish agreement with an export for that new measurement.

## Statistics and valid-point filtering

PV-2000 `Stdev` is sample standard deviation (`N-1`). The analyzer adds an independent **Valid-data filter** because the nominal map geometry can exceed the actual sample area (quarter wafer, coupon, broken/partial sample, etc.). The user chooses a filter metric and lower/upper limits after inspecting the distribution. One Boolean mask is then applied to every metric, summary statistic, map and export.

Excluded sites remain visible in point/profile views, but are not used in statistics or smooth interpolation. Smooth-map interpolation is also distance-limited to the neighborhood of valid measured sites to avoid painting an unmeasured quarter/coupon across the full nominal wafer.

The Distribution histogram follows the selected map metric (lifetime by default) and uses the same validity mask. Its valid bars use the wafer map's color function and valid-point minimum/maximum range at each metric bin midpoint; excluded counts remain gray. Swap axes turns its vertical bars into horizontal bars, with the metric on the vertical axis and count on the horizontal axis. The histogram CSV keeps metric bin limits and counts regardless of axis orientation.

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
