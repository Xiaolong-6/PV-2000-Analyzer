#!/usr/bin/env python3
"""Regression validators for private QSS-µPCD XML + PV-2000 CSV references.

Runtime remains XML-only. The historical qss_upcd_example pair validates the
305-point MapPattern/RoundWafer path including lifetime, Smax and Implied Voc.
Additional same-basename pairs under private/reference/qss/ validate supported
coordinate encodings; SquareRegionPattern is checked point-by-point against the
vendor X/Y export.
"""
from pathlib import Path
import csv
import glob
import math
import statistics
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TOL_COORD = 1e-12


def lname(tag):
    return tag.split("}", 1)[-1]


def children(e):
    return list(e) if e is not None else []


def child(e, name):
    return next((x for x in children(e) if lname(x.tag) == name), None)


def xtype(e):
    if e is None:
        return ""
    for key, value in e.attrib.items():
        if lname(key) == "type":
            return value
    return ""


def num(e, name, default=math.nan):
    x = child(e, name)
    try:
        return float((x.text or "").strip())
    except (AttributeError, TypeError, ValueError):
        return default


def max_abs(a, b):
    if len(a) != len(b):
        raise AssertionError(f"length mismatch {len(a)} != {len(b)}")
    return max((abs(x - y) for x, y in zip(a, b)), default=0.0)


def vendor_xy(path):
    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh, delimiter=";"))
    header_idx = next(
        (i for i, row in enumerate(rows) if row and row[0].strip() == "Point.X[mm]"),
        None,
    )
    if header_idx is None:
        raise AssertionError("point table header not found")
    header = rows[header_idx]
    ix = next(i for i, value in enumerate(header) if value.strip() == "Point.X[mm]")
    iy = next(i for i, value in enumerate(header) if value.strip() == "Point.Y[mm]")
    xs, ys = [], []
    for row in rows[header_idx + 1 :]:
        if max(ix, iy) >= len(row):
            continue
        try:
            x, y = float(row[ix]), float(row[iy])
        except ValueError:
            break
        if not (math.isfinite(x) and math.isfinite(y)):
            break
        xs.append(x)
        ys.append(y)
    return xs, ys


def validate_square_region(xml_path, csv_path):
    root = ET.parse(xml_path).getroot()
    m = child(root, "Measurement")
    if xtype(m) != "QssUpcdMeasurement":
        raise AssertionError(f"type={xtype(m)!r}, expected QssUpcdMeasurement")
    pattern = child(m, "Pattern")
    if xtype(pattern) != "SquareRegionPattern":
        raise AssertionError(f"NEW PROFILE: pattern={xtype(pattern)!r}")

    region = child(pattern, "Region")
    location = child(region, "Location")
    size = child(region, "Size")
    dimension = child(pattern, "Dimension")
    x0 = num(region, "X", num(location, "X"))
    y0 = num(region, "Y", num(location, "Y"))
    width = num(region, "Width", num(size, "Width"))
    height = num(region, "Height", num(size, "Height"))
    nx, ny = int(num(dimension, "X", 0)), int(num(dimension, "Y", 0))
    if nx < 1 or ny < 1 or not all(math.isfinite(v) for v in (x0, y0, width, height)):
        raise AssertionError("NEW PROFILE: incomplete SquareRegionPattern geometry")

    data = child(child(child(m, "MeasurementData"), "IterationData"), "Iteration")
    items = [x for x in children(child(data, "Data")) if lname(x.tag) == "DataItem"]
    if len(items) != nx * ny:
        raise AssertionError(f"Dimension={nx}x{ny}={nx * ny}, DataItem count={len(items)}")

    dx = width / (nx - 1) if nx > 1 else 0.0
    dy = height / (ny - 1) if ny > 1 else 0.0
    xs, ys = [], []
    for row in range(ny):
        for col in range(nx):
            xs.append(x0 + col * dx)
            ys.append(y0 + row * dy)

    vx, vy = vendor_xy(csv_path)
    ex, ey = max_abs(xs, vx), max_abs(ys, vy)
    if max(ex, ey) > TOL_COORD:
        raise AssertionError(f"coordinate max error X={ex:g}, Y={ey:g}")
    return (
        f"{xml_path.name}: SquareRegionPattern {nx}x{ny}={nx * ny}; "
        f"pitch={dx:.12g}x{dy:.12g} mm; X/Y max={max(ex, ey):.3g} mm"
    )


def validate_legacy():
    xml_path = ROOT / "private/reference/qss_upcd_example.xml"
    csv_path = ROOT / "private/reference/qss_upcd_export.csv"
    if not xml_path.exists() or not csv_path.exists():
        print("QSS legacy 305-point validator: SKIP")
        return True

    root = ET.parse(xml_path).getroot()
    m = child(root, "Measurement")
    it = child(child(child(m, "MeasurementData"), "IterationData"), "Iteration")
    vals = [float(child(x, "Value").text) for x in child(it, "Data")]
    Wum = num(m, "WaferThickness")
    W = Wum * 1e-4
    OF = num(m, "OpticalFactor")
    Nd = num(m, "Doping")
    pre = child(child(child(m, "PreProcessings"), "ArrayOfPreProcessSettings"), "PreProcessSettings")
    qss = num(pre, "QssLampIntensity") / 1000
    T = 273.15 + num(it, "ChuckTemperature")

    with csv_path.open(encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh, delimiter=";"))
    data_rows = [
        tuple(map(float, row[:5]))
        for row in rows[9:]
        if len(row) >= 5 and row[0].strip()
    ]
    assert len(vals) == len(data_rows) == 305

    pattern = child(m, "Pattern")
    pitch = num(child(pattern, "Pitch"), "X")
    target = child(m, "Target")
    radius = num(target, "Diameter") / 2
    edge = num(target, "EdgeExclusion", num(m, "EdgeExclusion", 0.0))
    radius -= edge
    pts = []
    n = math.ceil(radius / pitch)
    for iy in range(-n, n + 1):
        y = iy * pitch
        for ix in range(-n, n + 1):
            x = ix * pitch
            if x * x + y * y < radius * radius - 1e-9:
                pts.append((x, y))

    coord_err = max(
        max(abs(a - b) for a, b in zip(point, row[:2]))
        for point, row in zip(pts, data_rows)
    )
    tau_err = max(abs(value - row[2]) for value, row in zip(vals, data_rows))
    smax = [W / (2 * value * 1e-6) for value in vals]
    smax_err = max(abs(value - row[3]) for value, row in zip(smax, data_rows))

    q = 1.602176634e-19
    k = 1.380649e-23
    kb_ev = 8.617333262145e-5
    ni300 = 1.517791063348261e10

    def eg(tt):
        return 1.17 - 4.73e-4 * tt * tt / (tt + 636)

    def ni(tt):
        return ni300 * (tt / 300) ** 1.5 * math.exp(
            -eg(tt) / (2 * kb_ev * tt) + eg(300) / (2 * kb_ev * 300)
        )

    G = 2.38e17 * qss / W * OF
    voc = []
    for tau in vals:
        dn = G * tau * 1e-6
        voc.append(k * T / q * math.log(dn * (Nd + dn) / ni(T) ** 2))
    voc_err = max(abs(value - row[4]) for value, row in zip(voc, data_rows))

    assert coord_err <= TOL_COORD and tau_err == 0
    assert smax_err < 1e-9
    assert voc_err < 1e-4
    print(
        "PASS qss_upcd_example.xml: 305 points; coordinates/lifetime exact; "
        f"Smax max={smax_err:.3g}; Voc max={voc_err:.3g} V; "
        f"lifetime stdev={statistics.stdev(vals):.12g}"
    )
    return True


def main():
    ok = validate_legacy()
    raw = [Path(p) for p in (sys.argv[1:] or sorted(glob.glob("private/reference/qss/*.xml")))]
    if not raw:
        print("QSS SquareRegion paired validator: SKIP (no private/reference/qss/*.xml)")
        return 0 if ok else 1

    for xml_path in raw:
        csv_path = xml_path.with_suffix(".csv")
        if not csv_path.exists():
            print(f"FAIL {xml_path.name}: matching vendor CSV missing: {csv_path.name}")
            ok = False
            continue
        try:
            msg = validate_square_region(xml_path, csv_path)
        except Exception as exc:
            label = "NEW PROFILE" if "NEW PROFILE:" in str(exc) else "FAIL"
            print(f"{label} {xml_path.name}: {type(exc).__name__}: {exc}")
            ok = False
        else:
            print("PASS " + msg)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
