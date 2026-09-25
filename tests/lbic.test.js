const test=require('node:test'),assert=require('node:assert/strict');
global.PV2000={};
require('../src/core/stats.js');require('../src/core/geometry.js');require('../src/core/profiles.js');require('../src/profiles/geometry.js');require('../src/core/registry.js');
PV2000.xml={};PV2000.exporter={csv(){}};
require('../src/modules/lbic.js');
const L=PV2000.modules.lbic;
const FLUX=1708439235302983;
const CURRENT_FLAGS={measureCurrent:'true',measureDirect:'true',measureDiffuse:'true'};

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

test('multi-wavelength DL fits inverse IQE against penetration depth and respects blanking',()=>{
  const depths=[952,855,984].map(w=>L.penetrationDepthUm(w,0)),
    iqe=[91.1055855100519,90.3288092764988,82.8295415608055];
  assert.ok(Math.abs(L.diffusionLengthUm(depths,iqe,2000)-925.899933817009)<1e-9);
  assert.ok(Number.isNaN(L.diffusionLengthUm(depths,[iqe[0],NaN,iqe[2]],2000)));
  assert.ok(Number.isNaN(L.diffusionLengthUm(depths,iqe,500)));
  assert.ok(Number.isNaN(L.diffusionLengthUm(depths.slice(0,1),iqe.slice(0,1),2000)));
});

test('cross-beam DL is exposed only for the paired scattered-reflection calculation path',()=>{
  const wavelengths=[952,855,656,984],
    values=[91.1055855100519,90.3288092764988,95.8390111346475,82.8295415608055],
    flux=2.4e15,
    beams=Object.fromEntries(wavelengths.map((w,index)=>[index,{key:index,channels:{
      Current:[values[index]/100*1.602e-19*flux*1e6*(1-5/100)],
      DirectReflection:[0],ScatteredReflection:[5]
    }}]));
  const d={iterations:[{pointCount:1,temperatureC:0,beams}],
    laserByKey:Object.fromEntries(wavelengths.map((w,index)=>[index,{index,wavelengthNm:w,photonFlux:flux}])),
    dlRange:{min:700,max:1000},maxDLValue:2000,currentUnit:'μA',
    measureCurrent:'true',measureDirect:'false',measureDiffuse:'true'};
  const analyzed=L.analyze(d).iterations[0].beams;
  assert.equal(analyzed[3].metrics.__dl.status,'validated');
  assert.equal(analyzed[0].metrics.__dl,analyzed[1].metrics.__dl);
  assert.equal(analyzed[2].metrics.__dl,undefined);
  const disabled=L.analyze({...d,measureDiffuse:'false'}).iterations[0].beams;
  assert.ok(Object.values(disabled).every(b=>!b.metrics.__dl));
});

test('PV-2000-compatible IQE blanks calculated values above 100 percent',()=>{
  assert.ok(Number.isNaN(L.iqePercent(50,60)));
  assert.ok(Number.isNaN(L.iqePercent(10,100)));
  assert.ok(Math.abs(L.iqePercent(40,20)-50)<1e-12);
  assert.ok(Number.isNaN(L.iqePercent(-0.05,25)));
  assert.ok(Math.abs(L.iqePercent(-0.05,150)-0.1)<1e-12);
});

test('negative stored Current blanks the vendor Current result while signed optical intermediate remains available',()=>{
  const raw={key:1,channels:{Current:[-1.519],DirectReflection:[0],ScatteredReflection:[155.621745550633]}},
    beam=L.deriveBeam(raw,{index:1,wavelengthNm:952,photonFlux:2411851354173466},
      {currentUnit:'μA',measureCurrent:'true',measureDirect:'false',measureDiffuse:'true',iterationCount:1});
  const current=Object.values(beam.metrics).find(m=>m.concept==='current'),
    iqe=Object.values(beam.metrics).find(m=>m.concept==='iqe');
  assert.ok(Number.isNaN(current.values[0]));
  assert.equal(beam.metrics.__rawCurrent.values[0],-1.519);
  assert.ok(Math.abs(iqe.values[0]-0.706805808739036)<1e-12);
});

test('validated LBIC family is defined by measurement/result path, not exact numeric settings',()=>{
  const raw={key:0,channels:{Current:[11.0936],DirectReflection:[33.2],ScatteredReflection:[4.9]}};
  const d={...CURRENT_FLAGS,currentUnit:'μA',patternType:'SquareRegionPattern',nx:51,ny:51,regionX:-37,regionY:42,width:5,height:5,beamCount:1,iterationCount:1};
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},d),true);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:1064,power:0.25,photonFlux:FLUX*0.83},d),true);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX+1},{...d,nx:4,ny:5,regionX:-2,regionY:3,width:1.5,height:2}),true);
  assert.equal(L.isReferenceProfile({key:0,channels:{...raw.channels,ExtraChannel:[1]}},{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},d),true);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{...d,beamCount:2}),true);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{...d,iterationCount:2}),false);
  assert.equal(L.isReferenceProfile(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{...d,patternType:'OtherPattern'}),true);
});

test('current-enabled parity requires explicit active flags and a known current unit',()=>{
  const raw={key:0,channels:{Current:[11],DirectReflection:[30],ScatteredReflection:[10]}},
    laser={index:0,photonFlux:FLUX},
    d={...CURRENT_FLAGS,currentUnit:'μA',patternType:'SquareRegionPattern',nx:2,ny:2,regionX:0,regionY:0,width:1,height:1};
  assert.equal(L.referenceFamily(raw,laser,d),'LBIC-CALC-CURRENT-DIRECT-SCATTERED-001');
  for(const field of Object.keys(CURRENT_FLAGS)){
    assert.equal(L.referenceFamily(raw,laser,{...d,[field]:''}),'');
  }
  assert.equal(L.referenceFamily(raw,laser,{...d,measureCurrent:'false'}),'');
  assert.equal(L.referenceFamily(raw,laser,{...d,measureDirect:'false'}),'LBIC-CALC-CURRENT-SCATTERED-002');
  assert.equal(L.referenceFamily(raw,laser,{...d,measureDiffuse:'false'}),'');
  assert.equal(L.referenceFamily(raw,laser,{...d,currentUnit:''}),'');
  const unknownUnit=L.deriveBeam(raw,laser,{...d,currentUnit:''});
  assert.equal(Object.values(unknownUnit.metrics).some(m=>m.concept==='eqe'||m.concept==='iqe'),false);
  assert.equal(Object.values(unknownUnit.metrics).find(m=>m.concept==='current').unit,'');
});

test('reference profile exposes Current Reflectivity IQE as primary and diagnostics as advanced',()=>{
  const raw={key:0,channels:{Current:[11.0936],DirectReflection:[33.2321503717211],ScatteredReflection:[4.95641556511122]}};
  const b=L.deriveBeam(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{...CURRENT_FLAGS,currentUnit:'μA',patternType:'SquareRegionPattern',nx:51,ny:51,regionX:-37,regionY:42,width:5,height:5});
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
  const b=L.deriveBeam(raw,{index:0,wavelengthNm:1064,power:0.25,photonFlux:FLUX*0.83},{...CURRENT_FLAGS,currentUnit:'μA',patternType:'SquareRegionPattern',nx:4,ny:5,regionX:-2,regionY:3,width:1.5,height:2,beamCount:1,iterationCount:1});
  assert.equal(b.referenceProfile,true);
  for(const c of ['total','iqe'])assert.equal(Object.values(b.metrics).find(m=>m.concept===c).status,'validated');
});

test('raw Reflectivity EQE IQE channels take precedence over calculated candidates',()=>{
  const raw={key:0,channels:{Current:[100],DirectReflection:[30],ScatteredReflection:[10],TotalReflectance:[41],EQE:[35],IQE:[60]}};
  const b=L.deriveBeam(raw,{index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},{...CURRENT_FLAGS,currentUnit:'μA',patternType:'SquareRegionPattern',nx:51,ny:51,regionX:-37,regionY:42,width:5,height:5}),vals=Object.values(b.metrics);
  for(const c of ['total','eqe','iqe']){
    const ms=vals.filter(m=>m.concept===c);
    assert.equal(ms.length,1);
    assert.equal(ms[0].status,'raw');
  }
});


test('multi-beam MapPattern + PseudoSquareCell is a validated LBIC family',()=>{
  const raw={key:3,channels:{Current:[346.805782580645],DirectReflection:[0],ScatteredReflection:[-21.0514365493424]}},
    laser={index:3,wavelengthNm:656,power:1,photonFlux:Number('2209056601073362.2')},
    d={...CURRENT_FLAGS,currentUnit:'μA',patternType:'MapPattern',targetType:'PseudoSquareCell',targetWidth:125,targetHeight:125,diameter:150,edgeExclusion:3,pitchX:0.5,pitchY:0.5,beamCount:4,iterationCount:1};
  assert.equal(L.referenceFamily(raw,laser,d),'LBIC-CALC-CURRENT-DIRECT-SCATTERED-001');
  assert.equal(L.isReferenceProfile(raw,laser,d),true);
  assert.equal(L.isReferenceProfile(raw,laser,{...d,beamCount:1}),true);
});

test('PseudoSquare multi-beam Reflectivity display clamps negative raw optical sum but IQE uses the raw sum',()=>{
  const raw={key:3,channels:{Current:[346.805782580645],DirectReflection:[0],ScatteredReflection:[-21.0514365493424]}},
    laser={index:3,wavelengthNm:656,power:1,photonFlux:Number('2209056601073362.2')},
    d={...CURRENT_FLAGS,currentUnit:'μA',patternType:'MapPattern',targetType:'PseudoSquareCell',targetWidth:125,targetHeight:125,diameter:150,edgeExclusion:3,pitchX:0.5,pitchY:0.5,beamCount:4,iterationCount:1},
    b=L.deriveBeam(raw,laser,d),
    metrics=Object.values(b.metrics),
    refl=metrics.find(m=>m.concept==='total'),
    iqe=metrics.find(m=>m.concept==='iqe');
  assert.equal(refl.values[0],0);
  assert.ok(Math.abs(iqe.values[0]-80.9556244658789)<1e-12);
  assert.equal(refl.status,'validated');
  assert.equal(iqe.status,'validated');
});


test('reflectance-only LBIC honors XML measurement flags and validates the optical-only family',()=>{
  const raw={key:0,channels:{Current:[0,0],DirectReflection:[0.4,1.2],ScatteredReflection:[10.1,20.3]}},
    laser={index:0,wavelengthNm:984,power:0.6},
    d={measureCurrent:'false',measureDirect:'true',measureDiffuse:'true',currentUnit:'μA',patternType:'SquareRegionPattern',nx:61,ny:61,regionX:-10,regionY:-50,width:60,height:60,beamCount:1,iterationCount:1};
  assert.equal(L.referenceFamily(raw,laser,d),'LBIC-CALC-REFLECTANCE-ONLY-004');
  assert.equal(L.isReferenceProfile(raw,laser,d),true);
});

test('reflectance-only LBIC suppresses placeholder Current and does not synthesize EQE or IQE',()=>{
  const raw={key:0,channels:{Current:[0,0],DirectReflection:[0.4,1.2],ScatteredReflection:[10.1,20.3]}},
    laser={index:0,wavelengthNm:984,power:0.6,photonFlux:FLUX},
    d={measureCurrent:'false',measureDirect:'true',measureDiffuse:'true',currentUnit:'μA',patternType:'SquareRegionPattern',nx:61,ny:61,regionX:-10,regionY:-50,width:60,height:60,beamCount:1,iterationCount:1},
    b=L.deriveBeam(raw,laser,d),
    metrics=Object.values(b.metrics);
  assert.equal(b.referenceFamily,'LBIC-CALC-REFLECTANCE-ONLY-004');
  assert.equal(metrics.some(m=>m.concept==='current'),false);
  assert.equal(metrics.some(m=>m.concept==='eqe'),false);
  assert.equal(metrics.some(m=>m.concept==='iqe'),false);
  const reflectivity=metrics.find(m=>m.concept==='total');
  assert.ok(reflectivity);
  assert.deepEqual(reflectivity.values,[10.5,21.5]);
  assert.equal(reflectivity.status,'validated');
  assert.equal(reflectivity.tier,'primary');
  assert.deepEqual(metrics.filter(m=>m.tier==='primary').map(m=>m.concept),['total']);
});

test('nonzero disabled Current values stay hidden but do not inherit reflectance parity',()=>{
  const raw={key:0,channels:{Current:[1],DirectReflection:[2],ScatteredReflection:[3]}},
    d={measureCurrent:'false',measureDirect:'true',measureDiffuse:'true',patternType:'SquareRegionPattern',nx:1,ny:1,regionX:0,regionY:0,width:1,height:1},
    beam=L.deriveBeam(raw,{index:0},d),
    metrics=Object.values(beam.metrics);
  assert.equal(beam.referenceProfile,false);
  assert.equal(metrics.some(m=>m.concept==='current'||m.concept==='eqe'||m.concept==='iqe'),false);
  assert.equal(metrics.find(m=>m.concept==='total').status,'inferred');
});

test('paired scattered-only optical path synthesizes Reflectivity without DirectReflection',()=>{
  const raw={key:0,channels:{Current:[2],DirectReflection:[7],ScatteredReflection:[9]}},
    b=L.deriveBeam(raw,{index:0,photonFlux:FLUX},{measureCurrent:'true',measureDirect:'false',measureDiffuse:'true',currentUnit:'μA',patternType:'MapPattern',targetType:'SquareCell'}),
    metrics=Object.values(b.metrics),
    concepts=metrics.map(m=>m.concept);
  assert.equal(concepts.includes('direct'),false);
  assert.equal(concepts.includes('current'),true);
  assert.equal(concepts.includes('eqe'),true);
  assert.equal(concepts.includes('total'),true);
  assert.equal(concepts.includes('iqe'),true);
  assert.equal(b.referenceFamily,'LBIC-CALC-CURRENT-SCATTERED-002');
  assert.deepEqual(metrics.find(m=>m.concept==='total').values,[9]);
  assert.equal(metrics.find(m=>m.concept==='total').status,'validated');
  assert.equal(metrics.find(m=>m.concept==='iqe').status,'validated');
});


test('partial SquareRegion acquisition keeps calculation parity separate from geometry completeness',()=>{
  const full=PV2000.geometry.rectGrid(-10,-50,60,60,61,61,null,1),
    partial=full.slice(0,2814);
  assert.equal(full.length,3721);
  assert.equal(partial.length,2814);
  assert.deepEqual(partial[0],{x:-10,y:-50,row:0,col:0});
  assert.deepEqual(partial.at(-1),{x:-3,y:-4,row:46,col:7});

  const raw={key:0,channels:{Current:[0],DirectReflection:[1],ScatteredReflection:[2]}},
    laser={index:0,wavelengthNm:984},
    d={measureCurrent:'false',measureDirect:'true',measureDiffuse:'true',patternType:'SquareRegionPattern',nx:61,ny:61,regionX:-10,regionY:-50,width:60,height:60,beamCount:1,iterationCount:1,pointCount:2814,expectedPointCount:3721};
  assert.equal(L.referenceFamily(raw,laser,d),'LBIC-CALC-REFLECTANCE-ONLY-004');
});

test('paired current-only path is calculation-valid independently of geometry',()=>{
  const raw={key:0,channels:{Current:[123],DirectReflection:[0],ScatteredReflection:[0]}},
    laser={index:0,photonFlux:FLUX},
    d={measureCurrent:'true',measureDirect:'false',measureDiffuse:'false',currentUnit:'μA',patternType:'MapPattern',targetType:'SquareCell',iterationCount:1},
    b=L.deriveBeam(raw,laser,d),
    concepts=Object.values(b.metrics).map(m=>m.concept);
  assert.equal(b.referenceFamily,'LBIC-CALC-CURRENT-ONLY-003');
  assert.deepEqual(concepts,['current','eqe']);
  assert.equal(Object.values(b.metrics).find(m=>m.concept==='current').validation,'validated');
});

test('LBIC line profiles honor the shared active mask without changing site indexing',()=>{
  const d={
    coords:[
      {x:0,y:0},{x:1,y:0},{x:2,y:0},
      {x:0,y:1},{x:1,y:1},{x:2,y:1}
    ],
    pitchX:1,
    pitchY:1
  };
  const metric={values:[10,20,30,40,50,60]};
  const mask=[true,false,true,true,true,false];
  assert.deepEqual(
    L.profilePoints(d,metric,1,'x',mask).map(p=>[p.i,p.pos,p.v]),
    [[0,0,10],[2,2,30]]
  );
  assert.deepEqual(
    L.profilePoints(d,metric,1,'y',mask).map(p=>[p.i,p.pos,p.v]),
    [[4,1,50]]
  );
});

test('LBIC private validator separates calculation profile, shared geometry and DL evidence',()=>{
  const fs=require('node:fs');
  const src=fs.readFileSync(require.resolve('../scripts/validate_lbic_reference.py'),'utf8');
  assert.match(src,/from validate_geometry_profiles import resolve_xml_geometry/);
  assert.match(src,/LBIC-CALC-CURRENT-SCATTERED-002/);
  assert.match(src,/LBIC-CALC-CURRENT-DIRECT-SCATTERED-001/);
  assert.match(src,/value if value >= 0 else math\.nan/);
  assert.match(src,/0\.0 <= value <= 100\.0/);
  assert.match(src,/LBIC EMPTY/);
  assert.match(src,/calc=.*geometry=/);
});

test('LBIC renderer uses the shared Valid-data filter lifecycle across plots and exports',()=>{
  const fs=require('node:fs');
  const src=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.match(src,/PV\.ui\.validDataFilterMarkup/);
  assert.match(src,/PV\.ui\.bindValidDataFilter/);
  assert.match(src,/GEO=PV\.geometry,Sel=PV\.selection/);
  assert.match(src,/Sel\.createFilter/);
  assert.match(src,/controller\.metricMask\(metric\)/);
  assert.match(src,/summaryRows\(metrics,controller\)/);
  assert.match(src,/drawMap\(host\.querySelector\('#lMap'\),d,metric,displayMask/);
  assert.match(src,/drawHist\(host\.querySelector\('#lHist'\),metric,displayMask/);
  assert.match(src,/drawProfile\(host\.querySelector\('#lXProfile'\),d,metric,displayMask/);
  assert.match(src,/Pass valid-data filter/);
  assert.match(src,/Pass active filter/);
  assert.match(src,/validDataFilter:true/);
  assert.match(src,/No sites pass the active Valid-data filter/);
  assert.match(src,/ctx\.arc\(x,y,2,0,Math\.PI\*2\)/);
});
