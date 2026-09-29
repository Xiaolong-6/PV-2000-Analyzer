# Scientific Foundations

This page defines shared semiconductor and measurement concepts used across PV-2000 Analyzer.

## 1. Charge and carrier concentration

The elementary charge is approximately

```math
q = 1.602\times10^{-19}\ {\rm C}.
```

Carrier concentrations and doping densities are normally expressed in ${\rm cm^{-3}}$. Surface or sheet charge is commonly expressed as elementary charges per unit area, ${\rm q\,cm^{-2}}$, or as charge per area in ${\rm C\,cm^{-2}}$.

Electrostatic quantities such as contact potential difference, surface band bending, flat-band potential and implied open-circuit voltage are expressed in volts.

## 2. Thermal voltage

For temperature $T$ in kelvin,

```math
V_T=\frac{kT}{q},
```

where $k$ is Boltzmann's constant.

At 300 K, $V_T$ is about 25.9 mV.

The intrinsic carrier concentration $n_i$ depends on the chosen material model and temperature model. Compatibility profiles may use different numerical $n_i$ conventions, so family pages state the model together with each equation that depends on it.

## 3. Kelvin-probe contact potential difference

Kelvin-probe measurements provide a contact-potential-difference signal $V_{\rm CPD}$. Dark and illuminated measurements can be combined to estimate a surface-potential change.

A common reference relation is

```math
V_{\rm sb}
=
F_{\rm sb}
\left(
V_{\rm CPD,dark}-V_{\rm CPD,light}
\right),
```

where $F_{\rm sb}$ is a calibration or correction factor.

Sign conventions depend on doping type and measurement family.

## 4. Semiconductor surface space charge

For a uniformly doped semiconductor under a one-dimensional Poisson-Boltzmann model,

```math
Q_{\rm sc}
=
\frac{\sqrt{2\varepsilon_s kTN\,F(V_{\rm sb})}}{q},
```

when the dimensionless term $F(V_{\rm sb})$ is positive.

Here

- $\varepsilon_s=\varepsilon_0\varepsilon_r$ is the semiconductor permittivity;
- $N$ is the majority-carrier doping density;
- $n_i$ is intrinsic carrier concentration;
- $\beta=q/(kT)$.

For p-type material, a useful form is

```math
F_p=
e^{-\beta V_{\rm sb}}
+\beta V_{\rm sb}
-1
+
\frac{n_i^2}{N^2}
\left(
e^{\beta V_{\rm sb}}
-\beta V_{\rm sb}
-1
\right).
```

For n-type material,

```math
F_n=
e^{\beta V_{\rm sb}}
-\beta V_{\rm sb}
-1
+
\frac{n_i^2}{N^2}
\left(
e^{-\beta V_{\rm sb}}
+\beta V_{\rm sb}
-1
\right).
```

This relation is central to DIT analysis.

## 5. Effective lifetime

Effective carrier lifetime is denoted $\tau_{\rm eff}$ and is usually reported in microseconds.

A lifetime value can originate from several places:

- controller-side transient evaluation;
- a value stored directly in XML;
- an average of repeated stored values;
- a viewer-side scientific calculation.

The provenance matters because a stored controller result should remain distinguishable from a viewer-side re-evaluation.

## 6. Surface recombination upper bound

For a wafer of thickness $W$ with a simple symmetric two-surface approximation,

```math
S_{\rm max}=\frac{W}{2\tau_{\rm eff}}.
```

With $W$ in micrometres and $\tau$ in microseconds,

```math
S_{\rm max}[{\rm cm/s}]
=
50\frac{W_{\mu{\rm m}}}{\tau_{\mu{\rm s}}}.
```

## 7. Excess carrier density

Under a steady-state generation approximation,

```math
\Delta n=G\tau_{\rm eff}.
```

The generation rate depends on illumination, optical calibration and wafer thickness.

One reference compatibility form used in current QSS-family work is

```math
\Delta n
=
2.38\times10^{12}
\frac{I\,f_{\rm opt}\,\tau_{\mu s}}{W_{\mu m}},
```

where $I$ is intensity in mSun, $f_{\rm opt}$ is the optical factor, $\tau_{\mu s}$ is lifetime in microseconds and $W_{\mu m}$ is wafer thickness in micrometres.

## 8. Implied open-circuit voltage

For p-type material with acceptor density $N_A$,

```math
V_{\rm oc,impl}
=
V_T
\ln\left[
1+
\frac{\Delta n(N_A+\Delta n)}{n_i^2}
\right].
```

This is a physical carrier-product expression. The validated QSS map compatibility calculation omits the additive 1 inside the logarithm. The numerical result also depends on temperature, doping and the $n_i(T)$ convention; the measurement-family page states the applicable profile.

## 9. Emitter saturation current density

A Kane-Swanson-style lifetime relation can be written

```math
\frac{1}{\tau}=a+b\Delta n.
```

The slope can be converted to emitter saturation current density:

```math
J_0
=
\frac{bqWn_i^2}{2}.
```

Reported units may be A/cm², mA/cm² or fA/cm² depending on the family.

Basore-style methods use a different transformed fit, often involving generation intensity and $1/\tau^2$. The family page defines the exact transformation.

## 10. Capacitance and equivalent oxide thickness

For dielectric areal capacitance $C_{\rm ox}$,

```math
{\rm EOT}
=
\frac{\varepsilon_{\rm SiO_2}}{C_{\rm ox}}.
```

Contactless corona methods can obtain an effective capacitance from the slope of potential versus deposited charge. The CV/CET page describes the reference relation used by the project.

## 11. Diffusion length and lifetime

Minority-carrier diffusion length obeys

```math
L=\sqrt{D\tau},
```

so that

```math
\tau=\frac{L^2}{D}.
```

Surface-photovoltage methods estimate $L$ from wavelength-dependent generation depth and response. Optical corrections and finite-wafer assumptions are measurement-family specific.

## 12. Optical generation depth and quantum efficiency

For an absorption coefficient $\alpha(\lambda,T)$, a characteristic optical generation depth is

```math
Z(\lambda,T)\sim\frac{1}{\alpha(\lambda,T)}.
```

Shorter and longer wavelengths can therefore weight different depths in a semiconductor. SPV and multi-wavelength LBIC use this depth dependence in different physical models.

External quantum efficiency compares collected carriers with incident photons,

```math
\mathrm{EQE}=\frac{I/q}{\Phi},
```

where $I$ is photocurrent and $\Phi$ is incident photon flux. Under a simple front-reflection correction,

```math
\mathrm{IQE}=\frac{\mathrm{EQE}}{1-R}.
```

Actual compatibility calculations can use profile-specific units, clipping and raw-versus-displayed reflectivity rules; the LBIC page states those details.

## 13. Frequency response and first-order lifetime

A simple first-order low-pass response has magnitude

```math
V(f)
=
\frac{V_0}
{\sqrt{1+(2\pi f\tau)^2}}.
```

A frequency-scan lifetime can therefore be fitted from the roll-off of response amplitude with frequency.

## 14. Corona-charge relaxation and leakage

After a corona-charge step, a dielectric/semiconductor surface potential can relax because charge redistributes, leaks or exchanges with traps/interface states. In an idealized areal-capacitor model,

```math
J_{\rm leak}=-C_A\frac{dV}{dt},
```

where $C_A$ is capacitance per unit area. This relation gives physical context for derivative-based leakage diagnostics.

A Kelvin-probe CPD transient is not automatically identical to the dielectric voltage in that ideal model. Surface band bending, trapping and instrument conventions can also contribute. The current Leakage analyzer therefore reports its validated voltage-domain VSASS/LI compatibility quantities separately from any current-density interpretation.

## 15. Validity, blanking and undefined values

Scientific validity rules are part of a result definition.

Typical causes of an undefined result include:

- insufficient fit points;
- a zero or near-zero denominator;
- a requested target outside measured coverage;
- an inactive channel;
- a missing raw array;
- a profile-specific sentinel;
- a derived result outside its accepted range.

A numerical zero should remain distinguishable from an unavailable result.

## 16. Result provenance

Each project quantity should be classifiable as one of the following.

**Raw or stored measurement** — Directly represented in XML.

**Controller/device result** — Evaluated before the XML reaches the viewer.

**Corrected measurement** — A raw quantity after offset, calibration or sign correction.

**Derived physical quantity** — Calculated from measured quantities using an explicit scientific model.

**Compatibility result** — A profile-specific calculation that reproduces an established reference-output family.

**Analyzer-only optional result** — Additional scientific analysis provided by this project without claiming membership in the validated vendor result set.
