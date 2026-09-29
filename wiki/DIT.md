# DIT

Interface-state-density analysis combines corona charge, Kelvin-probe surface potential and semiconductor space-charge physics.

## In the analyzer

The `DITMeasurement` analyzer provides site-level DIT/COCOS analysis with:

- Vcpd–Qc, Vsb–Qc and Dit–Vsb inspection;
- discrete **Minimum Dit (PV2000-style)**;
- optional **Midgap Dit (PCHIP)**;
- Qsc, Qtot, Cox/EOT and flat-band-related results;
- target-aware site/measurement-position context;
- a shared Valid-data filter for population statistics and map display.

The Valid-data filter is downstream of the scientific calculation. Filtering can change which sites contribute to summary/map population views, but it does not recalculate Minimum Dit, Midgap Dit, Qsc, Qtot or the selected-site curves.

## 1. Physical picture

A controlled corona charge changes the electrostatic boundary condition at the semiconductor surface. Dark and illuminated Kelvin-probe measurements provide the corresponding surface-potential response.

Important quantities are:

- $Q_c$: applied corona charge density;
- $V_{\rm CPD,dark}$: dark contact potential difference;
- $V_{\rm CPD,light}$: illuminated contact potential difference;
- $V_{\rm sb}$: surface band bending;
- $Q_{\rm sc}$: semiconductor space charge;
- $D_{it}$: interface-state density;
- $V_{\rm fb}$: flat-band potential;
- $Q_{it}$: integrated interface-related charge over a selected barrier interval.

## 2. Surface band bending

The reference relation is

```math
V_{\rm sb}
=
F_{\rm sb}
\left(
V_{\rm CPD,dark}
-
V_{\rm CPD,light}
\right),
```

where $F_{\rm sb}$ is the Vsb correction factor.

The sign convention is tied to doping type and the chosen compatibility profile.

## 3. Semiconductor space charge

Define

```math
\beta=\frac{q}{kT},
\qquad
\varepsilon_s=\varepsilon_0\varepsilon_r,
```

and let $N$ denote the majority-carrier doping density.

For p-type material,

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

The semiconductor space-charge magnitude is

```math
Q_{\rm sc}
=
\frac{\sqrt{2\varepsilon_s kTNF}}{q},
```

for positive $F$.

When $Q_{\rm sc}$ is expressed after division by $q$, the unit is elementary charges per square centimetre.

## 4. Interface-state density

For adjacent measurement intervals,

```math
\frac{dQ_c}{dV_{\rm sb}}
\approx
\frac{Q_{c,i+1}-Q_{c,i}}
{V_{{\rm sb},i+1}-V_{{\rm sb},i}},
```

and

```math
\frac{dQ_{\rm sc}}{dV_{\rm sb}}
\approx
\frac{Q_{{\rm sc},i+1}-Q_{{\rm sc},i}}
{V_{{\rm sb},i+1}-V_{{\rm sb},i}}.
```

For the p-type reference path,

```math
D_{it}
=
\frac{dQ_c}{dV_{\rm sb}}
-
\frac{dQ_{\rm sc}}{dV_{\rm sb}}.
```

The n-type path uses the corresponding charge-sign convention.

The usual reported unit is ${\rm cm^{-2}\,eV^{-1}}$.

## 5. Charge-grid interpolation

The reference calculation uses a denser internal $Q_c$ grid for interpolation and intermediate calculations.

A discrete result is retained separately for the vendor-style Minimum Dit quantity. Optional PCHIP/midgap analysis is treated as an additional interpolation result.

This distinction preserves the meaning of a measured discrete minimum.

## 6. Flat band

Flat band is estimated from the local relationship between the dark and illuminated branches near a configured surface-band-bending threshold.

The corresponding corona charge is $Q_{c,fb}$, with flat-band potential $V_{fb}$.

PV-2000 final-result evidence shows that the initial corona charge includes the charged state before the stored PreProcess attempts:

```math
Q_{c,init}=(N_{\rm pre}+1)\,\Delta Q_{\rm pre}.
```

Across **13 paired final-result files / 43 sites**, this rule matches vendor `Initial Qc` exactly. Initial `VDark` also agrees to floating-point precision. Corrected final-result `VLight` and the direct result-table `Vsb = VDark - VLight_result` are independently validated. For N-type, that result-table Vsb is intentionally opposite in sign to the doping-aware signed Vsb used by the Standard-COCOS analysis arrays; recovered vendor IL shows these are separate quantities. For the current managed PV-2000 DLL, a separate compatibility reconstruction now also validates final-result Vfb, Qsc, Qtot, Qit and Minimum Dit. Historical releases can still differ, so this current-DLL result path remains version-scoped.

If $Q_{c,init}$ is the inferred initial-state charge,

```math
Q_{\rm total}
=
Q_{c,init}-Q_{c,fb}.
```

## 7. Integrated interface charge $Q_{it}$

Two configured surface-band-bending barriers can be mapped through the semiconductor charge relation and back onto equivalent corona-charge coordinates.

If those two coordinates are $Q_{c,1}$ and $Q_{c,2}$,

```math
Q_{it}
=
\left|Q_{c,2}-Q_{c,1}\right|.
```

The result represents an integrated charge difference over the selected surface-potential interval.

## 8. COCOS-II current-DLL behavior

The recovered current managed DLL applies COCOS-II **after** flatband has been determined from the measured/corrected light branch. This ordering is now covered by `DIT-RESULT-COCOSII-DLL-003`.

For a valid `Vfb/Qcfb`:

```math
C_{\rm ox} = \frac{3.453\times 10^{-5}}{{\rm EOT}[\AA]}
```

with `Cox` in F/cm², followed by

```math
V_{\rm light,II}
=
V_{fb}
+
\frac{(Q_c-Q_{c,fb})\,1.602\times10^{-19}}{C_{\rm ox}}.
```

The DLL recomputes internal `Vsb = Vdark - Vlight,II` and `Qsc` on both dense and raw charge grids. Qit is evaluated on the reconstructed dense branch before the N-type analysis-axis sign reversal. Minimum Dit then uses the raw reconstructed branch with the doping-dependent sign convention.

`VsbMin/VsbMax` are Dit **segment-validity** limits: a segment is rejected only when both endpoints lie below Min or both lie above Max. A segment crossing a boundary is retained. Qit uses its own configured barrier range.

The current DLL also preserves a non-obvious sentinel: when every COCOS-II raw Dit segment is unavailable, scalar Minimum Dit can remain a defined `1e100` value.

Controlled vendor probes based on real P- and N-type acquisition traces establish these semantics and the EOT/window response. They are vendor-DLL oracle outputs, not native instrument-recorded `UseCocosII=true` pairs. `DoBackSurfaceShift` remains outside the validated envelope.

## 9. Back-surface shift

The measurement settings can contain a Back Surface Shift option. Its mathematical transformation and effect on the DIT result have not been established from paired output. The current analysis records the setting but does not apply a shift or claim it as a validated correction.

## 10. Validity and discrete limits

DIT calculation requires finite neighboring $V_{\rm sb}$ separation.

Typical reference-profile rules include:

- undefined intervals when $\Delta V_{\rm sb}=0$;
- accepted surface-potential windows for selected compatibility paths;
- lower and upper limits for display/acceptance;
- explicit undefined state in addition to a numerical placeholder.

Optional interpolation must stay inside measured/retained coverage and should not extrapolate to a midgap target outside the supported domain.

## 11. Material model

Semiconductor material enters through at least:

- intrinsic carrier concentration $n_i$;
- relative permittivity $\varepsilon_r$;
- derived flat-band and midgap relations.

The analyzer currently supports silicon and a legacy-compatible germanium model. Validation remains material/profile specific.

## 12. Validation status

DIT validation is split by semantic path. `DIT-RESULT-INITIAL-001` validates final-result initial VDark, corrected VLight, direct result-table Vsb and Initial Qc across 13 paired files / 43 sites. `DIT-RESULT-STANDARD-DLL-002` separately validates the current-DLL Standard-COCOS Vfb/Qsc/Qtot/Qit/Minimum-Dit path on the same paired corpus with zero availability mismatches.

`DIT-RESULT-COCOSII-DLL-003` adds **controlled vendor validation** of the recovered current-DLL COCOS-II path. Two real P/N acquisitions supply unchanged measured arrays; 10 `UseCocosII=true` parameter variants plus two controls are re-run through the vendor DLL. An independent XML-only oracle reproduces all 12 outputs at floating-point scale.

These PV-2000 compatibility result paths remain distinct from the Analyzer's configurable Si/Ge scientific model and optional Midgap PCHIP. The Ge option is Analyzer-only. Native instrument-recorded COCOS-II XML/CSV pairs are still unavailable, and active Back Surface Shift behavior remains unvalidated.

Exact validation envelopes are maintained in `docs/REFERENCE_PROFILES.md`.
