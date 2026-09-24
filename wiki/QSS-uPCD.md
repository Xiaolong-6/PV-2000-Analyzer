# QSS-uPCD

QSS-uPCD combines an effective-lifetime measurement with illumination, wafer thickness and doping information to derive recombination-related quantities.

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

This is a symmetric-surface upper-bound interpretation.

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

Dual QSS can add steady-state correction and optional J0 methods to an injection scan. The viewer validates the stored raw injection/transient path and now has a narrow paired numeric result profile (`QSS-INJ-RESULT-001`) in which vendor `teff.d (1 Sun)` is reproduced exactly from XML `Values` for the observed exact-1000 and below-target endpoint cases. The corrected teff.SS / teff.SS Max, implied Voc and J0 transformations remain outside runtime until pointwise parity is established.

Its scientific elements include:

- QDC-based transient-quality gating;
- reconstruction of steady-state effective lifetime;
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

## 10. Scientific interpretation

The three primary vendor-comparison simple-map quantities answer different questions:

**$\tau_{\rm eff}$** — how long excess carriers persist under the measured condition.

**$S_{\rm max}$** — an upper-bound surface-recombination interpretation if the measured effective lifetime were limited by symmetric surfaces.

**Implied $V_{\rm oc}$** — the quasi-Fermi-level splitting implied by doping, injection and temperature.

They share the same lifetime input while depending on different physical assumptions. Optional Analyzer SRV is a separate post-processing estimate and does not replace Smax.

## 11. Validation status

Current QSS map profiles have paired-output validation for lifetime, geometry, Smax and profile-specific implied-Voc behavior.

Controller-side transient-evaluation formulas are outside the viewer's current scientific reconstruction boundary.
