#!/usr/bin/env python3
"""Audit paired DIT XML and PV-2000 raw COCOS CSV files.

The CSV is a development reference, never a runtime input. This validator
checks the observable XML measured-branch quantities separately from the
exported light/Vsb/Dit branch, which may include unsaved reprocessing state.
No reference file paths or contents are embedded in this script.
"""

from __future__ import annotations

import argparse
import csv
import math
import statistics
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path


def lname(tag: str) -> str:
    return tag.split("}", 1)[-1]


def child(parent, name):
    return next((node for node in ([] if parent is None else parent) if lname(node.tag) == name), None)


def xtype(node) -> str:
    if node is None:
        return ""
    return next((value for key, value in node.attrib.items() if lname(key) == "type"), "")


def number(parent, name, default=math.nan):
    node = child(parent, name)
    try:
        return float((node.text or "").strip())
    except (AttributeError, TypeError, ValueError):
        return default


def vector_means(parent):
    result = []
    for vector in [] if parent is None else parent:
        values = []
        for item in vector:
            try:
                values.append(float((item.text or "").strip()))
            except ValueError:
                pass
        result.append(statistics.fmean(values) if values else math.nan)
    return result


def measured_rows(path: Path):
    root = ET.parse(path).getroot()
    measurement = child(root, "Measurement")
    if xtype(measurement) != "DITMeasurement":
        return None, "non-DIT"
    if (child(measurement, "UseCocosII").text or "").strip().lower() != "false":
        return None, "not Standard COCOS"
    pattern = xtype(child(measurement, "Pattern"))
    if pattern != "OnePointPattern":
        return None, f"other pattern ({pattern or 'missing'})"

    md = child(measurement, "MeasurementData")
    iteration = child(child(md, "IterationData"), "Iteration")
    data = child(iteration, "Data")
    items = [node for node in ([] if data is None else data) if lname(node.tag) == "DataItem"]
    if len(items) != 1:
        return None, f"other site count ({len(items)})"

    offset = number(md, "VcpdOffsett", 0.0)
    factor = number(md, "VsbCorrectionFactor", 1.2)
    process = child(items[0], "ProcessData")
    dark = vector_means(child(process, "VcpdDark"))
    light = vector_means(child(process, "VcpdLight"))
    charge_step = number(child(child(measurement, "Process"), "Settings"), "CoronaCharge")
    doping_node = child(measurement, "DopingType")
    doping = (doping_node.text or "").strip() if doping_node is not None else ""
    sign = -1 if doping.lower().startswith("n") else 1
    if not all(math.isfinite(value) for value in (offset, factor, charge_step)):
        return None, "missing numeric settings"
    if len(dark) != len(light) or len(dark) < 2:
        return None, "unequal or empty process vectors"
    rows = []
    for index in range(1, len(dark)):
        vd, vl = dark[index] - offset, light[index] - offset
        rows.append((vd, vl, sign * factor * (vd - vl), (index - 1) * charge_step))
    return (rows, doping), None


def numeric(text):
    try:
        return float(text.strip())
    except (AttributeError, ValueError):
        return math.nan


def exported_rows(path: Path):
    for delimiter in (";", ","):
        with path.open(encoding="utf-8-sig", errors="replace", newline="") as stream:
            lines = list(csv.reader(stream, delimiter=delimiter))
        for header_index, header in enumerate(lines):
            normalized = [value.lower().replace(" ", "") for value in header]
            required = ("vcpdlight[v]", "vcpddark[v]", "vsb[v]", "qc[q/cm^2]")
            if not all(name in normalized for name in required):
                continue
            indices = [normalized.index(name) for name in required]
            dit_index = next((i for i, value in enumerate(normalized) if value.startswith("dit[")), None)
            rows = []
            blanks = 0
            for line in lines[header_index + 1 :]:
                if len(line) <= max(indices):
                    break
                values = tuple(numeric(line[i]) for i in indices)
                if not (math.isfinite(values[1]) and math.isfinite(values[3])):
                    break
                dit = numeric(line[dit_index]) if dit_index is not None and dit_index < len(line) else math.nan
                rows.append(values + (dit,))
                if not math.isfinite(dit):
                    blanks += 1
            return rows, blanks
    raise ValueError("raw COCOS column header not found")


def same_export(left, right):
    if len(left[0]) != len(right[0]) or left[1] != right[1]:
        return False
    for a_row, b_row in zip(left[0], right[0]):
        for a, b in zip(a_row, b_row):
            if math.isnan(a) and math.isnan(b):
                continue
            if not (math.isfinite(a) and math.isfinite(b) and abs(a - b) <= 1e-9 * max(1, abs(a), abs(b))):
                return False
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xml-dir", type=Path, required=True)
    parser.add_argument("--csv-dir", type=Path, action="append", required=True)
    parser.add_argument(
        "--max-dark-error-mv", type=float,
        help="strict gate: require every XML to pair and each dark row to stay below this error",
    )
    parser.add_argument("--show-errors", type=int, default=0)
    parser.add_argument("--show-outliers", type=int, default=0)
    args = parser.parse_args()

    csv_index = {}
    for directory in args.csv_dir:
        for path in directory.rglob("*.csv"):
            stem = path.stem.removeprefix("Raw ").casefold()
            csv_index.setdefault(stem, []).append(path)

    counts = Counter()
    differences = {name: [] for name in ("dark", "light", "vsb", "charge")}
    doping_counts = Counter()
    blank_count = 0
    shown_errors = 0
    pair_errors = []
    for path in args.xml_dir.rglob("*.xml"):
        stem = path.stem.casefold()
        if stem not in csv_index:
            counts["unpaired_xml"] += 1
            continue
        try:
            measured, reason = measured_rows(path)
            if reason:
                counts[reason] += 1
                continue
            variants = [exported_rows(csv_path) for csv_path in csv_index[stem]]
        except (OSError, ET.ParseError, ValueError, AttributeError) as error:
            counts[f"read/format error ({type(error).__name__})"] += 1
            if shown_errors < args.show_errors:
                print(f"diagnostic {path.name}: {type(error).__name__}: {error}")
                shown_errors += 1
            continue
        if not all(same_export(variants[0], other) for other in variants[1:]):
            counts["conflicting duplicate CSV"] += 1
            continue
        exported, blanks = variants[0]
        if len(measured[0]) != len(exported):
            counts["row count mismatch"] += 1
            if shown_errors < args.show_errors:
                print(f"diagnostic {path.name}: XML rows={len(measured[0])}, CSV rows={len(exported)}")
                shown_errors += 1
            continue
        counts["paired_standard_onepoint"] += 1
        doping_counts[measured[1]] += 1
        blank_count += blanks
        local_dark = []
        for actual, reference in zip(measured[0], exported):
            for name, a, b in zip(
                ("dark", "light", "vsb", "charge"),
                actual,
                (reference[1], reference[0], reference[2], reference[3]),
            ):
                if math.isfinite(a) and math.isfinite(b):
                    error = abs(a - b)
                    differences[name].append(error)
                    if name == "dark":
                        local_dark.append(error)
        if local_dark:
            pair_errors.append((max(local_dark), statistics.fmean(local_dark), path.name))

    for name, count in sorted(counts.items()):
        print(f"{name}: {count}")
    print(f"doping types: {dict(sorted(doping_counts.items()))}")
    print(f"exported blank Dit cells: {blank_count}")
    for name, values in differences.items():
        if values:
            print(f"{name}: n={len(values)} MAE={statistics.fmean(values):.9g} max={max(values):.9g}")
    if pair_errors:
        print(
            "pairs by maximum dark-channel error: "
            + ", ".join(
                f"<={limit:g} mV: {sum(error <= limit / 1000 for error, _, _ in pair_errors)}"
                for limit in (1, 2, 10, 100)
            )
        )
        print(f"median per-pair dark MAE: {statistics.median(item[1] for item in pair_errors):.9g} V")
        for maximum, mae, name in sorted(pair_errors, reverse=True)[: args.show_outliers]:
            print(f"outlier {name}: dark max={maximum:.9g} V MAE={mae:.9g} V")
    if counts["paired_standard_onepoint"] == 0:
        return 1
    if args.max_dark_error_mv is not None:
        if counts["paired_standard_onepoint"] != sum(counts.values()):
            print("strict gate requires every XML to be a paired Standard COCOS OnePoint case")
            return 1
        if not differences["dark"] or max(differences["dark"]) > args.max_dark_error_mv / 1000:
            print(f"dark channel exceeded {args.max_dark_error_mv:g} mV limit")
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
