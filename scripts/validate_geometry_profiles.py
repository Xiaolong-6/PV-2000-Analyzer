#!/usr/bin/env python3
"""Validate one private XML/CSV pair through the shared JavaScript geometry resolver."""
from __future__ import annotations

import csv
import json
import math
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

TYPE = "{http://www.w3.org/2001/XMLSchema-instance}type"


def number(node, path):
    try:
        return float(node.findtext(path))
    except (AttributeError, TypeError, ValueError):
        return None


def points(node):
    return [{"x": number(point, "X"), "y": number(point, "Y")}
            for point in (list(node) if node is not None else [])]


def resolve_xml_geometry(xml_path, point_count):
    root = ET.parse(xml_path).getroot()
    measurement = root.find("Measurement")
    pattern, target = measurement.find("Pattern"), measurement.find("Target")
    exclusions = [points(shape.find("Vertices")) for shape in target.findall("Exclusions/Shape")
                  if shape.attrib.get(TYPE) == "Quadrilateral"]
    region = pattern.find("Region")
    data = {
        "patternType": pattern.attrib.get(TYPE), "targetType": target.attrib.get(TYPE),
        "pointCount": point_count,
        "allowPartialPrefix": (root.findtext("Status") or "").lower() in
        {"terminated", "aborted", "interrupted", "cancelled", "canceled"},
        "rawCoefficients": points(pattern.find("Coefficients")),
        "exclusionPolygons": exclusions,
        "diameter": number(target, "Diameter"),
        "targetWidth": number(target, "Size/Width"),
        "targetHeight": number(target, "Size/Height"),
        "edgeExclusion": number(target, "EdgeExclusion"),
        "regionX": number(region, "X") if number(region, "X") is not None else number(region, "Location/X"),
        "regionY": number(region, "Y") if number(region, "Y") is not None else number(region, "Location/Y"),
        "regionWidth": number(region, "Width") if number(region, "Width") is not None else number(region, "Size/Width"),
        "regionHeight": number(region, "Height") if number(region, "Height") is not None else number(region, "Size/Height"),
        "nx": number(pattern, "Dimension/X"), "ny": number(pattern, "Dimension/Y"),
        "pitchX": number(pattern, "Pitch/X"), "pitchY": number(pattern, "Pitch/Y"),
    }
    source = """
      global.PV2000={};
      require('./src/core/geometry.js'); require('./src/core/profiles.js');
      require('./src/profiles/geometry.js');
      const fs=require('node:fs'), data=JSON.parse(fs.readFileSync(0,'utf8'));
      for(const [key,value] of Object.entries(data))if(value===null)delete data[key];
      const geometry=PV2000.geometry.resolveMeasurementGeometry(data);
      const profile=PV2000.profiles.resolveGeometry({geometryModel:geometry});
      process.stdout.write(JSON.stringify({points:geometry.pointsMm,status:geometry.geometryStatus,
        profileId:profile?.id,interpretation:geometry.interpretation}));
    """
    output = subprocess.run(["node", "-e", source], input=json.dumps(data), text=True,
                            capture_output=True, check=True)
    result = json.loads(output.stdout)
    return result, data


def validate(xml_path, csv_path, profile_id):
    with open(csv_path, encoding="utf-8-sig", newline="") as file:
        rows = list(csv.reader(file, delimiter=";"))
    header_index = next(i for i, row in enumerate(rows) if row and row[0].startswith("Point.X"))
    expected = [(float(row[0]), float(row[1])) for row in rows[header_index + 1 :]]
    result, data = resolve_xml_geometry(xml_path, len(expected))
    if data["allowPartialPrefix"] and result["status"] == "partial":
        assert result.get("profileId") is None and result["interpretation"] != "unresolved", result
    else:
        assert result["status"] == "complete" and result["profileId"] == profile_id, result
    assert len(result["points"]) == len(expected)
    error = max((math.hypot(point["x"] - x, point["y"] - y)
                 for point, (x, y) in zip(result["points"], expected)), default=0)
    assert error < 1e-9, (xml_path, error)
    print(f"PASS {profile_id} ({result['status']}): {len(expected)} paired coordinates, max error {error:.3g} mm")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Usage: validate_geometry_profiles.py private/result.xml private/result.csv GEOM-...")
    validate(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3])
