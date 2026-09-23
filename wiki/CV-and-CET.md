# CV and CET

The CV/CET family uses corona charge and Kelvin-probe measurements to control a surface-potential sweep and, in the CET path, estimate an effective capacitance and equivalent oxide thickness.

## 1. CV acquisition concept

The CV acquisition structure stores an initial dark/light state together with pre-process, process and post-process measurement stages.

A process stage can contain repeated dark and illuminated CPD readings while corona charge is adjusted toward a target range.

This acquisition history is scientifically useful even when no capacitance is calculated directly from the base CV record.

## 2. Barrier feedback

A surface-potential barrier quantity can be expressed as

\[
B
=
F_{\rm sb}
\left(
\overline{V_{\rm CPD,dark}}
-
\overline{V_{\rm CPD,light}}
\right).
\]

A target-range controller changes the sign of the next corona dose according to whether the measured barrier lies below or above the desired interval.

When the required dose direction reverses, the dose magnitude can be reduced. This creates a step-halving feedback process for reaching the target surface-potential region.

## 3. CET derived path

CET adds a contactless capacitance/EOT calculation to the same corona/Kelvin-probe acquisition framework.

For process index \(i\),

\[
Q_c(i)
=
i\,\Delta Q_c,
\]

where \(\Delta Q_c\) is the configured corona-charge step.

The illuminated CPD value is

\[
V_{\rm light}(i)
=
\overline{V_{\rm CPD,light}(i)}
-
V_{\rm offset}.
\]

A linear fit is performed:

\[
V_{\rm light}
=
a+mQ_c.
\]

The fit provides slope \(m\) and coefficient of determination \(R^2\).

## 4. Effective capacitance

The reference arithmetic can be represented as

\[
C_d^{*}
=
\frac{q\,10^6}{m},
\]

followed by the reported capacitance scaling

\[
C_d[{\rm nF/cm^2}]
=
1000\,C_d^{*}.
\]

This is a compatibility relation tied to the historical charge-axis and unit conventions.

## 5. Equivalent oxide thickness

The EOT output is calculated from the fitted capacitance through

\[
{\rm EOT}[\AA]
=
\frac{34.5}{C_d^{*}}.
\]

The constant combines the SiO₂ permittivity and the unit conventions used by the reference calculation.

The general physical relation remains

\[
{\rm EOT}
=
\frac{\varepsilon_{\rm SiO_2}}{C_{\rm ox}}.
\]

## 6. Fit quality

The third CET output is \(R^2\), the coefficient of determination for the linear CPD-versus-charge fit.

A high \(R^2\) indicates that the selected process interval behaves approximately linearly under this effective-capacitance model.

## 7. Units and interpretation

CET reports:

- EOT in ångström;
- \(C_d\) in nF/cm²;
- \(R^2\) as dimensionless fit quality.

The capacitance should be interpreted as an effective contactless corona/Kelvin-probe result for the selected process path.

## 8. Template dependence

Historical template generations can use different:

- CPD target ranges;
- charge steps;
- number of readings;
- Vsb correction factors.

These settings change the acquisition trajectory. Scientific pages should state the active profile when a template-specific value matters.

## 9. Validation status

The managed calculation path and unit arithmetic are documented. A real CET XML with matching vendor EOT/Cd/R² output is still required for paired-output validation of this family.

The base CV acquisition semantics are documented independently from CET's derived-result path.
