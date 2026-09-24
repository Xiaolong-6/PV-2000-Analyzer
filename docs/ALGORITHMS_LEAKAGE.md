# LeakageMeasurement compatibility algorithm

This note documents the implemented scalar result path for `LeakageMeasurement`.

## Outputs

The dedicated analyzer exposes:

- `VSASS+` [V];
- `VSASS-` [V];
- `LI` [V].

The current validated profile is `LEAKAGE-CALC-VSASS-001`.

## Offset-corrected transient

For an enabled polarity, subtract the mean stored `VcpdOffset` from each transient voltage sample:

```text
V_corrected[i] = V_raw[i] - mean(VcpdOffset)
t[i] = i * MeasuringIntervalSeconds
```

The calculation selects the local knot range surrounding 1.2 s:

```text
1.2 s - 2*dt  ...  1.2 s + 2*dt
```

and constructs a natural cubic spline through those samples.

The reported polarity value is evaluated at

```text
t_eval = 1.2 s - DelaySeconds
VSASS = spline(t_eval)
```

The compatibility implementation preserves the historical end-interval extrapolation behavior when `t_eval` lies outside the selected local knot interval.

## Leakage indicator

When the required negative branch is available:

```text
LI = VSASS+ - VSASS-
```

The positive-only paired case preserves VSASS+ while VSASS- and LI remain unavailable.

## Profile semantics

The sampling interval is a numeric input to the same spline algorithm and is not a profile identity. The validated calculation profile accepts positive enabled acquisitions with any finite positive interval, with an optional negative branch.

Different categorical acquisition/result paths — for example negative-only operation or a materially different result builder — require separate paired evidence before being labelled validated.

## Derivative I-V diagnostic

The legacy software also forms a dielectric-capacitance-scaled derivative diagnostic from smoothed transients. That recovered behavior is not currently exposed as a primary validated Analyzer quantity. The scalar VSASS/LI path is intentionally kept separate from that diagnostic.

## Paired evidence

Two private XML+CSV pairs reproduce the scalar results:

- both-polarity pair: VSASS+ ≈ `4.3e-14 V` max absolute error, VSASS- ≈ `1.1e-14 V`, LI ≈ `2.8e-14 V`;
- positive-only pair: VSASS+ ≈ `1.8e-15 V` absolute error with unavailable VSASS-/LI preserved.

See `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.
