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

Controls are contextual. **Material** is selected in Analysis controls and defaults to **Silicon (Si)**. COCOS-II EOT and Min/Max Vsb appear only when the inferred PV2000 COCOS-II path is active. Flatband controls remain visible because they feed both Standard COCOS and COCOS-II. **Optional Midgap Dit (PCHIP)** is always visible in Analysis controls with a checkbox; it is enabled by default. When unchecked, Midgap Dit and the PCHIP curve are disabled while the discrete Minimum Dit calculation is unchanged. Applying settings re-renders the analysis while keeping the Analysis controls panel open.

## Analyzer valid-data filter

DIT uses the shared site-selection controller/UI for **site-level presentation and statistics only**. The filter sits after the scientific calculation. It does not participate in flatband extraction, semiconductor Qsc, the adjacent-step variation Dit calculation, Minimum Dit selection, Midgap target calculation or PCHIP preprocessing/interpolation.

The intrinsic site-support mask is the existing DIT algorithm validity (`site.valid`). A user range filter can only narrow that intrinsic population; it cannot make an algorithm-invalid site valid. The selected filter metric may be Qtot, Minimum Dit, Midgap Dit (when PCHIP is enabled), EOT, Cox, Qsc, Initial Qc or Max |Vsb|. Each displayed quantity then adds its own finite-value availability on top of the shared active mask.

The active population is used by **Results summary**, wafer-map color scaling/display state and wafer-map CSV export. Current-site Vcpd–Qc, Vsb–Qc and Dit–Vsb curves remain available for inspection even when the selected site is filtered out, and their exports remain unchanged. Filtered sites stay visible as unfilled map markers so site indexing/spatial context are preserved.

Changing Analysis controls can change the calculated quantities themselves, so applying new analysis settings rebuilds the filter metrics and resets the numeric range for the previously selected filter quantity when that quantity still exists. Turning PCHIP off removes Midgap Dit from the filter choices.

Map export preserves every site and records algorithm validity, selected-quantity availability, filter pass/display state, filter metric and lower/upper bounds. `1–99%` and `Reset` are Analyzer conveniences and are not PV-2000 validity rules.

## Minimum Dit versus optional PCHIP Midgap Dit

The primary reported Dit is labelled **Minimum Dit (PV2000-style)**. It is the minimum accepted **discrete** variation-method Dit point. PCHIP interpolation never changes this value.

The optional PCHIP branch is used for **Midgap Dit (PCHIP)** and the green fitted curve only. It offers two preprocessing methods:

- **Median-binned PCHIP** — default. After the accepted-point filtering and any optional manual outlier threshold, nearby points are grouped into fixed Vsb bins. The default bin width is **10 mV**. Each bin is represented by median Vsb and the median Dit value in the selected interpolation space, then PCHIP is applied to those representatives.
- **PCHIP (original)** — preserves the previous raw-point preprocessing for compatibility/regression. Only essentially identical Vsb values (<1e-12 V apart) are collapsed before PCHIP.

Shared controls:

- **Median Vsb window** — adjustable in mV and used only by Median-binned PCHIP; default 10 mV.
- **PCHIP outlier limit** — optional manual upper Dit threshold inside the 0.1–0.5 V fit window. It is **disabled by default**; leaving the field blank keeps all finite points. Entering a finite positive value preserves the previous absolute-threshold behavior for difficult datasets. It affects only the optional PCHIP branch, never Minimum Dit.
- **Interpolation scale** — `LOG10` (default) fits `log10(Dit)`; `Linear` fits Dit directly. Median-binned PCHIP also computes its per-bin median in the selected interpolation space.

Midgap PCHIP is interpolation-only. The theoretical midgap Vsb must lie inside the measured Vsb coverage and inside the retained PCHIP knot domain after preprocessing. The analyzer never extrapolates a Midgap Dit beyond measured/retained coverage. When coverage is insufficient, Midgap Dit remains unavailable and the UI reports the target Vsb and the limiting coverage range.

The 10 mV default was selected after comparing the supplied real Dit–Vsb data against 5 mV, 10 mV, 20 mV, original PCHIP, LOWESS, MAKIMA and smoothing-spline candidates. It suppresses dense end-region zig-zagging while leaving the sparse midgap trend essentially unchanged on that dataset. This is an analyzer smoothing choice, not a vendor PV-2000 algorithm claim.

For COCOS-II, PCHIP preprocessing is applied after COCOS-II reconstructs signed Vsb and after the Min/Max Vsb acceptance mask is formed. Therefore COCOS-II and either PCHIP method can be used together without redefining the PV2000-style minimum Dit.

## Semiconductor material model

The **Material** selector is an Analyzer-level semiconductor model control. PV-2000 itself does not expose a Si/Ge material selector in these DIT result files. The selected Analyzer model feeds semiconductor Qsc, the adjacent-step variation Dit calculation (and therefore Minimum Dit), the flatband semiconductor-capacitance criterion, Qtot, and the theoretical Midgap Dit target.

Current 300 K compatibility parameters are inherited from the legacy MATLAB path:

| Material | ni [cm^-3] | εr | Analyzer status |
|---|---:|---:|---|
| Silicon (Si) | 9.65e9 | 11.68 | default Analyzer model; existing Si-sample reference path |
| Germanium (Ge) | 2e13 | 16.2 | Analyzer-only legacy MATLAB compatibility model |

The active Si implementation uses the legacy MATLAB midgap `ni = 9.65e9 cm^-3` consistently in both the midgap target and Qsc. The earlier inherited Qsc code used the rounded `1.00e10 cm^-3`; that mismatch was removed previously.

The Ge option must not be described as a PV-2000 Ge mode. A Ge sample can be measured and its result exported by PV-2000 without PV-2000 selecting a different semiconductor model. Comparisons against such exports test how the Analyzer's optional Ge model behaves on those samples; they do not establish a vendor material mode. The Analyzer never infers material from a sample name or substrate identifier.

The previously documented Si W1 regression (about 2.6% mean difference for minimum Dit and Qtot) predates the Si ni unification. Re-run the private Standard COCOS reference regression before quoting an exact post-change error figure.

## Initial Qc bookkeeping

PV-2000 final-result `Initial Qc` includes the initial charged state before the stored PreProcess attempts. For a PreProcess corona-charge step `ΔQ_pre` and `N_pre` stored dark-vector attempts,

```text
Initial Qc = (N_pre + 1) × ΔQ_pre
```

The extra one is required even though the XML contains only `N_pre` PreProcess dark vectors. The 100-case paired final-result corpus validates this bookkeeping exactly on **43 sites across 13 files**, over charge steps ranging from `-5e10` to `-1e14 cm^-2`.

This is a direct/bookkeeping result, not a new Standard COCOS formula.

## Final-result corrected VLight

The vendor final-result point table does not report the raw measured initial light value directly when `VsbCorrectionFactor != 1`. After offset removal, let `D` be initial dark, `L` the measured initial light and `F` the XML correction factor. The final-result light value is:

```text
Vsb_direct = F × (D - L)
VLight_result = D - Vsb_direct
```

Across **43 sites in 13 paired final-result files**, this reproduces vendor `VLight` to floating-point precision (maximum absolute error about **3.8e-15 V**). The largest measured-versus-result difference, about **83.1 mV**, is explained by this correction and is not an unexplained processing drift.

This result-table reconstruction is kept separate from the measured-light arrays used by Standard COCOS analysis. The two N-type regenerated result rows use the current-DLL direct Vsb sign, which conflicts with the stronger historical doping-aware Standard-COCOS sign evidence; that sign boundary remains unchanged.

## Standard COCOS

Standard COCOS keeps the measured dark/light XML branch. After Vcpd offset removal, let `D` and `L` be the measured dark and light values and `F` the XML `VsbCorrectionFactor`. The signed result convention is:

```text
direct = F * (D - L)
P-type Vsb = direct
N-type Vsb = -direct
```

The previous unconditional `abs(...)` lost real sign information and is no longer used. The same sign rule is applied to the initial dark/light state.

A private nine-pair one-point reference set exposes an additional export distinction: its PV-2000 Raw COCOS CSVs contain an almost straight processed `Vcpd Light` branch that does not equal the measured light means stored in the matching XMLs even though the XMLs have `UseCocosII=false`. The XML alone does not uniquely encode whether or how that extra reprocessing was applied. The browser runtime therefore preserves the measured Standard COCOS branch and does **not** guess a straight corrected-light branch merely to fit those exports.

## NinePointPattern geometry

`NinePointPattern/Coefficients` are treated as target-relative coordinates rather than physical millimetres. Raw coefficients are preserved for audit, while map/export geometry consumes canonical `pointsMm`.

For a RoundWafer:

```text
Rscheduled = Diameter/2 - EdgeExclusion
x_mm = x_coefficient * Rscheduled
y_mm = y_coefficient * Rscheduled
```

The W1-style 100 mm / 4 mm-edge family therefore uses a 46 mm scheduled radius. A coefficient magnitude `0.632455532...` maps to approximately `29.09 mm`.

This interpretation is **inferred** pending a matching PV-2000 X/Y export. The analyzer no longer displays these coefficients directly as millimetres.

## OnePointPattern geometry

`OnePointPattern` is not a spatial map. The Analyzer still shows the measurement location in spatial context, but its outline and autoscale come from the XML target geometry rather than from the single point's coordinate extent. For `RoundWafer`, the solid outline uses `Diameter/2` and the dashed scheduled boundary uses `Diameter/2 - EdgeExclusion`. A center-only one-point measurement is labelled **Measurement position**, not presented as a heatmap.

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
