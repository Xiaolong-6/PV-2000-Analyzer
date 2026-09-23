const test=require('node:test'),assert=require('node:assert/strict');
global.PV2000={};
require('../src/core/stats.js');require('../src/core/geometry.js');require('../src/core/registry.js');
PV2000.xml={};PV2000.exporter={csv(){}};
require('../src/modules/qss-upcd.js');
const values=[10.02216008,9.403090016,9.183140694,9.034540845,8.866233804,8.90195199,8.75130022,9.172374746,12.69525316];
test('sample stdev convention',()=>{const s=PV2000.stats.summary(values);assert.ok(Math.abs(s.mean-9.558893950555555)<1e-9);assert.equal(s.count,9)});
test('round map grid reproduces 305 sites in PV-2000 order',()=>{const p=PV2000.geometry.roundGrid(50,5,5,305);assert.equal(p.length,305);assert.deepEqual(p.slice(0,9),[-20,-15,-10,-5,0,5,10,15,20].map(x=>({x,y:-45})));assert.deepEqual(p.slice(-9),[-20,-15,-10,-5,0,5,10,15,20].map(x=>({x,y:45})))});
test('round map edge exclusion reconstructs the 1741-point 100 mm / 2 mm schedule',()=>{const r=PV2000.modules.qss.effectiveMapRadius(100,3);assert.equal(r,47);const p=PV2000.geometry.roundGrid(r,2,2,1741);assert.equal(p.length,1741);assert.ok(p.every(({x,y})=>x*x+y*y<47*47))});
test('SquareCell map uses centered effective bounds after edge exclusion',()=>{const half=PV2000.modules.qss.effectiveMapHalfExtent(100,35);assert.equal(half,15);const p=PV2000.geometry.centeredRectGrid(half,half,1,1,961);assert.equal(p.length,961);assert.deepEqual(p[0],{x:-15,y:-15});assert.deepEqual(p[480],{x:0,y:0});assert.deepEqual(p.at(-1),{x:15,y:15})});
test('wafer-map target geometry separates nominal target and scheduled region',()=>{
  const round=PV2000.modules.qss.targetGeometry({targetType:'RoundWafer',diameter:100,mapRadius:47});
  assert.deepEqual(round,{shape:'circle',nominal:{radius:50},scheduled:{radius:47},extent:50});
  const square=PV2000.modules.qss.targetGeometry({targetType:'SquareCell',targetWidth:100,targetHeight:100,mapHalfWidth:15,mapHalfHeight:15});
  assert.deepEqual(square,{shape:'rect',nominal:{halfWidth:50,halfHeight:50},scheduled:{halfWidth:15,halfHeight:15},extent:50});
});
test('Smax formula',()=>{const v=PV2000.modules.qss.smax(11.658483155829508,300);assert.ok(Math.abs(v-1286.617)<0.01)});
test('PV2000-compatible implied Voc is in reference range',()=>{const d={qssMilli:30,waferThickness:300,opticalFactor:.708,doping:1e14,temperatureC:24.494949494949495};const v=PV2000.modules.qss.impliedVoc(11.658483155829508,d);assert.ok(v>0.35&&v<0.38)});
test('valid-data mask honors lower and upper range',()=>{const a={metrics:{lifetime:{values:[1,2,3,10]}}};assert.deepEqual(PV2000.modules.qss.validMask(a,'lifetime',1.5,3.5),[false,true,true,false])});
test('smooth map leaves filtered site regions uncolored',()=>{const coords=[{x:-5,y:0},{x:0,y:0},{x:5,y:0},{x:0,y:5}],values=[10,100,20,15],mask=[true,false,true,true],sample=PV2000.modules.qss.smoothValueAt;assert.ok(Number.isNaN(sample(0,0,coords,values,mask,11)));assert.ok(Number.isNaN(sample(0,1,coords,values,mask,11)));assert.ok(Number.isFinite(sample(-5,0,coords,values,mask,11)));assert.ok(Number.isFinite(sample(0,5,coords,values,mask,11)));assert.ok(Number.isNaN(sample(30,0,coords,values,mask,11)))});

test('HighDensityPattern maps explicit normalized 35 x 35 coefficients to the EdgeExclusion-adjusted SquareCell',()=>{
  const coeff=[];
  for(let row=0;row<35;row++)for(let col=0;col<35;col++)coeff.push({x:-1+2*col/34,y:-1+2*row/34});
  const p=PV2000.modules.qss.highDensityCoords(coeff,71,71,1225);
  assert.equal(p.length,1225);
  assert.deepEqual(p[0],{x:-71,y:-71});
  assert.ok(Math.abs(p[612].x)<1e-12&&Math.abs(p[612].y)<1e-12);
  assert.deepEqual(p.at(-1),{x:71,y:71});
  assert.ok(Math.abs((p[1].x-p[0].x)-142/34)<1e-12);
  assert.deepEqual(PV2000.modules.qss.highDensityCoords(coeff,71,71,1224),[]);
  const g=PV2000.modules.qss.targetGeometry({patternType:'HighDensityPattern',targetType:'SquareCell',targetWidth:156,targetHeight:156,mapHalfWidth:71,mapHalfHeight:71});
  assert.deepEqual(g.scheduled,{halfWidth:71,halfHeight:71});
});

test('shared geometry resolver reproduces the established HighDensity mappings',()=>{
  const coeff=[];
  for(let row=0;row<35;row++)for(let col=0;col<35;col++)coeff.push({x:-1+2*col/34,y:-1+2*row/34});
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'HighDensityPattern',
    targetType:'SquareCell',
    rawCoefficients:coeff,
    pointCount:1225,
    targetWidth:156,
    targetHeight:156,
    edgeExclusion:7
  });
  assert.equal(g.pointsMm.length,1225);
  assert.deepEqual(g.pointsMm[0],{x:-71,y:-71});
  assert.deepEqual(g.pointsMm.at(-1),{x:71,y:71});
  assert.equal(g.sourceSpace,'normalized-target-coefficient');
  assert.equal(g.evidenceStatus,'inferred');
});

test('HighDensityPattern RoundWafer selects the strict unit-circle subset before physical scaling',()=>{
  const coeff15=[];
  for(let row=0;row<15;row++)for(let col=0;col<15;col++)coeff15.push({x:-1+2*col/14,y:-1+2*row/14});
  const radius=PV2000.modules.qss.effectiveMapRadius(100,7);
  const p15=PV2000.modules.qss.highDensityCoords(coeff15,radius,radius,145,true);
  assert.equal(p15.length,145);
  assert.ok(p15.every(({x,y})=>x*x+y*y<radius*radius+1e-9));
  assert.ok(p15.some(({x,y})=>Math.abs(x)<1e-12&&Math.abs(y)<1e-12));
  assert.deepEqual(PV2000.modules.qss.highDensityCoords(coeff15,radius,radius,225,true),[]);

  const coeff20=[];
  for(let row=0;row<20;row++)for(let col=0;col<20;col++)coeff20.push({x:-1+2*col/19,y:-1+2*row/19});
  const p20=PV2000.modules.qss.highDensityCoords(coeff20,radius,radius,276,true);
  assert.equal(p20.length,276);
  assert.ok(p20.every(({x,y})=>x*x+y*y<radius*radius+1e-9));
});

test('SquareRegionPattern reference raster reproduces the 35 x 30 vendor coordinate order',()=>{const p=PV2000.geometry.rectGrid(-40,-30,70,60,35,30,1050,1);assert.equal(p.length,1050);assert.deepEqual(p[0],{x:-40,y:-30,row:0,col:0});assert.ok(Math.abs(p[34].x-30)<1e-12&&Math.abs(p[34].y+30)<1e-12);assert.ok(Math.abs(p[35].x+40)<1e-12&&Math.abs(p[35].y-(-30+60/29))<1e-12);assert.ok(Math.abs(p.at(-1).x-30)<1e-12&&Math.abs(p.at(-1).y-30)<1e-12)});
test('SquareRegion target geometry uses the explicit measured rectangle',()=>{const g=PV2000.modules.qss.targetGeometry({patternType:'SquareRegionPattern',targetType:'SquareCell',targetWidth:100,targetHeight:100,regionX:-40,regionY:-30,regionWidth:70,regionHeight:60,mapHalfWidth:47,mapHalfHeight:47});assert.deepEqual(g.scheduled,{xMin:-40,xMax:30,yMin:-30,yMax:30});assert.equal(PV2000.modules.qss.insideScheduled(g,-40,-30),true);assert.equal(PV2000.modules.qss.insideScheduled(g,31,0),false)});
test('valid-data histogram counts are determined only by the validity mask',()=>{const a={metrics:{lifetime:{values:[1,2,3,4,100]}}},mask=PV2000.modules.qss.validMask(a,'lifetime',2,4),bins=PV2000.modules.qss.histogram(a.metrics.lifetime.values,mask,5);assert.equal(bins.reduce((n,b)=>n+b.valid,0),3);assert.equal(bins.reduce((n,b)=>n+b.invalid,0),2)});

test('valid filter bounds are inclusive while excluded counts remain separate diagnostics',()=>{
  const a={metrics:{lifetime:{values:[1,2,3,4,5]}}};
  const mask=PV2000.modules.qss.validMask(a,'lifetime',2,4);
  assert.deepEqual(mask,[false,true,true,true,false]);
  const bins=PV2000.modules.qss.histogram(a.metrics.lifetime.values,mask,5);
  assert.equal(bins.reduce((n,b)=>n+b.valid,0),3);
  assert.equal(bins.reduce((n,b)=>n+b.invalid,0),2);
});


test('125 mm RoundWafer with 5 mm pitch reconstructs the 489-site corpus geometry',()=>{
  const p=PV2000.geometry.roundGrid(62.5,5,5,489);
  assert.equal(p.length,489);
  assert.deepEqual(p[0],{x:-15,y:-60});
  assert.deepEqual(p.at(-1),{x:15,y:60});
  assert.ok(p.every(({x,y})=>x*x+y*y<62.5*62.5));
});

test('PV-2000 -1 lifetime sentinel is preserved raw but can be excluded from analysis support',()=>{
  const Q=PV2000.modules.qss;
  assert.equal(Q.smax(-1,190),-9500);
  const support=Q.intrinsicLifetimeMask([-1,50,100],true);
  assert.deepEqual(support,[false,true,true]);
  const a={metrics:{smax:{values:[-9500,190,95]}}};
  const mask=Q.validMask(a,'smax',90,200,support);
  assert.deepEqual(mask,[false,true,true]);
  const bins=Q.histogram(a.metrics.smax.values,mask,5,support);
  assert.equal(bins.reduce((n,b)=>n+b.valid+b.invalid,0),2);
});

test('SRV conversion supports planar and textured/black formulas with optional bulk lifetime',()=>{
  const Q=PV2000.modules.qss;
  assert.ok(Math.abs(Q.surfaceRecombinationVelocity(100,190,{mode:'planar'})-95)<1e-12);
  assert.ok(Math.abs(Q.surfaceRecombinationVelocity(100,190,{mode:'textured',planarSrv:5})-185)<1e-12);
  assert.ok(Math.abs(Q.surfaceRecombinationVelocity(100,190,{mode:'planar',bulkLifetimeUs:1000})-85.5)<1e-12);
  assert.ok(Number.isNaN(Q.surfaceRecombinationVelocity(-1,190,{mode:'planar'})));
  assert.ok(Number.isNaN(Q.surfaceRecombinationVelocity(100,190,{mode:'planar',minLifetimeUs:600})));
});

test('QSS analysis exposes SRV and keeps raw sentinel accounting',()=>{
  const Q=PV2000.modules.qss,d={
    values:[-1,100,200],qssMilli:30,waferThickness:190,opticalFactor:.708,
    doping:1e14,temperatureC:24.5
  };
  const a=Q.analyze(d);
  assert.equal(a.audit.invalidLifetimeCount,1);
  assert.deepEqual(Object.keys(a.metrics),['lifetime','smax','voc','srv']);
  assert.equal(a.metrics.smax.values[0],-9500);
  assert.ok(Number.isNaN(a.metrics.srv.values[0]));
  assert.ok(Math.abs(a.metrics.srv.values[1]-185)<1e-12);
});

test('physical Ge implied Voc is separate from the PV-2000 compatibility path',()=>{
  const Q=PV2000.modules.qss,d={qssMilli:30,waferThickness:290,opticalFactor:.708,doping:1e14,temperatureC:24.5};
  const vendor=Q.impliedVoc(100,d),ge=Q.impliedVocPhysical(100,d,'Ge'),si=Q.impliedVocPhysical(100,d,'Si');
  assert.ok(Number.isFinite(vendor)&&Number.isFinite(ge)&&Number.isFinite(si));
  assert.ok(ge<si);
  assert.ok(si>ge+0.2);
});
