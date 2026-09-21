# DIT / COCOS module notes

The modular Dit analyzer continues the standalone COCOS work while keeping XML as the only runtime input.

Implemented outputs include Vcpd dark/light curves, surface-barrier curve, barrier-adjustment Initial Qc bookkeeping, semiconductor Qsc, variation-method minimum/midgap Dit, accumulation-slope Cox and SiO2-equivalent EOT, differential-capacitance flatband and Qtot.

## Standard COCOS

When XML `UseCocosII=false`, the analyzer uses the XML `VsbCorrectionFactor` with measured dark/light curves and the group MATLAB-compatible variation/PCHIP path. On the supplied W1 reference, previous regression found about 2.6% mean relative difference versus PV-2000 for minimum Dit and about 2.6% mean absolute relative error for Qtot across valid sites.

## COCOS-II XML support

When XML `UseCocosII=true`, the analyzer automatically switches the primary Dit calculation to a guide-derived COCOS-II correction:

1. keep the measured dark V-Q curve;
2. use the same extracted flatband anchor;
3. replace the measured light curve with a straight synthetic light curve;
4. take its slope from XML `CocosIIEOT` when present/positive, otherwise from the dark accumulation slope;
5. calculate corrected `|Vsb| = |Vdark - Vlight,synthetic|`;
6. run the same variation/PCHIP Dit extraction on corrected Vsb.

The UI shows measured and synthetic light curves plus raw-standard and corrected Vsb for audit. This implementation follows the supplied COCOS-II guide, but **has not yet been regression-validated against a PV-2000 export from a measurement with `UseCocosII=true`**. Keep that caveat until such a reference is supplied.

## Known boundaries

- Exact proprietary PV-2000 `Vfb` and absolute `Qit` are not yet reproduced.
- Legacy direct-charge Dit remains an optional audit overlay only; do not promote it to the primary result without resolving its polarity/flatband assumptions.
- EOT is always SiO2-equivalent electrical thickness. For any other dielectric or multilayer stack it is not the physical stack thickness; Cox is the more material-independent underlying quantity.
