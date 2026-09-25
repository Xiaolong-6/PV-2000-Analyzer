# SPV / Diffusion Length

`SPVMeasurement` is the dedicated two-wavelength surface-photovoltage analyzer.

## Outputs

- **DL [µm]** — diffusion length from the PV-2000-compatible two-wavelength SPV ratio path.
- **Tau [µs]** — lifetime derived from DL using the vendor minority-carrier mobility constant for the selected doping type.
- **SPV8 [mV]** and **SPV6 [mV]** — the measured channel means after the measurement multiplier. These raw result channels remain available even when DL/Tau are undefined.

## Current validated path

`SPV-CALC-STANDARD-001` is validated against seven positive-oxide XML + numeric PV-2000 CSV pairs, including RoundWafer maps and a one-point acquisition. Three additional zero-oxide, zero-reflectivity pairs establish `SPV-CALC-ZERO-OXIDE-002` across HighDensity and NinePoint geometries. All use the non-enhanced, non-texture, measured-linearity P-type path.

Across the paired maps:

- SPV8/SPV6 reproduce at floating-point precision;
- DL maximum absolute difference is about **1.64e-11 µm**;
- Tau maximum absolute difference is about **2.06e-11 µs**;
- vendor `Ud.` availability for DL/Tau has **zero mismatches**.

The ten standard pairs include 1649-site maps with only one, 49 and zero finite DL/Tau sites, as well as maps with mostly finite results. The nine newly audited exports include one separate enhanced N-type pair; its 28 finite DL/Tau values do not match the standard formula, so that calculation path remains outside the validated envelopes.

## Calculation outline

The compatibility path uses the stored global/reduced-global SPV8 linearity measurement, channel wavelengths, chuck/LED temperature inputs and optical-correction settings. The standard DL branch can be summarized as:

1. optional legacy linearity correction;
2. wavelength-to-penetration-depth conversion;
3. optional texture correction to penetration depths;
4. reflectivity correction or oxide-stack correction to SPV amplitudes;
5. LED-temperature correction;
6. `R = SPV8corr / SPV6corr`;
7. `DL = (Z6 - R*Z8) / (R - 1)`;
8. reject non-positive DL or DL above 2500 µm;
9. derive Tau from DL.

## Validation boundary

The current paired profile does **not** validate:

- `UseEnhancedMode=true`;
- texture-correction-enabled cases;
- parsed-signal mode;
- other wavelength/configuration families;
- nonzero reflectivity correction in the zero-oxide branch.

Such files may still be structurally readable, but their derived-result status remains inferred until matching vendor output extends the profile.

Ordinary numeric settings such as wavelength, temperature, multiplier and positive oxide-thickness magnitude remain inputs to the positive-oxide formula; zero oxide with zero reflectivity correction has a separate validated calculation profile.

Geometry validation is tracked separately from calculation validation. A terminated 59-site HighDensity acquisition has exact vendor coordinate-prefix evidence but remains partial geometry.

## Related documentation

- [Measurement Families](Measurement-Families)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
- repository `docs/REFERENCE_PROFILES.md`
- repository `docs/VALIDATION.md`
