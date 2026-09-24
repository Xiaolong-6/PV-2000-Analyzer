# Measurement Families

This index summarizes the scientific role and result provenance of the known measurement families.

| Family | Main scientific quantity | Result provenance | Current project status |
|---|---|---|---|
| DIT | surface band bending, interface-state density, flat-band and interface charge | analyzer-derived from Kelvin-probe/corona data | implemented; profile-dependent validation |
| QSS-uPCD | effective lifetime, Smax, implied Voc | lifetime stored/controller-derived; Smax and Voc derived | implemented; current map profiles validated |
| Dual QSS | injection-dependent lifetime and J0-related quantities | stored lifetime/transients plus profile-scoped result reconstruction | raw path validated; `QSS-INJ-RESULT-001` reproduces teff.d (1 Sun); steady-state/Voc/J0 paths remain unresolved |
| Emitter J0 | emitter saturation current density | two lifetime states plus derived J0/Smax/Voc | implemented; current two-intensity map profile validated |
| ISC | dark/light Vcpd and surface band bending | corrected and derived from repeated Kelvin-probe readings | implemented; current profile validated |
| VCPD | contact potential difference | averaged stored Kelvin-probe readings | implemented; current profile validated |
| LBIC | photocurrent, reflectivity, EQE/IQE; diffusion length in some vendor results | mixed raw channels and derived quantities | current/reflectivity/IQE paths validated by profile; calculated diffusion length unsupported |
| CV | corona/Kelvin-probe acquisition history and feedback | acquisition/process state | measurement semantics documented |
| CET | capacitance, EOT and fit quality | derived from corona charge and light-CPD sweep | implemented; `CET-9PT-SQUARE-001` validates the current NinePointPattern + SquareCell path |
| SPV / Diffusion Length | minority-carrier diffusion length and derived lifetime | wavelength-dependent SPV plus optical corrections | scientific calculation documented; paired validation pending |
| Fe / LID | activation-induced defect concentration indicators | derived from before/after states | scientific calculation documented; paired validation pending |
| Surface Passivation | passivation-related response | corrected stored channels and ratios | scientific semantics documented; paired validation pending |
| Junction Lifetime | junction-associated lifetime and shunt-resistance proxy | derived from measured channels | scientific calculation documented; paired validation pending |
| Voc | pseudo-I–V, Voc, Vmp and fill factor | derived from transient voltage/current proxy | scientific calculation documented; paired validation pending |
| Voc Mapping | spatial Voc indicator | corrected dark/light Vcpd difference | scientific calculation documented; paired validation pending |
| Frequency Scan | first-order response lifetime and fitted amplitudes | fitted from frequency response | scientific calculation documented; paired validation pending |
| Leakage | VSASS±, leakage indicator and derivative I–V | transient interpolation and dielectric derivative transform | scientific calculation documented; paired validation pending |
| Sheet Resistance | sheet resistance and associated instrument values | controller/device result passthrough | provenance boundary documented |
| Eddy | resistivity and eddy-related instrument values | controller/device result passthrough | provenance boundary documented |
| Height | displacement / height change | calibrated voltage-to-distance transform | scientific semantics documented |

## Shared scientific groups

### Kelvin probe and corona charge

- VCPD
- ISC
- DIT
- CV
- CET
- Leakage

These families share electrostatic potential and charge concepts, while their acquisition sequence and derived results differ.

### Lifetime and recombination

- QSS-uPCD
- Dual QSS
- Emitter J0
- Fe / LID
- Junction Lifetime
- SPV / Diffusion Length

These families share effective lifetime, injection and recombination physics. Lifetime provenance and compatibility constants remain explicit on each family page.

### Optical and electrical mapping

- LBIC
- Voc Mapping
- Sheet Resistance
- Eddy
- Height

These families emphasize spatial data and instrument channels, with different levels of viewer-side scientific derivation.

## Result ownership

### Analyzer-derived

The XML provides raw or intermediate quantities and the analyzer evaluates a documented model.

Examples include DIT, QSS Smax, implied Voc and CET EOT.

### Controller/device-derived

The instrument or controller has already evaluated the quantity before the viewer receives it.

General uPCD lifetime evaluation modes and several sheet-resistance/eddy quantities fall into this category.

### Corrected stored result

The analyzer applies offsets, correction factors or sign conventions to stored data.

ISC is a representative case.

### Acquisition container

The XML primarily stores the history of a measurement process. A derived family can reuse that acquisition structure.

CV and CET illustrate this relationship.
