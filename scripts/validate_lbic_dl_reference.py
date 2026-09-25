#!/usr/bin/env python3
"""Pointwise private XML/vendor-CSV regression for the LBIC cross-beam DL path."""
from __future__ import annotations

import csv
import math
import statistics
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

Q = 1.602e-19


def depth(wavelength, temperature):
    dt = temperature - 21 if 15 <= temperature <= 45 else 0
    energy = 12395 / (10 * wavelength)
    corrected = energy + 0.001 * (1.3 * energy - 1) * dt
    absorption = 84.732 * corrected / 1.2395 - 76.417
    return 10000 / absorption**2


def dl_value(depths, iqe, maximum):
    if len(depths) < 2 or len(depths) != len(iqe) or any(
        not math.isfinite(value) or value <= 0 for value in iqe
    ):
        return math.nan
    inverse = [1 / value for value in iqe]
    mx, my = statistics.fmean(depths), statistics.fmean(inverse)
    xx = sum((x - mx) ** 2 for x in depths)
    slope = sum((x - mx) * (y - my) for x, y in zip(depths, inverse)) / xx
    candidate = (my - slope * mx) / slope if slope else math.nan
    return candidate if 0 < candidate <= maximum else math.nan


def vendor_number(raw):
    try:
        return float(raw)
    except (ValueError, TypeError):
        return math.nan


def validate(xml_path, csv_path):
    measurement = ET.parse(xml_path).getroot().find("Measurement")
    assert measurement is not None and measurement.attrib.get(
        "{http://www.w3.org/2001/XMLSchema-instance}type"
    ) == "LBICMeasurement"
    iterations = measurement.findall("MeasurementData/IterationData/Iteration")
    assert len(iterations) == 1
    iteration = iterations[0]
    items = iteration.findall("Data/DataItem")
    lasers = {
        int(setting.findtext("Index")): int(setting.findtext("Wavelength"))
        for setting in measurement.findall("LaserSettings/LBICLaserSetting")
    }
    flux = {
        int(item.findtext("Key/int")): float(item.findtext("Value/double"))
        for item in measurement.findall("FluxCache/Item")
    }
    lower = float(measurement.findtext("DLWavelenghtRange/Min"))
    upper = float(measurement.findtext("DLWavelenghtRange/Max"))
    maximum = float(measurement.findtext("MaxDLValue"))
    temperature = float(iteration.findtext("ChuckTemperature"))
    active = {key: wavelength for key, wavelength in lasers.items() if lower <= wavelength <= upper}
    assert len(active) >= 2 and len(set(active.values())) == len(active)
    depths = {key: depth(wavelength, temperature) for key, wavelength in active.items()}

    with open(csv_path, encoding="utf-8-sig", newline="") as file:
        rows = list(csv.reader(file, delimiter=";"))
    header_index = next(i for i, row in enumerate(rows) if row and row[0].startswith("Point.X"))
    header = rows[header_index]
    records = rows[header_index + 1 :]
    assert len(items) == len(records), (len(items), len(records))
    assert "DL [μm]" in header
    finite_errors, blank_count, iqe_error = [], 0, 0.0
    calculated = []
    for index, (item, row) in enumerate(zip(items, records), 1):
        beams = {int(beam.attrib["Key"]): beam.attrib for beam in item.findall("BeamData/Item")}
        iqe_by_key = {}
        for key, wavelength in lasers.items():
            data = beams[key]
            current = float(data["Current"])
            exported_current = vendor_number(row[header.index(f"Laser {wavelength}nm Current [μA]")])
            assert math.isfinite(exported_current) == (current >= 0), (index, wavelength, current)
            if current >= 0:
                assert abs(current - exported_current) < 1e-10
            eqe = current * 1e-6 / Q / flux[key] * 100
            reflectivity = float(data["DirectReflection"]) + float(data["ScatteredReflection"])
            iqe = eqe / (1 - reflectivity / 100) if reflectivity != 100 else math.nan
            iqe = iqe if 0 <= iqe <= 100 else math.nan
            exported = vendor_number(row[header.index(f"Laser {wavelength}nm IQE [%]")])
            assert math.isfinite(iqe) == math.isfinite(exported), (index, wavelength, iqe, exported)
            if math.isfinite(iqe):
                iqe_error = max(iqe_error, abs(iqe - exported))
            iqe_by_key[key] = iqe
        expected = vendor_number(row[header.index("DL [μm]")])
        actual = dl_value(list(depths.values()), [iqe_by_key[key] for key in depths], maximum)
        assert math.isfinite(actual) == math.isfinite(expected), (index, actual, expected)
        if math.isfinite(actual):
            finite_errors.append(abs(actual - expected))
            calculated.append(actual)
        else:
            blank_count += 1

    summary_index = next(i for i, row in enumerate(rows[:header_index]) if row and row[0] == "DL [μm]")
    observed = [vendor_number(value) for value in rows[summary_index + 1][1:6]]
    summary = ([statistics.fmean(calculated), statistics.median(calculated),
                statistics.stdev(calculated) if len(calculated) > 1 else math.nan,
                min(calculated), max(calculated)] if calculated
               else [math.nan, 0, 0, 0, 0])
    assert all(math.isfinite(left) == math.isfinite(right) for left, right in zip(summary, observed))
    summary_error = max((abs(left - right) for left, right in zip(summary, observed)
                         if math.isfinite(left)), default=0)
    assert iqe_error < 1e-10 and max(finite_errors, default=0) < 1e-8 and summary_error < 1e-8
    print(f"PASS {xml_path.name}: {len(items)} points, {len(finite_errors)} DL values, "
          f"{blank_count} Ud., max DL error {max(finite_errors, default=0):.3g} µm, "
          f"max IQE error {iqe_error:.3g} %, max summary error {summary_error:.3g} µm")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: validate_lbic_dl_reference.py private/result.xml private/result.csv")
    validate(Path(sys.argv[1]), Path(sys.argv[2]))
