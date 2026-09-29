#!/usr/bin/env python3
"""Validator for private LBIC XML + matching PV-2000 CSV/XPS references.

Runtime stays XML-only. Vendor CSV/XPS files are development evidence only.

The validator follows the current architecture:
- calculation profile comes from active measurement flags / channel semantics;
- geometry resolves independently through the shared geometry resolver;
- Current / Reflectivity / IQE availability is checked per quantity;
- calculated DL remains a separate validator/profile.

Historical LBIC-SINGLE-001 / LBIC-MULTI-002 / LBIC-REFLECTANCE-003 evidence
remains valid; the CALC profile labels below describe the decoupled runtime
semantics used by current analyzers.
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

from validate_geometry_profiles import resolve_xml_geometry

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
        return [math.nan, 0.0, 0.0, 0.0, 0.0]
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
    if not math.isfinite(eqe) or not math.isfinite(optical_reflectivity) or optical_reflectivity == 100.0:
        return math.nan
    value = eqe / (1.0 - optical_reflectivity / 100.0)
    return value if math.isfinite(value) and 0.0 <= value <= 100.0 else math.nan


def calculation_profile(measure_current, measure_direct, measure_diffuse, unit, point_beams):
    unit_ok = unit.replace("μ", "µ").replace("u", "µ").lower() == "µa"
    current_placeholder = all(
        values.get("Current", math.nan) == 0
        for row in point_beams
        for values in row.values()
    ) if point_beams else True

    if measure_current is True and unit_ok and measure_direct is True and measure_diffuse is True:
        return "LBIC-CALC-CURRENT-DIRECT-SCATTERED-001"
    if measure_current is True and unit_ok and measure_direct is False and measure_diffuse is True:
        return "LBIC-CALC-CURRENT-SCATTERED-002"
    if measure_current is True and unit_ok and measure_direct is False and measure_diffuse is False:
        return "LBIC-CALC-CURRENT-ONLY-003"
    if (
        measure_current is False
        and measure_direct is True
        and measure_diffuse is True
        and current_placeholder
    ):
        return "LBIC-CALC-REFLECTANCE-ONLY-004"
    raise AssertionError(
        "NEW PROFILE: active measurement flags/unit="
        f"{measure_current!r}/{measure_direct!r}/{measure_diffuse!r}/{unit!r}"
    )


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

    measure_current = flag_state(text(m, "MeasureCurrent", ""))
    measure_direct = flag_state(text(m, "MeasureDirectReflectance", ""))
    measure_diffuse = flag_state(text(m, "MeasureScatteredReflectance", ""))
    unit = text(m, "MicroAmps", "")
    profile = calculation_profile(
        measure_current, measure_direct, measure_diffuse, unit, point_beams
    )

    pattern_type = xtype(child(m, "Pattern"))
    target_type = xtype(child(m, "Target"))

    if not items:
        return {
            "empty": True,
            "profile": profile,
            "pattern_type": pattern_type,
            "target_type": target_type,
            "coords": [],
            "geometry_profile": None,
            "geometry_status": "empty",
            "geometry_interpretation": "zero acquired sites",
            "beams": {},
            "partial": False,
        }

    if not beam_keys:
        raise AssertionError("DataItems exist but no BeamData keys")
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

    for key in beam_keys:
        if key not in lasers:
            raise AssertionError(f"NEW PROFILE: LaserSettings row missing for beam {key}")
        if profile != "LBIC-CALC-REFLECTANCE-ONLY-004":
            if not math.isfinite(flux.get(key, math.nan)) or flux[key] <= 0:
                raise AssertionError(f"NEW PROFILE: missing/invalid FluxCache[{key}]={flux.get(key)!r}")

    geometry, _ = resolve_xml_geometry(path, len(items))
    geometry_status = geometry.get("status")
    geometry_profile = geometry.get("profileId")
    points = geometry.get("points", [])
    if geometry_status not in {"complete", "partial"} or len(points) != len(items):
        raise AssertionError(
            "NEW PROFILE: unresolved geometry "
            f"status={geometry_status!r} profile={geometry_profile!r} "
            f"points={len(points)} DataItems={len(items)}"
        )
    coords = [(point["x"], point["y"]) for point in points]

    beams = {}
    for key in sorted(beam_keys):
        stored_current = [row[key]["Current"] for row in point_beams]
        direct = [row[key]["DirectReflection"] for row in point_beams]
        scattered = [row[key]["ScatteredReflection"] for row in point_beams]
        current = [value if value >= 0 else math.nan for value in stored_current]

        if profile in {
            "LBIC-CALC-CURRENT-DIRECT-SCATTERED-001",
            "LBIC-CALC-REFLECTANCE-ONLY-004",
        }:
            optical = [a + b for a, b in zip(direct, scattered)]
        elif profile == "LBIC-CALC-CURRENT-SCATTERED-002":
            optical = scattered[:]
        else:
            optical = None

        beam = {"laser": lasers[key]}
        if profile != "LBIC-CALC-REFLECTANCE-ONLY-004":
            beam["current"] = current
        if optical is not None:
            beam["reflectivity"] = [
                max(0.0, min(100.0, value)) if math.isfinite(value) else math.nan
                for value in optical
            ]
        if profile in {
            "LBIC-CALC-CURRENT-DIRECT-SCATTERED-001",
            "LBIC-CALC-CURRENT-SCATTERED-002",
        }:
            eqe = [eqe_percent(value, flux[key]) for value in stored_current]
            beam["iqe"] = [
                iqe_percent(qe, reflectivity)
                for qe, reflectivity in zip(eqe, optical)
            ]
            beam["photon_flux"] = flux[key]
        beams[key] = beam

    return {
        "empty": False,
        "profile": profile,
        "pattern_type": pattern_type,
        "target_type": target_type,
        "coords": coords,
        "geometry_profile": geometry_profile,
        "geometry_status": geometry_status,
        "geometry_interpretation": geometry.get("interpretation"),
        "beams": beams,
        "partial": geometry_status == "partial",
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


def vendor_metric(vendor, wavelength, metric):
    prefix = f"Laser {wavelength:g}nm {metric} ["
    matches = [i for i, value in enumerate(vendor["header"]) if value.startswith(prefix)]
    if len(matches) != 1:
        raise AssertionError(f"expected one CSV column starting {prefix!r}, got {matches}")
    index = matches[0]
    return [finite_float(row[index]) for row in vendor["rows"]]


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
    if x["profile"] != "LBIC-CALC-REFLECTANCE-ONLY-004":
        raise AssertionError(
            f"expected LBIC-CALC-REFLECTANCE-ONLY-004, got {x['profile']}"
        )
    if x["empty"]:
        raise AssertionError("reflectance XPS reference has zero acquired sites")
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
        f"{xml_path.name}: LBIC-CALC-REFLECTANCE-ONLY-004; "
        f"geometry={x['geometry_profile'] or x['geometry_status']}; "
        f"points={len(x['coords'])}; XPS={checked}; "
        f"Reflectivity summary max error={worst:.4g} %-point"
    )


def validate_pair(xml_path: Path, csv_path: Path):
    x = parse_xml(xml_path)
    v = parse_vendor_csv(csv_path)

    if x["empty"]:
        if v["rows"]:
            raise AssertionError(f"zero XML DataItems but CSV has {len(v['rows'])} point rows")
        return (
            f"LBIC EMPTY {xml_path.name}: profile={x['profile']}; "
            f"pattern={x['pattern_type']} target={x['target_type']}; "
            "zero acquired sites; no numeric profile promoted"
        )

    xs = [p[0] for p in x["coords"]]
    ys = [p[1] for p in x["coords"]]
    n = len(xs)
    if len(v["xs"]) != n:
        raise AssertionError(f"CSV point count={len(v['xs'])}, XML geometry points={n}")

    ex = max_abs(xs, v["xs"])
    ey = max_abs(ys, v["ys"])
    if ex > TOL_COORD or ey > TOL_COORD:
        raise AssertionError(f"coordinate max error X={ex:g}, Y={ey:g}")

    beam_messages = []
    for key, beam in x["beams"].items():
        wavelength = beam["laser"]["wavelength"]
        checks = []

        if "current" in beam:
            expected = vendor_metric(v, wavelength, "Current")
            error = max_abs(beam["current"], expected, allow_nan=True)
            if error > TOL_CURRENT:
                raise AssertionError(f"beam {key} Current max error={error:g}")
            expected_summary = v["summaries"].get((wavelength, "current"))
            if expected_summary is None:
                raise AssertionError(f"missing {wavelength:g} nm current vendor summary")
            summary_error = max_abs(summary(beam["current"]), expected_summary, allow_nan=True)
            if summary_error > TOL_SUMMARY:
                raise AssertionError(f"beam {key} current summary max error={summary_error:g}")
            checks.append(f"Current={error:.3g}")

        if "reflectivity" in beam:
            expected = vendor_metric(v, wavelength, "Reflectivity")
            error = max_abs(beam["reflectivity"], expected, allow_nan=True)
            if error > TOL_REFLECTIVITY:
                raise AssertionError(f"beam {key} Reflectivity max error={error:g}")
            expected_summary = v["summaries"].get((wavelength, "reflectivity"))
            if expected_summary is None:
                raise AssertionError(f"missing {wavelength:g} nm reflectivity vendor summary")
            summary_error = max_abs(summary(beam["reflectivity"]), expected_summary, allow_nan=True)
            if summary_error > TOL_SUMMARY:
                raise AssertionError(f"beam {key} reflectivity summary max error={summary_error:g}")
            checks.append(f"R={error:.3g}")

        if "iqe" in beam:
            expected = vendor_metric(v, wavelength, "IQE")
            error = max_abs(beam["iqe"], expected, allow_nan=True)
            if error > TOL_IQE:
                raise AssertionError(f"beam {key} IQE max error={error:g}")
            expected_summary = v["summaries"].get((wavelength, "iqe"))
            if expected_summary is None:
                raise AssertionError(f"missing {wavelength:g} nm IQE vendor summary")
            summary_error = max_abs(summary(beam["iqe"]), expected_summary, allow_nan=True)
            if summary_error > TOL_SUMMARY:
                raise AssertionError(f"beam {key} IQE summary max error={summary_error:g}")
            checks.append(
                f"IQE={error:.3g},validIQE={sum(math.isfinite(value) for value in expected)}/{n}"
            )

        beam_messages.append(f"{wavelength:g}nm:" + ",".join(checks))

    geometry_label = (
        x["geometry_profile"]
        if x["geometry_status"] == "complete"
        else f"{x['geometry_status']}:{x['geometry_interpretation']}"
    )
    return (
        f"{xml_path.name}: calc={x['profile']}; geometry={geometry_label}; "
        f"points={n}; beams={len(x['beams'])}; X/Y max={max(ex, ey):.3g} mm; "
        + "; ".join(beam_messages)
    )


def main():
    args = sys.argv[1:]
    allow_unpaired = "--allow-unpaired" in args
    paths = [p for p in args if p != "--allow-unpaired"]
    raw = [Path(p) for p in (paths or sorted(glob.glob("private/reference/lbic/*.xml")))]
    if not raw:
        print("LBIC paired validator: SKIP (no private/reference/lbic/*.xml)")
        return 0

    ok = True
    counts = {"PASS": 0, "EMPTY": 0, "UNPAIRED": 0, "FAIL": 0}
    for xml_path in raw:
        try:
            parsed = parse_xml(xml_path)
            if parsed["profile"] == "LBIC-CALC-REFLECTANCE-ONLY-004":
                xps_paths = matching_xps_files(xml_path)
                if xps_paths:
                    msg = validate_reflectance_xps(xml_path, xps_paths)
                elif parsed["empty"]:
                    csv_path = xml_path.with_suffix(".csv")
                    if not csv_path.exists():
                        raise AssertionError("empty LBIC reference has no matching CSV")
                    msg = validate_pair(xml_path, csv_path)
                elif allow_unpaired:
                    print(
                        f"UNPAIRED {xml_path.name}: calc={parsed['profile']}; "
                        f"geometry={parsed['geometry_profile'] or parsed['geometry_status']}; "
                        f"points={len(parsed['coords'])}; no matching vendor XPS"
                    )
                    counts["UNPAIRED"] += 1
                    continue
                else:
                    raise AssertionError("matching PV-2000 Reflectivity XPS missing")
            else:
                csv_path = xml_path.with_suffix(".csv")
                if not csv_path.exists():
                    raise AssertionError(f"matching vendor CSV missing: {csv_path.name}")
                msg = validate_pair(xml_path, csv_path)
        except Exception as exc:
            label = "NEW PROFILE" if "NEW PROFILE:" in str(exc) else "FAIL"
            print(f"{label} {xml_path.name}: {type(exc).__name__}: {exc}")
            counts["FAIL"] += 1
            ok = False
        else:
            if msg.startswith("LBIC EMPTY"):
                print(msg)
                counts["EMPTY"] += 1
            else:
                print("PASS " + msg)
                counts["PASS"] += 1

    print("Summary: " + ", ".join(f"{label}={count}" for label, count in counts.items()))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
