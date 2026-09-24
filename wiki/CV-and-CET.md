# CV and CET

> **Analyzer support:** `CETMeasurement` has a dedicated CET / EOT analyzer. The base CV family is documented here for acquisition/scientific context, but there is currently **no dedicated `CVMeasurement` analyzer**. A CV-shaped XML may still be inspectable through the Generic XML Inspector.

The CV/CET family uses corona charge and Kelvin-probe measurements to control a surface-potential sweep and, in the CET path, estimate an effective capacitance and equivalent oxide thickness.

## 1. CV acquisition concept

The CV acquisition structure stores an initial dark/light state together with pre-process, process and post-process measurement stages.

A process stage can contain repeated dark and illuminated CPD readings while corona charge is adjusted toward a target range.

This acquisition history is scientifically useful even when no capacitance is calculated directly from the base CV record.

## 2. Barrier feedback

A surface-potential barrier quantity can be expressed as

```math
B
=
F_{\rm sb}
\left(
\overline{V_{\rm CPD,dark}}
-
\overline{V_{\rm CPD,light}}
\right).
```

A target-range controller changes the sign of the next corona dose according to whether the measured barrier lies below or above the desired interval.

When the required dose direction reverses, the dose magnitude can be reduced. This creates a step-halving feedback process for reaching the target surface-potential region.

## 3. CET derived path

CET adds a contactless capacitance/EOT calculation to the same corona/Kelvin-probe acquisition framework.

For process index $i$,

```math
Q_c(i)
=
i\,\Delta Q_c,
```

where $\Delta Q_c$ is the configured corona-charge step.

The illuminated CPD value is

```math
V_{\rm light}(i)
=
\overline{V_{\rm CPD,light}(i)}
-
V_{\rm offset}.
```

A linear fit is performed:

```math
V_{\rm light}
=
a+mQ_c.
```

The fit provides slope $m$ and coefficient of determination $R^2$.

## 4. Effective capacitance

The reference arithmetic can be represented as

```math
C_d^{*}
=
\frac{q\,10^6}{m},
```

followed by the reported capacitance scaling

```math
C_d[{\rm nF/cm^2}]
=
1000\,C_d^{*}.
```

For the paired CET compatibility profile, the historical charge constant is

```math
q = 1.602\times 10^{-19}\;{\rm C}.
```

This is a compatibility relation tied to the historical charge-axis and unit conventions. A different modern constant precision is not substituted when reproducing that reference profile.

## 5. Equivalent oxide thickness

The EOT output is calculated from the fitted capacitance through

```math
{\rm EOT}[\AA]
=
\frac{34.5}{C_d^{*}}.
```

The constant combines the SiO₂ permittivity and the unit conventions used by the reference calculation.

The general physical relation remains

```math
{\rm EOT}
=
\frac{\varepsilon_{\rm SiO_2}}{C_{\rm ox}}.
```

## 6. Fit quality

The third CET output is $R^2$, the coefficient of determination for the linear CPD-versus-charge fit.

A high $R^2$ indicates that the selected process interval behaves approximately linearly under this effective-capacitance model.

## 7. Units and interpretation

CET reports:

- EOT in ångström;
- $C_d$ in nF/cm²;
- $R^2$ as dimensionless fit quality.

The capacitance should be interpreted as an effective contactless corona/Kelvin-probe result for the selected process path.

## 8. Undefined-fit behavior

A linear fit requires at least two usable process points. In the validated CET reference, one site contains only one usable process point. The corresponding vendor result is undefined for EOT and Cd while R² is reported as 0.

The project therefore treats availability per quantity: EOT and Cd can be unavailable at a site where the compatibility R² field is still 0.

## 9. Fixed-point geometry

Standard fixed-point pattern coefficients are target-relative coordinates.

For the validated `NinePointPattern + SquareCell` profile,

```math
x_{\rm mm}=c_x\left(\frac{W}{2}-E\right),
\qquad
y_{\rm mm}=c_y\left(\frac{H}{2}-E\right),
```

where $c_x,c_y$ are the XML coefficients, $W,H$ are target dimensions and $E$ is EdgeExclusion.

For the paired 156 × 156 mm target with 4 mm edge exclusion, the coefficient magnitude 0.632455532... becomes 46.801709370492 mm. This establishes that the coefficient itself is not a millimetre coordinate.

## 10. Template dependence

Historical template generations can use different:

- CPD target ranges;
- charge steps;
- number of readings;
- Vsb correction factors.

These settings change the acquisition trajectory. Scientific pages should state the active profile when a template-specific value matters.

## 11. Validation status

One matching 9-site PV-2000 XML/numeric-export pair forms the historical `CET-9PT-SQUARE-001` evidence bundle. Runtime validation is split between `CET-CALC-001` for EOT/Cd/R² and `GEOM-NINEPOINT-SQUARE-001` for the paired coordinate path. The pair validates:

- target-relative NinePointPattern coordinates on a SquareCell;
- EOT;
- Cd;
- R²;
- summary statistics;
- the undefined EOT/Cd + R² = 0 site behavior.

The paired numerical differences are at floating-point precision. Other observed CET pattern/target geometries remain inferred until matching vendor coordinate/result evidence extends the profile envelope.

The base CV acquisition semantics are documented independently from CET's derived-result path.
