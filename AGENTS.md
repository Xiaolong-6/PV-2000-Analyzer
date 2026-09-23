# Agent instructions

## Non-negotiable data rule

`private/` is strictly local-only. Never commit, rename into a tracked path, or paste contents of `private/` into tracked files. Vendor manuals, group MATLAB code, customer-confidential material, and any reference files that have not been explicitly cleared for publication remain local validation material only.

The sole exception for real PV-2000 measurement material is the explicit public contribution area `reference_data/`. Public reference files may be tracked there only when the contributor intentionally submits them as public regression evidence, has the authority to make the grants in `REFERENCE_DATA_LICENSE.md`, and records the required acceptance. Prefer XML + numeric CSV. Full XPS/vendor reports and full-interface screenshots remain private by default; vendor manuals, proprietary binaries, PDB/debug symbols and decompiled source must not be published. A public reference case must document provenance, pairing, measurement/result intent and any anonymization in its case README. Never move existing `private/` material into `reference_data/` merely to make a test portable.

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

1. Preserve XML-only runtime operation. PV-2000 exports are regression references, never runtime dependencies. Do not treat PV-2000 CSV/UI as the complete XML schema: inventory useful stored XML quantities and unknown numeric channels when adding/auditing a family. Preserve them where practical and expose scientifically useful extra information through Advanced/diagnostic views with explicit provenance/evidence; absence from vendor export must not be mistaken for absence from XML, and XML presence must not be described as vendor-result validation.
2. Detect measurement type from `Measurement/@xsi:type`; never infer it from filenames.
3. Add each new result type as an isolated module registered through `PV2000.registry`.
4. Shared XML/statistics/geometry/theme/export/UI logic belongs in `src/core/`; do not duplicate common HTML escaping, help markup or tooltip helpers in measurement modules. For migrated/new scientific families, keep parsing, quantity provenance/availability, site selection, semantic profile metadata, scientific calculation and rendering as explicit layers. Use `PV2000.quantity`, `PV2000.selection`, `PV2000.measurement`, `PV2000.profiles` and the canonical geometry resolver rather than inventing module-local equivalents. All site-aligned arrays must use one shared site index space. Raw Pattern/Coefficients must remain distinct from physical `pointsMm`; modules/renderers must never assume an XML coefficient is already in millimetres.
5. Preserve the responsive scientific-workspace layout: wide screens use sidebar + two analysis columns; at medium widths (<=1200 CSS px) keep the sidebar and stack the two analysis columns into one scrollable column; narrow/mobile layouts collapse to one column. Do not imitate the legacy PV-2000 application. Plot axis-range controls must remain compact header popovers immediately before Export rather than taking permanent chart height. LBIC uses a two-column right workspace (Map/Distribution above, X/Y profiles below), with Selected pixel and Channel provenance in the sidebar; QSS Current dataset also belongs in the sidebar.
6. Every chart must expose a data export and shared zoom behavior: wheel in the plot zooms both axes, wheel over one axis zooms only that axis, and double-click restores auto scale.
7. Explain scientific quantities/controls with hover text (`title`/`.help`) rather than permanent instructional clutter.
8. Unknown XML types must fall back to Generic Inspector.
9. Reverse-engineered calculations require regression against a PV-2000 export/display before being labelled validated.
10. Run `npm run check`, `npm run build`, and relevant private validators before handoff; update CHANGELOG/HANDOFF. Keep executable source readable and do not commit generated `dist/` output.

## Licensing / CLA rule

The repository community license is **AGPL-3.0-only**. Separate commercial licensing is intentionally preserved. Do not replace or weaken the repository license, CLA, commercial-licensing notice, or copyright notice without an explicit project-owner decision.

External pull requests containing copyrightable code, documentation, tests, UI assets or other material must affirm the current `CLA.md` through the exact PR-author acceptance comment defined there. The `Legal / contributor grants` status verifies that record and should be configured as a required merge check. Contributors retain copyright, while the CLA grants Xiaolong Liu the sublicensing/relicensing rights needed for dual licensing.

Public files under `reference_data/` additionally require the exact PR-author acceptance defined in `REFERENCE_DATA_LICENSE.md`; the same legal gate checks it whenever a PR changes that directory. Issue-form uploads require the separate Reference Data License checkbox.

## Reference-profile rule

Validation is attached to an explicit **reference envelope**, not to a measurement-type name in general. This applies to Dit, QSS-µPCD, Dual QSS, JZero, ISC/VCPD, LBIC and every future analyzer.

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

Do not simplify Dit below the functionality of the restored modular analyzer / `legacy/Semilab_PV2000_Dit_Analyzer_v1.0.html`: Vcpd-Qc, Vsb-Qc, log Dit-Vsb with optional PCHIP/midgap, geometry-aware wafer map / OnePoint measurement-position view, site navigation, valid-site/current-site summary, flatband details, full XML metadata and per-chart export are required. Analysis controls must retain a Material selector with Si default and Ge support. Si uses `ni=9.65e9 cm^-3, εr=11.68`; Ge restores the legacy MATLAB `ni=2e13 cm^-3, εr=16.2`. Material selection must feed Qsc, variation/Minimum Dit, flatband/Qtot and Midgap Dit; never change only the PCHIP target. Ge is an Analyzer-only model choice; PV-2000 itself has no Si/Ge material selector. Ge-sample XML/export comparisons may benchmark Analyzer behavior but must never be described as validating a PV-2000 Ge mode. Under Follow XML setting, `UseCocosII=true` must invoke the current **PV2000 COCOS-II (inferred)** path; `false` must preserve Standard COCOS. Standard measured-light Vsb is signed and doping-aware: P-type uses `F*(VDark-VLight)` and N-type reverses that sign; never restore an unconditional `abs()` path. If a vendor export contains an additional corrected-light branch that is not uniquely recoverable from XML state, document it as unresolved rather than guessing it at runtime. The older guide-based COCOS-II implementation has been removed and must not be reintroduced as a user path. **Minimum Dit (PV2000-style)** is the accepted discrete minimum; PCHIP settings must not change it. Optional Midgap Dit (PCHIP) must remain always visible with a default-on checkbox, and disabling it must suppress Midgap Dit/PCHIP curve only. Its default method is Median-binned PCHIP with a 10 mV Vsb window; PCHIP (original) must remain selectable for compatibility, and LOG10/Linear are shared interpolation-scale options. The absolute PCHIP outlier limit must remain available as an optional manual threshold but default to disabled/blank; do not impose a fixed absolute Dit ceiling on all samples. Midgap Dit is interpolation-only: never extrapolate beyond measured Vsb coverage or the retained PCHIP fit domain, and surface the coverage reason when unavailable. None of these PCHIP settings may alter Minimum Dit. Invalid COCOS-II settings must be surfaced, never silently replaced by Standard COCOS. Analysis controls must be contextual/compact, and recalculation/re-rendering must not unexpectedly collapse an Analysis controls panel the user left open. In fine-pointer desktop multi-column layouts, keep the left functional sidebar independently scrollable without scrolling the plot columns, including under browser zoom. Sidebar child panels must not flex-shrink vertically; if they shrink, overflow disappears and the scrollbar becomes nonfunctional. Do not use portrait orientation alone to force the mobile layout on desktop; portrait/tablet fallback should require coarse-pointer input. Dit sidebar summaries must remain readable without horizontal clipping.

## QSS-µPCD validity rule

A QSS map can represent a full wafer, quarter wafer, coupon, or partially invalid field. Never assume every geometrically scheduled point belongs to the sample. For `MapPattern + RoundWafer`, reconstruct the scheduled radius from `Diameter/2 - EdgeExclusion` when EdgeExclusion is present before the strict circular site test; do not use nominal wafer radius alone.

PV-2000 QSS maps may encode unavailable lifetime as the numeric sentinel `-1 µs`. Preserve that raw XML value and the corresponding raw Smax calculation for traceability/vendor-parity export; do not silently rewrite it. Scientific analysis must default to treating non-positive lifetime as unavailable before applying the user-controlled validity range. Keep availability and range filtering distinct in UI/tooltips/exports, and prevent unavailable sites from setting scientific histogram/map ranges or being smoothed across the sample. An explicit Raw / PV-2000 style mode may expose the vendor-style numeric behavior.

The QSS XML family does not provide a trustworthy semiconductor-material identifier. Never infer Si/Ge from filenames, result names or substrate IDs. The default Implied-Voc path remains the documented PV-2000 compatibility model for vendor comparison. Physical Si/Ge estimates must require explicit user selection and remain labelled analyzer-side estimates unless matching material-specific PV-2000 output validates them.

Lifetime→SRV is analyzer post-processing, not a PV-2000 result. Preserve the configurable planar/textured formulas, optional bulk lifetime, textured planar-reference SRV and minimum-lifetime threshold; keep SRV distinct from vendor-compatible Smax. Apply the active availability/filter mask consistently to summary statistics, maps and exports. Smooth maps must not extrapolate invalid/unsupported regions across the whole nominal wafer.


## JZero validity rule

JZero calculation semantics and spatial geometry are separate. `JZERO-CALC-001` is the two-iteration JZero calculation path; `JZERO-GEOM-MAP-PSEUDOSQUARE-001` is the currently paired geometry path. Preserve site pairing by iteration index. Basore J0 and Smax are pointwise vendor-regressed; JZero Implied Voc uses its own documented compatibility calibration and must not silently reuse the general QSS-map `ni(T)` model.

A different resolver-supported Pattern/Target combination must not be rejected merely because it is not `MapPattern + PseudoSquareCell`. Keep calculation status and geometry status separate: the validated pseudo-square map geometry remains validated, while another geometry such as `OnePointPattern + SquareCell` can be displayed as **inferred** until paired X/Y/display evidence is supplied. A different iteration count/order, raw data schema or result set remains a new calculation profile. Do not map `JZeroMeasurement` to `QssUpcdMeasurement` merely because both contain `UpcdDataItem` lifetime values.

## ISC validity rule

The current validated ISC family is one iteration of repeated `VcpdDark` / `VcpdLight` readings using `MapPattern + SquareCell`, finite `VcpdOffset` and `VsbCorrectionFactor`, and vendor outputs Vcpd Dark / Vcpd Light / Vsb. For raw means `D` and `L`, offset `O`, and factor `F`, preserve the paired-reference equations `Vcpd Dark = D-O`, `Vsb = F(D-L)`, and `Vcpd Light = Vcpd Dark-Vsb`.

Numeric pitch/target/edge/read-count/offset/factor changes remain within this family when the same semantic path applies. Another pattern/coordinate encoding, target scheduling rule, iteration/raw schema, correction semantics, unit convention or vendor result set is **NEW PROFILE** and requires the actual XML plus matching PV-2000 output before validation expands. The runtime remains XML-only.

## LBIC validity rule

LBIC files may contain different combinations of beams/wavelengths and current/reflectance/QE channels. Do not hard-code raw BeamData attributes as active measured quantities: honor the XML measurement flags, preserve unknown numeric attributes, map BeamData Key to laser/FluxCache index, and prefer active raw XML Total R/EQE/IQE over calculated candidates when those channels are genuinely measured.

Three LBIC profile families are currently validated. `LBIC-SINGLE-001` covers the current-enabled one-iteration, single-beam `SquareRegionPattern` path. `LBIC-MULTI-002` independently covers current-enabled one-iteration multi-beam `MapPattern + PseudoSquareCell`. Both current-enabled families use µA Current + DirectReflection + ScatteredReflection with vendor Current / Reflectivity / IQE outputs; preserve the display clamp for Reflectivity while using the unclamped raw optical sum in the IQE denominator. `LBIC-REFLECTANCE-003` covers one-iteration, single-beam `SquareRegionPattern` with `MeasureCurrent=false` and active Direct/Scattered reflectance; zero-valued Current placeholders must be suppressed, Reflectivity is the primary result, and EQE/IQE must not be synthesized.

Numeric changes in wavelength, power, finite FluxCache, complete-region geometry, pitch, grid size, or independent beam count remain inside the applicable established family when the same semantic path is used. **NEW PROFILE** is reserved for categorical changes such as multi-iteration semantics, another pattern/target coordinate encoding, another active measurement-flag combination, another unit convention, a different raw channel set, raw Total R/EQE/IQE taking over the path, coupled cross-beam calculations, incomplete-acquisition ordering not confirmed by vendor coordinates, or a different vendor output/blanking behavior. Such cases require the actual XML plus matching PV-2000 output before validation expands.

Do not implement a calculated LBIC diffusion-length map from a plausible literature formula; require a real multi-wavelength PV-2000 XML plus matching DL output and regression first.
