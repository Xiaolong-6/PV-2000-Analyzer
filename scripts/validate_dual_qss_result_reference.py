#!/usr/bin/env python3
"""Validate paired DualQssMeasurement XML + numeric PV-2000 result CSV evidence.

This validator deliberately separates what is reconstructed from XML from what is
only an internally consistent relationship among vendor result columns.

Validated from the current paired profile:
- teff.d (1 Sun): clamped linear interpolation of XML Values versus actual XML Intensity
- Smax (1 Sun): W / (2 * vendor teff.SS)
- Smax at maximum teff.SS: W / (2 * vendor teff.SS Max)
- finite Delta n (1 Sun): generation * vendor teff.SS

Not reconstructed here:
- teff.SS curve / scalar generation
- teff.SS Max generation
- Implied Voc
- Basore J0
- K-S J0
- general unavailable/zero rules beyond the paired cases

Runtime remains XML-only. Matching CSVs are private development evidence.
"""
from __future__ import annotations

import csv
import glob
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

TEFFD_TOL_US = 1e-9
SMAX_TOL = 1e-9
DN_REL_TOL = 1e-12


def lname(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


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
        return ""
    for key, value in node.attrib.items():
        if lname(key) == "type":
            return value
    return ""


def number(node, name, default=math.nan):
    item = child(node, name)
    if item is None or item.text is None or not item.text.strip():
        return default
    try:
        return float(item.text)
    except ValueError:
        return default


def vector(node, name):
    holder = child(node, name)
    if holder is None:
        return []
    vectors = list(holder)
    if not vectors:
        return []
    result = []
    for item in list(vectors[0]):
        try:
            result.append(float(item.text))
        except (TypeError, ValueError):
            result.append(math.nan)
    return result


def parse_xml(path: Path):
    root = ET.parse(path).getroot()
    measurement = child(root, "Measurement")
    if attr_type(measurement) != "DualQssMeasurement":
        raise AssertionError(f"{path.name}: expected DualQssMeasurement")

    pattern = child(measurement, "Pattern")
    target = child(measurement, "Target")
    if attr_type(pattern) != "OnePointPattern":
        raise AssertionError(f"{path.name}: paired result profile expects OnePointPattern")
    if attr_type(target) != "RoundWafer":
        raise AssertionError(f"{path.name}: paired result profile expects RoundWafer")

    md = child(measurement, "MeasurementData")
    iteration_data = child(md, "IterationData")
    iterations = children(iteration_data, "Iteration")
    if len(iterations) != 1:
        raise AssertionError(f"{path.name}: expected one Iteration, got {len(iterations)}")
    data = child(iterations[0], "Data")
    items = children(data, "DataItem")
    if len(items) != 1 or attr_type(items[0]) != "QssDataItem":
        raise AssertionError(f"{path.name}: expected one QssDataItem")
    item = items[0]

    intensity = vector(item, "Intensity")
    values = vector(item, "Values")
    if len(intensity) != len(values) or not intensity:
        raise AssertionError(
            f"{path.name}: Intensity/Values count mismatch {len(intensity)} != {len(values)}"
        )

    return {
        "intensity": intensity,
        "values": values,
        "wafer_thickness_um": number(measurement, "WaferThickness"),
        "optical_factor": number(measurement, "OpticalFactor"),
        "doping": number(measurement, "Doping"),
        "doping_type": (child(measurement, "DopingType").text or "").strip()
        if child(measurement, "DopingType") is not None
        else "",
        "probe": (child(measurement, "ProbeSelection").text or "").strip()
        if child(measurement, "ProbeSelection") is not None
        else "",
        "bias": (child(measurement, "QssBiasSelection").text or "").strip()
        if child(measurement, "QssBiasSelection") is not None
        else "",
    }


def parse_number(value):
    text = (value or "").strip()
    if not text or text.lower().startswith("ud") or text.lower() in {"nan", "infinity", "inf"}:
        return math.nan
    try:
        return float(text.replace(",", "."))
    except ValueError:
        return math.nan


def read_rows(path: Path):
    raw = path.read_text(encoding="utf-8-sig")
    sample = raw[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ";" if raw.count(";") > raw.count(",") else ","
    return list(csv.reader(raw.splitlines(), delimiter=delimiter))


def norm(text):
    return " ".join((text or "").replace("μ", "u").replace("µ", "u").split()).lower()


def find_col(header, *terms):
    normalized = [norm(value) for value in header]
    for index, value in enumerate(normalized):
        if all(term.lower() in value for term in terms):
            return index
    return None


def parse_vendor_csv(path: Path):
    rows = read_rows(path)
    header_index = next(
        (
            index
            for index, row in enumerate(rows)
            if row and norm(row[0]).startswith("point.x")
        ),
        None,
    )
    if header_index is None:
        raise AssertionError(f"{path.name}: point-result header not found")
    header = rows[header_index]
    data_row = next(
        (row for row in rows[header_index + 1 :] if row and (row[0] or "").strip()),
        None,
    )
    if data_row is None:
        raise AssertionError(f"{path.name}: point-result row not found")

    def value(*terms):
        index = find_col(header, *terms)
        return parse_number(data_row[index]) if index is not None and index < len(data_row) else math.nan

    return {
        "teffd_1sun": value("teff.d", "1 sun"),
        "teffss_1sun": value("teff.ss", "1 sun"),
        "teffss_max": value("teff.ss max"),
        "basore_j0": value("basore", "j0"),
        "dn_1sun": value("n", "1 sun"),
        "smax_1sun": value("smax", "1 sun"),
        "smax_max": value("smax"),
        "voc_1sun": value("implied voc", "1 sun"),
        "ks_j0": value("k-s", "j0"),
        "header": header,
    }


def clamped_linear(xs, ys, target):
    pairs = sorted(
        (float(x), float(y))
        for x, y in zip(xs, ys)
        if math.isfinite(x) and math.isfinite(y)
    )
    if not pairs:
        return math.nan
    if target <= pairs[0][0]:
        return pairs[0][1]
    if target >= pairs[-1][0]:
        return pairs[-1][1]
    for (x0, y0), (x1, y1) in zip(pairs, pairs[1:]):
        if target == x0:
            return y0
        if target == x1:
            return y1
        if x0 < target < x1:
            if x1 == x0:
                return y0
            f = (target - x0) / (x1 - x0)
            return y0 + f * (y1 - y0)
    return math.nan


def relative_error(calculated, expected):
    if not (math.isfinite(calculated) and math.isfinite(expected)):
        return math.nan
    if expected == 0:
        return abs(calculated - expected)
    return abs(calculated - expected) / abs(expected)


def validate_pair(xml_path: Path, csv_path: Path):
    xml = parse_xml(xml_path)
    vendor = parse_vendor_csv(csv_path)

    teffd_calc = clamped_linear(xml["intensity"], xml["values"], 1000.0)
    if not math.isfinite(vendor["teffd_1sun"]):
        raise AssertionError(f"{csv_path.name}: vendor teff.d (1 Sun) unavailable")
    teffd_error = abs(teffd_calc - vendor["teffd_1sun"])
    if teffd_error > TEFFD_TOL_US:
        raise AssertionError(
            f"teff.d (1 Sun) error {teffd_error:g} us exceeds {TEFFD_TOL_US:g}"
        )

    if not (
        math.isfinite(xml["wafer_thickness_um"])
        and xml["wafer_thickness_um"] > 0
        and math.isfinite(vendor["teffss_1sun"])
        and vendor["teffss_1sun"] > 0
        and math.isfinite(vendor["teffss_max"])
        and vendor["teffss_max"] > 0
    ):
        raise AssertionError("paired result lacks finite W / teff.SS / teff.SS Max")

    smax_1_calc = 50.0 * xml["wafer_thickness_um"] / vendor["teffss_1sun"]
    smax_max_calc = 50.0 * xml["wafer_thickness_um"] / vendor["teffss_max"]
    smax_1_error = abs(smax_1_calc - vendor["smax_1sun"])
    smax_max_error = abs(smax_max_calc - vendor["smax_max"])
    if smax_1_error > SMAX_TOL:
        raise AssertionError(f"Smax (1 Sun) error {smax_1_error:g} exceeds {SMAX_TOL:g}")
    if smax_max_error > SMAX_TOL:
        raise AssertionError(f"Smax max error {smax_max_error:g} exceeds {SMAX_TOL:g}")

    dn_rel = math.nan
    if math.isfinite(vendor["dn_1sun"]):
        if not (math.isfinite(xml["optical_factor"]) and xml["optical_factor"] > 0):
            raise AssertionError("finite vendor Delta n requires finite positive OpticalFactor")
        dn_calc = (
            2.38e12
            * 1000.0
            * xml["optical_factor"]
            * vendor["teffss_1sun"]
            / xml["wafer_thickness_um"]
        )
        dn_rel = relative_error(dn_calc, vendor["dn_1sun"])
        if dn_rel > DN_REL_TOL:
            raise AssertionError(
                f"Delta n (1 Sun) relative error {dn_rel:g} exceeds {DN_REL_TOL:g}"
            )

    return {
        "points": len(xml["intensity"]),
        "intensity_min": min(xml["intensity"]),
        "intensity_max": max(xml["intensity"]),
        "teffd_calc": teffd_calc,
        "teffd_vendor": vendor["teffd_1sun"],
        "teffd_error": teffd_error,
        "smax_1_error": smax_1_error,
        "smax_max_error": smax_max_error,
        "dn_rel_error": dn_rel,
        "vendor_dn_available": math.isfinite(vendor["dn_1sun"]),
        "vendor_basore_available": math.isfinite(vendor["basore_j0"]),
        "vendor_ks_available": math.isfinite(vendor["ks_j0"]),
        "vendor_voc_available": math.isfinite(vendor["voc_1sun"]),
    }


def pair_from_argument(path: Path):
    if path.is_dir():
        xml_path = path / "result.xml"
        csv_path = path / "result.csv"
    else:
        xml_path = path
        csv_path = path.with_suffix(".csv")
    if not xml_path.exists():
        raise FileNotFoundError(f"Missing XML: {xml_path}")
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing matching CSV: {csv_path}")
    return xml_path, csv_path


def default_cases():
    roots = [
        Path("private/reference/dual_qss_results"),
        Path("private/reference/dual_qss"),
    ]
    cases = []
    for root in roots:
        if root.exists():
            cases.extend(path for path in root.iterdir() if path.is_dir() and (path / "result.xml").exists())
    if cases:
        return sorted(cases)
    return [Path(value) for value in sorted(glob.glob("private/reference/dual_qss_results/*.xml"))]


def main():
    args = [Path(value) for value in sys.argv[1:]]
    cases = args or default_cases()
    if not cases:
        print(
            "Dual QSS numeric-result validator: SKIP "
            "(provide paired case directories or private/reference/dual_qss_results)"
        )
        return 0

    for case in cases:
        xml_path, csv_path = pair_from_argument(case)
        result = validate_pair(xml_path, csv_path)
        dn = (
            f"{result['dn_rel_error']:.3g}"
            if math.isfinite(result["dn_rel_error"])
            else "vendor-unavailable"
        )
        print(
            f"DUAL-QSS RESULT PASS {xml_path.parent.name or xml_path.name}: "
            f"points={result['points']}; "
            f"I={result['intensity_min']:g}..{result['intensity_max']:g} mSun; "
            f"teff.d@1sun={result['teffd_calc']:.12g} us "
            f"(err={result['teffd_error']:.3g}); "
            f"Smax1 err={result['smax_1_error']:.3g}; "
            f"SmaxMax err={result['smax_max_error']:.3g}; "
            f"dn rel={dn}; "
            f"Basore={'available' if result['vendor_basore_available'] else 'Ud.'}; "
            f"KS={'available' if result['vendor_ks_available'] else 'Ud.'}; "
            f"Voc={'available' if result['vendor_voc_available'] else 'Ud.'}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
