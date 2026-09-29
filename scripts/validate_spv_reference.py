#!/usr/bin/env python3
"""Validate standard SPVMeasurement XML against matching PV-2000 CSV output."""

from __future__ import annotations

import csv
import glob
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def lname(tag):
    return tag.rsplit('}', 1)[-1]


def child(node, name):
    if node is None:
        return None
    return next((item for item in list(node) if lname(item.tag) == name), None)


def children(node, name):
    if node is None:
        return []
    return [item for item in list(node) if lname(item.tag) == name]


def attr_type(node):
    if node is None:
        return ''
    for key, value in node.attrib.items():
        if lname(key) == 'type':
            return value
    return ''


def number(node, name, default=math.nan):
    item = child(node, name)
    if item is None or item.text is None:
        return default
    try:
        return float(item.text)
    except ValueError:
        return default


def text(node, name, default=''):
    item = child(node, name)
    return item.text.strip() if item is not None and item.text else default


def vector_mean(node):
    values = []
    for item in list(node) if node is not None else []:
        try:
            values.append(float(item.text))
        except (TypeError, ValueError):
            pass
    return sum(values) / len(values) if values else math.nan


def lnl(x, ratio, ratio_ok):
    return math.log(1 + x) / math.log(1 + x / ratio_ok) - ratio


def linearity_factor(spv8_global, spv8_reduced, ratio_ok):
    ratio, rok = spv8_global / spv8_reduced, ratio_ok - 0.03
    lo, hi, tol = 0.001, 400.0, 1e-15
    flo, fhi = lnl(lo, ratio, rok), lnl(hi, ratio, rok)
    if flo * fhi >= 0:
        return -1.0
    if flo < 0:
        root, dx = lo, hi - lo
    else:
        root, dx = hi, lo - hi
    for _ in range(200):
        dx *= 0.5
        mid = root + dx
        fmid = lnl(mid, ratio, rok)
        if fmid <= 0:
            root = mid
        if abs(dx) < tol or fmid == 0:
            break
    return root


def penetration(wavelength_nm, temperature):
    dt = 0.0 if temperature < 15 or temperature > 45 else temperature - 21
    wavelength_a = wavelength_nm * 10.0
    energy = 12395.0 / wavelength_a
    corrected = energy + (1.3 * energy - 1.0) * 0.001 * dt
    alpha = 84.732 * corrected / 1.2395 - 76.417
    return 10000.0 / (alpha * alpha)


def n_si(wavelength_a):
    if wavelength_a < 7500:
        return 3.67
    if wavelength_a > 10300:
        return 3.53
    return 3.55 + (10000 - wavelength_a) * 5e-5


def oxide_reflectance(thickness, wavelength_um):
    nox, r1 = 1.46, 0.187
    wavelength_a = wavelength_um * 10000.0
    nsi = n_si(wavelength_a)
    r2 = (nsi - nox) / (nsi + nox)
    cross = r1 * r2 * math.cos((4 * nox * thickness / wavelength_a - 1) * math.pi)
    return (r1 * r1 + r2 * r2 + 2 * cross) / (1 + r1 * r1 * r2 * r2 + 2 * cross)


def oxide_correction(wavelength_nm, thickness):
    u = wavelength_nm / 1000.0
    return (1 - oxide_reflectance(thickness, u)) / (1 - oxide_reflectance(0, u))


def lifetime(dl, is_p):
    mobility = 1288.07 if is_p else 461.511
    return dl * dl * 0.01 / (0.0259 * mobility)


def enhanced_equation(length_cm, surface_velocity, wafer_cm, ratio, z6_cm, z8_cm, is_p):
    diffusion = 36.4 if is_p else 12.2
    a = diffusion / length_cm
    if surface_velocity != 0:
        sw = math.sinh(wafer_cm / length_cm)
        cw = math.cosh(wafer_cm / length_cm)
        b = ((a / surface_velocity) * sw + cw) / (
            sw + (a / surface_velocity) * cw
        )
    else:
        b = math.tanh(wafer_cm / length_cm)
    return (
        ((1 - (z6_cm / length_cm) ** 2) / (1 - (z8_cm / length_cm) ** 2))
        * ((1 - b * z8_cm / length_cm) / (1 - b * z6_cm / length_cm))
        - ratio
    )


def enhanced_dl(ratio, z6_um, z8_um, wafer_um, surface_velocity, is_p):
    if not all(math.isfinite(v) for v in (
        ratio, z6_um, z8_um, wafer_um, surface_velocity
    )) or wafer_um <= 0:
        return math.nan
    wafer_cm, z6_cm, z8_cm = wafer_um * 1e-4, z6_um * 1e-4, z8_um * 1e-4
    fn = lambda length: enhanced_equation(
        length, surface_velocity, wafer_cm, ratio, z6_cm, z8_cm, is_p
    )
    lo, hi = 0.001, 3.0
    flo, fhi = fn(lo), fn(hi)
    if not (math.isfinite(flo) and math.isfinite(fhi)) or flo * fhi > 0:
        return math.nan
    if flo == 0:
        return lo * 1e4
    if fhi == 0:
        return hi * 1e4
    for _ in range(220):
        mid = (lo + hi) / 2
        fm = fn(mid)
        if not math.isfinite(fm):
            return math.nan
        if abs(fm) < 1e-14 or abs(hi - lo) < 1e-15:
            lo = hi = mid
            break
        if flo * fm <= 0:
            hi, fhi = mid, fm
        else:
            lo, flo = mid, fm
    value = (lo + hi) / 2 * 1e4
    return value if 0 < value <= 2500 else math.nan


def calculate(spv8, spv6, s):
    if s['parse_signals']:
        return math.nan, math.nan
    c8, c6 = spv8, spv6
    factor = linearity_factor(s['spv8_global'], s['spv8_reduced'], s['ratio_ok'])
    z6, z8 = penetration(s['w6'], s['chuck']), penetration(s['w8'], s['chuck'])
    if s['texture_enabled'] and 0 < s['texture'] <= 1:
        z6 *= s['texture']
        z8 *= s['texture']
    if factor != -1:
        c8 = spv8 * factor / math.log(1 + factor)
        c6 = spv8 / math.log(1 + factor) * ((1 + factor) ** (spv6 / spv8) - 1)
    # PV-2000's historical helper signature/caller order cross-maps the XML coefficients:
    # SPV8 uses the stored LED6 coefficient; SPV6 uses the stored LED8 coefficient.
    t8 = 1 / (1 + s['tc6'] * (s['led'] - 26))
    t6 = 1 / (1 + s['tc8'] * (s['led'] - 26))
    if s['oxide'] <= 0:
        r8, r6 = min(1, max(0, s['r8'])), min(1, max(0, s['r6']))
        if r8 != 1 and r6 != 1:
            c8 /= 1 - r8
            c6 /= 1 - r6
    else:
        c8 *= oxide_correction(s['w8'], s['oxide'])
        c6 *= oxide_correction(s['w6'], s['oxide'])
    c8 /= t8
    c6 /= t6
    if not (spv8 > spv6) or c6 == 0:
        return math.nan, math.nan
    ratio = c8 / c6
    dl = (
        enhanced_dl(
            ratio, z6, z8, s['wafer_thickness'], s['bsr_velocity'], s['is_p']
        )
        if s['enhanced']
        else (z6 - ratio * z8) / (ratio - 1)
    )
    if not (0 < dl <= 2500):
        return math.nan, math.nan
    return dl, lifetime(dl, s['is_p'])


def parse_xml(path, enhanced_override=None):
    root = ET.parse(path).getroot()
    measurement = child(root, 'Measurement')
    if attr_type(measurement) != 'SPVMeasurement':
        raise ValueError(f'{path.name}: expected SPVMeasurement')
    md = child(measurement, 'MeasurementData')
    iteration = child(child(md, 'IterationData'), 'Iteration')
    s = {
        'multiplier': number(measurement, 'Multiplier', 1000),
        'oxide': number(md, 'OxideThickness', number(measurement, 'OxideThickness', 0)),
        'w8': number(md, 'Wavelength8'),
        'w6': number(md, 'Wavelenght6'),
        'tc8': number(md, 'TemperatureCorrectionCoefficientLED8', 0),
        'tc6': number(md, 'TemperatureCorrectionCoefficientLED6', 0),
        'chuck': number(iteration, 'ChuckTemperature'),
        'led': number(iteration, 'LEDTemperature'),
        'linearity_method': text(measurement, 'LinearityRatioMethod', 'UseMeasuredLR'),
        'manual_linearity': number(measurement, 'ManualLinearityRatioValue'),
        'spv8_global': number(measurement, 'ManualLinearityRatioValue') if text(measurement, 'LinearityRatioMethod', 'UseMeasuredLR') == 'UseManualLR' else number(iteration, 'SPV8Global'),
        'spv8_reduced': 1.0 if text(measurement, 'LinearityRatioMethod', 'UseMeasuredLR') == 'UseManualLR' else number(iteration, 'SPV8ReducedGlobal'),
        'ratio_ok': number(iteration, 'LineartiyRatioOK'),
        'r8': number(measurement, 'ReflectivityCorrection8', 0),
        'r6': number(measurement, 'ReflectivityCorrection6', 0),
        'texture_enabled': text(measurement, 'UseTextureCorrection').lower() == 'true',
        'texture': number(measurement, 'TextureCorrection'),
        'enhanced': text(measurement, 'UseEnhancedMode').lower() == 'true',
        'parse_signals': text(measurement, 'ParseSignals').lower() == 'true',
        'wafer_thickness': number(measurement, 'WaferThickness'),
        'bsr_velocity': number(measurement, 'BSRVelocity'),
        'is_p': text(measurement, 'DopingType', 'PType') == 'PType',
    }
    if enhanced_override is not None:
        s['enhanced'] = enhanced_override
    out = []
    for item in children(child(iteration, 'Data'), 'DataItem'):
        signal = child(item, 'Signal')
        vectors = list(signal) if signal is not None else []
        spv8 = vector_mean(vectors[0]) * s['multiplier']
        spv6 = vector_mean(vectors[1]) * s['multiplier']
        dl, tau = calculate(spv8, spv6, s)
        out.append((dl, tau, spv8, spv6))
    return out


def parse_number(value):
    value = (value or '').strip()
    if not value or value.lower().startswith('ud') or value.lower() == 'nan':
        return math.nan
    return float(value)


def parse_csv(path):
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.reader(handle, delimiter=';'))
    hi = next(i for i, row in enumerate(rows) if row and row[0].strip() == 'Point.X[mm]')
    header = [item.strip() for item in rows[hi]]
    names = ['DL [μm]', 'Tau [μs]', 'SPV8 [mV]', 'SPV6 [mV]']
    indices = [header.index(name) for name in names]
    return [tuple(parse_number(row[i]) for i in indices) for row in rows[hi + 1:] if row and row[0].strip()]


def max_error(calc, vendor):
    error = 0.0
    mismatch = 0
    for a, b in zip(calc, vendor):
        if math.isfinite(a) != math.isfinite(b):
            mismatch += 1
        elif math.isfinite(a):
            error = max(error, abs(a - b))
    return error, mismatch


def validate(xml_path, csv_path):
    calc, vendor = parse_xml(xml_path), parse_csv(csv_path)
    if len(calc) != len(vendor):
        raise AssertionError(f'row count {len(calc)} != {len(vendor)}')
    results = [max_error([row[i] for row in calc], [row[i] for row in vendor]) for i in range(4)]
    enhanced = is_enhanced(xml_path)
    tolerances = [1e-6, 1e-6, 1e-10, 1e-10] if enhanced else [1e-8, 1e-8, 1e-10, 1e-10]
    for (error, mismatch), tolerance in zip(results, tolerances):
        if mismatch or error > tolerance:
            raise AssertionError(f'error={error} mismatch={mismatch} tolerance={tolerance}')
    return results


def is_enhanced(xml_path):
    root = ET.parse(xml_path).getroot()
    return text(child(root, 'Measurement'), 'UseEnhancedMode').lower() == 'true'


def audit_enhanced(xml_path, csv_path):
    root = ET.parse(xml_path).getroot()
    if text(child(root, 'Measurement'), 'UseEnhancedMode').lower() != 'true':
        raise AssertionError('Expected UseEnhancedMode=true')
    results = validate(xml_path, csv_path)
    labels = ['DL', 'Tau', 'SPV8', 'SPV6']
    print('SPV ENHANCED PASS ' + xml_path.name + ': ' + ', '.join(
        f'{label} err={error:.3g} mask={mismatch}'
        for label, (error, mismatch) in zip(labels, results)
    ))


def pair_paths(value):
    if '::' in value:
        xml_value, csv_value = value.split('::', 1)
        return Path(xml_value), Path(csv_value)
    xml_path = Path(value)
    return xml_path, xml_path.with_suffix('.csv')


def main():
    args = list(sys.argv[1:])
    enhanced = '--audit-enhanced' in args
    if enhanced:
        args.remove('--audit-enhanced')
    if not args:
        args = sorted(glob.glob('private/reference/spv/*.xml'))
    if not args:
        print('SPV paired validator: SKIP (provide XML paths or XML::CSV pairs)')
        return 0
    for value in args:
        xml_path, csv_path = pair_paths(value)
        if enhanced or is_enhanced(xml_path):
            audit_enhanced(xml_path, csv_path)
            continue
        results = validate(xml_path, csv_path)
        labels = ['DL', 'Tau', 'SPV8', 'SPV6']
        print('SPV PASS ' + xml_path.name + ': ' + ', '.join(
            f'{label} err={error:.3g} mask={mismatch}' for label, (error, mismatch) in zip(labels, results)
        ))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
