# Leakage

`LeakageMeasurement` analyzes corona-relaxation Kelvin-probe transients and reports the historical PV-2000 leakage result quantities.

## Outputs

- **VSASS+ [V]** — positive-polarity surface-assignment voltage.
- **VSASS- [V]** — negative-polarity surface-assignment voltage.
- **LI [V]** — legacy leakage indicator, `VSASS+ - VSASS-` when both required branches are available.

## Current validated path

`LEAKAGE-CALC-VSASS-001` is validated against two real XML + numeric PV-2000 CSV pairs.

One pair contains both polarities; replay gives:

- VSASS+ error about **4.3e-14 V**;
- VSASS- error about **1.1e-14 V**;
- LI error about **2.8e-14 V**.

A second pair exercises the positive-only branch and reproduces VSASS+ to about **1.8e-15 V** while the unavailable negative/LI quantities remain unavailable.

## Vendor-compatible VSASS extraction

For each enabled polarity the Analyzer follows the recovered PV-2000 path:

1. subtract the mean stored Vcpd offset from the transient;
2. form the time axis from the stored measurement interval;
3. select the local sample window around 1.2 s;
4. build the vendor natural cubic spline;
5. evaluate at `1.2 s - polarity delay`.

The target can lie outside the selected local knot interval; the historical routine extrapolates using the end spline interval, and the compatibility implementation preserves that behavior.

## Derivative I-V diagnostic boundary

The vendor software also constructs a smoothed derivative diagnostic using dielectric capacitance and repeated smoothing/interpolation. That recovered path is documented reference knowledge, but it is not part of the current primary scalar-result profile and is not claimed as a separately validated user-facing quantity.

## Validation boundary

Current paired evidence is one-point data. Multi-point Leakage geometry, different material/thickness branches and additional acquisition modes require matching vendor output before expanding the validated profile.

Calculation validation and geometry validation are independent.

## Related documentation

- [Measurement Families](Measurement-Families)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
- repository `docs/REFERENCE_PROFILES.md`
- repository `docs/VALIDATION.md`
