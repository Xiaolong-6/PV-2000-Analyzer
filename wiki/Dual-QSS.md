# Dual QSS

Dual QSS is the analyzer for `DualQssMeasurement`: an injection-intensity sweep measured at one nominal sample position. It is separate from the spatial [QSS-µPCD](QSS-uPCD) map analyzer.

## Physical measurement principle

QSS lifetime analysis follows the carrier response while optical generation is varied. For excess-carrier density $\Delta n$,

```math
\frac{d\Delta n}{dt}=G-R,
```

where $G$ is generation and $R$ total recombination. In the quasi-steady-state limit,

```math
\tau_{\mathrm{eff}}\approx\frac{\Delta n}{G}.
```

When illumination changes appreciably during acquisition, dynamic/transient correction is required before a steady-state lifetime is inferred. Raw controller lifetime, XML stored lifetime vectors and corrected `teff.SS` therefore have different provenance.

Sweeping injection also provides the injection dependence needed for emitter-$J_0$ analysis.

## What the analyzer shows

The current runtime exposes injection intensity, canonical raw lifetime, stored transient traces/metadata, LP/HP/repeat overlays where stored, nominal measurement position, XML-derived sweep export and the profile-scoped vendor-compatible scalar result table when `QSS-INJ-RESULT-001` applies.

That scalar table can include **teff.d (1 Sun), teff.SS (1 Sun), teff.SS Max, Δn, Smax, implied Voc, Basore J0 and K-S J0**, with quantity-specific unavailable states.

## Two XML lifetime fields

Observed XML contains both `TransientInfo@LifeTime` and one or more lifetime vectors under `Values`. They are not interchangeable.

The paired raw CSV `LifeTime` column matches `TransientInfo@LifeTime`, so the analyzer uses that as canonical raw lifetime for the displayed injection curve. The validated scalar-result path uses the saved `Values` data according to the vendor point-averaging rule:

```text
DoPointAveraging = false  -> Values[0][i]
DoPointAveraging = true   -> mean(Values[*][i])
```

The true branch is recovered directly from the vendor managed DLL. `PointAverageCount` alone does not select it. A vendor result-table lifetime found in broader exports is another post-processed quantity and is not silently substituted for either XML representation.

## Injection level and downstream quantities

Under the project QSS generation convention,

```math
\Delta n=G\tau.
```

For steady-state lifetime $\tau_{SS}$ and wafer thickness $W$,

```math
S_{\max}=\frac{W}{2\tau_{SS}}.
```

A familiar p-type implied-voltage relation is

```math
V_{oc,\mathrm{impl}}
=
\frac{kT}{q}
\ln\!\left(
1+\frac{\Delta n(N_A+\Delta n)}{n_i^2}
\right).
```

Compatibility results use profile-defined constants/conventions; the physical equation alone does not establish vendor parity.

## teff.d and teff.SS

`teff.d` is the profile-scoped 1-sun lifetime from the effective XML `Values` path: first saved vector normally, or the pointwise mean of all saved vectors when point averaging is enabled. `teff.SS` is the transient-corrected steady-state result reconstructed for the validated non-Auger Back/Back profile. `teff.SS Max` has its own vendor availability rule: an internal corrected curve can exist while the vendor-compatible maximum remains unavailable.

This separation prevents several lifetime concepts in one sweep from being presented as the same quantity.

## J0 from injection dependence

A Kane-Swanson-style representation uses

```math
\frac{1}{\tau}=a+b\Delta n,
```

with slope converted to emitter saturation current density using profile/material constants. Basore-style processing uses a different transformed relation.

The runtime exposes Basore and K-S J0 only where the applicable profile/request flags support them.

## Validation status

The raw injection/transient path is validated on the large paired raw corpus.

`QSS-INJ-RESULT-001` validates the current non-Auger Back/Back scalar path on real matching XML + numeric result exports, including teff.d, teff.SS, teff.SS Max, Δn, both Smax values, implied Voc, Basore J0 and K-S J0 where applicable. Evidence now includes OnePoint acquisitions and two one-site FixedPoints/PseudoSquare acquisitions; the latter close at floating-point scale once the saved-vector point-averaging rule is applied.

Multi-site FixedPoints, Auger correction, alternate source selections, unsupported 1000-mSun placement and other categorical branches remain outside this envelope.

## Related documentation

- [QSS-uPCD](QSS-uPCD)
- [Emitter J0](Emitter-J0)
- [Scientific Foundations](Scientific-Foundations)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
- repository `docs/ALGORITHMS_DUAL_QSS.md`
