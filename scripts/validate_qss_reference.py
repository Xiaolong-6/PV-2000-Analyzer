#!/usr/bin/env python3
from pathlib import Path
import csv, xml.etree.ElementTree as ET, statistics, math, sys
ROOT=Path(__file__).resolve().parents[1]
XML=ROOT/'private/reference/qss_upcd_example.xml'
CSV=ROOT/'private/reference/qss_upcd_export.csv'
if not XML.exists() or not CSV.exists():
    print('SKIP: private QSS reference XML/export not found');sys.exit(0)
r=ET.parse(XML).getroot(); m=r.find('Measurement'); it=m.find('./MeasurementData/IterationData/Iteration')
vals=[float(x.find('Value').text) for x in it.find('Data')]
Wum=float(m.findtext('WaferThickness')); W=Wum*1e-4
OF=float(m.findtext('OpticalFactor')); Nd=float(m.findtext('Doping'))
qss=float(m.findtext('./PreProcessings/ArrayOfPreProcessSettings/PreProcessSettings/QssLampIntensity'))/1000
T=273.15+float(it.findtext('ChuckTemperature'))
rows=[]
with CSV.open(encoding='utf-8-sig') as f:
    rr=list(csv.reader(f,delimiter=';'))
for x in rr[9:]:
    if len(x)>=5 and x[0].strip(): rows.append(tuple(map(float,x[:5])))
assert len(vals)==len(rows)==305
# Coordinates: ascending Y, ascending X, strict circular boundary.
pitch=float(m.findtext('./Pattern/Pitch/X')); radius=float(m.findtext('./Target/Diameter'))/2
pts=[]
for iy in range(math.ceil(-radius/pitch),math.floor(radius/pitch)+1):
    y=iy*pitch
    for ix in range(math.ceil(-radius/pitch),math.floor(radius/pitch)+1):
        x=ix*pitch
        if x*x+y*y < radius*radius-1e-9: pts.append((x,y))
coord_err=max(max(abs(a-b) for a,b in zip(p,row[:2])) for p,row in zip(pts,rows))
tau_err=max(abs(v-row[2]) for v,row in zip(vals,rows))
smax=[W/(2*v*1e-6) for v in vals]; smax_err=max(abs(v-row[3]) for v,row in zip(smax,rows))
# PV-2000 compatibility ni(T): old-vendor-compatible anchor fitted once to this export,
# temperature dependence then follows the standard Si Varshni/Boltzmann scaling.
q=1.602176634e-19;k=1.380649e-23;kb_ev=8.617333262145e-5;NI300=1.517791063348261e10
def eg(tt): return 1.17-4.73e-4*tt*tt/(tt+636)
def ni(tt): return NI300*(tt/300)**1.5*math.exp(-eg(tt)/(2*kb_ev*tt)+eg(300)/(2*kb_ev*300))
G=2.38e17*qss/W*OF
voc=[]
for tau in vals:
    dn=G*tau*1e-6
    voc.append(k*T/q*math.log(dn*(Nd+dn)/ni(T)**2))
voc_err=max(abs(v-row[4]) for v,row in zip(voc,rows))
print('QSS XML/export pointwise regression')
print('points:',len(vals),'coordinate max error:',coord_err)
print('tau max error:',tau_err)
print('Smax max error:',smax_err)
print('Voc max error [V]:',voc_err)
print(f'lifetime stats avg={statistics.mean(vals):.12g} median={statistics.median(vals):.12g} stdev={statistics.stdev(vals):.12g}')
print(f'Smax stats    avg={statistics.mean(smax):.12g} median={statistics.median(smax):.12g} stdev={statistics.stdev(smax):.12g}')
print(f'Voc stats     avg={statistics.mean(voc):.12g} median={statistics.median(voc):.12g} stdev={statistics.stdev(voc):.12g}')
assert coord_err==0 and tau_err==0
assert smax_err < 1e-9
assert voc_err < 1e-4
print('PASS: coordinates/lifetime exact, Smax floating-point exact, Implied Voc <0.1 mV max error vs PV-2000 export.')
