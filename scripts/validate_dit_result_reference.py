#!/usr/bin/env python3
"""Validate paired DIT final-result table quantities.

This validator complements validate_dit_raw_reference.py.  It targets the
PV-2000 final-result point table produced by the private development harness,
not the raw COCOS process-row export.

Strict gates are intentionally narrow:
- point count;
- shared geometry coordinates when a complete geometry profile resolves;
- initial VDark stored in XML;
- Initial Qc preprocess bookkeeping.

VLight and Vsb are printed as diagnostics because regenerated historical
exports can contain corrected-light/vendor-version state not uniquely saved in
the XML.  This script must not be used to widen Standard COCOS or COCOS-II
calculation claims.
"""
from __future__ import annotations

import argparse
import csv
import math
import os
import statistics
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_geometry_profiles import resolve_xml_geometry  # noqa: E402


def lname(tag):
    return tag.split("}", 1)[-1]


def kids(node):
    return list(node) if node is not None else []


def child(node, name):
    return next((x for x in kids(node) if lname(x.tag) == name), None)


def xtype(node):
    if node is None:
        return ""
    return next((v for k, v in node.attrib.items() if lname(k) == "type"), "")


def text(node, name, default=""):
    x = child(node, name)
    return (x.text or "").strip() if x is not None else default


def num(node, name, default=math.nan):
    try:
        return float(text(node, name, ""))
    except (TypeError, ValueError):
        return default


def scalar_mean(node):
    values = []
    for x in kids(node):
        try:
            values.append(float((x.text or "").strip()))
        except (TypeError, ValueError):
            pass
    return statistics.fmean(values) if values else math.nan


def vendor_num(raw):
    value = (raw or "").strip()
    if not value or value.lower() in {"ud.", "ud", "nan", "n/a", "na", "—", "-"}:
        return None
    try:
        parsed = float(value)
    except ValueError:
        return None
    return parsed if math.isfinite(parsed) else None


def norm(value):
    return " ".join(
        (value or "")
        .replace("μ", "u")
        .replace("µ", "u")
        .replace("⁻", "-")
        .replace("²", "2")
        .split()
    ).lower()


def vendor_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh, delimiter=";"))
    hi = next((i for i, row in enumerate(rows) if row and norm(row[0]).startswith("point.x")), None)
    if hi is None:
        raise ValueError("final-result point header not found")
    headers = [x.strip() for x in rows[hi]]

    def col(prefix):
        return next((i for i, name in enumerate(headers) if norm(name).startswith(prefix)), None)

    indices = {
        "x": col("point.x"),
        "y": col("point.y"),
        "VDark": col("vdark"),
        "VLight": col("vlight"),
        "Vsb": col("vsb"),
        "InitialQc": col("initial qc"),
    }
    missing = [name for name, index in indices.items() if index is None]
    if missing:
        raise ValueError(f"missing final-result columns: {', '.join(missing)}")

    result = []
    for row in rows[hi + 1 :]:
        if not row or not (row[0] or "").strip():
            continue
        mapped = {
            name: vendor_num(row[index] if index < len(row) else "")
            for name, index in indices.items()
        }
        if mapped["x"] is None or mapped["y"] is None:
            break
        result.append(mapped)
    return result


def xml_rows(path):
    root = ET.parse(path).getroot()
    measurement = child(root, "Measurement")
    if xtype(measurement) != "DITMeasurement":
        raise ValueError(f"type={xtype(measurement)!r}, expected DITMeasurement")

    md = child(measurement, "MeasurementData")
    iteration = child(child(md, "IterationData"), "Iteration")
    data = child(iteration, "Data")
    items = [x for x in kids(data) if lname(x.tag) == "DataItem"]
    offset = num(md, "VcpdOffsett", 0.0)
    factor = num(md, "VsbCorrectionFactor", 1.2)
    doping_type = "n" if text(measurement, "DopingType", "NType").lower().startswith("n") else "p"
    pre_settings = child(child(measurement, "PreProcess"), "Settings")
    pre_step = num(pre_settings, "CoronaCharge")

    result = []
    for item in items:
        initial_dark = scalar_mean(child(item, "InitialVcpdDark")) - offset
        initial_light = scalar_mean(child(item, "InitialVcpdLight")) - offset
        direct = factor * (initial_dark - initial_light)
        vsb = -direct if doping_type == "n" else direct
        pred = child(item, "PreProcessData")
        attempts = len(kids(child(pred, "VcpdDark")))
        initial_qc = (attempts + 1) * pre_step if math.isfinite(pre_step) else math.nan
        result.append({
            "VDark": initial_dark,
            "VLight": initial_light,
            "Vsb": vsb,
            "InitialQc": initial_qc,
        })
    return result, doping_type, xtype(child(measurement, "Pattern")), xtype(child(measurement, "Target"))


def max_abs(actual, expected):
    if len(actual) != len(expected):
        raise AssertionError(f"length mismatch {len(actual)} != {len(expected)}")
    error = 0.0
    mismatch = 0
    pairs = 0
    for a, b in zip(actual, expected):
        af = a is not None and math.isfinite(a)
        bf = b is not None and math.isfinite(b)
        if af != bf:
            mismatch += 1
        elif af:
            error = max(error, abs(a - b))
            pairs += 1
    return error, mismatch, pairs


def resolve(path, count):
    old = Path.cwd()
    try:
        os.chdir(ROOT)
        return resolve_xml_geometry(path, count)[0]
    finally:
        os.chdir(old)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xml", type=Path)
    parser.add_argument("csv", type=Path)
    args = parser.parse_args()

    vendor = vendor_rows(args.csv)
    actual, doping_type, pattern, target = xml_rows(args.xml)
    if len(actual) != len(vendor):
        raise AssertionError(f"XML sites={len(actual)}, vendor rows={len(vendor)}")
    if not actual and not vendor:
        print(f"DIT RESULT EMPTY {args.xml.name}: zero acquired sites; no numeric profile promoted")
        return 0

    vdark_error, vdark_mask, _ = max_abs(
        [x["VDark"] for x in actual], [x["VDark"] for x in vendor]
    )
    initial_error, initial_mask, _ = max_abs(
        [x["InitialQc"] for x in actual], [x["InitialQc"] for x in vendor]
    )
    light_error, light_mask, _ = max_abs(
        [x["VLight"] for x in actual], [x["VLight"] for x in vendor]
    )
    vsb_error, vsb_mask, _ = max_abs(
        [x["Vsb"] for x in actual], [x["Vsb"] for x in vendor]
    )

    geometry = resolve(args.xml, len(vendor))
    profile = geometry.get("profileId")
    status = geometry.get("status")
    points = geometry.get("points", [])
    coord_error = None
    if status == "complete" and profile and len(points) == len(vendor):
        coord_error = max(
            (
                math.hypot(point["x"] - row["x"], point["y"] - row["y"])
                for point, row in zip(points, vendor)
            ),
            default=0.0,
        )
        if coord_error > 1e-9:
            raise AssertionError(f"coordinate max error={coord_error:g} mm")

    if vdark_mask or vdark_error > 1e-9:
        raise AssertionError(f"VDark max={vdark_error:g} availability mismatch={vdark_mask}")
    if initial_mask or initial_error > 1e-6:
        raise AssertionError(
            f"InitialQc max={initial_error:g} availability mismatch={initial_mask}"
        )

    geometry_text = (
        f"{profile} XY={coord_error:.3g} mm"
        if coord_error is not None
        else f"unresolved ({status or 'unknown'}; {pattern}+{target})"
    )
    print(
        f"DIT RESULT PASS {args.xml.name}: sites={len(actual)}; geometry={geometry_text}; "
        f"VDark max={vdark_error:.3g} V; InitialQc max={initial_error:.3g} cm^-2; "
        f"VLight diagnostic max={light_error:.6g} V/mask{light_mask}; "
        f"Vsb diagnostic max={vsb_error:.6g} V/mask{vsb_mask}; doping={doping_type}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
