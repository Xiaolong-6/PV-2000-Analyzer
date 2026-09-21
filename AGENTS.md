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

## Validation labels

- **validated** — numerically checked against a PV-2000 export/display.
- **reproduced at shown precision** — only rounded screenshot values were available.
- **inferred** — reverse-engineered but not confirmed by raw export.
- **unsupported** — no implemented/validated calculation yet.

Do not silently substitute a plausible formula for a vendor calculation.

## Dit parity rule

Do not simplify Dit below the functionality of the restored modular analyzer / `legacy/Semilab_PV2000_Dit_Analyzer_v1.0.html`: Vcpd-Qc, Vsb-Qc, log Dit-Vsb with optional PCHIP/midgap, selectable numeric wafer map, site navigation, valid-site/current-site summary, flatband details, full XML metadata and per-chart export are required. Under Follow XML setting, `UseCocosII=true` must invoke the current **PV2000 COCOS-II (inferred)** path; `false` must preserve Standard COCOS. The older guide-based implementation is legacy/development-only. **Minimum Dit (PV2000-style)** is the accepted discrete minimum; PCHIP settings must not change it and belong to the optional Midgap Dit branch only. Invalid COCOS-II settings must be surfaced, never silently replaced by Standard COCOS. Analysis controls must be contextual/compact, and recalculation/re-rendering must not unexpectedly collapse an Analysis controls panel the user left open. In any multi-column layout, keep the left functional sidebar independently scrollable without scrolling the plot columns. Browser zoom must not disable this by crossing the 900 px breakpoint; only the true single-column/mobile layout may return the sidebar to normal flow.

## QSS-µPCD validity rule

A QSS map can represent a full wafer, quarter wafer, coupon, or partially invalid field. Never assume every geometrically scheduled point belongs to the sample. Keep the user-controlled validity range and apply its mask consistently to summary statistics, derived metrics, maps and exports. Smooth maps must not extrapolate invalid/unsupported regions across the whole nominal wafer.


## LBIC validity rule

LBIC files may contain different combinations of beams/wavelengths and current/reflectance/QE channels. Do not hard-code the supplied single-beam examples as the schema. Preserve unknown numeric BeamData attributes, map BeamData Key to laser/FluxCache index, and prefer raw XML Total R/EQE/IQE over calculated candidates.

Until matching vendor exports exist, rectangular scan orientation/order and calculated Total R/EQE/IQE must remain labelled **inferred**. Do not implement a calculated LBIC diffusion-length map from a plausible literature formula; require a multi-wavelength PV-2000 XML plus matching DL output and regression first.
