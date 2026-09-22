# Agent instructions

## Non-negotiable data rule

`private/` is strictly local-only. Never commit, rename into a tracked path, or paste contents of `private/` into tracked files. Vendor manuals, group MATLAB code, customer-confidential material, and any reference files that have not been explicitly cleared for publication remain local validation material only.

The sole exception for real PV-2000 measurement material is the explicit public contribution area `reference_data/`. XML, matching PV-2000 exported CSV/XPS, and screenshots may be tracked there only when the contributor intentionally submits them as public regression evidence and confirms they have the right to publish them. A public reference case must document provenance, pairing, measurement/result intent, and any anonymization in its case README. Never move existing `private/` material into `reference_data/` merely to make a test portable.

Before every commit run:

```bash
git status --short --ignored
```

If anything under `private/` is staged, unstage it immediately. Never use `git add -f` on ignored reference data. Public reference files must be added only under `reference_data/` through the normal contribution workflow described in `CONTRIBUTING.md`.

## Repository versioning rule

The canonical project version is the single line in root `VERSION`. Do not use semantic versions such as `v0.2.2`.

- On `main`, use `vYYYYMMDD.N`, where `N` is the chronological order of commits merged to `main` on that calendar date. The first main baseline/commit of a date is `.1`.
- A branch created from main version `vYYYYMMDD.N` uses `vYYYYMMDD.N.1`, `vYYYYMMDD.N.2`, ... for successive branch commits.
- Immediately before merging, re-read the current `main` version. The merged main commit discards the branch suffix and becomes the next main ordinal for that date. Example: a branch from `.52` may reach `.52.2`; if main has meanwhile reached `.55`, the squash merge is `.56`.
- If the calendar date changes, main restarts at `.1` for the new date.
- Prefer squash merges so each accepted PR becomes one mainline commit/version.
- The merge commit title should start with the resolved version, e.g. `v20260922.56 — ...`.
- Before merge, update `VERSION` and the current CHANGELOG entry to the resolved main version. If main moves before merge, recompute rather than reusing a stale ordinal.
- `package.json` intentionally has no package version; this private project uses `VERSION` as the authoritative identifier.

## Development workflow

1. Preserve XML-only runtime operation. PV-2000 exports are regression references, never runtime dependencies.
2. Detect measurement type from `Measurement/@xsi:type`; never infer it from filenames.
3. Add each new result type as an isolated module registered through `PV2000.registry`.
4. Shared XML/statistics/geometry/theme/export logic belongs in `src/core/`.
5. Preserve the current responsive three-column UI; do not imitate the legacy PV-2000 application.
6. Every chart must expose a data export and shared zoom behavior: wheel in the plot zooms both axes, wheel over one axis zooms only that axis, and double-click restores auto scale.
7. Explain scientific quantities/controls with hover text (`title`/`.help`) rather than permanent instructional clutter.
8. Unknown XML types must fall back to Generic Inspector.
9. Reverse-engineered calculations require regression against a PV-2000 export/display before being labelled validated.
10. Run `npm test`, `npm run build`, and relevant private validators before handoff; update CHANGELOG/HANDOFF.

## Licensing / CLA rule

The repository community license is **AGPL-3.0-only**. Separate commercial licensing is intentionally preserved. Do not replace or weaken the repository license, CLA, commercial-licensing notice, or copyright notice without an explicit project-owner decision.

External pull requests containing copyrightable code, documentation, tests, UI assets or other material must affirm the current `CLA.md` before merge. Contributors retain copyright, while the CLA grants Xiaolong Liu the sublicensing/relicensing rights needed for dual licensing. Reference-data publication rights remain a separate requirement.

## Reference-profile rule

Validation is attached to an explicit **reference envelope**, not to a measurement-type name in general. This applies to Dit, QSS-µPCD, LBIC and every future analyzer.

A **reference instance** is one concrete XML/export pair. A **validated profile family** is the input→output algorithm path established by one or more reference instances. Ordinary numeric parameter changes inside the same path are not automatically NEW PROFILE. For example, changing raster dimensions/origin/pitch, wavelength, laser power or FluxCache value does not by itself create a new LBIC profile when the same single-beam channel/result path and formulas apply.

Treat a dataset as **NEW PROFILE** when there is a categorical or semantic change that may alter parsing or calculation: a new XML schema/path, algorithm mode, pattern type/coordinate encoding, beam multiplicity, channel/result combination, unit convention, validity/blanking rule, or derived-result path. Then require the actual PV-2000 XML and matching vendor export/display before expanding validation.

For a NEW PROFILE:

1. keep runtime behavior conservative and label unconfirmed calculations **inferred**;
2. obtain the real XML plus its matching PV-2000 output;
3. perform pointwise regression where possible, including invalid/blank behavior and summaries;
4. revise parser/calculation/UI assumptions if the new pair behaves differently;
5. append the reference envelope and evidence to `docs/REFERENCE_PROFILES.md`;
6. only then expand the validator and any **validated** label.

Do not confuse a new numeric value with a new algorithm profile. Conversely, do not infer that a genuinely different input/output path is vendor-valid merely because it shares the same `xsi:type`.

## Validation labels

- **validated** — numerically checked against a PV-2000 export/display.
- **reproduced at shown precision** — only rounded screenshot values were available.
- **inferred** — reverse-engineered but not confirmed by raw export.
- **unsupported** — no implemented/validated calculation yet.

Do not silently substitute a plausible formula for a vendor calculation.

## Dit parity rule

Do not simplify Dit below the functionality of the restored modular analyzer / `legacy/Semilab_PV2000_Dit_Analyzer_v1.0.html`: Vcpd-Qc, Vsb-Qc, log Dit-Vsb with optional PCHIP/midgap, selectable numeric wafer map, site navigation, valid-site/current-site summary, flatband details, full XML metadata and per-chart export are required. Under Follow XML setting, `UseCocosII=true` must invoke the current **PV2000 COCOS-II (inferred)** path; `false` must preserve Standard COCOS. The older guide-based COCOS-II implementation has been removed and must not be reintroduced as a user path. **Minimum Dit (PV2000-style)** is the accepted discrete minimum; PCHIP settings must not change it. Optional Midgap Dit (PCHIP) must remain always visible with a default-on checkbox, and disabling it must suppress Midgap Dit/PCHIP curve only. Its default method is Median-binned PCHIP with a 10 mV Vsb window; PCHIP (original) must remain selectable for compatibility, and LOG10/Linear are shared interpolation-scale options. None of these PCHIP settings may alter Minimum Dit. Invalid COCOS-II settings must be surfaced, never silently replaced by Standard COCOS. Analysis controls must be contextual/compact, and recalculation/re-rendering must not unexpectedly collapse an Analysis controls panel the user left open. In fine-pointer desktop multi-column layouts, keep the left functional sidebar independently scrollable without scrolling the plot columns, including under browser zoom. Sidebar child panels must not flex-shrink vertically; if they shrink, overflow disappears and the scrollbar becomes nonfunctional. Do not use portrait orientation alone to force the mobile layout on desktop; portrait/tablet fallback should require coarse-pointer input. Dit sidebar summaries must remain readable without horizontal clipping.

## QSS-µPCD validity rule

A QSS map can represent a full wafer, quarter wafer, coupon, or partially invalid field. Never assume every geometrically scheduled point belongs to the sample. Keep the user-controlled validity range and apply its mask consistently to summary statistics, derived metrics, maps and exports. Smooth maps must not extrapolate invalid/unsupported regions across the whole nominal wafer.


## LBIC validity rule

LBIC files may contain different combinations of beams/wavelengths and current/reflectance/QE channels. Do not hard-code the current single-beam examples as the parser schema. Preserve unknown numeric BeamData attributes, map BeamData Key to laser/FluxCache index, and prefer raw XML Total R/EQE/IQE over calculated candidates.

Four paired XML+CSV reference instances establish the current validated LBIC family: one iteration, one beam, `SquareRegionPattern`, µA current, raw Current + DirectReflection + ScatteredReflection, finite positive photon FluxCache, and vendor outputs Current + Reflectivity + IQE. Within this family, coordinate reconstruction, Reflectivity = min(100%, Direct + Scattered), and IQE using q=1.602e-19 C with >100% blanking are validated.

Numeric changes in wavelength, power, FluxCache, Region origin/size, pitch, or grid dimensions remain inside this family when the same measurement/result path is used. **NEW PROFILE** is reserved for categorical changes such as multi-beam/multi-iteration semantics, another pattern type/coordinate encoding, another unit convention, a different raw channel set, raw Total R/EQE/IQE taking over the path, or a different vendor output/blanking behavior. Such cases require the actual XML plus matching PV-2000 output and may require redesign before validation expands.

Do not implement a calculated LBIC diffusion-length map from a plausible literature formula; require a real multi-wavelength PV-2000 XML plus matching DL output and regression first.
