# Agent instructions

## Non-negotiable data rule

Never commit, rename into a tracked path, or paste contents of `private/` into tracked files. Real PV-2000 XML/CSV/XPS, vendor manuals, screenshots, group MATLAB code, and user-provided documents are local validation material only.

Before every commit run:

```bash
git status --short --ignored
```

If anything under `private/` is staged, unstage it immediately. Never use `git add -f` on ignored reference data.

## Development workflow

1. Preserve XML-only runtime operation. PV-2000 exports are regression references, never runtime dependencies.
2. Detect measurement type from `Measurement/@xsi:type`; never infer it from filenames.
3. Add each new result type as an isolated module registered through `PV2000.registry`.
4. Shared XML/statistics/geometry/theme/export logic belongs in `src/core/`.
5. Preserve the current responsive three-column UI; do not imitate the legacy PV-2000 application.
6. Every chart must expose a data export.
7. Explain scientific quantities/controls with hover text (`title`/`.help`) rather than permanent instructional clutter.
8. Unknown XML types must fall back to Generic Inspector.
9. Reverse-engineered calculations require regression against a PV-2000 export/display before being labelled validated.
10. Run `npm test`, `npm run build`, and relevant private validators before handoff; update CHANGELOG/HANDOFF.

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

Do not simplify Dit below the functionality of the restored modular analyzer / `legacy/Semilab_PV2000_Dit_Analyzer_v1.0.html`: Vcpd-Qc, Vsb-Qc, log Dit-Vsb with optional PCHIP/midgap, selectable numeric wafer map, site navigation, valid-site/current-site summary, flatband details, full XML metadata and per-chart export are required. Under Follow XML setting, `UseCocosII=true` must invoke the current **PV2000 COCOS-II (inferred)** path; `false` must preserve Standard COCOS. The older guide-based implementation is legacy/development-only. **Minimum Dit (PV2000-style)** is the accepted discrete minimum; PCHIP settings must not change it and belong to the optional Midgap Dit branch only. Invalid COCOS-II settings must be surfaced, never silently replaced by Standard COCOS. Analysis controls must be contextual/compact, and recalculation/re-rendering must not unexpectedly collapse an Analysis controls panel the user left open. In fine-pointer desktop multi-column layouts, keep the left functional sidebar independently scrollable without scrolling the plot columns, including under browser zoom. Do not use portrait orientation alone to force the mobile layout on desktop; portrait/tablet fallback should require coarse-pointer input. Dit sidebar summaries must remain readable without horizontal clipping.

## QSS-µPCD validity rule

A QSS map can represent a full wafer, quarter wafer, coupon, or partially invalid field. Never assume every geometrically scheduled point belongs to the sample. Keep the user-controlled validity range and apply its mask consistently to summary statistics, derived metrics, maps and exports. Smooth maps must not extrapolate invalid/unsupported regions across the whole nominal wafer.


## LBIC validity rule

LBIC files may contain different combinations of beams/wavelengths and current/reflectance/QE channels. Do not hard-code the current single-beam examples as the parser schema. Preserve unknown numeric BeamData attributes, map BeamData Key to laser/FluxCache index, and prefer raw XML Total R/EQE/IQE over calculated candidates.

Four paired XML+CSV reference instances establish the current validated LBIC family: one iteration, one beam, `SquareRegionPattern`, µA current, raw Current + DirectReflection + ScatteredReflection, finite positive photon FluxCache, and vendor outputs Current + Reflectivity + IQE. Within this family, coordinate reconstruction, Reflectivity = Direct + Scattered, and IQE using q=1.602e-19 C with >100% blanking are validated.

Numeric changes in wavelength, power, FluxCache, Region origin/size, pitch, or grid dimensions remain inside this family when the same measurement/result path is used. **NEW PROFILE** is reserved for categorical changes such as multi-beam/multi-iteration semantics, another pattern type/coordinate encoding, another unit convention, a different raw channel set, raw Total R/EQE/IQE taking over the path, or a different vendor output/blanking behavior. Such cases require the actual XML plus matching PV-2000 output and may require redesign before validation expands.

Do not implement a calculated LBIC diffusion-length map from a plausible literature formula; require a real multi-wavelength PV-2000 XML plus matching DL output and regression first.
