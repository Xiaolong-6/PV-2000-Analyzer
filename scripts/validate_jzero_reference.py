#!/usr/bin/env python3
from __future__ import annotations
import glob, math, statistics, sys, xml.etree.ElementTree as ET
from pathlib import Path

from validate_geometry_profiles import resolve_xml_geometry

Q=1.602176634e-19
K=1.380649e-23
KB_EV=8.617333262145e-5
NI_BASORE_COMPAT=8.626227186463587e9
NI_VOC_300=(1.1136399052670412e10,1.107764334152709e10)
TOL_COORD=1e-12
TOL_LIFETIME=1e-9
TOL_SMAX=1e-9
TOL_J0=1e-8
TOL_VOC_PROFILE=1e-3
TOL_SUMMARY=1e-8

def lname(tag): return tag.split('}',1)[-1]
def children(e): return list(e) if e is not None else []
def child(e,name): return next((x for x in children(e) if lname(x.tag)==name),None)
def text(e,name,default=''):
    x=child(e,name); return (x.text or '').strip() if x is not None else default
def num(e,name,default=math.nan):
    try:return float(text(e,name,''))
    except (TypeError,ValueError):return default
def xtype(e):
    if e is None:return ''
    for k,v in e.attrib.items():
        if lname(k)=='type':return v
    return ''
def finite(s):
    try:v=float(s)
    except (TypeError,ValueError):return math.nan
    return v if math.isfinite(v) else math.nan

def max_abs(a,b):
    if len(a)!=len(b): raise AssertionError(f'length mismatch {len(a)} != {len(b)}')
    err=0.0
    for i,(x,y) in enumerate(zip(a,b)):
        if not(math.isfinite(x) and math.isfinite(y)):
            if math.isnan(x) and math.isnan(y):continue
            raise AssertionError(f'non-finite mismatch at point {i+1}: {x!r}, {y!r}')
        err=max(err,abs(x-y))
    return err

def summary(v):
    z=[x for x in v if math.isfinite(x)]
    return [statistics.fmean(z),statistics.median(z),statistics.stdev(z) if len(z)>1 else math.nan,min(z),max(z)] if z else [math.nan]*5

def effective_half(size,edge):
    half=size/2
    return half-edge if math.isfinite(half) and half>0 and math.isfinite(edge) and 0<=edge<half else math.nan

def pseudo_square_coords(width,height,diameter,edge,pitch_x,pitch_y):
    hw,hh,r=effective_half(width,edge),effective_half(height,edge),effective_half(diameter,edge)
    if not all(math.isfinite(x) for x in (hw,hh,r,pitch_x,pitch_y)) or pitch_x<=0 or pitch_y<=0:return []
    nx,ny=math.floor(hw/pitch_x+1e-9),math.floor(hh/pitch_y+1e-9);out=[];r2=r*r
    for iy in range(-ny,ny+1):
        y=iy*pitch_y
        for ix in range(-nx,nx+1):
            x=ix*pitch_x
            if x*x+y*y<=r2+1e-9:out.append((x,y))
    return out

def generation(intensity_milli,w_um,optical):
    return 2.38e17*(intensity_milli/1000)/(w_um*1e-4)*optical

def smax(tau_us,w_um): return (w_um*1e-4)/(2*tau_us*1e-6)
def eg_si(T): return 1.17-4.73e-4*T*T/(T+636)
def ni_temp(ni300,T): return ni300*(T/300)**1.5*math.exp(-eg_si(T)/(2*KB_EV*T)+eg_si(300)/(2*KB_EV*300))
def voc(tau_us,intensity_milli,w_um,optical,doping,temp_c,index):
    G=generation(intensity_milli,w_um,optical);T=temp_c+273.15;dn=G*tau_us*1e-6;ni=ni_temp(NI_VOC_300[index],T)
    return K*T/Q*math.log(dn*(doping+dn)/(ni*ni))
def basore(t1_us,t2_us,i1,i2,w_um,optical):
    G1,G2=generation(i1,w_um,optical),generation(i2,w_um,optical);t1,t2=t1_us*1e-6,t2_us*1e-6;W=w_um*1e-4
    slope=((1/t2)**2-(1/t1)**2)/(G2-G1)
    return Q*NI_BASORE_COMPAT**2*(W/4)*slope*1e15

def parse_xml(path):
    root=ET.parse(path).getroot();m=child(root,'Measurement')
    if xtype(m)!='JZeroMeasurement':raise AssertionError(f'type={xtype(m)!r}, expected JZeroMeasurement')
    md=child(m,'MeasurementData');itd=child(md,'IterationData');iters=[x for x in children(itd) if lname(x.tag)=='Iteration']
    if len(iters)!=2 or any(xtype(x)!='UpcdIterationData' for x in iters):raise AssertionError(f'NEW PROFILE: expected two UpcdIterationData iterations, got {[xtype(x) for x in iters]}')
    vals=[]
    for it in iters:
        data=child(it,'Data');vals.append([num(x,'Value') for x in children(data) if lname(x.tag)=='DataItem'])
    if len(vals[0])!=len(vals[1]):raise AssertionError(f'iteration point-count mismatch {len(vals[0])} != {len(vals[1])}')
    pattern,target=child(m,'Pattern'),child(m,'Target')
    geometry,_=resolve_xml_geometry(path,len(vals[0]))
    coords=[(point['x'],point['y']) for point in geometry.get('points',[])]
    geometry_profile=geometry.get('profileId')
    if len(coords)!=len(vals[0]):
        raise AssertionError(f'coordinate schedule={len(coords)}, values={len(vals[0])}')
    if not geometry_profile:
        raise AssertionError(
            f"NEW PROFILE: unresolved geometry {xtype(pattern)} + {xtype(target)} "
            f"(status={geometry.get('status')}, interpretation={geometry.get('interpretation')})"
        )
    pre=child(m,'PreProcessings');qss=[]
    for group in children(pre):
        setting=children(group)[0] if children(group) else None
        v=num(setting,'QssLampIntensity')
        if math.isfinite(v):qss.append(v)
    if len(qss)<2:raise AssertionError('missing two QSS intensities')
    return {'values':vals,'coords':coords,'geometry_profile':geometry_profile,'qss':qss[:2],'w':num(m,'WaferThickness'),'optical':num(m,'OpticalFactor',1),'doping':num(m,'Doping'),'temps':[num(it,'ChuckTemperature') for it in iters]}

def parse_csv(path):
    lines=Path(path).read_text(encoding='utf-8-sig').splitlines();summaries={};header=None;rows=[]
    for i,line in enumerate(lines):
        if line.startswith('Point.X[mm];'):
            header=line.split(';')[:-1]
            for row in lines[i+1:]:
                cells=row.split(';')[:-1]
                if len(cells)<len(header):break
                vals=[finite(x) for x in cells[:len(header)]]
                if not all(math.isfinite(x) for x in vals):break
                rows.append(vals)
            break
        if i+1<len(lines) and ';Average;Med;Stdev;Min;Max;' in lines[i]:
            metric=line.split(';',1)[0]
            vals=[finite(x) for x in lines[i+1].split(';') if x!='']
            if len(vals)>=5:summaries[metric]=vals[:5]
    if not header or not rows:raise AssertionError('vendor point table not found')
    return {'header':header,'rows':rows,'summaries':summaries}

def validate_pair(xml_path,csv_path):
    x,v=parse_xml(xml_path),parse_csv(csv_path);h=v['header'];idx={name:i for i,name in enumerate(h)}
    names=['Point.X[mm]','Point.Y[mm]','Basore J0 [fA/cm²]','teff.d (1sun)  [μs]','teff.d (3sun)  [μs]','Smax (1sun)  [cm/s]','Smax (3sun)  [cm/s]','Implied Voc (1sun)  [V]','Implied Voc (3sun)  [V]']
    for n in names:
        if n not in idx:raise AssertionError(f'missing CSV column {n!r}')
    cols={n:[r[idx[n]] for r in v['rows']] for n in names}
    if len(v['rows'])!=len(x['coords']):raise AssertionError(f'CSV points={len(v["rows"])}, XML points={len(x["coords"])}')
    ex=max_abs([p[0] for p in x['coords']],cols[names[0]]);ey=max_abs([p[1] for p in x['coords']],cols[names[1]])
    et1=max_abs(x['values'][0],cols[names[3]]);et2=max_abs(x['values'][1],cols[names[4]])
    s1=[smax(t,x['w']) for t in x['values'][0]];s2=[smax(t,x['w']) for t in x['values'][1]]
    es1=max_abs(s1,cols[names[5]]);es2=max_abs(s2,cols[names[6]])
    j0=[basore(a,b,x['qss'][0],x['qss'][1],x['w'],x['optical']) for a,b in zip(*x['values'])];ej=max_abs(j0,cols[names[2]])
    vv1=[voc(t,x['qss'][0],x['w'],x['optical'],x['doping'],x['temps'][0],0) for t in x['values'][0]];vv2=[voc(t,x['qss'][1],x['w'],x['optical'],x['doping'],x['temps'][1],1) for t in x['values'][1]]
    ev1=max_abs(vv1,cols[names[7]]);ev2=max_abs(vv2,cols[names[8]])
    if max(ex,ey)>TOL_COORD:raise AssertionError(f'coordinate max error={max(ex,ey):g}')
    if max(et1,et2)>TOL_LIFETIME:raise AssertionError(f'lifetime max error={max(et1,et2):g}')
    if max(es1,es2)>TOL_SMAX:raise AssertionError(f'Smax max error={max(es1,es2):g}')
    if ej>TOL_J0:raise AssertionError(f'Basore J0 max error={ej:g}')
    voc_profile=x['geometry_profile']=='GEOM-MAP-PSEUDOSQUARE-001'
    if voc_profile and max(ev1,ev2)>TOL_VOC_PROFILE:
        raise AssertionError(f'Implied Voc profile max error={max(ev1,ev2):g} V')
    metric_pairs=[(names[2],j0),(names[3],x['values'][0]),(names[4],x['values'][1]),(names[5],s1),(names[6],s2)]
    for name,data in metric_pairs:
        expected=v['summaries'].get(name)
        if expected is None:raise AssertionError(f'missing vendor summary for {name}')
        err=max_abs(summary(data),expected)
        if err>TOL_SUMMARY:raise AssertionError(f'{name} summary max error={err:g}')
    for name,data in ((names[7],vv1),(names[8],vv2)):
        expected=v['summaries'].get(name)
        if expected is None:raise AssertionError(f'missing vendor summary for {name}')
        err=max_abs(summary(data),expected)
        if voc_profile and err>TOL_VOC_PROFILE:
            raise AssertionError(f'{name} profile summary max error={err:g}')
    voc_status='JZERO-VOC-MAP-PSEUDOSQUARE-001' if voc_profile else 'diagnostic/inferred'
    return (f'{xml_path.name}: points={len(j0)}; geometry={x["geometry_profile"]}; '
            f'X/Y={max(ex,ey):.3g} mm; lifetime={max(et1,et2):.3g} us; '
            f'Smax={max(es1,es2):.3g}; J0={ej:.3g} fA/cm2; '
            f'Voc={max(ev1,ev2)*1e3:.4f} mV ({voc_status})')

def main():
    raw=[Path(p) for p in (sys.argv[1:] or sorted(glob.glob('private/reference/jzero/*.xml')))]
    if not raw:
        print('JZero paired validator: SKIP (no private/reference/jzero/*.xml)');return 0
    ok=True
    for xml_path in raw:
        csv_path=xml_path.with_suffix('.csv')
        if not csv_path.exists():print(f'FAIL {xml_path.name}: matching vendor CSV missing');ok=False;continue
        try:print('PASS '+validate_pair(xml_path,csv_path))
        except Exception as exc:print(('NEW PROFILE' if 'NEW PROFILE:' in str(exc) else 'FAIL')+f' {xml_path.name}: {type(exc).__name__}: {exc}');ok=False
    return 0 if ok else 1
if __name__=='__main__':raise SystemExit(main())
