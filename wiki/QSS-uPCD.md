# QSS-uPCD

QSS-uPCD combines an effective-lifetime measurement with illumination, wafer thickness and doping information to derive recombination-related quantities.

## In the analyzer

The `QssUpcdMeasurement` analyzer provides:

- effective-lifetime maps and acquisition/profile views;
- Smax and profile-specific PV-2000-compatible implied Voc;
- optional Analyzer-side physical Si/Ge implied-Voc estimates;
- optional Analyzer SRV post-processing, disabled by default;
- map, Distribution, filtering and CSV export;
- explicit handling of non-positive raw lifetime sentinels versus scientifically available values.

The **Valid-data filter** is user analysis state applied after intrinsic lifetime support. It affects summaries and population plots without changing the stored XML lifetime or making an intrinsically unavailable site valid.

## 1. Lifetime provenance

On the simple QSS-uPCD map path, lifetime is already stored in the measurement data.

For a single stored value,

```math
\tau_{\rm eff}=\tau_{\rm stored}.
```

For repeated stored values, the map result uses their arithmetic mean.

The exact SL/64 through SL/1024, 1/e and 1/e² transient-evaluation algorithms belong to the external uPCD controller path. The viewer uses the lifetime value present in the measurement data.

## 2. Effective lifetime validity

A simple reference validity interval is

```math
0<\tau_{\rm eff}\le 10000\ \mu{\rm s}.
```

Values outside the accepted interval are treated as unavailable on that path.

PV-2000 XML can store unavailable controller lifetime as `-1 µs`. Raw XML `-1` is preserved for provenance. Paired final-result exports show a different quantity-level representation at those same sites: **lifetime = `Ud.`, Smax = 0, Implied Voc = 0**. The default scientific population excludes non-positive lifetime before the user Valid-data filter is applied; **Raw XML/controller values** is an inspection mode, not a claim that `-1` is the vendor final-result lifetime.

## 3. Maximum surface recombination velocity

For wafer thickness $W$ and effective lifetime $\tau_{\rm eff}$,

```math
S_{\rm max}
=
\frac{W}{2\tau_{\rm eff}}.
```

With $W$ in micrometres and $\tau$ in microseconds,

```math
S_{\rm max}[{\rm cm/s}]
=
50\frac{W_{\mu m}}{\tau_{\mu s}}.
```

This is a symmetric-surface upper-bound interpretation for positive lifetime. For the paired controller sentinel `τ=-1 µs`, PV-2000 final-result exports use the placeholder **Smax = 0** rather than applying the formula to obtain a negative value.

## 4. Optional Analyzer SRV

The analyzer also provides an optional lifetime-to-surface-recombination-velocity post-processing path. This is **Analyzer-side analysis**, not a PV-2000 stored result or recipe parameter, and it is disabled by default.

For a planar sample,

```math
S
=
\frac{W}{2}
\left(
\frac{1}{\tau_{\rm eff}}
-
\frac{1}{\tau_{\rm bulk}}
\right).
```

If bulk lifetime is left blank, the analysis uses the infinite-bulk-lifetime limit.

For the explicit **Textured / black** model with a separately known planar-reference SRV,

```math
S_{\rm textured}
=
W
\left(
\frac{1}{\tau_{\rm eff}}
-
\frac{1}{\tau_{\rm bulk}}
\right)
-
S_{\rm planar,ref}.
```

The planar-reference term is only applicable to that textured model. Non-positive lifetime is unavailable for SRV analysis, and negative calculated SRV is clipped to zero. These SRV estimates remain separate from vendor-compatible $S_{\max}$.

## 5. Illumination to excess carrier density

The current reference calculation uses

```math
\Delta n
=
2.38\times10^{12}
\frac{I\,f_{\rm opt}\,\tau_{\mu s}}
{W_{\mu m}},
```

where

- $I$ is the QSS intensity in mSun as stored in the XML (1000 mSun = 1 sun);
- $f_{\rm opt}$ is the optical factor;
- $W_{\mu m}$ is wafer thickness;
- $\tau_{\mu s}$ is effective lifetime.

This has the steady-state structure

```math
\Delta n=G\tau.
```

## 6. Implied Voc

For p-type material with doping $N_A$, a physical carrier-product expression is

```math
V_{\rm oc,impl}
=
\frac{kT}{q}
\ln\left[
1+
\frac{\Delta n(N_A+\Delta n)}{n_i^2}
\right].
```

The currently validated QSS map compatibility path evaluates the same expression **without** the additive 1:

```math
V_{\rm oc,compat}
=
\frac{kT}{q}
\ln\left[
\frac{\Delta n(N_A+\Delta n)}{n_i^2}
\right].
```

This distinction, temperature and the $n_i(T)$ convention are part of the reference profile; the physical expression above must not be substituted for the vendor-regressed compatibility calculation.

## 7. Intensity-scan J0

An injection scan can estimate emitter $J_0$ from the high-injection falloff of lifetime.

Accepted points are transformed as

```math
x=\Delta n,
\qquad
y=\frac{1}{\tau}.
```

A linear fit

```math
\frac{1}{\tau}
=
a+b\Delta n
```

gives slope $b$.

The emitter saturation current density is then

```math
J_0
=
\frac{bqWn_i^2}{2}.
```

The intensity-scan reference path reports this result in mA/cm² after the corresponding scale conversion.

Point selection matters. The fit is performed on a defined post-maximum-lifetime portion of the scan, with a minimum lifetime-drop criterion before the fit is accepted.

## 8. Dual-QSS relationship

Dual QSS can add steady-state correction and optional J0 methods to an injection scan. The viewer validates the stored raw injection/transient path and has a two-pair numeric final-result profile (`QSS-INJ-RESULT-001`) for the non-Auger Back/Back path. Within that profile, XML-only runtime reconstruction reproduces vendor QDC, teff.d, teff.SS, teff.SS Max, Δn, Smax, implied Voc, Basore J0 and K-S J0, including the observed undefined states. The steady-state path uses vendor-compatible transient smoothing followed by log-log Akima interpolation and integration.

Its scientific elements include:

- QDC-based transient-quality gating;
- reconstruction of steady-state effective lifetime; managed-code inspection shows the reference build uses a log-log **Akima** spline (despite the wrapper class being named `CubicSplineInterpolator`), followed by integration and linear interpolation;
- excess-carrier-density recalculation;
- optional Auger correction;
- Kane-Swanson-style J0;
- Basore-style J0.

These operations belong to a separate measurement family because the lifetime correction and J0 pathways differ from the simple map.

## 9. Geometry and maps

Spatial QSS measurements combine a lifetime value with a target/pattern definition.

The project supports several coordinate families, including:

- MapPattern;
- SquareRegionPattern;
- HighDensityPattern;
- RoundWafer;
- SquareCell.

Geometry validation is tracked separately from lifetime/Smax/Voc validation because coordinate reconstruction is its own input-to-output path.

Paired QSS evidence now covers **MapPattern + RoundWafer**, **SquareRegionPattern + SquareCell**, and **HighDensityPattern + RoundWafer**. In the 100-case corpus, the two nonempty HighDensity/RoundWafer cases contain 145 and 276 sites and reproduce vendor X/Y to about **7.03×10⁻¹⁴ mm**. Other target/pattern combinations retain their own geometry evidence boundary.

## 10. Scientific interpretation

The three primary vendor-comparison simple-map quantities answer different questions:

**$\tau_{\rm eff}$** — how long excess carriers persist under the measured condition.

**$S_{\rm max}$** — an upper-bound surface-recombination interpretation if the measured effective lifetime were limited by symmetric surfaces.

**Implied $V_{\rm oc}$** — the quasi-Fermi-level splitting implied by doping, injection and temperature.

They share the same lifetime input while depending on different physical assumptions. Optional Analyzer SRV is a separate post-processing estimate and does not replace Smax.

## 11. Validation status

Current QSS evidence separates calculation, geometry and quantity availability. Seven nonempty 100-case XML/vendor-CSV pairs span SquareRegion, Map and HighDensity geometries: positive lifetime agrees to **5.68×10⁻¹⁴ µs**, Smax to **5.00×10⁻¹² cm/s**, and all **39** non-positive controller sentinels reproduce the vendor `Ud./0/0` lifetime/Smax/Voc result convention.

Implied Voc is deliberately narrower. The original reference remains within about 0.1 mV, while the later cross-geometry audit reaches about **4.918 mV** maximum absolute difference. It therefore remains a PV-2000-compatible/inferred quantity outside the tightly regressed instance rather than being promoted together with lifetime/Smax.

Controller-side transient-evaluation formulas are outside the viewer's current scientific reconstruction boundary.
