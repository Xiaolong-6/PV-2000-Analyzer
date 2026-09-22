# Contributing to PV-2000 Analyzer

Contributions are welcome from anyone who uses a PV-2000, including users who do not write code.

[**Share PV-2000 data →**](https://github.com/Xiaolong-6/PV-2000-Analyzer/issues/new?template=share-pv2000-data.yml) · [**Open an issue →**](https://github.com/Xiaolong-6/PV-2000-Analyzer/issues/new) · [**Live analyzer →**](https://xiaolong-6.github.io/PV-2000-Analyzer/)

The project grows by comparing real PV-2000 XML inputs with the matching results exported or displayed by PV-2000. The goal is reproducible support for additional measurement/result combinations without guessing vendor behavior from unrelated files.

## Contributor licensing / CLA

Code, documentation, tests, UI assets and other copyrightable material submitted through a pull request are accepted under the project [Contributor License Agreement](CLA.md).

The CLA does **not** transfer your copyright. It grants Xiaolong Liu broad rights, including sublicensing/relicensing rights, so the Project can remain available under AGPL-3.0 while also being offered under separate commercial/proprietary licenses.

Before submitting a PR:

- read [CLA.md](CLA.md);
- make sure you have authority to grant its rights, including employer approval when applicable;
- after opening the PR, post the exact CLA acceptance comment specified in `CLA.md`;
- wait for the **Legal / contributor grants** status to pass;
- continue to follow the separate licensing rules for public reference material.

The legal gate verifies acceptance from the PR author, not a checkbox edited by a maintainer. Editing or deleting the acceptance comment causes the status to be reevaluated. Repository branch rules should require **Legal / contributor grants** before merge.

For substantial corporate contributions, a separately signed CLA may be requested before merge.

## Two useful contribution paths

### 1. Data-only reference pull request

If the analyzer does not support a measurement, channel, result, pattern or algorithm path you need, you can submit reference data without implementing anything.

Please add one case under:

```text
reference_data/<measurement>/<case-id>/
    raw.xml
    pv2000_export.csv
    README.md
    screenshot.png        # optional, minimal, and only when publication rights are clear
```

The XML and export must come from the same measurement/result context. Prefer machine-generated XML plus numeric CSV. Full XPS/vendor reports and full-interface screenshots should remain private unless redistribution rights are specifically clear.

Files under `reference_data/` are accepted only under [REFERENCE_DATA_LICENSE.md](REFERENCE_DATA_LICENSE.md). In addition to the CLA acceptance, a PR author changing `reference_data/` must post the exact Reference Data License acceptance comment stated in that file.

The case `README.md` should state:

- PV-2000 measurement type / `Measurement/@xsi:type`;
- what result or behavior you want supported;
- which files belong to the same measurement;
- what the PV-2000 export/display contains;
- relevant settings that affect interpretation;
- whether any names/identifiers were anonymized;
- confirmation that you have the right and organizational authority to publish and license the submitted files under `REFERENCE_DATA_LICENSE.md`.

A data-only PR is still valuable. A maintainer or another contributor can use it to design the parser/calculation and regression test.

### 2. Implementation + reference pull request

If you want to implement support yourself:

1. branch from current `main`;
2. add or update the isolated measurement/result module;
3. include a matching public reference case when you are allowed to publish it, or document the private validator used when the data cannot be published;
4. add regression tests for parser structure, coordinates/raw quantities and derived results where possible;
5. update the relevant algorithm/validation documentation;
6. run the normal tests/build before requesting merge.

Do not make the runtime depend on CSV/XPS/screenshots. Runtime input remains XML-only.

### Development checks

Install the pinned development tooling once with:

```bash
npm install --ignore-scripts --no-audit --no-fund
```

Before opening an implementation PR, run:

```bash
npm run check
npm run validate:qss
npm run validate:isc
npm run validate:vcpd
npm run validate:lbic
npm run build
```

`npm run check` runs ESLint, the source-density guard, and the unit tests. The `validate:*` commands use matching local/private reference pairs when those files are available; they are regression evidence, not runtime requirements. Keep executable JavaScript split into reviewable statements instead of hand-minified one-line functions. Reuse shared helpers from `src/core/` rather than copying module-local variants.

`dist/` is generated output. Do not commit `dist/index.html`; CI and GitHub Pages rebuild it from `src/`.


## Validation model

Validation belongs to a semantic **input→output profile family**, not to one exact file or one exact numeric setting.

A different grid size, origin, pitch, wavelength, power or FluxCache value does not automatically create a new profile when the same parser/calculation/result path applies.

A **NEW PROFILE** is appropriate when a categorical/semantic change may alter software behavior, for example:

- different XML schema/path;
- different pattern type or coordinate encoding;
- different algorithm branch;
- multi-beam or iteration semantics;
- different raw channel/result combination;
- different unit convention;
- different validity/blanking/masking behavior;
- different derived-result path.

New profiles require the actual XML plus matching PV-2000 output before they are described as validated.

The project uses these labels:

- **validated** — numerically checked against matching PV-2000 output;
- **reproduced at shown precision** — only rounded display/screenshot values were available;
- **inferred** — reverse-engineered but not confirmed against matching raw vendor output;
- **unsupported** — no implemented/validated calculation.

Matching one reference case does not prove the undisclosed internal PV-2000 algorithm. It validates the observed behavior only within the documented envelope.

## Data publication and privacy

`private/` is never a contribution source. Do not move files from `private/` into a tracked location merely to open a PR.

Only submit real reference material under `reference_data/` when you intentionally want it to become public and you can grant the rights in [REFERENCE_DATA_LICENSE.md](REFERENCE_DATA_LICENSE.md). Prefer XML + numeric CSV. Keep full XPS/vendor reports and full-interface screenshots private unless redistribution rights are specifically clear.

Do not publish:

- customer-confidential measurements;
- vendor manuals or other copyrighted documentation you do not have redistribution rights for;
- proprietary binaries, PDB/debug-symbol files or decompiled source;
- group/internal code;
- credentials, personal data or instrument/network identifiers that should remain private.

You may anonymize sample names or identifiers when necessary, but do not silently alter scientific values. Document any anonymization in the case README.

## Pull request expectations

For a reference-data or implementation PR, explain what new measurement/result path the PR exercises and whether you believe it extends an existing validated family or introduces a new profile. It is fine to mark that assessment as uncertain.

For implementation PRs, keep unsupported or unverified calculations labelled **inferred** until regression evidence justifies a stronger label.

See `reference_data/README.md`, `docs/REFERENCE_PROFILES.md`, `docs/VALIDATION.md` and `AGENTS.md` for the detailed rules.
