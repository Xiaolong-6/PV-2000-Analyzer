# SPV / Diffusion Length

`SPVMeasurement` is the dedicated two-wavelength surface-photovoltage analyzer.

## Outputs

- **DL [µm]** — diffusion length from the PV-2000-compatible two-wavelength SPV ratio path.
- **Tau [µs]** — lifetime derived from DL using the vendor minority-carrier mobility constant for the selected doping type.
- **SPV8 [mV]** and **SPV6 [mV]** — the measured channel means after the measurement multiplier. These raw result channels remain available even when DL/Tau are undefined.

## Current validated path

`SPV-CALC-STANDARD-001` is validated against seven positive-oxide XML + numeric PV-2000 CSV pairs, including RoundWafer maps and a one-point acquisition. Three additional zero-oxide, zero-reflectivity pairs establish `SPV-CALC-ZERO-OXIDE-002` across HighDensity and NinePoint geometries. These standard paths use non-enhanced, non-texture, measured-linearity P-type processing. A separate paired N-type Enhanced case establishes `SPV-CALC-ENHANCED-N-003`.

Across the paired maps:

- SPV8/SPV6 reproduce at floating-point precision;
- DL maximum absolute difference is about **1.64e-11 µm**;
- Tau maximum absolute difference is about **2.06e-11 µs**;
- vendor `Ud.` availability for DL/Tau has **zero mismatches**.

The ten standard pairs include 1649-site maps with only one, 49 and zero finite DL/Tau sites, as well as maps with mostly finite results. The separate N-type Enhanced pair contains 69 sites, 28 finite vendor DL/Tau values and 41 unavailable sites. The recovered finite-wafer/back-surface root model reproduces DL within **2.11×10⁻⁷ µm**, Tau within **1.46×10⁻⁷ µs**, raw SPV8/SPV6 at floating-point precision, and all availability masks exactly. Enhanced P-type, texture correction, parsed signals and manual-linearity remain outside the validated envelope.

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
