# Measurement Families

This page separates **dedicated runtime analyzers** from measurement families that are known/documented but do not yet have a scientific analyzer.

## Dedicated analyzers

| Family | XML type | Main result provenance | Current status |
|---|---|---|---|
| [DIT / COCOS](DIT) | `DITMeasurement` | corrected Kelvin-probe/corona data plus analyzer-derived semiconductor/Dit results | implemented; validation is path/profile dependent; COCOS-II inferred |
| [QSS-µPCD](QSS-uPCD) | `QssUpcdMeasurement` | stored/controller lifetime plus derived Smax/Voc and optional Analyzer SRV | implemented; map profiles have paired validation |
| [Dual QSS](Dual-QSS) | `DualQssMeasurement` | stored injection/transient data plus profile-scoped steady-state/Voc/J0 reconstruction | implemented; raw path validated; two-pair `QSS-INJ-RESULT-001` validates the non-Auger Back/Back final scalar result table |
| [Emitter J0](Emitter-J0) | `JZeroMeasurement` | two lifetime states plus derived Smax/Voc/J0 | implemented; paired two-intensity map path validated |
| [ISC](ISC-and-VCPD) | `ISCMeasurement` | corrected/derived repeated Kelvin-probe readings | implemented; paired map profile validated |
| [VCPD](ISC-and-VCPD) | `VcpdMeasurement` | stored/averaged Kelvin-probe readings | implemented; separate paired map profile validated |
| [CET / EOT](CV-and-CET) | `CETMeasurement` | corona/CPD sweep plus fitted capacitance/EOT | implemented; `CET-9PT-SQUARE-001` validates the current fixed-point path |
| [LBIC](LBIC) | `LBICMeasurement` | measured photocurrent/reflection channels plus derived Reflectivity/IQE | implemented; three current reference-profile families; calculated DL unsupported |
| [SPV / Diffusion Length](SPV) | `SPVMeasurement` | raw SPV8/SPV6 plus compatibility DL and DL-derived Tau | implemented; paired 4 mm RoundWafer standard path validated |
| [Leakage](Leakage) | `LeakageMeasurement` | offset-corrected transient interpolation to VSASS+/VSASS- plus LI | implemented; two paired one-point cases validate the current extraction path |

The **Generic XML Inspector** handles unregistered XML types as a structural/raw-data fallback. It is not listed above because it performs no family-specific scientific reconstruction.

## Known/documented families without a dedicated analyzer

These families may be described in manuals/reference research or may appear in XML collections, but the current application does not provide a dedicated scientific analyzer for them:

- CV acquisition/process family;
- Frequency Scan;
- Voc / Voc Mapping / pseudo-I–V;
- Fe / LID / ALID;
- Surface Passivation;
- Junction Lifetime;
- Sheet Resistance;
- Eddy / resistivity;
- Height / displacement;
- other PV-2000 measurement types not in the dedicated table.

A new dedicated result path requires real paired evidence rather than similarity to an existing family.

## Shared scientific groups

### Kelvin probe and corona charge

DIT, ISC, VCPD and CET share contact-potential/charge concepts. CV is scientifically related but currently has no dedicated analyzer.

### Lifetime and recombination

QSS-µPCD, Dual QSS, Emitter J0 and SPV all expose lifetime-related quantities but use different acquisition physics and provenance. SPV Tau is derived from optical diffusion length, not a transient lifetime. They should not be treated as interchangeable representations of the same stored lifetime.

### Optical and electrical mapping

LBIC emphasizes spatial optical/electrical channels. Other spatial families such as Voc Mapping, sheet resistance, eddy and height remain outside the current dedicated-analyzer set.

## Result ownership vocabulary

**Raw/stored measurement** — directly represented in XML.

**Controller/device result** — evaluated before the XML reaches the viewer.

**Corrected measurement** — stored quantity after an explicit offset/calibration/sign convention.

**Derived physical quantity** — analyzer calculation from a stated scientific model.

**Compatibility result** — profile-specific calculation established against a PV-2000 output family.

**Analyzer-only optional result** — additional user analysis without claiming membership in the vendor result set.
