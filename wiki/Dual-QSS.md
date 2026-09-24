# Dual QSS

Dual QSS is the analyzer for `DualQssMeasurement`, an injection-intensity sweep measured at one nominal sample position. It is separate from the spatial [QSS-µPCD](QSS-uPCD) map analyzer.

## What the analyzer currently shows

The runtime exposes:

- injection intensity;
- raw/canonical lifetime for each acquired injection point;
- stored transient traces and their metadata;
- LP / HP / repeat overlays where stored;
- the nominal one-point measurement position;
- CSV export of the XML-derived sweep;
- vendor-compatible **teff.d (1 Sun)** only where the validated result-profile rule applies.

The analyzer does **not** currently expose vendor-compatible teff.SS, teff.SS Max, implied Voc or J0.

## Two XML lifetime fields

Observed Dual-QSS XML contains two distinct lifetime representations:

- `TransientInfo@LifeTime`;
- the XML `Values` vector.

They must not be treated as interchangeable fields.

For the paired raw-data corpus, the PV-2000 raw CSV `LifeTime` column matches `TransientInfo@LifeTime`. The analyzer therefore uses that field as the canonical raw lifetime, falling back to `Values` only when needed.

The final vendor scalar teff.d (1 Sun), however, is established from XML `Values` on the current paired result profile.

## teff.d at 1 sun

The validated result profile currently covers two observed target-placement cases:

1. **1000 mSun acquired exactly** — use the XML `Values` element at 1000 mSun.
2. **sweep ends below 1000 mSun** — use the final acquired XML `Values` element for the paired observed case.

The analyzer does not invent an interpolation rule for an unobserved case where a sweep crosses 1000 mSun without sampling 1000 exactly. That result remains unavailable until matching real output establishes the rule.

This is a deliberately narrow compatibility path rather than a general physical interpolation assumption.

## Steady-state concepts

Dual QSS can contain several lifetime concepts:

- raw transient/controller lifetime;
- XML `Values`;
- transient-corrected steady-state lifetime;
- lifetime at a target intensity;
- maximum corrected lifetime.

These are scientifically related but have different provenance. A future steady-state reconstruction must preserve that distinction.

Once a steady-state lifetime `tau_SS` is known, familiar downstream relations include:

```math
S_{max}=\frac{W}{2\tau_{SS}}
```

and, under the project QSS generation convention,

```math
\Delta n = G\tau_{SS}.
```

Those downstream equations do not by themselves establish how PV-2000 transforms the stored transient/raw sweep into `tau_SS`.

## J0 relationship

Injection-dependent lifetime can support Kane–Swanson- or Basore-style emitter-saturation-current analysis. The scientific concept is documented in [Scientific Foundations](Scientific-Foundations) and [Emitter J0](Emitter-J0).

For `QSS-INJ-RESULT-001`, the vendor-compatible teff.SS and J0 transformations are implemented in runtime and validated point-by-point against two real XML+numeric-CSV pairs. This remains a profile-scoped result path; Auger correction and alternate source-selection branches are not generalized without their own pairs.

## Validation status

Current evidence separates two boundaries:

- the raw injection/transient path is validated on a large paired corpus;
- `QSS-INJ-RESULT-001` uses two real XML+numeric-CSV pairs to validate the complete non-Auger Back/Back final scalar path: QDC, teff.d, teff.SS, teff.SS Max, Δn, both Smax values, implied Voc, Basore J0 and K-S J0.

The compatibility result path remains profile-scoped. Auger correction, alternate source selections and other categorical result branches stay unavailable until matching vendor output validates them.

Exact corpus counts, tolerances and profile details are maintained in the repository validation documentation.
