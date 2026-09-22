#!/usr/bin/env python3
"""Validate the raw DualQssMeasurement XML path against paired PV-2000 raw CSV.

The validator deliberately separates two different lifetime quantities:
- XML Values / TransientInfo@LifeTime / CSV raw LifeTime: validated raw path.
- CSV top-table Lifetime[us]: vendor post-processing, observed but not reconstructed.

Runtime remains XML-only. This script is development/regression tooling.
"""
from __future__ import annotations

import csv
import glob
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RAW_LIFETIME_TOL_US = 0.006
DN_REL_TOL = 0.006


def lname(tag: str) -> str:
    return tag.split("}", 1)[-1]


def children(e):
    return list(e) if e is not None else []


def child(e, name):
    return next((x for x in children(e) if lname(x.tag) == name), None)


def text(e, name, default=""):
    x = child(e, name)
    return (x.text or "").strip() if x is not None else default


def num(e, name, default=math.nan):
    try:
        return float(text(e, name, ""))
    except (TypeError, ValueError):
        return default


def xtype(e):
    if e is None:
        return ""
    for key, value in e.attrib.items():
        if lname(key) == "type":
            return value
    return ""


def vector(item, name):
    holder = child(item, name)
    values = children(holder)
    if not values:
        return []
    out = []
    for x in children(values[0]):
        try:
            out.append(float((x.text or "").strip()))
        except (TypeError, ValueError):
            out.append(math.nan)
    return out


def attr_num(e, name, default=math.nan):
    raw = e.attrib.get(name) if e is not None else None
    if raw in (None, ""):
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def parse_xml(path: Path):
    root = ET.parse(path).getroot()
    measurement = child(root, "Measurement")
    if xtype(measurement) != "DualQssMeasurement":
        raise AssertionError(
            f"NEW PROFILE: type={xtype(measurement)!r}, expected DualQssMeasurement"
        )
    pattern = child(measurement, "Pattern")
    if xtype(pattern) != "OnePointPattern":
        raise AssertionError(
            f"NEW PROFILE: pattern={xtype(pattern)!r}, expected OnePointPattern"
        )
    iteration = child(child(child(measurement, "MeasurementData"), "IterationData"), "Iteration")
    data = child(iteration, "Data")
    items = [x for x in children(data) if lname(x.tag) == "DataItem"]
    if len(items) != 1 or xtype(items[0]) != "QssDataItem":
        raise AssertionError(
            f"NEW PROFILE: expected one QssDataItem, got {len(items)} / "
            f"{[xtype(x) for x in items]}"
        )
    item = items[0]
    values = vector(item, "Values")
    intensity = vector(item, "Intensity")
    power = vector(item, "Power")
    transients = [x for x in children(child(item, "Transients")) if lname(x.tag) == "TransientInfo"]
    counts = {len(values), len(intensity), len(power), len(transients)}
    if len(counts) != 1:
        raise AssertionError(
            f"aligned vector counts differ: values={len(values)}, intensity={len(intensity)}, "
            f"power={len(power)}, transients={len(transients)}"
        )
    return {
        "values": values,
        "intensity": intensity,
        "power": power,
        "transients": transients,
        "wafer_thickness_um": num(measurement, "WaferThickness"),
        "optical_factor": num(measurement, "OpticalFactor"),
    }


def read_csv(path: Path):
    raw = path.read_text(encoding="utf-8-sig")
    sample = raw[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ","
    return list(csv.reader(raw.splitlines(), delimiter=delimiter))


def finite_float(value):
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return math.nan


def parse_vendor_csv(path: Path):
    rows = read_csv(path)
    top_header = next(
        (i for i, row in enumerate(rows) if row and row[0].strip() == "QSS Intensity[mSun]"),
        None,
    )
    if top_header is None:
        raise AssertionError("QSS result-table header not found")
    top = []
    for row in rows[top_header + 1 :]:
        if len(row) < 5 or not row[0].strip():
            break
        i = finite_float(row[0])
        p = finite_float(row[1])
        lifetime = finite_float(row[2])
        if not (math.isfinite(i) and math.isfinite(p) and math.isfinite(lifetime)):
            break
        top.append(
            {
                "intensity": i,
                "power": p,
                "lifetime": lifetime,
                "dn": finite_float(row[3]) if len(row) > 3 else math.nan,
                "voc": finite_float(row[4]) if len(row) > 4 else math.nan,
            }
        )

    life_row = next(
        (row for row in rows if row and row[0].strip().startswith("LifeTime [")),
        None,
    )
    if life_row is None:
        raise AssertionError("raw LifeTime row not found")

    raw_header = next(
        (
            i
            for i, row in enumerate(rows)
            if len(row) >= 2 and row[0].strip() == "Time" and row[1].strip() == "Voltage"
        ),
        None,
    )
    if raw_header is None:
        raise AssertionError("raw Time/Voltage table header not found")
    return rows, top, life_row, raw_header


def find_csv(xml_path: Path) -> Path | None:
    candidates = [
        xml_path.with_suffix(".csv"),
        xml_path.with_name("Raw " + xml_path.stem + ".csv"),
        xml_path.parent.parent / "Raw data (csv)" / ("Raw " + xml_path.stem + ".csv"),
    ]
    return next((p for p in candidates if p.exists()), None)


def validate_pair(xml_path: Path, csv_path: Path):
    x = parse_xml(xml_path)
    rows, top, raw_lifetime, raw_header = parse_vendor_csv(csv_path)
    n = len(x["values"])
    if len(top) != n:
        raise AssertionError(f"top-table rows={len(top)}, XML points={n}")

    max_intensity = max((abs(top[i]["intensity"] - x["intensity"][i]) for i in range(n)), default=0)
    max_power = max((abs(top[i]["power"] - x["power"][i]) for i in range(n)), default=0)
    if max(max_intensity, max_power) > 1e-12:
        raise AssertionError(
            f"intensity/power mismatch: intensity={max_intensity:g}, power={max_power:g}"
        )

    max_lifetime = 0.0
    for i, value in enumerate(x["values"]):
        col = 1 + 3 * i
        if col >= len(raw_lifetime):
            raise AssertionError(f"raw LifeTime column missing for point {i + 1}")
        csv_value = finite_float(raw_lifetime[col])
        if not math.isfinite(csv_value):
            raise AssertionError(f"raw LifeTime missing for point {i + 1}")
        max_lifetime = max(max_lifetime, abs(csv_value - value))
    if max_lifetime > RAW_LIFETIME_TOL_US:
        raise AssertionError(f"raw LifeTime max error={max_lifetime:g} us")

    compared = 0
    max_time = 0.0
    max_voltage = 0.0
    csv_samples = []
    for j, transient in enumerate(x["transients"]):
        points = children(child(transient, "Transient"))
        col = 3 * j
        count = 0
        for k, point in enumerate(points):
            row_index = raw_header + 1 + k
            if row_index >= len(rows):
                break
            row = rows[row_index]
            if col + 1 >= len(row) or not row[col].strip() or not row[col + 1].strip():
                break
            tx = finite_float(row[col])
            vy = finite_float(row[col + 1])
            xx = attr_num(point, "X")
            yy = attr_num(point, "Y")
            max_time = max(max_time, abs(tx - xx))
            max_voltage = max(max_voltage, abs(vy - yy))
            count += 1
            compared += 1
        if count not in {len(points), max(0, len(points) - 1)}:
            raise AssertionError(
                f"raw transient {j + 1}: CSV samples={count}, XML samples={len(points)}"
            )
        csv_samples.append(count)
    if max(max_time, max_voltage) > 1e-12:
        raise AssertionError(
            f"raw transient mismatch: time={max_time:g}, voltage={max_voltage:g}"
        )

    vendor_positive = 0
    vendor_zero = 0
    max_dn_rel = 0.0
    w_cm = x["wafer_thickness_um"] * 1e-4
    of = x["optical_factor"]
    for row in top:
        lifetime = row["lifetime"]
        if lifetime > 0:
            vendor_positive += 1
            if math.isfinite(row["dn"]) and row["dn"] > 0:
                generation = 2.38e17 * (row["intensity"] / 1000.0) / w_cm * of
                predicted = generation * lifetime * 1e-6
                max_dn_rel = max(max_dn_rel, abs(predicted - row["dn"]) / row["dn"])
        else:
            vendor_zero += 1
    if max_dn_rel > DN_REL_TOL:
        raise AssertionError(f"vendor Lifetime->dn max relative error={max_dn_rel:g}")

    return {
        "points": n,
        "raw_samples": compared,
        "csv_samples_min": min(csv_samples) if csv_samples else 0,
        "csv_samples_max": max(csv_samples) if csv_samples else 0,
        "raw_lifetime_error": max_lifetime,
        "vendor_positive": vendor_positive,
        "vendor_zero": vendor_zero,
        "dn_rel_error": max_dn_rel,
    }


def main():
    xmls = [Path(p) for p in (sys.argv[1:] or sorted(glob.glob("private/reference/dual_qss/**/*.xml", recursive=True)))]
    if not xmls:
        print("Dual QSS paired validator: SKIP (no private/reference/dual_qss/**/*.xml)")
        return 0

    totals = {
        "pairs": 0,
        "points": 0,
        "raw_samples": 0,
        "vendor_positive": 0,
        "vendor_zero": 0,
        "raw_lifetime_error": 0.0,
        "dn_rel_error": 0.0,
    }
    ok = True
    for xml_path in xmls:
        csv_path = find_csv(xml_path)
        if csv_path is None:
            print(f"SKIP {xml_path.name}: matching raw CSV not found")
            continue
        try:
            result = validate_pair(xml_path, csv_path)
        except Exception as exc:
            label = "NEW PROFILE" if "NEW PROFILE:" in str(exc) else "FAIL"
            print(f"{label} {xml_path.name}: {type(exc).__name__}: {exc}")
            ok = False
            continue
        totals["pairs"] += 1
        totals["points"] += result["points"]
        totals["raw_samples"] += result["raw_samples"]
        totals["vendor_positive"] += result["vendor_positive"]
        totals["vendor_zero"] += result["vendor_zero"]
        totals["raw_lifetime_error"] = max(totals["raw_lifetime_error"], result["raw_lifetime_error"])
        totals["dn_rel_error"] = max(totals["dn_rel_error"], result["dn_rel_error"])
        print(
            f"PASS {xml_path.name}: points={result['points']}; "
            f"raw lifetime max={result['raw_lifetime_error']:.6g} us; "
            f"CSV transient samples={result['csv_samples_min']}..{result['csv_samples_max']}; "
            f"vendor +Lifetime/zero={result['vendor_positive']}/{result['vendor_zero']}; "
            f"Lifetime->dn rel max={result['dn_rel_error']:.4g}"
        )

    if totals["pairs"]:
        print(
            "SUMMARY "
            f"pairs={totals['pairs']}; points={totals['points']}; "
            f"raw samples={totals['raw_samples']}; "
            f"raw lifetime max={totals['raw_lifetime_error']:.7g} us; "
            f"vendor +Lifetime/zero={totals['vendor_positive']}/{totals['vendor_zero']}; "
            f"Lifetime->dn rel max={totals['dn_rel_error']:.5g}"
        )
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
