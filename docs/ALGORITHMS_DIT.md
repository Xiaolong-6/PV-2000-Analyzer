# DIT / COCOS module notes

The modular Dit analyzer continues the standalone COCOS work while keeping XML as the only runtime input.

Implemented outputs include Vcpd dark/light curves, surface-barrier curve, barrier-adjustment Initial Qc bookkeeping, semiconductor Qsc, variation-method minimum/midgap Dit, accumulation-slope Cox and SiO2-equivalent EOT, differential-capacitance flatband and Qtot.

## Analysis-method routing

The Dit sidebar exposes **Analysis method** rather than one flat list of unrelated COCOS controls.

Normal user choices are:

- **Follow XML setting** — the default. `UseCocosII=false` resolves to Standard COCOS; `UseCocosII=true` resolves to **PV2000 COCOS-II (inferred)**.
- **Standard COCOS** — force the measured dark/light path regardless of the XML flag.
- **PV2000 COCOS-II (inferred)** — force the current same-raw-data reverse-engineered model.

The obsolete guide-only COCOS-II implementation has been removed from the runtime and user interface.

Controls are contextual. COCOS-II EOT and Min/Max Vsb appear only when the inferred PV2000 COCOS-II path is active. Flatband controls remain visible because they feed both Standard COCOS and COCOS-II. **Optional Midgap Dit (PCHIP)** is always visible in Analysis controls with a checkbox; it is enabled by default. When unchecked, Midgap Dit and the PCHIP curve are disabled while the discrete Minimum Dit calculation is unchanged. Applying settings re-renders the analysis while keeping the Analysis controls panel open.

## Minimum Dit versus optional PCHIP Midgap Dit

The primary reported Dit is labelled **Minimum Dit (PV2000-style)**. It is the minimum accepted **discrete** variation-method Dit point. PCHIP interpolation never changes this value.

The optional PCHIP branch is used for **Midgap Dit (PCHIP)** and the green fitted curve only. It offers two preprocessing methods:

- **Median-binned PCHIP** — default. After the existing accepted-point/outlier filtering, nearby points are grouped into fixed Vsb bins. The default bin width is **10 mV**. Each bin is represented by median Vsb and the median Dit value in the selected interpolation space, then PCHIP is applied to those representatives.
- **PCHIP (original)** — preserves the previous raw-point preprocessing for compatibility/regression. Only essentially identical Vsb values (<1e-12 V apart) are collapsed before PCHIP.

Shared controls:

- **Median Vsb window** — adjustable in mV and used only by Median-binned PCHIP; default 10 mV.
- **PCHIP outlier limit** — rejects high Dit points inside the 0.1–0.5 V fit window.
- **Interpolation scale** — `LOG10` (default) fits `log10(Dit)`; `Linear` fits Dit directly. Median-binned PCHIP also computes its per-bin median in the selected interpolation space.

The 10 mV default was selected after comparing the supplied real Dit–Vsb data against 5 mV, 10 mV, 20 mV, original PCHIP, LOWESS, MAKIMA and smoothing-spline candidates. It suppresses dense end-region zig-zagging while leaving the sparse midgap trend essentially unchanged on that dataset. This is an analyzer smoothing choice, not a vendor PV-2000 algorithm claim.

For COCOS-II, PCHIP preprocessing is applied after COCOS-II reconstructs signed Vsb and after the Min/Max Vsb acceptance mask is formed. Therefore COCOS-II and either PCHIP method can be used together without redefining the PV2000-style minimum Dit.

## Standard COCOS

When Standard COCOS is active, the analyzer uses the XML `VsbCorrectionFactor` with measured dark/light curves and the group MATLAB-compatible variation/PCHIP path.

The Dit model now uses one 300 K silicon intrinsic-carrier concentration throughout: `ni = 9.65e9 cm^-3`. This is the **legacy MATLAB midgap value**, adopted as the unified Dit-model value. The inherited Qsc implementation previously used the rounded `1.00e10 cm^-3` while the midgap target used `9.65e9 cm^-3`; the original program documents no reason for that difference. This cleanup therefore changes Qsc slightly and is not presented as a vendor-algorithm claim.

The previously documented W1 regression (about 2.6% mean difference for minimum Dit and Qtot) predates this ni unification. Re-run the private Standard COCOS reference regression before quoting an exact post-change error figure.

## PV2000 COCOS-II (inferred)

This is now the default COCOS-II path when **Follow XML setting** sees `UseCocosII=true`. Its status is **inferred**, not vendor-exact. It is based on repeated PV-2000 reprocessing of the same raw dataset while changing one adjustment at a time, plus the displayed Vcpd-Qc curves.

Current inferred model:

1. retain the same dark V-Q curve and flatband anchor used by the analyzer;
2. interpret the PV-2000 `COCOS II EOT` numeric setting as **ångström**, not nm;
3. compute `Cox = 3.9 ε0 / EOT` and synthetic-light slope `dV/dQc = q/Cox`; therefore 100 Å gives ~0.46398 V per 1e12 q/cm²;
4. create a straight synthetic light curve through the flatband anchor;
5. use a **signed** surface barrier. For n-type, `Vsb = Vlight,synthetic - Vdark`; p-type uses the opposite polarity so accumulation retains the same sign convention;
6. use the existing semiconductor-Qsc and adjacent-step variation Dit calculation;
7. apply `COCOSII Min Vsb` / `COCOSII Max Vsb` only as a signed-Vsb acceptance window for selecting the reported minimum Dit. Defaults are -0.10 V and +0.65 V;
8. if no Dit segment survives the window, return NaN/invalid rather than PV-2000's apparent 1e99/1e100 sentinel values.

Evidence from the supplied same-raw-data parameter sweeps: changing Min/Max Vsb changed Dit while VDark, VLight, summary Vsb, Vfb, Qsc, Qtot and Qit remained unchanged; EOT changes affected the COCOS-II result; toggling Back Surface Shift produced no observable output change on this dataset. The exact proprietary Min/Max selection semantics could still contain extra conditions, so the current window rule is the simplest model consistent with the observations.

### COCOS-II parameter defaults and suggestions

Missing numeric XML fields no longer collapse to JavaScript zero. An absent Min/Max setting therefore correctly falls back to the inferred defaults `-0.10 V` and `+0.65 V` instead of producing `0/0` and invalidating the calculation.

The analyzer also computes a **data-derived suggestion**:

- EOT suggestion = median dark-accumulation EOT across usable sites, converted to Å;
- Min/Max suggestion = the inferred vendor default window, expanded outward in 0.05 V steps only when reconstructed signed-Vsb coverage extends beyond the default bounds, with a small margin.

The suggestion is advisory. If XML contains a positive COCOS-II EOT, the XML value remains applied until the user presses **Use** and then applies the settings. Invalid user settings such as `Max Vsb <= Min Vsb` raise an explicit analysis error and do **not** silently fall back to Standard COCOS.

The UI reports, for the current site, the number of accepted Dit intervals and the Vsb location of the discrete minimum to make Min/Max-window behavior auditable.

`Back Surface Shift` is recorded for traceability but deliberately **not applied**. Its mathematical effect has not been identified.

## Known boundaries

- Exact proprietary PV-2000 `Vfb` and absolute `Qit` are not yet reproduced.
- A historical charge-derivative diagnostic is retained internally for one release cycle but is absent from the normal UI and chart CSV. The current implementation differentiates `qit = -Qsc - (Qc - Qsurface)`; it is not simply `dQc/dVsb`, and its polarity/flatband assumptions remain unresolved. Do not label it as a validated Dit result.
- EOT is always SiO2-equivalent electrical thickness. For any other dielectric or multilayer stack it is not the physical stack thickness; Cox is the more material-independent underlying quantity.
