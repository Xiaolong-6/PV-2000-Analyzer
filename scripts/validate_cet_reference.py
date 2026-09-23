#!/usr/bin/env python3
"""Pointwise validator for private CETMeasurement XML + PV-2000 CSV references."""

from __future__ import annotations

import csv
import glob
import math
import statistics
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

Q_LEGACY = 1.602e-19
EOT_FACTOR = 34.5


def lname(tag: str) -> str:
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
    if item is None or item.text is None or not item.text.strip():
        return default
    try:
        return float(item.text)
    except ValueError:
        return default


def vector_means(node):
    result = []
    for vector in list(node) if node is not None else []:
        values = []
        for item in list(vector):
            try:
                values.append(float(item.text))
            except (TypeError, ValueError):
                pass
        result.append(sum(values) / len(values) if values else math.nan)
    return result


def linear_fit(xs, ys):
    pairs = [(x, y) for x, y in zip(xs, ys) if math.isfinite(x) and math.isfinite(y)]
    if len(pairs) < 2:
        return math.nan, math.nan, 0.0, False
    n = len(pairs)
    sx = sum(x for x, _ in pairs)
    sy = sum(y for _, y in pairs)
    sxx = sum(x * x for x, _ in pairs)
    sxy = sum(x * y for x, y in pairs)
    den = n * sxx - sx * sx
    if not math.isfinite(den) or den == 0:
        return math.nan, math.nan, 0.0, False
    slope = (n * sxy - sx * sy) / den
    intercept = (sy - slope * sx) / n
    mean = sy / n
    sse = sum((y - (intercept + slope * x)) ** 2 for x, y in pairs)
    sst = sum((y - mean) ** 2 for _, y in pairs)
    r2 = 1.0 - sse / sst if sst > 0 else 0.0
    return slope, intercept, r2 if math.isfinite(r2) else 0.0, True


def parse_xml(path: Path):
    root = ET.parse(path).getroot()
    measurement = child(root, 'Measurement')
    if attr_type(measurement) != 'CETMeasurement':
        raise ValueError(f'{path.name}: expected CETMeasurement')

    md = child(measurement, 'MeasurementData')
    iterations = children(child(md, 'IterationData'), 'Iteration')
    iteration = iterations[0] if iterations else None
    data = child(iteration, 'Data')
    items = children(data, 'DataItem')
    offset = number(md, 'VcpdOffsett', number(md, 'VcpdOffset', 0.0))
    process_settings = child(child(measurement, 'Process'), 'Settings')
    charge_step = number(process_settings, 'CoronaCharge')

    sites = []
    for item in items:
        process_data = child(item, 'ProcessData')
        means = vector_means(child(process_data, 'VcpdLight'))
        corrected = [value - offset if math.isfinite(value) else math.nan for value in means]
        qc = [index * charge_step for index in range(len(corrected))]
        slope, intercept, r2, defined = linear_fit(qc, corrected)
        cd = eot = math.nan
        if defined and math.isfinite(slope) and slope != 0:
            cd_internal = (1.0 / slope) * Q_LEGACY * 1e6
            if math.isfinite(cd_internal):
                cd = cd_internal * 1000.0
                if cd_internal != 0:
                    eot = EOT_FACTOR / cd_internal
        sites.append({'eot': eot, 'cd': cd, 'r2': r2})

    pattern = child(measurement, 'Pattern')
    target = child(measurement, 'Target')
    pattern_type = attr_type(pattern)
    target_type = attr_type(target)
    if pattern_type != 'NinePointPattern' or target_type != 'SquareCell':
        raise ValueError(f'{path.name}: validator currently targets paired NinePointPattern + SquareCell CET profile')
    size = child(target, 'Size')
    half_x = number(size, 'Width') / 2 - number(target, 'EdgeExclusion', number(measurement, 'EdgeExclusion', 0.0))
    half_y = number(size, 'Height') / 2 - number(target, 'EdgeExclusion', number(measurement, 'EdgeExclusion', 0.0))
    coefficients = []
    coeff_node=child(pattern, 'Coefficients')
    for point in (list(coeff_node) if coeff_node is not None else []):
        coefficients.append((number(point, 'X'), number(point, 'Y')))
    coords = [(x * half_x, y * half_y) for x, y in coefficients]
    if len(coords) != len(sites):
        raise ValueError(f'{path.name}: {len(coords)} coordinates for {len(sites)} sites')
    return sites, coords


def parse_number(text):
    value = (text or '').strip()
    if not value or value.lower().startswith('ud'):
        return math.nan
    return float(value)


def parse_csv(path: Path):
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.reader(handle, delimiter=';'))

    summaries = {}
    for index, row in enumerate(rows[:-1]):
        key = (row[0] if row else '').strip()
        if key in {'EOT [Å]', 'Cd [nF/cm²]', 'R² [ ]'}:
            values = rows[index + 1][1:6]
            summaries[key] = [parse_number(value) for value in values]

    header_index = next(index for index, row in enumerate(rows) if row and row[0].strip() == 'Point.X[mm]')
    points = []
    for row in rows[header_index + 1:]:
        if len(row) < 5 or not row[0].strip():
            continue
        points.append({
            'x': parse_number(row[0]),
            'y': parse_number(row[1]),
            'eot': parse_number(row[2]),
            'cd': parse_number(row[3]),
            'r2': parse_number(row[4]),
        })
    return points, summaries


def max_error(a, b):
    errors = []
    for left, right in zip(a, b):
        if math.isfinite(left) != math.isfinite(right):
            return math.inf
        if math.isfinite(left):
            errors.append(abs(left - right))
    return max(errors, default=0.0)


def summary(values):
    finite = [value for value in values if math.isfinite(value)]
    return [
        statistics.mean(finite),
        statistics.median(finite),
        statistics.stdev(finite) if len(finite) > 1 else math.nan,
        min(finite),
        max(finite),
    ]


def validate_pair(xml_path: Path, csv_path: Path):
    sites, coords = parse_xml(xml_path)
    vendor, vendor_summaries = parse_csv(csv_path)
    if len(sites) != len(vendor):
        raise AssertionError(f'row count {len(sites)} != {len(vendor)}')

    coord_errors = [math.hypot(coords[index][0] - row['x'], coords[index][1] - row['y']) for index, row in enumerate(vendor)]
    errors = {
        'coords_mm': max(coord_errors, default=0.0),
        'eot_A': max_error([site['eot'] for site in sites], [row['eot'] for row in vendor]),
        'cd_nF_cm2': max_error([site['cd'] for site in sites], [row['cd'] for row in vendor]),
        'r2': max_error([site['r2'] for site in sites], [row['r2'] for row in vendor]),
    }

    summary_map = {'EOT [Å]': 'eot', 'Cd [nF/cm²]': 'cd', 'R² [ ]': 'r2'}
    summary_errors = {}
    for label, key in summary_map.items():
        expected = vendor_summaries.get(label)
        if expected is None:
            raise AssertionError(f'missing vendor summary {label}')
        calculated = summary([site[key] for site in sites])
        summary_errors[label] = max_error(calculated, expected)

    tolerances = {'coords_mm': 1e-10, 'eot_A': 1e-9, 'cd_nF_cm2': 1e-10, 'r2': 1e-12}
    for key, value in errors.items():
        if value > tolerances[key]:
            raise AssertionError(f'{key} max error {value} exceeds {tolerances[key]}')
    for label, value in summary_errors.items():
        if value > 1e-9:
            raise AssertionError(f'{label} summary max error {value} exceeds 1e-9')
    return errors, summary_errors


def main():
    xml_paths = [Path(value) for value in (sys.argv[1:] or sorted(glob.glob('private/reference/cet/*.xml')))]
    if not xml_paths:
        print('CET paired validator: SKIP (no private/reference/cet/*.xml)')
        return 0

    for xml_path in xml_paths:
        csv_path = xml_path.with_suffix('.csv')
        if not csv_path.exists():
            raise FileNotFoundError(f'Missing matching CSV: {csv_path}')
        errors, summary_errors = validate_pair(xml_path, csv_path)
        print(f'CET PASS {xml_path.name}')
        print('  pointwise:', ', '.join(f'{key}={value:.3g}' for key, value in errors.items()))
        print('  summaries:', ', '.join(f'{key}={value:.3g}' for key, value in summary_errors.items()))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())