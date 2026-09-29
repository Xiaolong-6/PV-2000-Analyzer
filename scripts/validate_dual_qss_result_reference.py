#!/usr/bin/env python3
"""Validate paired DualQssMeasurement final-result evidence.

Runtime remains XML-only. Matching vendor CSV files are development evidence.

This validator intentionally distinguishes:
- strict PASS for the paired non-Auger Back/Back single-site result family;
- diagnostic zero-site acquisitions;
- diagnostic legacy Lifetime-only exports;
- diagnostic categorical branches outside QSS-INJ-RESULT-001.

Pattern/Target geometry is not used as a calculation key. Paired evidence now
covers OnePointPattern plus one-site FixedPointsPattern results. When
DoPointAveraging=true, the vendor result path averages the saved lifetime
vectors pointwise before the existing downstream calculation.

The validator checks only relationships that are independently observable from
XML/result columns here. Full steady-state/QDC/J0 runtime parity is covered by
the paired runtime-result regression.
"""
from __future__ import annotations

import csv
import glob
import math
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from validate_geometry_profiles import resolve_xml_geometry

TEFFD_TOL_US = 1e-9
SMAX_TOL = 1e-9
DN_REL_TOL = 1e-12
COORD_TOL_MM = 1e-12


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


def text(node, name, default=""):
    item = child(node, name)
    return item.text.strip() if item is not None and item.text else default


def number(node, name, default=math.nan):
    try:
        return float(text(node, name, ""))
    except ValueError:
        return default


def bool_value(node, name):
    value = text(node, name, "").lower()
    if value == "true":
        return True
    if value == "false":
        return False
    return None


def vectors(node, name):
    holder = child(node, name)
    rows = list(holder) if holder is not None else []
    if not rows:
        return []
    if not any(list(row) for row in rows):
        rows = [rows]
    result = []
    for row in rows:
        values = []
        for item in list(row):
            try:
                values.append(float(item.text))
            except (TypeError, ValueError):
                values.append(math.nan)
        if values:
            result.append(values)
    return result


def vector(node, name):
    rows = vectors(node, name)
    return rows[0] if rows else []


def effective_lifetime(rows, point_averaging):
    if not rows:
        return []
    if point_averaging is not True or len(rows) == 1:
        return list(rows[0])
    out = []
    for index in range(len(rows[0])):
        column = [
            row[index] if index < len(row) else math.nan
            for row in rows
        ]
        out.append(
            sum(column) / len(column)
            if all(math.isfinite(value) for value in column)
            else math.nan
        )
    return out


def parse_xml(path: Path):
    root = ET.parse(path).getroot()
    measurement = child(root, "Measurement")
    if attr_type(measurement) != "DualQssMeasurement":
        raise AssertionError(f"{path.name}: expected DualQssMeasurement")

    pattern_type = attr_type(child(measurement, "Pattern"))
    target_type = attr_type(child(measurement, "Target"))
    md = child(measurement, "MeasurementData")
    iterations = children(child(md, "IterationData"), "Iteration")
    if len(iterations) != 1:
        return {
            "diagnostic": f"iteration-count={len(iterations)}",
            "pattern_type": pattern_type,
            "target_type": target_type,
            "item_count": 0,
        }

    iteration = iterations[0]
    items = children(child(iteration, "Data"), "DataItem")
    base = {
        "pattern_type": pattern_type,
        "target_type": target_type,
        "item_count": len(items),
        "probe": text(measurement, "ProbeSelection"),
        "bias": text(measurement, "QssBiasSelection"),
        "auger": bool_value(measurement, "UseAugerCorrection"),
        "calculate_j0": bool_value(measurement, "CalculateJZeroParams"),
        "include_ks": bool_value(measurement, "IncludeKSJ0"),
        "do_point_averaging": bool_value(measurement, "DoPointAveraging"),
        "point_average_count": number(measurement, "PointAverageCount"),
        "wafer_thickness_um": number(measurement, "WaferThickness"),
        "optical_factor": number(measurement, "OpticalFactor"),
        "doping": number(measurement, "Doping"),
        "doping_type": text(measurement, "DopingType"),
    }
    if not items:
        return {**base, "empty": True, "intensity": [], "values": []}
    if len(items) != 1 or attr_type(items[0]) != "QssDataItem":
        return {
            **base,
            "diagnostic": (
                f"data-layout items={len(items)} "
                f"type={attr_type(items[0]) if items else 'none'}"
            ),
        }

    intensity = vector(items[0], "Intensity")
    value_vectors = vectors(items[0], "Values")
    values = effective_lifetime(value_vectors, base["do_point_averaging"])
    if len(intensity) != len(values) or not intensity:
        return {
            **base,
            "diagnostic": (
                f"Intensity/Values count {len(intensity)} != {len(values)}"
            ),
            "intensity": intensity,
            "values": values,
        }
    return {
        **base,
        "empty": False,
        "intensity": intensity,
        "values": values,
        "value_vector_count": len(value_vectors),
    }


def parse_number(value):
    raw = (value or "").strip()
    if not raw or raw.lower().startswith("ud") or raw.lower() in {
        "nan", "infinity", "inf"
    }:
        return math.nan
    try:
        return float(raw.replace(",", "."))
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


def norm(value):
    return " ".join(
        (value or "")
        .replace("μ", "u")
        .replace("µ", "u")
        .replace("Δ", "delta")
        .replace("δ", "delta")
        .split()
    ).lower()


def find_col(header, predicate):
    normalized = [norm(value) for value in header]
    return next((i for i, value in enumerate(normalized) if predicate(value)), None)


def parse_vendor_csv(path: Path):
    rows = read_rows(path)
    header_index = next(
        (i for i, row in enumerate(rows) if row and norm(row[0]).startswith("point.x")),
        None,
    )
    if header_index is None:
        raise AssertionError(f"{path.name}: point-result header not found")

    header = rows[header_index]
    data_rows = [
        row for row in rows[header_index + 1 :]
        if row and (row[0] or "").strip()
    ]
    if not data_rows:
        return {"kind": "empty", "header": header, "rows": []}

    def value(row, predicate):
        index = find_col(header, predicate)
        return (
            parse_number(row[index])
            if index is not None and index < len(row)
            else math.nan
        )

    legacy_index = find_col(
        header, lambda s: s.startswith("lifetime") and "teff" not in s
    )
    teffd_index = find_col(
        header, lambda s: s.startswith("teff.d") and "1 sun" in s
    )
    if legacy_index is not None and teffd_index is None:
        return {
            "kind": "legacy-lifetime",
            "header": header,
            "rows": data_rows,
            "legacy_lifetime": parse_number(data_rows[0][legacy_index]),
        }

    parsed = []
    for row in data_rows:
        parsed.append({
            "x": value(row, lambda s: s.startswith("point.x")),
            "y": value(row, lambda s: s.startswith("point.y")),
            "teffd_1sun": value(
                row, lambda s: s.startswith("teff.d") and "1 sun" in s
            ),
            "teffss_1sun": value(
                row,
                lambda s: s.startswith("teff.ss")
                and "1 sun" in s
                and "max" not in s,
            ),
            "teffss_max": value(row, lambda s: s.startswith("teff.ss max")),
            "basore_j0": value(
                row, lambda s: s.startswith("basore") and "j0" in s
            ),
            "dn_1sun": value(
                row, lambda s: s.startswith("deltan") and "1 sun" in s
            ),
            "smax_1sun": value(
                row, lambda s: s.startswith("smax") and "1 sun" in s
            ),
            "smax_max": value(
                row, lambda s: s.startswith("smax") and "1 sun" not in s
            ),
            "voc_1sun": value(
                row, lambda s: s.startswith("implied voc") and "1 sun" in s
            ),
            "ks_j0": value(row, lambda s: s.startswith("k-s") and "j0" in s),
        })
    return {"kind": "result", "header": header, "rows": parsed}


def paired_teffd_one_sun(xs, ys):
    """Return only target-placement behaviors established by paired evidence."""
    pairs = sorted(
        (float(x), float(y))
        for x, y in zip(xs, ys)
        if math.isfinite(x) and math.isfinite(y)
    )
    if not pairs:
        return math.nan, "unavailable"
    exact = next((y for x, y in pairs if x == 1000.0), None)
    if exact is not None:
        return exact, "exact-1000"
    if pairs[-1][0] < 1000.0:
        return pairs[-1][1], "right-endpoint-below-1000"
    return math.nan, "unvalidated-target-placement"


def relative_error(calculated, expected):
    if not (math.isfinite(calculated) and math.isfinite(expected)):
        return math.nan
    if expected == 0:
        return abs(calculated - expected)
    return abs(calculated - expected) / abs(expected)


def resolve_geometry(path: Path, count: int):
    old = Path.cwd()
    try:
        os.chdir(Path(__file__).resolve().parents[1])
        geometry, _ = resolve_xml_geometry(path, count)
    finally:
        os.chdir(old)
    return geometry


def diagnostic(xml_path: Path, xml, reason):
    return {
        "status": "diagnostic",
        "message": (
            f"DUAL-QSS DIAGNOSTIC {xml_path.name}: {reason}; "
            f"pattern={xml.get('pattern_type', 'unknown')} "
            f"target={xml.get('target_type', 'unknown')}; "
            "no result-profile promotion"
        ),
    }


def validate_pair(xml_path: Path, csv_path: Path):
    xml = parse_xml(xml_path)
    vendor = parse_vendor_csv(csv_path)

    if vendor["kind"] == "empty":
        if xml.get("item_count", 0) != 0:
            raise AssertionError(
                f"{xml_path.name}: vendor has zero result rows but XML has "
                f"{xml.get('item_count')} DataItems"
            )
        return diagnostic(xml_path, xml, "zero acquired result rows")

    if vendor["kind"] == "legacy-lifetime":
        return diagnostic(
            xml_path,
            xml,
            "legacy Laser Power / Lifetime-only result branch",
        )

    if xml.get("diagnostic"):
        return diagnostic(xml_path, xml, xml["diagnostic"])

    if xml["pattern_type"] not in {"OnePointPattern", "FixedPointsPattern"}:
        return diagnostic(
            xml_path,
            xml,
            "outside QSS-INJ-RESULT-001 paired single-site calculation envelope",
        )
    if xml["probe"] != "Back" or xml["bias"] != "Back":
        return diagnostic(
            xml_path,
            xml,
            f"source selections {xml['probe']}/{xml['bias']} outside paired Back/Back",
        )
    if xml["auger"] is True:
        return diagnostic(xml_path, xml, "UseAugerCorrection=true remains unvalidated")
    if len(vendor["rows"]) != 1:
        return diagnostic(
            xml_path,
            xml,
            f"single-site profile has {len(vendor['rows'])} vendor result rows",
        )

    row = vendor["rows"][0]
    teffd_calc, teffd_rule = paired_teffd_one_sun(
        xml["intensity"], xml["values"]
    )
    if teffd_rule == "unvalidated-target-placement":
        return diagnostic(
            xml_path,
            xml,
            "1000-mSun target placement is outside paired extraction rules",
        )
    if not math.isfinite(row["teffd_1sun"]):
        raise AssertionError(f"{csv_path.name}: vendor teff.d (1 Sun) unavailable")
    teffd_error = abs(teffd_calc - row["teffd_1sun"])
    if teffd_error > TEFFD_TOL_US:
        raise AssertionError(
            f"teff.d (1 Sun) error {teffd_error:g} us exceeds {TEFFD_TOL_US:g}"
        )

    if not (
        math.isfinite(xml["wafer_thickness_um"])
        and xml["wafer_thickness_um"] > 0
        and math.isfinite(row["teffss_1sun"])
        and row["teffss_1sun"] > 0
    ):
        raise AssertionError("paired result lacks finite W / teff.SS (1 Sun)")

    smax_1_calc = 50.0 * xml["wafer_thickness_um"] / row["teffss_1sun"]
    smax_1_error = abs(smax_1_calc - row["smax_1sun"])
    if smax_1_error > SMAX_TOL:
        raise AssertionError(
            f"Smax (1 Sun) error {smax_1_error:g} exceeds {SMAX_TOL:g}"
        )

    calculate_j0 = xml["calculate_j0"] is True
    smax_max_error = math.nan
    if calculate_j0:
        if not (
            math.isfinite(row["teffss_max"])
            and row["teffss_max"] > 0
            and math.isfinite(row["smax_max"])
        ):
            raise AssertionError(
                "CalculateJZeroParams=true requires finite paired teff.SS Max / Smax Max"
            )
        smax_max_calc = 50.0 * xml["wafer_thickness_um"] / row["teffss_max"]
        smax_max_error = abs(smax_max_calc - row["smax_max"])
        if smax_max_error > SMAX_TOL:
            raise AssertionError(
                f"Smax max error {smax_max_error:g} exceeds {SMAX_TOL:g}"
            )
    else:
        if math.isfinite(row["teffss_max"]) or math.isfinite(row["smax_max"]):
            raise AssertionError(
                "CalculateJZeroParams=false expects teff.SS Max / Smax Max to be Ud."
            )
        if math.isfinite(row["basore_j0"]) or math.isfinite(row["ks_j0"]):
            raise AssertionError(
                "CalculateJZeroParams=false expects Basore/K-S J0 to be unavailable"
            )

    dn_rel = math.nan
    if math.isfinite(row["dn_1sun"]):
        if not (
            math.isfinite(xml["optical_factor"])
            and xml["optical_factor"] > 0
        ):
            raise AssertionError(
                "finite vendor Delta n requires finite positive OpticalFactor"
            )
        dn_calc = (
            2.38e12
            * 1000.0
            * xml["optical_factor"]
            * row["teffss_1sun"]
            / xml["wafer_thickness_um"]
        )
        dn_rel = relative_error(dn_calc, row["dn_1sun"])
        if dn_rel > DN_REL_TOL:
            raise AssertionError(
                f"Delta n (1 Sun) relative error {dn_rel:g} exceeds {DN_REL_TOL:g}"
            )

    geometry = resolve_geometry(xml_path, 1)
    points = geometry.get("points", [])
    if geometry.get("status") != "complete" or len(points) != 1:
        raise AssertionError(
            f"single-site geometry unresolved: status={geometry.get('status')} "
            f"profile={geometry.get('profileId')}"
        )
    if not (math.isfinite(row["x"]) and math.isfinite(row["y"])):
        raise AssertionError("vendor single-site X/Y unavailable")
    coord_error = math.hypot(
        points[0]["x"] - row["x"], points[0]["y"] - row["y"]
    )
    if coord_error > COORD_TOL_MM:
        raise AssertionError(f"OnePoint coordinate error {coord_error:g} mm")

    return {
        "status": "pass",
        "points": len(xml["intensity"]),
        "target_type": xml["target_type"],
        "geometry_profile": geometry.get("profileId"),
        "coord_error": coord_error,
        "teffd_error": teffd_error,
        "teffd_rule": teffd_rule,
        "smax_1_error": smax_1_error,
        "smax_max_error": smax_max_error,
        "dn_rel_error": dn_rel,
        "calculate_j0": calculate_j0,
        "do_point_averaging": xml.get("do_point_averaging"),
        "value_vector_count": xml.get("value_vector_count", 0),
        "vendor_basore_available": math.isfinite(row["basore_j0"]),
        "vendor_ks_available": math.isfinite(row["ks_j0"]),
        "vendor_voc_available": math.isfinite(row["voc_1sun"]),
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
            cases.extend(
                path
                for path in root.iterdir()
                if path.is_dir() and (path / "result.xml").exists()
            )
    if cases:
        return sorted(cases)
    return [
        Path(value)
        for value in sorted(glob.glob("private/reference/dual_qss_results/*.xml"))
    ]


def main():
    cases = [Path(value) for value in sys.argv[1:]] or default_cases()
    if not cases:
        print(
            "Dual QSS numeric-result validator: SKIP "
            "(provide paired case directories or private/reference/dual_qss_results)"
        )
        return 0

    for case in cases:
        xml_path, csv_path = pair_from_argument(case)
        result = validate_pair(xml_path, csv_path)
        if result["status"] == "diagnostic":
            print(result["message"])
            continue

        dn = (
            f"{result['dn_rel_error']:.3g}"
            if math.isfinite(result["dn_rel_error"])
            else "vendor-unavailable"
        )
        max_smax = (
            f"{result['smax_max_error']:.3g}"
            if math.isfinite(result["smax_max_error"])
            else "Ud.=Ud."
        )
        print(
            f"DUAL-QSS RESULT PASS {xml_path.parent.name or xml_path.name}: "
            f"points={result['points']}; "
            f"target={result['target_type']}; "
            f"geometry={result['geometry_profile']}; "
            f"XY err={result['coord_error']:.3g} mm; "
            f"teff.d err={result['teffd_error']:.3g} "
            f"(rule={result['teffd_rule']}); "
            f"Smax1 err={result['smax_1_error']:.3g}; "
            f"SmaxMax={max_smax}; "
            f"dn rel={dn}; "
            f"J0-requested={result['calculate_j0']}; "
            f"Basore={'available' if result['vendor_basore_available'] else 'Ud.'}; "
            f"KS={'available' if result['vendor_ks_available'] else 'Ud.'}; "
            f"Voc={'available' if result['vendor_voc_available'] else 'Ud.'}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
