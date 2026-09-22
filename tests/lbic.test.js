const test=require('node:test'),assert=require('node:assert/strict');
global.PV2000={};
require('../src/core/stats.js');require('../src/core/geometry.js');require('../src/core/registry.js');
PV2000.xml={};PV2000.exporter={csv(){}};
require('../src/modules/lbic.js');
const L=PV2000.modules.lbic;
const FLUX=1708439235302983;

test('rect grid reproduces PV-2000 X-fast row-major coordinates with increasing Y',()=>{
  const p=PV2000.geometry.rectGrid(-37,42,5,5,51,51,2601,1);
  assert.equal(p.length,2601);
  assert.deepEqual(p[0],{x:-37,y:42,row:0,col:0});
  assert.deepEqual(p[50],{x:-32,y:42,row:0,col:50});
  assert.deepEqual(p[51],{x:-37,y:42.1,row:1,col:0});
  assert.deepEqual(p.at(-1),{x:-32,y:47,row:50,col:50});
});

test('101x101 reference grid uses 0.05 mm pitch and reaches Region origin plus Size',()=>{
  const p=PV2000.geometry.rectGrid(-37,42,5,5,101,101,10201,1);
  assert.equal(p.length,10201);
  assert.equal(p[1].x,-36.95);
  assert.equal(p[101].y,42.05);
  assert.deepEqual(p.at(-1),{x:-32,y:47,row:100,col:100});
});

test('PseudoSquareCell MapPattern reconstructs the 54,449-point 0.5 mm raster',()=>{
  const p=PV2000.geometry.pseudoSquareGrid(59.5,59.5,72,0.5,0.5,54449);
  assert.equal(p.length,54449);
  assert.deepEqual(p[0],{x:-40.5,y:-59.5,row:0,col:38});
  assert.deepEqual(p.at(-1),{x:40.5,y:59.5,row:238,col:200});
  const center=p.findIndex(pt=>pt.x===0&&pt.y===0);
  assert.ok(center>=0);
  assert.deepEqual(p[center],{x:0,y:0,row:119,col:119});
  const firstRow=p.filter(pt=>pt.y===-59.5);
  assert.equal(firstRow.length,163);
  assert.equal(firstRow[0].x,-40.5);
  assert.equal(firstRow.at(-1).x,40.5);
});

test('coordinate-based LBIC profiles work on masked pseudo-square rows and columns',()=>{
  const coords=PV2000.geometry.pseudoSquareGrid(59.5,59.5,72,0.5,0.5,54449),
    metric={values:coords.map((_,i)=>i)},
    center=coords.findIndex(pt=>pt.x===0&&pt.y===0),
    edge=0;
  const xp=L.profilePoints({coords,pitchX:0.5,pitchY:0.5},metric,center,'x'),
    yp=L.profilePoints({coords,pitchX:0.5,pitchY:0.5},metric,center,'y'),
    edgeXp=L.profilePoints({coords,pitchX:0.5,pitchY:0.5},metric,edge,'x');
  assert.equal(xp.length,239);
  assert.equal(yp.length,239);
  assert.equal(xp[0].pos,-59.5);
  assert.equal(xp.at(-1).pos,59.5);
  assert.equal(edgeXp.length,163);
});

test('PV-2000 Reflectivity is DirectReflection plus ScatteredReflection with a 100% cap',()=>{
  const direct=33.2321503717211,scattered=4.95641556511122;
  assert.ok(Math.abs(L.totalReflectance(direct,scattered)-38.1885659368323)<1e-13);
  assert.equal(L.totalReflectance(90.5,9.5179668),100);
  assert.equal(L.totalReflectance(80,25),100);
  assert.equal(L.totalReflectance(0,-21.0514365493424),0);
  assert.ok(Number.isNaN(L.totalReflectance(NaN,2)));
});

test('EQE compatibility calculation uses PV-2000 q = 1.602e-19 C',()=>{
  assert.equal(L.Q_PV2000,1.602e-19);
  const eqe=L.eqePercent(11.0936,FLUX);
  assert.ok(Math.abs(eqe-4.053315916641647)<1e-14);
});

test('IQE reproduces the fast2 first exported point',()=>{
  const eqe=L.eqePercent(11.0936,FLUX);
  const iqe=L.iqePercent(eqe,38.1885659368323);
  assert.ok(Math.abs(iqe-6.55755035953282)<1e-13);
});

test('PV-2000-compatible IQE blanks calculated values above 100 percent',()=>{
  assert.ok(Number.isNaN(L.iqePercent(50,60)));
  assert.ok(Number.isNaN(L.iqePercent(10,100)));
  assert.ok(Math.abs(L.iqePercent(40,20)-50)<1e-12);
});

test('validated LBIC family is defined by measurement/result path, not exact numeric settings',()=>{
  const raw={key:0,channels:{Current:[11.0936],DirectReflection:[33.2],ScatteredReflection:[4.9]}};
  const d={currentUnit:'μA',patternType:'SquareRegionPattern',nx:51,ny:51,regionX:-37,regionY:42,width:5,height:5,beamCount:1,iterationCount:1};
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},d),true);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:1064,power:0.25,photonFlux:FLUX*0.83},d),true);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX+1},{...d,nx:4,ny:5,regionX:-2,regionY:3,width:1.5,height:2}),true);
  assert.equal(L.isReferenceProfile({key:0,channels:{...raw.channels,ExtraChannel:[1]}},{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},d),false);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{...d,beamCount:2}),false);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{...d,iterationCount:2}),false);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{...d,patternType:'OtherPattern'}),false);
});

test('reference profile exposes Current Reflectivity IQE as primary and diagnostics as advanced',()=>{
  const raw={key:0,channels:{Current:[11.0936],DirectReflection:[33.2321503717211],ScatteredReflection:[4.95641556511122]}};
  const b=L.deriveBeam(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{currentUnit:'μA',patternType:'SquareRegionPattern',nx:51,ny:51,regionX:-37,regionY:42,width:5,height:5});
  const vals=Object.values(b.metrics);
  assert.equal(b.referenceProfile,true);
  assert.deepEqual(vals.filter(m=>m.tier==='primary').map(m=>m.concept),['current','total','iqe']);
  assert.equal(vals.find(m=>m.concept==='total').status,'validated');
  assert.equal(vals.find(m=>m.concept==='iqe').status,'validated');
  assert.equal(vals.find(m=>m.concept==='eqe').tier,'advanced');
  assert.equal(vals.find(m=>m.concept==='eqe').status,'inferred');
});

test('numeric wavelength power flux and raster size changes stay in the validated algorithm family',()=>{
  const raw={key:0,channels:{Current:[11],DirectReflection:[30],ScatteredReflection:[10]}};
  const b=L.deriveBeam(raw,{index:0,wavelengthNm:1064,power:0.25,photonFlux:FLUX*0.83},{currentUnit:'μA',patternType:'SquareRegionPattern',nx:4,ny:5,regionX:-2,regionY:3,width:1.5,height:2,beamCount:1,iterationCount:1});
  assert.equal(b.referenceProfile,true);
  for(const c of ['total','iqe'])assert.equal(Object.values(b.metrics).find(m=>m.concept===c).status,'validated');
});

test('raw Reflectivity EQE IQE channels take precedence over calculated candidates',()=>{
  const raw={key:0,channels:{Current:[100],DirectReflection:[30],ScatteredReflection:[10],TotalReflectance:[41],EQE:[35],IQE:[60]}};
  const b=L.deriveBeam(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{currentUnit:'μA',patternType:'SquareRegionPattern',nx:51,ny:51,regionX:-37,regionY:42,width:5,height:5}),vals=Object.values(b.metrics);
  for(const c of ['total','eqe','iqe']){
    const ms=vals.filter(m=>m.concept===c);
    assert.equal(ms.length,1);
    assert.equal(ms[0].status,'raw');
  }
});


test('multi-beam MapPattern + PseudoSquareCell is a validated LBIC family',()=>{
  const raw={key:3,channels:{Current:[346.805782580645],DirectReflection:[0],ScatteredReflection:[-21.0514365493424]}},
    laser={index:3,wavelengthNm:656,power:1,photonFlux:Number('2209056601073362.2')},
    d={currentUnit:'μA',patternType:'MapPattern',targetType:'PseudoSquareCell',targetWidth:125,targetHeight:125,diameter:150,edgeExclusion:3,pitchX:0.5,pitchY:0.5,beamCount:4,iterationCount:1};
  assert.equal(L.referenceFamily(raw,laser,d),'LBIC-MULTI-002');
  assert.equal(L.isReferenceProfile(raw,laser,d),true);
  assert.equal(L.isReferenceProfile(raw,laser,{...d,beamCount:1}),false);
});

test('PseudoSquare multi-beam Reflectivity display clamps negative raw optical sum but IQE uses the raw sum',()=>{
  const raw={key:3,channels:{Current:[346.805782580645],DirectReflection:[0],ScatteredReflection:[-21.0514365493424]}},
    laser={index:3,wavelengthNm:656,power:1,photonFlux:Number('2209056601073362.2')},
    d={currentUnit:'μA',patternType:'MapPattern',targetType:'PseudoSquareCell',targetWidth:125,targetHeight:125,diameter:150,edgeExclusion:3,pitchX:0.5,pitchY:0.5,beamCount:4,iterationCount:1},
    b=L.deriveBeam(raw,laser,d),
    metrics=Object.values(b.metrics),
    refl=metrics.find(m=>m.concept==='total'),
    iqe=metrics.find(m=>m.concept==='iqe');
  assert.equal(refl.values[0],0);
  assert.ok(Math.abs(iqe.values[0]-80.9556244658789)<1e-12);
  assert.equal(refl.status,'validated');
  assert.equal(iqe.status,'validated');
});
