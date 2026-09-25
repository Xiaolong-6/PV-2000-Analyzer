#!/usr/bin/env python3
"""Pointwise validator for paired private PV-2000 VCPD XML + CSV references.

Runtime remains XML-only. CSV exports are development references. The current
validated calculation family is VcpdMeasurement with Readings per site,
LightOn=false, iteration-level VcpdOffset=0, and the
vendor Vcpd Dark output.

The paired references establish the arithmetic mean of one, four or sixteen
XML readings against exported Vcpd Dark. Geometry is validated independently.
Non-zero offset, illuminated VCPD and additional result quantities remain
outside the calculation profile.
"""
from __future__ import annotations

import csv
import glob
import math
import statistics
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from validate_geometry_profiles import resolve_xml_geometry

TOL_COORD = 1e-12
TOL_VALUE = 1e-12
TOL_SUMMARY = 1e-12


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
    for k, v in e.attrib.items():
        if lname(k) == "type":
            return v
    return ""


def finite_float(value):
    try:
        v = float(value)
    except (TypeError, ValueError):
        return math.nan
    return v if math.isfinite(v) else math.nan


def scalar_values(e):
    out = []
    for x in children(e):
        v = finite_float((x.text or "").strip())
        if math.isfinite(v):
            out.append(v)
    return out


def max_abs(a, b):
    if len(a) != len(b):
        raise AssertionError(f"length mismatch {len(a)} != {len(b)}")
    err = 0.0
    for i, (x, y) in enumerate(zip(a, b)):
        if not (math.isfinite(x) and math.isfinite(y)):
            raise AssertionError(f"non-finite value at point {i + 1}: {x!r}, {y!r}")
        err = max(err, abs(x - y))
    return err


def max_abs_available(a, b):
    if len(a) != len(b):
        raise AssertionError(f"length mismatch {len(a)} != {len(b)}")
    error = 0.0
    for i, (left, right) in enumerate(zip(a, b), 1):
        if math.isfinite(left) != math.isfinite(right):
            raise AssertionError(f"summary availability mismatch at column {i}")
        if math.isfinite(left):
            error = max(error, abs(left - right))
    return error


def summary(values):
    z = [v for v in values if math.isfinite(v)]
    if not z:
        return [math.nan] * 5
    return [
        statistics.fmean(z),
        statistics.median(z),
        statistics.stdev(z) if len(z) > 1 else math.nan,
        min(z),
        max(z),
    ]


def parse_xml(path: Path):
    root = ET.parse(path).getroot()
    m = child(root, "Measurement")
    if xtype(m) != "VcpdMeasurement":
        raise AssertionError(f"type={xtype(m)!r}, expected VcpdMeasurement")

    md = child(m, "MeasurementData")
    itd = child(md, "IterationData")
    iters = [x for x in children(itd) if lname(x.tag) == "Iteration"]
    if len(iters) != 1:
        raise AssertionError(f"NEW PROFILE: expected one Iteration, found {len(iters)}")
    iteration = iters[0]
    data = child(iteration, "Data")
    items = [x for x in children(data) if lname(x.tag) == "DataItem"]
    if not items:
        raise AssertionError("NEW PROFILE: no acquired sites; empty export only")
    geometry, _ = resolve_xml_geometry(path, len(items))
    xs = [point["x"] for point in geometry["points"]]
    ys = [point["y"] for point in geometry["points"]]

    offset = num(iteration, "VcpdOffset")
    if not math.isfinite(offset):
        raise AssertionError("NEW PROFILE: missing iteration VcpdOffset")
    if abs(offset) > TOL_VALUE:
        raise AssertionError(f"NEW PROFILE: non-zero VcpdOffset={offset:g}")

    light_on = text(m, "LightOn", "").lower()
    if light_on != "false":
        raise AssertionError(f"NEW PROFILE: LightOn={light_on!r}")

    configured_readings = num(m, "NumberOfReadings")
    if not math.isfinite(configured_readings) or configured_readings < 1 or int(configured_readings) != configured_readings:
        raise AssertionError(f"NEW PROFILE: NumberOfReadings={configured_readings!r}")

    values = []
    reading_counts = set()
    for i, item in enumerate(items):
        readings = scalar_values(child(item, "Readings"))
        if len(readings) != configured_readings:
            raise AssertionError(
                f"NEW PROFILE: point {i + 1} reading count={len(readings)}"
            )
        reading_counts.add(len(readings))
        values.append(statistics.fmean(readings))

    return {
        "xs": xs,
        "ys": ys,
        "values": values,
        "geometry": geometry,
        "reading_counts": sorted(reading_counts),
        "offset": offset,
    }


def parse_vendor_csv(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh, delimiter=";"))

    summary_row = None
    for i, row in enumerate(rows[:-1]):
        if row and row[0].strip().startswith("Vcpd Dark ["):
            summary_row = [finite_float(x) for x in rows[i + 1][1:6]]
            break
    if summary_row is None:
        raise AssertionError("Vcpd Dark vendor summary not found")

    header_idx = next(
        (i for i, row in enumerate(rows) if row and row[0].strip() == "Point.X[mm]"),
        None,
    )
    if header_idx is None:
        raise AssertionError("point table header not found")
    header = rows[header_idx]

    def col(exact):
        matches = [i for i, h in enumerate(header) if h.strip() == exact]
        if len(matches) != 1:
            raise AssertionError(f"expected one CSV column {exact!r}, got {matches}")
        return matches[0]

    ix = col("Point.X[mm]")
    iy = col("Point.Y[mm]")
    iv = col("Vcpd Dark [V]")

    xs, ys, values = [], [], []
    for row in rows[header_idx + 1 :]:
        if max(ix, iy, iv) >= len(row):
            continue
        x, y, v = finite_float(row[ix]), finite_float(row[iy]), finite_float(row[iv])
        if not (math.isfinite(x) and math.isfinite(y)):
            break
        xs.append(x)
        ys.append(y)
        values.append(v)

    return {"xs": xs, "ys": ys, "values": values, "summary": summary_row}


def validate_pair(xml_path: Path, csv_path: Path):
    x = parse_xml(xml_path)
    v = parse_vendor_csv(csv_path)
    if len(v["xs"]) != len(x["values"]):
        raise AssertionError(
            f"CSV point count={len(v['xs'])}, XML point count={len(x['values'])}"
        )

    if x["geometry"]["status"] not in {"complete", "partial"} or len(x["xs"]) != len(x["values"]):
        raise AssertionError(f"GEOMETRY NEW PROFILE: {x['geometry']}")
    ex = max_abs(x["xs"], v["xs"])
    ey = max_abs(x["ys"], v["ys"])
    ev = max_abs(x["values"], v["values"])
    es = max_abs_available(summary(x["values"]), v["summary"])
    if max(ex, ey) > TOL_COORD:
        raise AssertionError(f"coordinate max error X={ex:g}, Y={ey:g}")
    if ev > TOL_VALUE:
        raise AssertionError(f"Vcpd Dark max error={ev:g} V")
    if es > TOL_SUMMARY:
        raise AssertionError(f"summary max error={es:g}")

    return (
        f"{xml_path.name}: points={len(x['xs'])}; readings/site={x['reading_counts']}; "
        f"geometry={x['geometry']['profileId'] or x['geometry']['status']}; "
        f"X/Y max={max(ex, ey):.3g} mm; Vcpd Dark max={ev:.3g} V; "
        f"summary max={es:.3g}"
    )


def main():
    raw = [
        Path(p)
        for p in (sys.argv[1:] or sorted(glob.glob("private/reference/vcpd/*.xml")))
    ]
    if not raw:
        print("VCPD paired validator: SKIP (no private/reference/vcpd/*.xml)")
        return 0

    ok = True
    for xml_path in raw:
        csv_path = xml_path.with_suffix(".csv")
        if not csv_path.exists():
            print(f"FAIL {xml_path.name}: matching vendor CSV missing: {csv_path.name}")
            ok = False
            continue
        try:
            msg = validate_pair(xml_path, csv_path)
        except Exception as exc:
            label = "NEW PROFILE" if "NEW PROFILE:" in str(exc) else "FAIL"
            print(f"{label} {xml_path.name}: {type(exc).__name__}: {exc}")
            ok = False
        else:
            print("PASS " + msg)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
