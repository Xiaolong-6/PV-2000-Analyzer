#!/usr/bin/env python3
"""Pointwise validator for paired private PV-2000 ISC XML + CSV references.

Runtime remains XML-only. CSV exports are development references. The current
validated family is ISCMeasurement + MapPattern + SquareCell with repeated
VcpdDark/VcpdLight readings, XML VcpdOffset/VsbCorrectionFactor, and vendor
Vcpd Dark / Vcpd Light / Vsb outputs.

Ordinary numeric changes in target size, edge exclusion, pitch, reading count,
offset or correction factor stay within this family when the same XML/result
path is used. Other pattern/target/result paths are NEW PROFILE until paired
vendor output confirms their semantics.
"""
from __future__ import annotations

import csv
import glob
import math
import statistics
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

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


def first_num(e, names, default=math.nan):
    for name in names:
        v = num(e, name, math.nan)
        if math.isfinite(v):
            return v
    return default


def xtype(e):
    if e is None:
        return ""
    for k, v in e.attrib.items():
        if lname(k) == "type":
            return v
    return ""


def scalar_values(e):
    out = []
    for x in children(e):
        try:
            v = float((x.text or "").strip())
        except (TypeError, ValueError):
            continue
        if math.isfinite(v):
            out.append(v)
    return out


def finite_float(value):
    try:
        v = float(value)
    except (TypeError, ValueError):
        return math.nan
    return v if math.isfinite(v) else math.nan


def max_abs(a, b):
    if len(a) != len(b):
        raise AssertionError(f"length mismatch {len(a)} != {len(b)}")
    err = 0.0
    for i, (x, y) in enumerate(zip(a, b)):
        if not (math.isfinite(x) and math.isfinite(y)):
            raise AssertionError(f"non-finite value at point {i + 1}: {x!r}, {y!r}")
        err = max(err, abs(x - y))
    return err


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
    if xtype(m) != "ISCMeasurement":
        raise AssertionError(f"type={xtype(m)!r}, expected ISCMeasurement")

    md = child(m, "MeasurementData")
    itd = child(md, "IterationData")
    iters = [x for x in children(itd) if lname(x.tag) == "Iteration"]
    if len(iters) != 1:
        raise AssertionError(f"NEW PROFILE: expected one Iteration, found {len(iters)}")
    data = child(iters[0], "Data")
    items = [x for x in children(data) if lname(x.tag) == "DataItem"]

    pattern = child(m, "Pattern")
    target = child(m, "Target")
    if xtype(pattern) != "MapPattern":
        raise AssertionError(f"NEW PROFILE: pattern={xtype(pattern)!r}")
    if xtype(target) != "SquareCell":
        raise AssertionError(f"NEW PROFILE: target={xtype(target)!r}")

    pitch = child(pattern, "Pitch")
    pitch_x, pitch_y = num(pitch, "X"), num(pitch, "Y")
    size = child(target, "Size")
    width, height = num(size, "Width"), num(size, "Height")
    edge = num(target, "EdgeExclusion", num(m, "EdgeExclusion", 0.0))
    if not all(math.isfinite(v) for v in (pitch_x, pitch_y, width, height, edge)):
        raise AssertionError("NEW PROFILE: incomplete MapPattern/SquareCell geometry")
    if pitch_x <= 0 or pitch_y <= 0 or width <= 0 or height <= 0:
        raise AssertionError("NEW PROFILE: invalid MapPattern/SquareCell geometry")
    hx, hy = width / 2 - edge, height / 2 - edge
    if hx < 0 or hy < 0:
        raise AssertionError("NEW PROFILE: edge exclusion exceeds target half-size")

    nx = math.floor(hx / pitch_x + 1e-9)
    ny = math.floor(hy / pitch_y + 1e-9)
    xs, ys = [], []
    for iy in range(-ny, ny + 1):
        for ix in range(-nx, nx + 1):
            xs.append(ix * pitch_x)
            ys.append(iy * pitch_y)
    if len(xs) != len(items):
        raise AssertionError(
            f"NEW PROFILE: generated coordinates={len(xs)}, DataItem count={len(items)}"
        )

    offset = first_num(md, ["VcpdOffset", "VcpdOffsett"], 0.0)
    factor = num(md, "VsbCorrectionFactor", math.nan)
    if not math.isfinite(factor):
        raise AssertionError("NEW PROFILE: missing VsbCorrectionFactor")

    dark, light, vsb = [], [], []
    reading_counts = set()
    for i, item in enumerate(items):
        d = scalar_values(child(item, "VcpdDark"))
        l = scalar_values(child(item, "VcpdLight"))
        if not d or not l or len(d) != len(l):
            raise AssertionError(
                f"NEW PROFILE: point {i + 1} dark/light reading counts {len(d)}/{len(l)}"
            )
        reading_counts.add(len(d))
        dm = statistics.fmean(d)
        lm = statistics.fmean(l)
        vd = dm - offset
        vbarrier = factor * (dm - lm)
        vl = vd - vbarrier
        dark.append(vd)
        light.append(vl)
        vsb.append(vbarrier)

    return {
        "xs": xs,
        "ys": ys,
        "dark": dark,
        "light": light,
        "vsb": vsb,
        "reading_counts": sorted(reading_counts),
        "factor": factor,
        "offset": offset,
        "pitch": (pitch_x, pitch_y),
        "size": (width, height),
        "edge": edge,
    }


def parse_vendor_csv(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh, delimiter=";"))

    summary_rows = {}
    for i, row in enumerate(rows[:-1]):
        head = row[0].strip() if row else ""
        key = (
            "dark" if head.startswith("Vcpd Dark [")
            else "light" if head.startswith("Vcpd Light [")
            else "vsb" if head.startswith("Vsb [") or head.startswith("VSB [")
            else None
        )
        if key:
            summary_rows[key] = [finite_float(x) for x in rows[i + 1][1:6]]

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
    idark = col("Vcpd Dark [V]")
    ilight = col("Vcpd Light [V]")
    ivsb = col("Vsb [V]")

    xs, ys, dark, light, vsb = [], [], [], [], []
    for row in rows[header_idx + 1 :]:
        if max(ix, iy, idark, ilight, ivsb) >= len(row):
            continue
        x, y = finite_float(row[ix]), finite_float(row[iy])
        if not (math.isfinite(x) and math.isfinite(y)):
            break
        xs.append(x)
        ys.append(y)
        dark.append(finite_float(row[idark]))
        light.append(finite_float(row[ilight]))
        vsb.append(finite_float(row[ivsb]))

    return {
        "xs": xs,
        "ys": ys,
        "dark": dark,
        "light": light,
        "vsb": vsb,
        "summary": summary_rows,
    }


def validate_pair(xml_path: Path, csv_path: Path):
    x = parse_xml(xml_path)
    v = parse_vendor_csv(csv_path)
    n = len(x["xs"])
    if len(v["xs"]) != n:
        raise AssertionError(f"CSV point count={len(v['xs'])}, XML point count={n}")

    ex = max_abs(x["xs"], v["xs"])
    ey = max_abs(x["ys"], v["ys"])
    ed = max_abs(x["dark"], v["dark"])
    el = max_abs(x["light"], v["light"])
    eb = max_abs(x["vsb"], v["vsb"])
    if max(ex, ey) > TOL_COORD:
        raise AssertionError(f"coordinate max error X={ex:g}, Y={ey:g}")
    if max(ed, el, eb) > TOL_VALUE:
        raise AssertionError(
            f"value max error dark={ed:g}, light={el:g}, vsb={eb:g}"
        )

    summary_err = 0.0
    for key in ("dark", "light", "vsb"):
        if key not in v["summary"]:
            raise AssertionError(f"missing {key} vendor summary")
        summary_err = max(summary_err, max_abs(summary(x[key]), v["summary"][key]))
    if summary_err > TOL_SUMMARY:
        raise AssertionError(f"summary max error={summary_err:g}")

    return (
        f"{xml_path.name}: points={n}; readings/site={x['reading_counts']}; "
        f"pitch={x['pitch'][0]:g}x{x['pitch'][1]:g} mm; "
        f"target={x['size'][0]:g}x{x['size'][1]:g} mm; edge={x['edge']:g} mm; "
        f"X/Y max={max(ex, ey):.3g} mm; Vcpd Dark max={ed:.3g} V; "
        f"Vcpd Light max={el:.3g} V; Vsb max={eb:.3g} V; "
        f"summary max={summary_err:.3g}"
    )


def main():
    raw = [Path(p) for p in (sys.argv[1:] or sorted(glob.glob("private/reference/isc/*.xml")))]
    if not raw:
        print("ISC paired validator: SKIP (no private/reference/isc/*.xml)")
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
