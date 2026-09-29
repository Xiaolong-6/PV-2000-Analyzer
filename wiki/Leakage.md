# Leakage

`LeakageMeasurement` follows the relaxation of a corona-charged surface with Kelvin-probe contact-potential measurements. The current analyzer reproduces the historical PV-2000 voltage-domain outputs **VSASS+**, **VSASS-** and **LI**.

## Physical measurement principle

A corona step changes charge associated with the dielectric/semiconductor surface system. After charging, the measured contact potential can relax as charge redistributes, leaks through the dielectric stack, exchanges with interface states, or responds through other electrical relaxation mechanisms.

The instrument records a Kelvin-probe voltage transient rather than directly measuring leakage current.

In an idealized areal-capacitor picture,

```math
J_{\mathrm{leak}}=-C_A\frac{dV}{dt}.
```

This explains why a relaxation slope can carry leakage information. Real CPD can also contain semiconductor surface-potential and trapping contributions, so this equation is physical context rather than the definition of the current validated outputs.

## What is measured

For each enabled polarity the XML stores a sequence of Kelvin-probe voltage readings separated by a measurement interval. The result path also uses the stored Vcpd offset and polarity-specific delay. The raw transient remains available for selected-point inspection.

## Offset-corrected transient

Let $V_i^{\mathrm{raw}}$ be a stored sample and $\overline{V_{\mathrm{off}}}$ the mean stored offset:

```math
V_i^{\mathrm{corr}}=V_i^{\mathrm{raw}}-\overline{V_{\mathrm{off}}}.
```

With interval $\Delta t$,

```math
t_i=i\Delta t.
```

The compatibility path selects the local samples around 1.2 s and constructs a natural cubic spline $S(t)$.

## VSASS extraction

For stored polarity delay $t_d$,

```math
t_{\mathrm{eval}}=1.2\;\mathrm{s}-t_d,
```

and

```math
VSASS=S(t_{\mathrm{eval}}).
```

The historical routine can evaluate outside the selected local knot interval by continuing the end spline interval; the compatibility implementation preserves that behavior.

Positive and negative acquisitions are processed independently.

## Leakage indicator

When both required polarity results are available,

```math
LI=VSASS_+-VSASS_-.
```

LI therefore has units of volts in the current analyzer.

**LI is not a leakage-current density.** Converting a transient slope to current density additionally requires a validated capacitance/electrostatic model and a defined transient region.

## Derivative diagnostic

Historical PV-2000 processing also contains a dielectric-capacitance-scaled derivative diagnostic based on smoothing/interpolation of the transient. Conceptually it is the branch most directly connected to

```math
J\propto-C_A\frac{dV}{dt}.
```

That recovered diagnostic is scientific context, but it is not currently exposed as a separately validated primary Analyzer result.

## Outputs and interpretation

- **VSASS+ [V]** — positive-polarity delayed spline result.
- **VSASS- [V]** — negative-polarity result when measured.
- **LI [V]** — difference between the two polarity results.
- **Raw leakage readings** — stored transient data for inspection.

A changing CPD transient demonstrates electrical/surface relaxation. Assigning all of that change to bulk dielectric leakage requires additional assumptions because trapping, surface states and electrostatic redistribution can also affect the signal.

## Validation status

`LEAKAGE-CALC-VSASS-001` is validated against two real XML + numeric PV-2000 CSV pairs: one both-polarity case and one positive-only case. The pairs establish the natural-cubic VSASS extraction, LI difference and unavailable-branch behavior.

Current paired evidence is one-point data. Multi-point geometry and materially different acquisition/result builders require matching vendor output before the validation envelope expands.

## Related documentation

- [Scientific Foundations](Scientific-Foundations)
- [Measurement Families](Measurement-Families)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
- repository `docs/ALGORITHMS_LEAKAGE.md`
- repository `docs/REFERENCE_PROFILES.md`
- repository `docs/VALIDATION.md`
