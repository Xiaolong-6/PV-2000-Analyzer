#!/usr/bin/env python3
"""Validate LeakageMeasurement XML against matching PV-2000 CSV output."""

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


def vector(node):
    values = []
    for item in list(node) if node is not None else []:
        try:
            values.append(float(item.text))
        except (TypeError, ValueError):
            pass
    return values


def find_x(xs, value):
    return sum(x < value for x in xs) if len(xs) > 1 else -1


def spline_second(xs, ys):
    n = min(len(xs), len(ys))
    y2 = [0.0] * n
    u = [0.0] * max(0, n - 1)
    if n < 2:
        return y2
    for i in range(1, n - 1):
        sig = (xs[i] - xs[i - 1]) / (xs[i + 1] - xs[i - 1])
        p = sig * y2[i - 1] + 2.0
        y2[i] = (sig - 1.0) / p
        u[i] = (
            6.0
            * (
                (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])
                - (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1])
            )
            / (xs[i + 1] - xs[i - 1])
            - sig * u[i - 1]
        ) / p
    for i in range(n - 2, -1, -1):
        y2[i] = y2[i] * y2[i + 1] + u[i]
    return y2


def cubic(xs, ys, value):
    y2 = spline_second(xs, ys)
    lo, hi = 0, len(xs) - 1
    while hi - lo > 1:
        mid = ((hi + lo + 2) >> 1) - 1
        if xs[mid] > value:
            hi = mid
        else:
            lo = mid
    h = xs[hi] - xs[lo]
    a = (xs[hi] - value) / h
    b = (value - xs[lo]) / h
    return (
        a * ys[lo]
        + b * ys[hi]
        + ((a**3 - a) * y2[lo] + (b**3 - b) * y2[hi]) * h * h / 6.0
    )


def calculate(raw, interval, delay, offset):
    if not raw:
        return math.nan
    xs = [i * interval for i in range(len(raw))]
    ys = [value - offset for value in raw]
    first = find_x(xs, 1.2 - 2 * interval)
    last = find_x(xs, 1.2 + 2 * interval)
    return cubic(xs[first:last + 1], ys[first:last + 1], 1.2 - delay)


def parse_xml(path):
    root = ET.parse(path).getroot()
    measurement = child(root, 'Measurement')
    if attr_type(measurement) != 'LeakageMeasurement':
        raise ValueError(f'{path.name}: expected LeakageMeasurement')
    md = child(measurement, 'MeasurementData')
    iteration = child(child(md, 'IterationData'), 'Iteration')
    data = child(iteration, 'Data')
    offsets = vector(child(md, 'VcpdOffset'))
    offset = sum(offsets) / len(offsets) if offsets else 0.0
    positive_enabled = (child(measurement, 'MeasurePositive').text or '').lower() == 'true'
    negative_enabled = (child(measurement, 'MeasureNegative').text or '').lower() == 'true'
    ps = child(measurement, 'PositiveSettings')
    ns = child(measurement, 'NegativeSettings')
    pi = number(ps, 'MeasuringIntervalSeconds')
    ni = number(ns, 'MeasuringIntervalSeconds')
    out = []
    for item in children(data, 'DataItem'):
        positive = vector(child(item, 'PositiveData'))
        negative = vector(child(item, 'NegativeData'))
        vp = calculate(positive, pi, number(item, 'PositiveDelaySeconds'), offset) if positive_enabled else math.nan
        vn = calculate(negative, ni, number(item, 'NegativeDelaySeconds'), offset) if negative_enabled else math.nan
        li = (vp if math.isfinite(vp) else 0.0) - vn if math.isfinite(vn) else math.nan
        out.append((vp, vn, li))
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
    indices = [header.index('VSASS+ [V]'), header.index('VSASS- [V]'), header.index('LI [V]')]
    return [tuple(parse_number(row[i]) for i in indices) for row in rows[hi + 1:] if row and row[0].strip()]


def max_error(calc, vendor):
    error = 0.0
    for a, b in zip(calc, vendor):
        if math.isfinite(a) != math.isfinite(b):
            return math.inf
        if math.isfinite(a):
            error = max(error, abs(a - b))
    return error


def validate(xml_path, csv_path):
    calc, vendor = parse_xml(xml_path), parse_csv(csv_path)
    if len(calc) != len(vendor):
        raise AssertionError(f'row count {len(calc)} != {len(vendor)}')
    errors = [max_error([row[i] for row in calc], [row[i] for row in vendor]) for i in range(3)]
    if errors[0] > 1e-10 or errors[1] > 1e-10 or errors[2] > 1e-10:
        raise AssertionError(f'errors exceed tolerance: {errors}')
    return errors


def pair_paths(value):
    if '::' in value:
        xml_value, csv_value = value.split('::', 1)
        return Path(xml_value), Path(csv_value)
    xml_path = Path(value)
    return xml_path, xml_path.with_suffix('.csv')


def main():
    args = list(sys.argv[1:])
    if not args:
        args = sorted(glob.glob('private/reference/leakage/*.xml'))
    if not args:
        print('Leakage paired validator: SKIP (provide XML paths or XML::CSV pairs)')
        return 0
    for value in args:
        xml_path, csv_path = pair_paths(value)
        errors = validate(xml_path, csv_path)
        print(f'LEAKAGE PASS {xml_path.name}: VSASS+={errors[0]:.3g}, VSASS-={errors[1]:.3g}, LI={errors[2]:.3g}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
