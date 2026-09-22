#!/usr/bin/env python3
"""Validator for private LBIC XML + matching PV-2000 CSV/XPS references.

Runtime stays XML-only. CSV/XPS files are development references. The validator
recognizes LBIC-SINGLE-001, LBIC-MULTI-002 and LBIC-REFLECTANCE-003; ordinary
numeric wavelength, flux and geometry values are not whitelist keys.
"""
from __future__ import annotations

import csv
import glob
import html
import math
import re
import statistics
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

Q_PV2000 = 1.602e-19
REFERENCE_CHANNELS = {"Current", "DirectReflection", "ScatteredReflection"}

TOL_COORD = 1e-12
TOL_CURRENT = 1e-12
TOL_REFLECTIVITY = 1e-10
TOL_IQE = 1e-10
TOL_SUMMARY = 1e-10
TOL_XPS_ROUNDED_SUMMARY = 0.0051


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


def flag_state(value: str):
    v = str(value or "").strip().lower()
    if v in {"true", "1", "yes"}:
        return True
    if v in {"false", "0", "no"}:
        return False
    return None


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


def iqe_percent(eqe, optical_reflectivity):
    if not math.isfinite(eqe) or not math.isfinite(optical_reflectivity) or optical_reflectivity >= 100.0:
        return math.nan
    value = eqe / (1.0 - optical_reflectivity / 100.0)
    return value if math.isfinite(value) and value <= 100.0 else math.nan


def effective_half(size, edge):
    half = size / 2.0
    if not math.isfinite(half) or half <= 0:
        return math.nan
    edge = edge if math.isfinite(edge) else 0.0
    return half - edge if 0 <= edge < half else math.nan


def pseudo_square_coords(width, height, diameter, edge, pitch_x, pitch_y):
    half_w = effective_half(width, edge)
    half_h = effective_half(height, edge)
    radius = effective_half(diameter, edge)
    if not all(math.isfinite(v) for v in (half_w, half_h, radius, pitch_x, pitch_y)):
        return []
    if pitch_x <= 0 or pitch_y <= 0:
        return []
    nx = math.floor(half_w / pitch_x + 1e-9)
    ny = math.floor(half_h / pitch_y + 1e-9)
    r2 = radius * radius
    out = []
    for iy in range(-ny, ny + 1):
        y = iy * pitch_y
        for ix in range(-nx, nx + 1):
            x = ix * pitch_x
            if x * x + y * y <= r2 + 1e-9:
                out.append((x, y))
    return out


def parse_xml(path: Path):
    root = ET.parse(path).getroot()
    m = child(root, "Measurement")
    if xtype(m) != "LBICMeasurement":
        raise AssertionError(f"type={xtype(m)!r}, expected LBICMeasurement")

    md = child(m, "MeasurementData")
    itd = child(md, "IterationData")
    iters = [x for x in children(itd) if lname(x.tag) == "Iteration"]
    if len(iters) != 1:
        raise AssertionError(f"NEW PROFILE: expected one Iteration, found {len(iters)}")
    data = child(iters[0], "Data")
    items = [x for x in children(data) if lname(x.tag) == "DataItem"]

    point_beams = []
    beam_keys = set()
    channel_sets = {}
    for di in items:
        bd = child(di, "BeamData")
        row = {}
        for b in children(bd):
            try:
                key = int(b.attrib.get("Key", ""))
            except ValueError as exc:
                raise AssertionError(f"NEW PROFILE: non-integer BeamData key={b.attrib.get('Key')!r}") from exc
            vals = {}
            for k, v in b.attrib.items():
                if k == "Key":
                    continue
                try:
                    vals[k] = float(v)
                except ValueError:
                    continue
            beam_keys.add(key)
            channel_sets.setdefault(key, set()).update(vals)
            row[key] = vals
        point_beams.append(row)

    if not beam_keys:
        raise AssertionError("no BeamData keys")
    for key in beam_keys:
        if channel_sets.get(key) != REFERENCE_CHANNELS:
            raise AssertionError(
                f"NEW PROFILE: beam {key} numeric channels={sorted(channel_sets.get(key, set()))}; "
                f"validated set={sorted(REFERENCE_CHANNELS)}"
            )
        if any(key not in row for row in point_beams):
            raise AssertionError(f"beam {key} missing from one or more DataItem rows")

    lasers_node = child(m, "LaserSettings")
    lasers = {}
    for row in children(lasers_node):
        key = int(num(row, "Index", -1))
        lasers[key] = {"wavelength": num(row, "Wavelength"), "power": num(row, "Power")}
    flux_node = child(m, "FluxCache")
    flux = {}
    for item in children(flux_node):
        key = int(num(child(item, "Key"), "int", -1))
        flux[key] = num(child(item, "Value"), "double")

    measure_current = flag_state(text(m, "MeasureCurrent", ""))
    measure_direct = flag_state(text(m, "MeasureDirectReflectance", ""))
    measure_diffuse = flag_state(text(m, "MeasureScatteredReflectance", ""))
    reflectance_only = measure_current is False and measure_direct is True and measure_diffuse is True

    for key in beam_keys:
        if key not in lasers:
            raise AssertionError(f"NEW PROFILE: LaserSettings row missing for beam {key}")
        if not reflectance_only and (not math.isfinite(flux.get(key, math.nan)) or flux[key] <= 0):
            raise AssertionError(f"NEW PROFILE: missing/invalid FluxCache[{key}]={flux.get(key)!r}")

    unit = text(m, "MicroAmps", "")
    if not reflectance_only and unit.replace("μ", "µ").lower() not in {"µa", "ua"}:
        raise AssertionError(f"NEW PROFILE: current unit={unit!r}")

    pat = child(m, "Pattern")
    target = child(m, "Target")
    pattern_type = xtype(pat)
    target_type = xtype(target)
    coords = []
    profile = ""

    if pattern_type == "SquareRegionPattern":
        if len(beam_keys) != 1:
            raise AssertionError(f"NEW PROFILE: SquareRegionPattern reference expects one beam, got {len(beam_keys)}")
        dim, reg = child(pat, "Dimension"), child(pat, "Region")
        nx, ny = int(num(dim, "X", 0)), int(num(dim, "Y", 0))
        x0, y0 = num(reg, "X"), num(reg, "Y")
        width, height = num(reg, "Width"), num(reg, "Height")
        if len(items) != nx * ny:
            raise AssertionError(f"Dimension={nx}x{ny}={nx * ny}, DataItem count={len(items)}")
        dx = width / (nx - 1) if nx > 1 else 0.0
        dy = height / (ny - 1) if ny > 1 else 0.0
        coords = [(x0 + col * dx, y0 + row * dy) for row in range(ny) for col in range(nx)]
        profile = "LBIC-REFLECTANCE-003" if reflectance_only else "LBIC-SINGLE-001"
    elif pattern_type == "MapPattern" and target_type == "PseudoSquareCell":
        if len(beam_keys) < 2:
            raise AssertionError(f"NEW PROFILE: PseudoSquareCell multi-beam reference expects >=2 beams, got {len(beam_keys)}")
        pitch = child(pat, "Pitch")
        size = child(target, "Size")
        width, height = num(size, "Width"), num(size, "Height")
        diameter = num(target, "Diameter")
        edge = num(target, "EdgeExclusion", num(m, "EdgeExclusion", 0.0))
        pitch_x, pitch_y = num(pitch, "X"), num(pitch, "Y")
        coords = pseudo_square_coords(width, height, diameter, edge, pitch_x, pitch_y)
        if len(coords) != len(items):
            raise AssertionError(
                f"PseudoSquare schedule={len(coords)}, DataItem count={len(items)} "
                f"(Size={width}x{height}, Diameter={diameter}, EdgeExclusion={edge}, Pitch={pitch_x}x{pitch_y})"
            )
        profile = "LBIC-MULTI-002"
    else:
        raise AssertionError(f"NEW PROFILE: pattern={pattern_type!r}, target={target_type!r}")

    beams = {}
    for key in sorted(beam_keys):
        current = [row[key]["Current"] for row in point_beams]
        direct = [row[key]["DirectReflection"] for row in point_beams]
        scattered = [row[key]["ScatteredReflection"] for row in point_beams]
        optical = [a + b for a, b in zip(direct, scattered)]
        reflectivity = [max(0.0, min(100.0, r)) for r in optical]
        beam = {
            "laser": lasers[key],
            "reflectivity": reflectivity,
        }
        if not reflectance_only:
            eqe = [eqe_percent(v, flux[key]) for v in current]
            iqe = [iqe_percent(qe, r) for qe, r in zip(eqe, optical)]
            beam.update({
                "photon_flux": flux[key],
                "current": current,
                "iqe": iqe,
            })
        beams[key] = beam

    return {
        "profile": profile,
        "coords": coords,
        "beams": beams,
        "reflectance_only": reflectance_only,
    }


def parse_vendor_csv(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh, delimiter=";"))

    summaries = {}
    rx = re.compile(r"^Laser\s+([0-9.]+)nm\s+(Current|Reflectivity|IQE)\s+\[")
    for i, row in enumerate(rows[:-1]):
        head = row[0].strip() if row else ""
        match = rx.match(head)
        if match:
            wavelength = float(match.group(1))
            metric = match.group(2).lower()
            summaries[(wavelength, metric)] = [finite_float(x) for x in rows[i + 1][1:6]]

    header_idx = next((i for i, r in enumerate(rows) if r and r[0].strip() == "Point.X[mm]"), None)
    if header_idx is None:
        raise AssertionError("point table header not found")
    header = rows[header_idx]

    def exact_col(name):
        matches = [i for i, value in enumerate(header) if value.strip() == name]
        if len(matches) != 1:
            raise AssertionError(f"expected one CSV column {name!r}, got {matches}")
        return matches[0]

    ix, iy = exact_col("Point.X[mm]"), exact_col("Point.Y[mm]")
    point_rows = []
    for row in rows[header_idx + 1 :]:
        if max(ix, iy) >= len(row):
            continue
        x, y = finite_float(row[ix]), finite_float(row[iy])
        if not math.isfinite(x) or not math.isfinite(y):
            break
        point_rows.append(row)

    xs = [finite_float(r[ix]) for r in point_rows]
    ys = [finite_float(r[iy]) for r in point_rows]
    return {"header": header, "rows": point_rows, "xs": xs, "ys": ys, "summaries": summaries}


def vendor_beam(vendor, wavelength):
    prefix = f"Laser {wavelength:g}nm "
    header = vendor["header"]

    def col(metric):
        needle = prefix + metric + " ["
        matches = [i for i, value in enumerate(header) if value.startswith(needle)]
        if len(matches) != 1:
            raise AssertionError(f"expected one CSV column starting {needle!r}, got {matches}")
        return matches[0]

    ic, ir, ii = col("Current"), col("Reflectivity"), col("IQE")
    return {
        "current": [finite_float(r[ic]) for r in vendor["rows"]],
        "reflectivity": [finite_float(r[ir]) for r in vendor["rows"]],
        "iqe": [finite_float(r[ii]) for r in vendor["rows"]],
    }



def normalize_filename(value: str):
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def matching_xps_files(xml_path: Path):
    base = normalize_filename(xml_path.stem)
    return sorted(
        path for path in xml_path.parent.glob("*.xps")
        if normalize_filename(path.stem).startswith(base)
    )


def parse_vendor_xps_summary(path: Path):
    with zipfile.ZipFile(path) as archive:
        page_names = [
            name for name in archive.namelist()
            if name.endswith("Documents/1/Pages/1.fpage/[0].piece")
            or "Documents/1/Pages/1.fpage/[0].piece" in name
        ]
        if len(page_names) != 1:
            raise AssertionError(f"expected one XPS first-page piece, got {page_names}")
        page = archive.read(page_names[0]).decode("utf-8-sig", errors="ignore")

    strings = [html.unescape(value) for value in re.findall(r'UnicodeString="([^"]*)"', page)]
    if not any("Reflectivity" in value for value in strings):
        raise AssertionError("XPS does not identify a Reflectivity result")

    labels = ["Average", "Median", "Stdev", "Minimum", "Maximum"]
    for i in range(len(strings) - len(labels)):
        if strings[i:i + len(labels)] != labels:
            continue
        values = []
        for value in strings[i + len(labels):]:
            parsed = finite_float(value)
            if math.isfinite(parsed):
                values.append(parsed)
                if len(values) == 5:
                    return values
            elif values:
                break
    raise AssertionError("Reflectivity summary statistics not found in XPS")


def validate_reflectance_xps(xml_path: Path, xps_paths):
    x = parse_xml(xml_path)
    if x["profile"] != "LBIC-REFLECTANCE-003":
        raise AssertionError(f"expected LBIC-REFLECTANCE-003, got {x['profile']}")
    if len(x["beams"]) != 1:
        raise AssertionError(f"expected one reflectance beam, got {len(x['beams'])}")

    reflectivity = next(iter(x["beams"].values()))["reflectivity"]
    calculated = summary(reflectivity)
    checked = 0
    worst = 0.0
    for xps_path in xps_paths:
        expected = parse_vendor_xps_summary(xps_path)
        error = max_abs(calculated, expected)
        if error > TOL_XPS_ROUNDED_SUMMARY:
            raise AssertionError(
                f"{xps_path.name}: Reflectivity summary max error={error:g}; "
                f"tolerance={TOL_XPS_ROUNDED_SUMMARY:g}"
            )
        worst = max(worst, error)
        checked += 1

    return (
        f"{xml_path.name}: LBIC-REFLECTANCE-003; points={len(x['coords'])}; "
        f"XPS={checked}; Reflectivity summary max error={worst:.4g} %-point"
    )


def validate_pair(xml_path: Path, csv_path: Path):
    x = parse_xml(xml_path)
    v = parse_vendor_csv(csv_path)
    xs = [p[0] for p in x["coords"]]
    ys = [p[1] for p in x["coords"]]
    n = len(xs)
    if len(v["xs"]) != n:
        raise AssertionError(f"CSV point count={len(v['xs'])}, XML schedule={n}")

    ex = max_abs(xs, v["xs"])
    ey = max_abs(ys, v["ys"])
    if ex > TOL_COORD or ey > TOL_COORD:
        raise AssertionError(f"coordinate max error X={ex:g}, Y={ey:g}")

    beam_messages = []
    for key, beam in x["beams"].items():
        wavelength = beam["laser"]["wavelength"]
        vb = vendor_beam(v, wavelength)
        ec = max_abs(beam["current"], vb["current"])
        er = max_abs(beam["reflectivity"], vb["reflectivity"])
        ei = max_abs(beam["iqe"], vb["iqe"], allow_nan=True)
        if ec > TOL_CURRENT:
            raise AssertionError(f"beam {key} Current max error={ec:g}")
        if er > TOL_REFLECTIVITY:
            raise AssertionError(f"beam {key} Reflectivity max error={er:g}")
        if ei > TOL_IQE:
            raise AssertionError(f"beam {key} IQE max error={ei:g}")

        for metric in ("current", "reflectivity", "iqe"):
            expected = v["summaries"].get((wavelength, metric))
            if expected is None:
                raise AssertionError(f"missing {wavelength:g} nm {metric} vendor summary")
            es = max_abs(summary(beam[metric]), expected, allow_nan=True)
            if es > TOL_SUMMARY:
                raise AssertionError(f"beam {key} {metric} summary max error={es:g}")

        valid_iqe = sum(math.isfinite(value) for value in vb["iqe"])
        beam_messages.append(
            f"{wavelength:g}nm:Current={ec:.3g},R={er:.3g},IQE={ei:.3g},"
            f"validIQE={valid_iqe}/{n}"
        )

    return (
        f"{xml_path.name}: {x['profile']}; points={n}; beams={len(x['beams'])}; "
        f"X/Y max={max(ex, ey):.3g} mm; " + "; ".join(beam_messages)
    )


def main():
    raw = [Path(p) for p in (sys.argv[1:] or sorted(glob.glob("private/reference/lbic/*.xml")))]
    if not raw:
        print("LBIC paired validator: SKIP (no private/reference/lbic/*.xml)")
        return 0

    ok = True
    for xml_path in raw:
        try:
            parsed = parse_xml(xml_path)
            if parsed["profile"] == "LBIC-REFLECTANCE-003":
                xps_paths = matching_xps_files(xml_path)
                if not xps_paths:
                    raise AssertionError("matching PV-2000 Reflectivity XPS missing")
                msg = validate_reflectance_xps(xml_path, xps_paths)
            else:
                csv_path = xml_path.with_suffix(".csv")
                if not csv_path.exists():
                    raise AssertionError(f"matching vendor CSV missing: {csv_path.name}")
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
