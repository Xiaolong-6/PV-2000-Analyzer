# PV-2000 Analyzer Scientific Wiki

PV-2000 Analyzer is a browser-based environment for reading and analyzing PV-2000 XML measurement files. This Wiki collects the physics, mathematics, units, assumptions and measurement semantics used by the project.

The Wiki is maintained as a living scientific reference. Each page presents the current best understanding directly.

## Start here

- [Scientific Foundations](Scientific-Foundations)
- [Measurement Families](Measurement-Families)
- [Validation and Reference Profiles](Validation-and-Reference-Profiles)
- [DIT](DIT)
- [QSS-uPCD](QSS-uPCD)
- [CV and CET](CV-and-CET)

## What belongs here

Scientific pages explain:

- what a measurement represents physically;
- which quantities are measured, stored, corrected or derived;
- governing equations and symbol definitions;
- units and dimensional relationships;
- assumptions and approximations;
- validity, blanking and undefined conditions;
- relationships between measurement families;
- compatibility-model status and validation scope.

Implementation details, XML-field mappings, tests and exact validation evidence remain in the repository documentation.

## Validation vocabulary

**Validated** — numerically checked against matching PV-2000 output for a stated reference profile.

**Reproduced at shown precision** — agreement is established to the precision visible in the available reference output.

**Inferred** — the scientific or compatibility model is documented, while matching output has not yet established numerical parity.

**Unsupported** — the project does not currently provide the corresponding scientific result.

## Scientific model and compatibility model

A scientific model describes the underlying semiconductor, optical or electrical relationship.

A compatibility model describes a calculation used to reproduce a defined reference-output family.

A quantity can have both descriptions. Validation applies to the stated input-to-output profile and is recorded separately from physical plausibility.

## Project links

- Repository: https://github.com/Xiaolong-6/PV-2000-Analyzer
- Analyzer: https://xiaolong-6.github.io/PV-2000-Analyzer/
