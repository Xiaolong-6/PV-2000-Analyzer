#!/usr/bin/env python3
"""Pointwise validator for paired private LBIC XML + PV-2000 CSV references.

Runtime stays XML-only. CSV files are development references. The four supplied
pairs validate an algorithm family rather than four frozen numeric settings:
single-beam SquareRegionPattern measurements with raw Current,
DirectReflection and ScatteredReflection, a valid photon FluxCache, and vendor
outputs Current / Reflectivity / IQE.

Numeric wavelength, laser power, photon flux, Region origin/size and raster
dimensions may vary within this family. A categorical change in the input/output
path (for example multi-beam, a different channel set, another pattern type or a
different vendor result combination) is NEW PROFILE and must be checked against
its actual XML + matching PV-2000 export before the validation envelope expands.
"""
from __future__ import annotations

import csv
import glob
import math
import statistics
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

Q_PV2000 = 1.602e-19
REFERENCE_CHANNELS = {"Current", "DirectReflection", "ScatteredReflection"}

TOL_COORD = 1e-12
TOL_CURRENT = 1e-12
TOL_REFLECTIVITY = 1e-10
TOL_IQE = 1e-10
TOL_SUMMARY = 1e-10


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


def finite_float(s: str):
    try:
        v = float(s)
    except (TypeError, ValueError):
        return math.nan
    return v if math.isfinite(v) else math.nan


def max_abs(a, b, allow_nan=False):
    if len(a) != len(b):
        raise AssertionError(f"length mismatch {len(a)} != {len(b)}")
    err = 0.0
    for i, (x, y) in enumerate(zip(a, b)):
        xf, yf = math.isfinite(x), math.isfinite(y)
        if not xf or not yf:
            if allow_nan and not xf and not yf:
                continue
            raise AssertionError(f"finite/blank mismatch at point {i + 1}: {x!r} vs {y!r}")
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


def eqe_percent(current_microamp, photon_flux):
    if not math.isfinite(current_microamp) or not math.isfinite(photon_flux) or photon_flux <= 0:
        return math.nan
    return current_microamp * 1e-6 / Q_PV2000 / photon_flux * 100.0


def iqe_percent(eqe, reflectivity):
    if not math.isfinite(eqe) or not math.isfinite(reflectivity) or reflectivity >= 100.0:
        return math.nan
    value = eqe / (1.0 - reflectivity / 100.0)
    return value if math.isfinite(value) and value <= 100.0 else math.nan


def parse_xml(path: Path):
    root = ET.parse(path).getroot()
    m = child(root, "Measurement")
    if xtype(m) != "LBICMeasurement":
        raise AssertionError(f"type={xtype(m)!r}, expected LBICMeasurement")

    pat = child(m, "Pattern")
    if xtype(pat) != "SquareRegionPattern":
        raise AssertionError(f"NEW PROFILE: pattern={xtype(pat)!r}")

    dim, reg = child(pat, "Dimension"), child(pat, "Region")
    nx, ny = int(num(dim, "X", 0)), int(num(dim, "Y", 0))
    x0, y0 = num(reg, "X"), num(reg, "Y")
    width, height = num(reg, "Width"), num(reg, "Height")

    md = child(m, "MeasurementData")
    itd = child(md, "IterationData")
    iters = [x for x in children(itd) if lname(x.tag) == "Iteration"]
    if len(iters) != 1:
        raise AssertionError(f"NEW PROFILE: expected one Iteration, found {len(iters)}")

    data = child(iters[0], "Data")
    items = [x for x in children(data) if lname(x.tag) == "DataItem"]
    if len(items) != nx * ny:
        raise AssertionError(f"Dimension={nx}x{ny}={nx * ny}, DataItem count={len(items)}")

    rows = []
    beam_keys = set()
    channels = set()
    for di in items:
        bd = child(di, "BeamData")
        beams = children(bd)
        if len(beams) != 1:
            raise AssertionError(f"NEW PROFILE: point contains {len(beams)} beam rows")
        b = beams[0]
        key = b.attrib.get("Key", "")
        beam_keys.add(key)
        vals = {}
        for k, v in b.attrib.items():
            if k == "Key":
                continue
            try:
                vals[k] = float(v)
            except ValueError:
                continue
            channels.add(k)
        rows.append(vals)

    if len(beam_keys) != 1:
        raise AssertionError(f"NEW PROFILE: expected one BeamData key, got {sorted(beam_keys)}")
    beam_key_text = next(iter(beam_keys))
    try:
        beam_key = int(beam_key_text)
    except ValueError as exc:
        raise AssertionError(f"NEW PROFILE: non-integer BeamData key={beam_key_text!r}") from exc
    if channels != REFERENCE_CHANNELS:
        raise AssertionError(
            f"NEW PROFILE: numeric channels={sorted(channels)}; "
            f"validated set={sorted(REFERENCE_CHANNELS)}"
        )

    lasers = child(m, "LaserSettings")
    laser_rows = []
    for l in children(lasers):
        laser_rows.append((int(num(l, "Index", -1)), num(l, "Wavelength"), num(l, "Power")))
    matching_lasers = [row for row in laser_rows if row[0] == beam_key]
    if len(matching_lasers) != 1:
        raise AssertionError(
            f"NEW PROFILE: expected one LaserSettings row for beam {beam_key}, got {matching_lasers!r}"
        )

    flux_node = child(m, "FluxCache")
    flux = {}
    for item in children(flux_node):
        k = int(num(child(item, "Key"), "int", -1))
        v = num(child(item, "Value"), "double")
        flux[k] = v
    photon_flux = flux.get(beam_key, math.nan)
    if not math.isfinite(photon_flux) or photon_flux <= 0:
        raise AssertionError(f"NEW PROFILE: missing/invalid FluxCache[{beam_key}]={photon_flux!r}")

    unit = text(m, "MicroAmps", "")
    if unit.replace("μ", "µ").lower() not in {"µa", "ua"}:
        raise AssertionError(f"NEW PROFILE: current unit={unit!r}")

    dx = width / (nx - 1) if nx > 1 else 0.0
    dy = height / (ny - 1) if ny > 1 else 0.0
    xs, ys = [], []
    for row in range(ny):
        for col in range(nx):
            xs.append(x0 + col * dx)
            ys.append(y0 + row * dy)

    current = [r["Current"] for r in rows]
    direct = [r["DirectReflection"] for r in rows]
    scattered = [r["ScatteredReflection"] for r in rows]
    reflectivity = [a + b for a, b in zip(direct, scattered)]
    eqe = [eqe_percent(v, photon_flux) for v in current]
    iqe = [iqe_percent(qe, r) for qe, r in zip(eqe, reflectivity)]

    return {
        "nx": nx,
        "ny": ny,
        "beam_key": beam_key,
        "laser": matching_lasers[0],
        "photon_flux": photon_flux,
        "xs": xs,
        "ys": ys,
        "current": current,
        "reflectivity": reflectivity,
        "iqe": iqe,
    }


def parse_vendor_csv(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh, delimiter=";"))

    summary_rows = {}
    for i, row in enumerate(rows[:-1]):
        head = row[0].strip() if row else ""
        if " Current [" in head:
            summary_rows["current"] = [finite_float(x) for x in rows[i + 1][1:6]]
        elif " Reflectivity [" in head:
            summary_rows["reflectivity"] = [finite_float(x) for x in rows[i + 1][1:6]]
        elif " IQE [" in head:
            summary_rows["iqe"] = [finite_float(x) for x in rows[i + 1][1:6]]

    header_idx = next((i for i, r in enumerate(rows) if r and r[0].strip() == "Point.X[mm]"), None)
    if header_idx is None:
        raise AssertionError("point table header not found")
    header = rows[header_idx]

    def col(needle):
        matches = [i for i, h in enumerate(header) if needle in h]
        if len(matches) != 1:
            raise AssertionError(f"expected one CSV column containing {needle!r}, got {matches}")
        return matches[0]

    ix, iy = col("Point.X[mm]"), col("Point.Y[mm]")
    ic, ir, ii = col(" Current ["), col(" Reflectivity ["), col(" IQE [")

    xs, ys, current, reflectivity, iqe = [], [], [], [], []
    for row in rows[header_idx + 1 :]:
        if max(ix, iy, ic, ir, ii) >= len(row):
            continue
        x, y = finite_float(row[ix]), finite_float(row[iy])
        if not math.isfinite(x) or not math.isfinite(y):
            break
        xs.append(x)
        ys.append(y)
        current.append(finite_float(row[ic]))
        reflectivity.append(finite_float(row[ir]))
        iqe.append(finite_float(row[ii]))

    return {
        "xs": xs,
        "ys": ys,
        "current": current,
        "reflectivity": reflectivity,
        "iqe": iqe,
        "summary": summary_rows,
    }


def validate_pair(xml_path: Path, csv_path: Path):
    x = parse_xml(xml_path)
    v = parse_vendor_csv(csv_path)
    n = x["nx"] * x["ny"]
    if len(v["xs"]) != n:
        raise AssertionError(f"CSV point count={len(v['xs'])}, XML Dimension={n}")

    ex = max_abs(x["xs"], v["xs"])
    ey = max_abs(x["ys"], v["ys"])
    ec = max_abs(x["current"], v["current"])
    er = max_abs(x["reflectivity"], v["reflectivity"])
    ei = max_abs(x["iqe"], v["iqe"], allow_nan=True)

    if ex > TOL_COORD or ey > TOL_COORD:
        raise AssertionError(f"coordinate max error X={ex:g}, Y={ey:g}")
    if ec > TOL_CURRENT:
        raise AssertionError(f"Current max error={ec:g}")
    if er > TOL_REFLECTIVITY:
        raise AssertionError(f"Reflectivity max error={er:g}")
    if ei > TOL_IQE:
        raise AssertionError(f"IQE max error={ei:g}")

    for key in ("current", "reflectivity", "iqe"):
        if key not in v["summary"]:
            raise AssertionError(f"missing {key} vendor summary")
        es = max_abs(summary(x[key]), v["summary"][key], allow_nan=True)
        if es > TOL_SUMMARY:
            raise AssertionError(f"{key} summary max error={es:g}")

    valid_iqe = sum(math.isfinite(vv) for vv in v["iqe"])
    blanks = n - valid_iqe
    return (
        f"{xml_path.name}: {x['nx']}x{x['ny']}={n}; beam={x['beam_key']}; "
        f"wavelength={x['laser'][1]:g} nm; power={x['laser'][2]:g}; flux={x['photon_flux']:.12g}; "
        f"X/Y max={max(ex, ey):.3g} mm; Current max={ec:.3g} µA; "
        f"Reflectivity max={er:.3g} %-pt; IQE max={ei:.3g} %-pt; "
        f"IQE valid={valid_iqe}, blank={blanks}"
    )


def main():
    raw = [Path(p) for p in (sys.argv[1:] or sorted(glob.glob("private/reference/lbic/*.xml")))]
    if not raw:
        print("LBIC paired validator: SKIP (no private/reference/lbic/*.xml)")
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
