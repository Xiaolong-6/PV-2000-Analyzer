#!/usr/bin/env python3
"""Regression validators for private QSS-µPCD XML + PV-2000 CSV references.

Runtime remains XML-only. Development references validate geometry, stored
lifetime, Smax, and result availability as separate axes. Implied Voc is
reported diagnostically because its compatibility model is not promoted to a
cross-profile numeric guarantee.
"""
from pathlib import Path
import csv
import glob
import math
import statistics
import sys
import xml.etree.ElementTree as ET

from validate_geometry_profiles import resolve_xml_geometry

ROOT = Path(__file__).resolve().parents[1]
TOL_COORD = 1e-9
TOL_LIFETIME = 1e-9
TOL_SMAX = 1e-8
Q = 1.602176634e-19
K = 1.380649e-23
KB_EV = 8.617333262145e-5
NI300_PV2000_COMPAT = 1.517791063348261e10


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


def vendor_num(text):
    raw = (text or "").strip()
    if not raw or raw.lower() in {"ud.", "ud", "nan", "n/a", "na", "—", "-"}:
        return None
    try:
        value = float(raw)
    except ValueError:
        return None
    return value if math.isfinite(value) else None


def max_numeric_error(actual, expected):
    if len(actual) != len(expected):
        raise AssertionError(f"length mismatch {len(actual)} != {len(expected)}")
    error = 0.0
    mismatch = 0
    paired = 0
    for a, b in zip(actual, expected):
        af = a is not None and math.isfinite(a)
        bf = b is not None and math.isfinite(b)
        if af != bf:
            mismatch += 1
        elif af:
            error = max(error, abs(a - b))
            paired += 1
    return error, mismatch, paired


def eg_si(t):
    return 1.17 - 4.73e-4 * t * t / (t + 636)


def ni_compat(t):
    ref = 300.0
    ratio = (t / ref) ** 1.5 * math.exp(
        -eg_si(t) / (2 * KB_EV * t) + eg_si(ref) / (2 * KB_EV * ref)
    )
    return NI300_PV2000_COMPAT * ratio


def implied_voc(tau_us, intensity_sun, thickness_um, optical_factor, doping, temp_k):
    if not all(math.isfinite(v) for v in (
        tau_us, intensity_sun, thickness_um, optical_factor, doping, temp_k
    )):
        return None
    if tau_us <= 0 or intensity_sun <= 0 or thickness_um <= 0 or doping <= 0:
        return None
    w_cm = thickness_um * 1e-4
    generation = 2.38e17 * intensity_sun / w_cm * optical_factor
    dn = generation * tau_us * 1e-6
    ni = ni_compat(temp_k)
    value = K * temp_k / Q * math.log(dn * (doping + dn) / (ni * ni))
    return value if math.isfinite(value) else None


def vendor_table(path):
    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh, delimiter=";"))
    header_index = next(
        (i for i, row in enumerate(rows)
         if row and row[0].strip().lower().startswith("point.x")),
        None,
    )
    if header_index is None:
        raise AssertionError("point table header not found")
    header = [value.strip() for value in rows[header_index]]

    def column(predicate):
        return next((i for i, value in enumerate(header) if predicate(value.lower())), None)

    ix = column(lambda value: value.startswith("point.x"))
    iy = column(lambda value: value.startswith("point.y"))
    ilife = column(lambda value: "teff" in value and ("μs" in value or "us" in value))
    ismax = column(lambda value: value.startswith("smax") or "smax " in value)
    ivoc = column(lambda value: "implied voc" in value)
    if ix is None or iy is None:
        raise AssertionError(f"coordinate columns missing: {header}")

    result = []
    for row in rows[header_index + 1 :]:
        if max(ix, iy) >= len(row):
            break
        x, y = vendor_num(row[ix]), vendor_num(row[iy])
        if x is None or y is None:
            break
        result.append({
            "x": x,
            "y": y,
            "life": vendor_num(row[ilife]) if ilife is not None and ilife < len(row) else None,
            "smax": vendor_num(row[ismax]) if ismax is not None and ismax < len(row) else None,
            "voc": vendor_num(row[ivoc]) if ivoc is not None and ivoc < len(row) else None,
        })
    return result


def xml_values(measurement):
    md = child(measurement, "MeasurementData")
    itd = child(md, "IterationData")
    iteration = child(itd, "Iteration")
    data = child(iteration, "Data")
    values = [
        num(item, "Value")
        for item in children(data)
        if lname(item.tag) == "DataItem"
    ]
    return values, iteration


def validate_pair(xml_path, csv_path):
    root = ET.parse(xml_path).getroot()
    measurement = child(root, "Measurement")
    if xtype(measurement) != "QssUpcdMeasurement":
        raise AssertionError(f"type={xtype(measurement)!r}, expected QssUpcdMeasurement")

    values, iteration = xml_values(measurement)
    vendor = vendor_table(csv_path)
    pattern = xtype(child(measurement, "Pattern"))
    target = xtype(child(measurement, "Target"))
    status = (child(root, "Status").text or "").strip() if child(root, "Status") is not None else ""

    if not values and not vendor:
        return (
            f"QSS EMPTY {xml_path.name}: pattern={pattern or 'unknown'}; "
            f"target={target or 'unknown'}; status={status or 'unknown'}; "
            "zero acquired sites; no numeric profile promoted"
        )
    if len(values) != len(vendor):
        raise AssertionError(f"XML values={len(values)}, vendor rows={len(vendor)}")

    geometry, _ = resolve_xml_geometry(xml_path, len(vendor))
    if geometry.get("status") != "complete" or not geometry.get("profileId"):
        raise AssertionError(
            f"geometry unresolved: status={geometry.get('status')} "
            f"profile={geometry.get('profileId')} interpretation={geometry.get('interpretation')}"
        )
    points = geometry.get("points", [])
    if len(points) != len(vendor):
        raise AssertionError(f"geometry points={len(points)}, vendor rows={len(vendor)}")
    coord_error = max(
        (
            math.hypot(point["x"] - row["x"], point["y"] - row["y"])
            for point, row in zip(points, vendor)
        ),
        default=0.0,
    )

    thickness = num(measurement, "WaferThickness")
    optical_factor = num(measurement, "OpticalFactor", 1.0)
    doping = num(measurement, "Doping")
    pre_array = child(child(measurement, "PreProcessings"), "ArrayOfPreProcessSettings")
    pre = children(pre_array)[0] if children(pre_array) else None
    qss_milli = num(pre, "QssLampIntensity")
    temp_k = num(iteration, "ChuckTemperature", 26.85) + 273.15

    expected_lifetime = [
        value if math.isfinite(value) and value > 0 else None
        for value in values
    ]
    expected_smax = [
        (thickness * 1e-4) / (2 * value * 1e-6)
        if math.isfinite(value) and value > 0 and math.isfinite(thickness)
        else 0.0 if math.isfinite(value) and value <= 0 else None
        for value in values
    ]
    expected_voc = [
        implied_voc(value, qss_milli / 1000.0, thickness, optical_factor, doping, temp_k)
        if math.isfinite(value) and value > 0
        else 0.0 if math.isfinite(value) and value <= 0 else None
        for value in values
    ]

    lifetime_error, lifetime_mismatch, _ = max_numeric_error(
        expected_lifetime, [row["life"] for row in vendor]
    )
    smax_error, smax_mismatch, _ = max_numeric_error(
        expected_smax, [row["smax"] for row in vendor]
    )
    voc_error, voc_mismatch, voc_pairs = max_numeric_error(
        expected_voc, [row["voc"] for row in vendor]
    )
    sentinels = sum(1 for value in values if math.isfinite(value) and value <= 0)

    if coord_error > TOL_COORD:
        raise AssertionError(f"coordinate max error={coord_error:g} mm")
    if lifetime_mismatch or lifetime_error > TOL_LIFETIME:
        raise AssertionError(
            f"lifetime error={lifetime_error:g} availability mismatch={lifetime_mismatch}"
        )
    if smax_mismatch or smax_error > TOL_SMAX:
        raise AssertionError(
            f"Smax error={smax_error:g} availability mismatch={smax_mismatch}"
        )
    if voc_mismatch:
        raise AssertionError(f"Implied Voc availability mismatch={voc_mismatch}")

    return (
        f"QSS PASS {xml_path.name}: profile={geometry.get('profileId')}; "
        f"points={len(values)}; sentinel={sentinels}; "
        f"X/Y max={coord_error:.3g} mm; lifetime max={lifetime_error:.3g} us; "
        f"Smax max={smax_error:.3g} cm/s; "
        f"Voc diagnostic max={voc_error:.6g} V over {voc_pairs} finite/placeholder rows"
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

    G = 2.38e17 * qss / W * OF
    voc = []
    for tau in vals:
        dn = G * tau * 1e-6
        voc.append(K * T / Q * math.log(dn * (Nd + dn) / ni_compat(T) ** 2))
    voc_err = max(abs(value - row[4]) for value, row in zip(voc, data_rows))

    assert coord_err <= 1e-12 and tau_err == 0
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
        print("QSS paired validator: SKIP (no private/reference/qss/*.xml)")
        return 0 if ok else 1

    for xml_path in raw:
        csv_path = xml_path.with_suffix(".csv")
        if not csv_path.exists():
            print(f"FAIL {xml_path.name}: matching vendor CSV missing: {csv_path.name}")
            ok = False
            continue
        try:
            message = validate_pair(xml_path, csv_path)
        except Exception as exc:
            print(f"FAIL {xml_path.name}: {type(exc).__name__}: {exc}")
            ok = False
        else:
            print(message)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
