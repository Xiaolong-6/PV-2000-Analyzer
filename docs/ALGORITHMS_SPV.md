# SPVMeasurement compatibility algorithm

This note documents the implemented XML-to-result path for `SPVMeasurement`. Runtime consumes XML only; matching PV-2000 CSV files are development regression evidence.

## Outputs

The dedicated analyzer exposes:

- `DL` [µm] — two-wavelength diffusion length;
- `Tau` [µs] — lifetime derived from DL;
- `SPV8` [mV] and `SPV6` [mV] — measured channel means multiplied by the XML `Multiplier`.

Raw SPV channels are quantity-independent: they remain available when DL/Tau are undefined.

## Standard calculation branch

The positive-oxide calculation is `SPV-CALC-STANDARD-001`; zero oxide with zero stored reflectivity corrections is independently paired as `SPV-CALC-ZERO-OXIDE-002`.

For the stored global and reduced-global SPV8 measurements, define the measured linearity ratio and solve the historical nonlinear correction parameter on its accepted interval. If no valid root exists, the point channels are left unlinearized.

For a channel wavelength `lambda` in nm and chuck temperature `T`, the compatibility penetration-depth approximation is evaluated after converting the wavelength to ångström:

```text
dT = T - 21                         for 15 <= T <= 45 °C
dT = 0                              otherwise
E  = 12395 / lambda_A
x  = E + 0.001 * (1.3*E - 1) * dT
a  = 84.732*x/1.2395 - 76.417
Z  = 10000 / a^2
```

When texture correction is disabled, the resulting `Z6` and `Z8` are used directly.

Positive-oxide pairs exercise the oxide-correction branch. Three zero-oxide pairs instead exercise the reflectivity branch with both stored corrections equal to zero. The recovered vendor helper has a historical parameter-order quirk: XML `TemperatureCorrectionCoefficientLED6` is applied to SPV8, while XML `TemperatureCorrectionCoefficientLED8` is applied to SPV6. The Analyzer preserves that compatibility behavior. After the optical and LED-temperature corrections, let

```text
R = SPV8_corrected / SPV6_corrected
```

and calculate

```text
DL = (Z6 - R*Z8) / (R - 1)
```

DL is unavailable when the raw ordering required by the vendor path is not satisfied, the corrected denominator is invalid, `DL <= 0`, or `DL > 2500 µm`.

## Lifetime from DL

Tau is not an independently measured transient lifetime. It is derived from DL:

```text
Tau_us = DL_um^2 * 0.01 / (0.0259 * mobility)
```

The paired P-type path uses the historical minority-electron mobility constant `1288.07 cm²/(V s)`.

## Profile semantics

A validation profile describes an algorithm branch, not one instrument setting tuple. Ordinary numeric changes such as wavelength, temperature, multiplier, or positive oxide-thickness magnitude remain inputs to the same standard formula.

Categorical changes that currently remain outside `SPV-CALC-STANDARD-001` include:

- enhanced finite-wafer mode;
- texture correction enabled;
- parsed-signal processing;
- N-type lifetime branch;
- manual-linearity-ratio (`UseManualLR`) branch;
- nonzero reflectivity correction on the zero-oxide branch.

These paths remain inferred/unvalidated until matching numeric vendor output is supplied.

## Paired evidence

Two original 1649-site RoundWafer XML+CSV pairs and eight new standard pairs reproduce:

- SPV8/SPV6 to floating-point precision;
- DL with maximum absolute difference about `1.64e-11 µm`;
- Tau with maximum absolute difference about `2.06e-11 µs`;
- DL/Tau availability with zero `Ud.` mismatches.

See `docs/REFERENCE_PROFILES.md` and `docs/VALIDATION.md`.
