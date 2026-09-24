const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
global.PV2000={};
require('../src/core/stats.js');
require('../src/core/selection.js');
require('../src/core/geometry.js');
require('../src/core/profiles.js');
require('../src/profiles/geometry.js');
require('../src/core/registry.js');
PV2000.xml={};
PV2000.ui={escapeHtml:String,help(){return''},cssVar(){return''}};
PV2000.plot={};
PV2000.exporter={csv(){}};
require('../src/modules/jzero.js');

test('JZero module registers dedicated measurement type',()=>{
  assert.deepEqual(PV2000.modules.jzero.types,['JZeroMeasurement']);
});

test('pseudo-square JZero reference geometry reconstructs 5017 sites',()=>{
  const pts=PV2000.geometry.pseudoSquareGrid(71,71,95.5,2,2,5017);
  assert.equal(pts.length,5017);
  assert.deepEqual({x:pts[0].x,y:pts[0].y},{x:-64,y:-70});
  assert.deepEqual({x:pts.at(-1).x,y:pts.at(-1).y},{x:64,y:70});
});

test('JZero SquareRegion geometry uses structured Region + Dimension fields',()=>{
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'SquareRegionPattern',
    targetType:'RoundWafer',
    pointCount:1,
    diameter:100,
    edgeExclusion:7,
    regionX:0,
    regionY:0,
    regionWidth:10,
    regionHeight:10,
    nx:1,
    ny:1
  });
  assert.equal(g.geometryStatus,'complete');
  assert.equal(g.expectedPointCount,1);
  assert.deepEqual(g.pointsMm,[{x:0,y:0,row:0,col:0}]);
  assert.equal(g.interpretation,'explicit-region-grid');
});

test('terminated JZero SquareRegion can preserve a 5-of-9 leading schedule prefix',()=>{
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'SquareRegionPattern',
    targetType:'RoundWafer',
    pointCount:5,
    diameter:100,
    edgeExclusion:7,
    regionX:-10,
    regionY:-10,
    regionWidth:10,
    regionHeight:10,
    nx:3,
    ny:3,
    allowPartialPrefix:true
  });
  assert.equal(g.geometryStatus,'partial');
  assert.equal(g.expectedPointCount,9);
  assert.equal(g.acquiredPointCount,5);
  assert.equal(g.coordinateCompleteness,'prefix-inferred');
  assert.deepEqual(g.pointsMm.map(({x,y})=>({x,y})),[
    {x:-10,y:-10},{x:-5,y:-10},{x:0,y:-10},{x:-10,y:-5},{x:-5,y:-5}
  ]);
});

test('incomplete JZero preserves first-intensity quantities and blanks unpaired results',()=>{
  const d={
    values:[[14.6675916,14.87557039,14.87483182,14.92398295,14.47964071]],
    siteCount:5,
    qssMilli:[1000,3000],
    waferThickness:400,
    opticalFactor:0.7,
    doping:5e15,
    temperatures:[23.570554025099479]
  };
  const a=PV2000.modules.jzero.analyze(d);
  assert.equal(a.metrics.tau1.values.length,5);
  assert.deepEqual(a.metrics.tau1.values,d.values[0]);
  assert.ok(a.metrics.smax1.values.every(Number.isFinite));
  assert.ok(a.metrics.voc1.values.every(Number.isFinite));
  assert.ok(a.metrics.tau2.values.every(Number.isNaN));
  assert.ok(a.metrics.smax2.values.every(Number.isNaN));
  assert.ok(a.metrics.voc2.values.every(Number.isNaN));
  assert.ok(a.metrics.j0.values.every(Number.isNaN));
});

test('JZero Basore, Smax and implied-Voc compatibility reproduce reference point',()=>{
  const d={
    values:[[200.31474788960881],[125.68686517442578]],
    qssMilli:[1000,3000],
    waferThickness:200,
    opticalFactor:1,
    doping:1.5e16,
    temperatures:[28.468013468013467,28.547597183960821]
  };
  const a=PV2000.modules.jzero.analyze(d);
  assert.ok(Math.abs(a.metrics.j0.values[0]-96.1303349762924)<1e-9);
  assert.ok(Math.abs(a.metrics.smax1.values[0]-49.921436665816)<1e-10);
  assert.ok(Math.abs(a.metrics.smax2.values[0]-79.5628086206319)<1e-10);
  assert.ok(Math.abs(a.metrics.voc1.values[0]-0.682745286002936)<7e-5);
  assert.ok(Math.abs(a.metrics.voc2.values[0]-0.70227764869422)<7e-5);
  assert.equal(Object.keys(a.metrics).length,7);
});

test('JZero UI keeps all seven metrics and shared plot controls',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/jzero.js'),'utf8');
  for(const key of ['j0','tau1','tau2','smax1','smax2','voc1','voc2'])assert.match(src,new RegExp(`key:'${key}'`));
  assert.match(src,/axisControls\('jMapAxes'\)/);
  assert.match(src,/axisControls\('jHistAxes'/);
  assert.match(src,/binControls\('jHistBins'/);
  assert.match(src,/Sel\.createFilter/);
  assert.match(src,/PV\.ui\.validDataFilterMarkup/);
  assert.match(src,/PV\.ui\.bindValidDataFilter/);
  assert.match(src,/filterController\.metricMask/);
  assert.match(src,/Pass valid-data filter/);
  assert.doesNotMatch(src,/jCentral98|jApplyFilter|jResetFilter|validMask\(/);
  assert.match(src,/PseudoSquareCell/);
});

test('single-file build includes JZero before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const jzero=build.indexOf("'src/modules/jzero.js'");
  const generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(jzero>=0);
  assert.ok(generic>jzero);
});


test('JZero calculation semantics are independent from OnePoint SquareCell geometry',()=>{
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'OnePointPattern',
    targetType:'SquareCell',
    rawCoefficients:[{x:0,y:0}],
    pointCount:1,
    targetWidth:100,
    targetHeight:100,
    edgeExclusion:7
  });
  assert.equal(g.shape,'rect');
  assert.deepEqual(g.nominal,{halfWidth:50,halfHeight:50});
  assert.deepEqual(g.scheduled,{halfWidth:43,halfHeight:43});
  assert.deepEqual(g.pointsMm,[{x:0,y:0}]);
  assert.equal(g.interpretation,'single-center-point');
  assert.equal(g.evidenceStatus,'inferred');
});

test('JZero no longer hard-codes MapPattern + PseudoSquareCell as the only loadable geometry',()=>{
  const fs=require('node:fs');
  const src=fs.readFileSync(require.resolve('../src/modules/jzero.js'),'utf8');
  assert.doesNotMatch(src,/patternType!==['"]MapPattern['"]/);
  assert.doesNotMatch(src,/targetType!==['"]PseudoSquareCell['"]/);
  assert.match(src,/resolveMeasurementGeometry/);
  assert.match(src,/JZERO-CALC-001/);
  assert.match(src,/Profiles\.resolveGeometry/);
  assert.match(src,/GEOM-MAP-PSEUDOSQUARE-001/);
  assert.match(src,/Measurement position/);
});


test('JZero quantity validation is narrower than calculation and geometry validation',()=>{
  const d={
    values:[[200,300],[125,140]],
    qssMilli:[1000,3000],
    waferThickness:200,
    opticalFactor:1,
    doping:1.5e16,
    temperatures:[28,28],
    calculationProfile:{id:'JZERO-CALC-001',status:'validated'},
    geometryProfile:{id:'GEOM-HIGHDENSITY-ROUND-001',status:'validated'}
  };
  const a=PV2000.modules.jzero.analyze(d);
  assert.equal(a.metrics.j0.profileId,'JZERO-CALC-001');
  assert.equal(a.metrics.j0.validation,'validated');
  assert.equal(a.metrics.smax1.validation,'validated');
  assert.equal(a.metrics.voc1.profileId,null);
  assert.equal(a.metrics.voc1.validation,'inferred');

  d.geometryProfile={id:'GEOM-MAP-PSEUDOSQUARE-001',status:'validated'};
  const legacy=PV2000.modules.jzero.analyze(d);
  assert.equal(legacy.metrics.voc1.profileId,'JZERO-VOC-MAP-PSEUDOSQUARE-001');
  assert.equal(legacy.metrics.voc1.validation,'reproduced-at-shown-precision');
});

test('JZero shared filter keeps one paired-site mask and adds displayed-metric support',()=>{
  const d={
    values:[[200,-1,300],[125,130,140]],
    qssMilli:[1000,3000],
    waferThickness:200,
    opticalFactor:1,
    doping:1.5e16,
    temperatures:[28,28]
  };
  const a=PV2000.modules.jzero.analyze(d);
  const filter=PV2000.selection.createFilter({metrics:a.metrics,siteCount:3,metricKey:'tau2'});
  let state=filter.apply(129,141);
  assert.deepEqual(state.selection.activeMask,[false,true,true]);
  assert.deepEqual(filter.metricMask('tau2'),[false,true,true]);
  assert.deepEqual(filter.metricMask('j0'),[false,false,true]);
  state=filter.setMetric('j0');
  assert.deepEqual(state.selection.activeMask,[true,false,true]);
});

test('JZero parser wires SquareRegion fields and permits explicit incomplete acquisition state',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/jzero.js'),'utf8');
  for(const token of ['regionX','regionY','regionWidth','regionHeight','nx','ny','allowPartialPrefix'])assert.match(src,new RegExp(token));
  assert.match(src,/isIncompleteAcquisitionStatus/);
  assert.match(src,/iterations\.length<2&&!incompleteStatus/);
  assert.doesNotMatch(src,/iterations\.length!==2/);
  assert.match(src,/defaultMetric=a\.metrics\.j0\.values\.some\(Number\.isFinite\)\?'j0':'tau1'/);
  assert.match(src,/paired QSS sites/);
});

