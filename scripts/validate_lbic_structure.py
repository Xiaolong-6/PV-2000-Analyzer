#!/usr/bin/env python3
"""Structural validator for private LBIC XML references.

This validator does not claim vendor parity. It checks only XML structure that the
browser parser relies on: measurement type, SquareRegionPattern geometry, raster
point count, beam keys/channels, laser settings and FluxCache presence.
"""
from __future__ import annotations
import glob, math, sys, xml.etree.ElementTree as ET
from pathlib import Path

def lname(tag: str) -> str: return tag.split('}',1)[-1]
def children(e): return list(e) if e is not None else []
def child(e, name): return next((x for x in children(e) if lname(x.tag)==name), None)
def text(e, name, default=''):
    x=child(e,name); return (x.text or '').strip() if x is not None else default
def num(e,name,default=math.nan):
    try: return float(text(e,name,''))
    except ValueError: return default
def xtype(e):
    if e is None: return ''
    for k,v in e.attrib.items():
        if lname(k)=='type': return v
    return ''

def validate(path: str) -> tuple[bool,str]:
    root=ET.parse(path).getroot(); m=child(root,'Measurement')
    if xtype(m)!='LBICMeasurement': return False, f'{path}: type={xtype(m)!r}, expected LBICMeasurement'
    pat=child(m,'Pattern'); dim=child(pat,'Dimension'); reg=child(pat,'Region')
    if xtype(pat)!='SquareRegionPattern': return False, f'{path}: unsupported pattern {xtype(pat)!r}'
    nx,ny=int(num(dim,'X',0)),int(num(dim,'Y',0)); expected=nx*ny
    md=child(m,'MeasurementData'); itd=child(md,'IterationData'); iters=[x for x in children(itd) if lname(x.tag)=='Iteration']
    if not iters: return False, f'{path}: no Iteration'
    counts=[]; keys=set(); attrs=set()
    for it in iters:
        data=child(it,'Data'); items=[x for x in children(data) if lname(x.tag)=='DataItem']; counts.append(len(items))
        for di in items:
            bd=child(di,'BeamData')
            for b in children(bd):
                keys.add(b.attrib.get('Key','')); attrs.update(k for k in b.attrib if k!='Key')
    if any(n!=expected for n in counts): return False, f'{path}: Dimension={nx}x{ny}={expected}, iteration counts={counts}'
    lasers=child(m,'LaserSettings'); laser_rows=[]
    for l in children(lasers): laser_rows.append((int(num(l,'Index',-1)),num(l,'Wavelength'),num(l,'Power')))
    flux=child(m,'FluxCache'); flux_keys=[]
    for item in children(flux):
        k=child(item,'Key'); flux_keys.append(int(num(k,'int',-1)))
    x,y,w,h=num(reg,'X'),num(reg,'Y'),num(reg,'Width'),num(reg,'Height')
    return True, f'{Path(path).name}: {nx}x{ny}={expected}; region=({x:g},{y:g}) {w:g}x{h:g} mm; beams={sorted(keys)}; channels={sorted(attrs)}; lasers={laser_rows}; flux keys={flux_keys}'

def main():
    paths=sys.argv[1:] or sorted(glob.glob('private/reference/lbic/*.xml'))
    if not paths:
        print('LBIC structural validator: SKIP (no private/reference/lbic/*.xml)'); return 0
    ok=True
    for p in paths:
        try:
            good,msg=validate(p)
        except Exception as e:
            good,msg=False,f'{p}: {type(e).__name__}: {e}'
        print(('PASS ' if good else 'FAIL ')+msg); ok &= good
    return 0 if ok else 1
if __name__=='__main__': raise SystemExit(main())
