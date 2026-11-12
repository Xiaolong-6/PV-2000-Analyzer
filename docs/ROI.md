# Spatial Region of Interest (ROI)

ROI is an **Analyzer-only spatial selection** for multi-site maps. It does not modify XML data, change an underlying PV-2000 result, adjust a numerical scientific model, or claim PV-2000 vendor parity.

## Using ROI

1. Open a supported multi-site XML result and choose **ROI** in the Map header.
2. Select **Rectangle**, **Circle**, or **Sector**, then drag from a starting location on the map.
3. Use **Edit** to drag the shape or its handles, or enter precise dimensions and center coordinates in millimetres and select **Apply**.
4. Use the **Statistics** selector to switch between **Whole sample** and the selected ROI. The ROI menu can retain multiple named regions.
5. Use **Inspect** (or close the ROI panel) for normal Map site-click inspection. **Esc** exits ROI editing; **Delete** removes the selected ROI when an editable field is not focused.

The circle uses a center and radius; the rectangle uses center, width, height and counterclockwise rotation; the sector uses center, radius, start angle and sweep angle. Sector angles are measured counterclockwise from +X in the physical X/Y plane; a sweep of 360 degrees is a full disk. No screen-pixel coordinates are stored.

The chosen ROI is visibly outlined on the Map. **Distribution** and **Results summary** label the selected ROI when ROI statistics are active; switching to Whole sample preserves drawn shapes. Map color normalization and point selection remain based on the existing data and do not change solely because ROI statistics are active.

## Statistical contract

A site is inside an ROI if its **physical measurement-site center** is inside the region. Boundaries are inclusive. The statistics do not measure geometric area overlap, reweight cells by overlap fraction, or sample interpolated Smooth Map pixels.

For a metric q at site i, the included statistical population is:

`ROIContains(site[i]) AND selection.metricMask(q)[i]`

This combines spatial membership with the existing valid-data filter, intrinsic algorithm validity, and per-metric availability. Site-aligned measurements keep their original index space. Sites without finite X/Y coordinates cannot enter a spatial ROI. A zero-site or one-site ROI does not invent a population distribution; sample standard deviation is unavailable for fewer than two finite samples.

The ordinary Map, acquisition profiles, selected-site details, raw readings and scientific calculations are not silently constrained by the ROI statistical scope. The Map remains a whole-sample reference and its ROI outline identifies the analysis subset.

## Supported measurement surfaces

- ISC / VCPD, QSS-µPCD, JZero, SPV: multi-point Map, Distribution and Results summary.
- LBIC: spatial ROI for the current site geometry, applied to Distribution and per-quantity Results summary for the active iteration/beam.
- CET: multi-point SVG map and associated population statistics.
- DIT: multi-point SVG wafer map and Results summary. DIT currently has no separate Distribution surface, so ROI does not create a fake one.
- Single-point measurement-position surfaces and Generic XML Inspector do not expose ROI drawing.

ROI geometry is session-local to the current XML view; it is not injected into the source XML and is not automatically persisted between imports.

## Engineering contract

`src/core/roi.js` owns the three physical-coordinate containment tests, selection-mask composition and the single editor/controller shared by Canvas and SVG maps. Measurement modules supply site coordinates and a rendering projection (`X`, `Y`, plot dimensions) to the editor, not custom hit-test code.

`PV.roi.combineMasks` requires aligned selection and coordinate arrays. The session adapter pads unavailable site coordinates with nulls to preserve the measurement index space. The ROI mask must not replace the intrinsic support/availability mask or leak into calculation functions; only presentation-level population statistics use the intersection.

For changes, test boundary inclusion, rotation, angle wrap, empty/nonfinite coordinates, filter/ROI intersections and repeated interaction after map resize and zoom. Run `npm run check` and `npm run build`, then visually inspect Canvas/SVG maps at wide, medium and narrow viewport sizes.
