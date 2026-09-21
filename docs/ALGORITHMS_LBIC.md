# LBIC analyzer algorithm and validation status

## Scope

The `LBICMeasurement` module is an XML-only spatial raster viewer. It is intentionally designed around **raster position × beam/wavelength × channel**, because LBIC files may contain multiple wavelengths and different combinations of current, direct/diffuse/total reflectance, EQE and IQE.

The supplied development examples cover only one 984 nm beam and raw `Current`, `DirectReflection` and `ScatteredReflection`. The parser therefore discovers numeric BeamData attributes dynamically instead of hard-coding those three fields.

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

The current **X-fast, row-major, downward-Y** convention is **inferred**, not vendor-export validated. The point-count invariant `DataItem count == nx*ny` is checked before coordinates are exposed.

### What is needed to validate orientation/order

Provide one LBIC XML plus either:
- its matching PV-2000 point export containing X/Y, or
- a PV-2000 map screenshot/export with an unmistakably asymmetric physical feature whose orientation is known.

Then compare every reconstructed coordinate and acquisition index. If a serpentine or opposite-Y case is found, geometry should become explicit per pattern rather than silently flipping data.

## Derived optical/electrical quantities

The PV-2000 manual states that total reflectance includes direct and scattered reflectance, QE is short-circuit current normalized to laser photon flux, and IQE is determined using total reflectance. Based on that description, the module exposes these **inferred** candidates only when equivalent raw XML channels are absent:

```
Rtotal[%] = Rdirect[%] + Rdiffuse[%]
EQE[%]    = (I[µA] * 1e-6 / q / photonFlux) * 100
IQE[%]    = EQE[%] / (1 - Rtotal[%] / 100)
```

Signed current is preserved. IQE is invalid when `Rtotal >= 100%`. These calculations are not labelled vendor-exact.

### What is needed to validate Total R / EQE / IQE

Provide a matching PV-2000 export or display that reports pointwise (preferred) or summary:
- Total reflectance,
- QE/EQE,
- IQE,
- wavelength/beam index and photon flux calibration.

Regression should check pointwise values and units. If the vendor uses gain/sign/offset/calibration factors, the formulas above must be revised before changing their status from **inferred** to **validated**.

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

The four supplied examples structurally pass:
- 51×51 → 2601 points,
- 101×101 → 10201 points,
- SquareRegionPattern Region/Dimension parsing,
- Beam key 0,
- 984 nm / power 0.6,
- Current + DirectReflection + ScatteredReflection,
- FluxCache key 0.

This is structural validation, not vendor numerical parity for coordinate orientation or derived quantities.
