# QSS-uPCD

QSS-uPCD combines an effective-lifetime measurement with illumination, wafer thickness and doping information to derive recombination-related quantities.

## 1. Lifetime provenance

On the simple QSS-uPCD map path, lifetime is already stored in the measurement data.

For a single stored value,

\[
\tau_{\rm eff}=\tau_{\rm stored}.
\]

For repeated stored values, the map result uses their arithmetic mean.

The exact SL/64 through SL/1024, 1/e and 1/e² transient-evaluation algorithms belong to the external uPCD controller path. The viewer uses the lifetime value present in the measurement data.

## 2. Effective lifetime validity

A simple reference validity interval is

\[
0<\tau_{\rm eff}\le 10000\ \mu{\rm s}.
\]

Values outside the accepted interval are treated as unavailable on that path.

## 3. Maximum surface recombination velocity

For wafer thickness \(W\) and effective lifetime \(\tau_{\rm eff}\),

\[
S_{\rm max}
=
\frac{W}{2\tau_{\rm eff}}.
\]

With \(W\) in micrometres and \(\tau\) in microseconds,

\[
S_{\rm max}[{\rm cm/s}]
=
50\frac{W_{\mu m}}{\tau_{\mu s}}.
\]

This is a symmetric-surface upper-bound interpretation.

## 4. Illumination to excess carrier density

The current reference calculation uses

\[
\Delta n
=
2.38\times10^{12}
\frac{I\,f_{\rm opt}\,\tau_{\mu s}}
{W_{\mu m}},
\]

where

- \(I\) is the QSS intensity in the profile's stored convention;
- \(f_{\rm opt}\) is the optical factor;
- \(W_{\mu m}\) is wafer thickness;
- \(\tau_{\mu s}\) is effective lifetime.

This has the steady-state structure

\[
\Delta n=G\tau.
\]

## 5. Implied Voc

For p-type material with doping \(N_A\),

\[
V_{\rm oc,impl}
=
\frac{kT}{q}
\ln\left[
1+
\frac{\Delta n(N_A+\Delta n)}{n_i^2}
\right].
\]

Temperature and \(n_i\) are compatibility-sensitive inputs. Different historical result families can require different compatibility constants even when the physical equation has the same form.

## 6. Intensity-scan J0

An injection scan can estimate emitter \(J_0\) from the high-injection falloff of lifetime.

Accepted points are transformed as

\[
x=\Delta n,
\qquad
y=\frac{1}{\tau}.
\]

A linear fit

\[
\frac{1}{\tau}
=
a+b\Delta n
\]

gives slope \(b\).

The emitter saturation current density is then

\[
J_0
=
\frac{bqWn_i^2}{2}.
\]

The intensity-scan reference path reports this result in mA/cm² after the corresponding scale conversion.

Point selection matters. The fit is performed on a defined post-maximum-lifetime portion of the scan, with a minimum lifetime-drop criterion before the fit is accepted.

## 7. Dual-QSS relationship

Dual QSS adds steady-state correction and optional J0 methods to an injection scan.

Its scientific elements include:

- QDC-based transient-quality gating;
- reconstruction of steady-state effective lifetime;
- excess-carrier-density recalculation;
- optional Auger correction;
- Kane-Swanson-style J0;
- Basore-style J0.

These operations belong to a separate measurement family because the lifetime correction and J0 pathways differ from the simple map.

## 8. Geometry and maps

Spatial QSS measurements combine a lifetime value with a target/pattern definition.

The project supports several coordinate families, including:

- MapPattern;
- SquareRegionPattern;
- HighDensityPattern;
- RoundWafer;
- SquareCell.

Geometry validation is tracked separately from lifetime/Smax/Voc validation because coordinate reconstruction is its own input-to-output path.

## 9. Scientific interpretation

The three primary simple-map quantities answer different questions:

**\(\tau_{\rm eff}\)** — how long excess carriers persist under the measured condition.

**\(S_{\rm max}\)** — an upper-bound surface-recombination interpretation if the measured effective lifetime were limited by symmetric surfaces.

**Implied \(V_{\rm oc}\)** — the quasi-Fermi-level splitting implied by doping, injection and temperature.

They share the same lifetime input while depending on different physical assumptions.

## 10. Validation status

Current QSS map profiles have paired-output validation for lifetime, geometry, Smax and profile-specific implied-Voc behavior.

Controller-side transient-evaluation formulas are outside the viewer's current scientific reconstruction boundary.
