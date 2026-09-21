# LBIC analyzer algorithm and validation status

## Scope

The `LBICMeasurement` module is an XML-only spatial raster viewer. It is intentionally designed around **raster position × beam/wavelength × channel**, because LBIC files may contain multiple wavelengths and different combinations of current, direct/diffuse/total reflectance, EQE and IQE.

The paired XML+CSV validation references currently use one beam per file and expose raw `Current`, `DirectReflection` and `ScatteredReflection`. Their concrete wavelength/power/FluxCache values are **reference values, not validation gates**. Validation is attached to the input/output relationship and units: e.g. a different wavelength or a slightly different calibrated photon flux does not by itself make the same current/FluxCache calculation unvalidated. The parser therefore discovers numeric BeamData attributes dynamically instead of hard-coding one fixture.

## Raw data and provenance

Raw XML values always take priority. Known names are mapped to canonical concepts for display, while unknown numeric BeamData attributes are retained and exported under their XML names.

Laser metadata are joined by `BeamData/Item/@Key == LaserSettings/LBICLaserSetting/Index`. `FluxCache` is also indexed by the same integer key when present.

Supported raw concepts include current, direct/specular reflectance, diffuse/scattered reflectance, total reflectance, EQE/QE and IQE. A future XML containing a vendor Total R, EQE or IQE therefore suppresses the corresponding calculated candidate.

## Rectangular raster reconstruction

For `SquareRegionPattern`, geometry is read from structured `Region` and `Dimension` fields. `Pattern/Name` is display metadata only and is never parsed for coordinates; the supplied examples demonstrate that it can be stale.

For Dimension `nx × ny` and Region `(x0,y0,width,height)`:

```
dx = width / (nx - 1)
dy = height / (ny - 1)
index = row * nx + col
x = x0 + col * dx
y = y0 - row * dy
```

The **X-fast, row-major, downward-Y** convention is vendor-validated for the paired `SquareRegionPattern` references. The validated contract is the transformation from structured `Region` + `Dimension` + acquisition index to coordinates, not one specific region size or beam setting. The point-count invariant `DataItem count == nx*ny` is checked before coordinates are exposed.

This validation does not automatically cover a different pattern type, a serpentine acquisition mode, or a future XML schema with different ordering semantics. Those would need their own paired reference.

## Derived optical/electrical quantities

The PV-2000 manual states that total reflectance includes direct and scattered reflectance, QE is short-circuit current normalized to laser photon flux, and IQE is determined using total reflectance. The paired vendor references validate the following derived relationships when equivalent raw XML channels are absent and the documented units/semantics apply:

```
Rtotal[%] = Rdirect[%] + Rdiffuse[%]
EQE[%]    = (I[µA] * 1e-6 / q / photonFlux) * 100
IQE[%]    = EQE[%] / (1 - Rtotal[%] / 100)
```

Signed current is preserved. IQE is blanked when `Rtotal >= 100%`; that blanking behavior is part of the validated relationship.

### Validation domain

The current validation applies to the **combination of inputs, units and transformation**, not to exact fixture constants. In particular:

- `Rtotal = Rdirect + Rscattered` is validated for percentage reflectance channels;
- current-to-photon-flux normalization is validated for current expressed in µA and `FluxCache` interpreted as calibrated photons/s;
- IQE is validated for the above normalization combined with total reflectance and the electron charge constant used by the implementation;
- changing wavelength, laser power or the numeric `FluxCache` value does not alone invalidate those relationships, provided the channel meanings and units are unchanged.

A new input **kind** or semantic combination still needs regression. Examples include current in a different unit, reflectance encoded as a 0–1 fraction instead of percent, a different meaning for `FluxCache`, or a vendor correction/gain field not present in the validated references.

## Multi-wavelength support

The data model accepts arbitrary BeamData keys and does not assume one beam. Laser index, wavelength, power and FluxCache are stored per beam. Current UI switches beam/wavelength and the full export emits all beam/channel columns.

The supplied examples do not exercise multiple beams, so multi-beam parsing is structurally supported but still needs a real multi-wavelength XML regression sample.

## Diffusion length

The manual states that two LBIC wavelengths with different penetration depths can be used to determine minority-carrier diffusion length. This branch deliberately does **not** invent that vendor calculation.

Status: **unsupported for calculation** unless the XML already carries an explicit raw diffusion-length channel.

To implement it later, provide:
1. a multi-wavelength LBIC XML where DL is enabled,
2. matching PV-2000 DL output/map,
3. wavelengths and calibrated photon fluxes,
4. any recipe fields affecting absorption/penetration-depth or optical correction.

Reverse-engineer against the vendor output, add pointwise regression tests, and only then expose a calculated DL map.

## Current validation evidence

The four paired XML+CSV references establish vendor parity for the relationships listed above. Observed fixture values include 51×51 and 101×101 rasters, a single beam, 984 nm, power 0.6 and one calibrated FluxCache value. Those exact numbers describe the fixtures; they are **not** used as a whitelist.

What remains outside the current vendor-regressed domain:
- true multi-beam / multi-wavelength files and any beam-interleaving edge cases;
- non-`SquareRegionPattern` geometry/order;
- alternative units or channel semantics;
- calculated diffusion length.
