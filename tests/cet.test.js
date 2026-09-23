const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
global.PV2000={};
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/validity.js');
require('../src/core/quantity.js');
require('../src/core/selection.js');
require('../src/core/measurement.js');
require('../src/core/profiles.js');
require('../src/core/registry.js');
PV2000.xml={};
PV2000.ui={escapeHtml:String,help(){return''},cssVar(){return''}};
PV2000.plot={};
PV2000.exporter={csv(){}};
require('../src/profiles/cet.js');
require('../src/modules/cet.js');

test('CET module registers dedicated measurement type',()=>{
  assert.deepEqual(PV2000.modules.cet.types,['CETMeasurement']);
});

test('CET paired reference site reproduces Cd, EOT and R2',()=>{
  const means=[
    -6.898262779166667,
    -6.7192402499999995,
    -6.530093987083333,
    -6.351892869166666,
    -6.170772731666666,
    -5.98944538875
  ];
  const result=PV2000.modules.cet.calculateSite(means,1e11,-0.010826977837499998);
  assert.ok(Math.abs(result.cd-88.0539010169012)<1e-10);
  assert.ok(Math.abs(result.eot-391.805469168004)<1e-9);
  assert.ok(Math.abs(result.r2-0.999951732052584)<1e-12);
  assert.equal(result.fitCount,6);
});

test('CET undefined one-point fit keeps R2 zero and EOT/Cd unavailable',()=>{
  const result=PV2000.modules.cet.calculateSite([-1.25],1e11,0);
  assert.equal(result.r2,0);
  assert.equal(result.fitDefined,false);
  assert.ok(Number.isNaN(result.cd));
  assert.ok(Number.isNaN(result.eot));
});

test('CET paired NinePointPattern SquareCell coordinates match vendor export',()=>{
  const c=Math.sqrt(.4),raw=[
    {x:0,y:0},{x:-c,y:0},{x:0,y:-c},{x:c,y:0},{x:0,y:c},
    {x:-c,y:c},{x:c,y:c},{x:c,y:-c},{x:-c,y:-c}
  ];
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'NinePointPattern',
    targetType:'SquareCell',
    rawCoefficients:raw,
    pointCount:9,
    targetWidth:156,
    targetHeight:156,
    edgeExclusion:4
  });
  assert.equal(g.geometryStatus,'complete');
  assert.equal(g.interpretation,'target-relative-fixed-point-pattern');
  assert.ok(Math.abs(g.pointsMm[1].x+46.801709370492)<1e-12);
  assert.ok(Math.abs(g.pointsMm[2].y+46.801709370492)<1e-12);
  assert.ok(Math.abs(g.pointsMm[6].x-46.801709370492)<1e-12);
  assert.ok(Math.abs(g.pointsMm[6].y-46.801709370492)<1e-12);
});

test('canonical geometry preserves FixedPointsPattern as absolute millimetres',()=>{
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'FixedPointsPattern',
    targetType:'RoundWafer',
    absolutePoints:[{x:30,y:-60}],
    pointCount:1,
    diameter:200,
    edgeExclusion:4
  });
  assert.deepEqual(g.pointsMm,[{x:30,y:-60}]);
  assert.equal(g.sourceSpace,'absolute-point-mm');
  assert.equal(g.interpretation,'explicit-fixed-points');
});

test('CET source uses shared domain, quantity, geometry and valid-data contracts',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/cet.js'),'utf8');
  assert.match(src,/GEO\.resolveMeasurementGeometry/);
  assert.match(src,/M\.create/);
  assert.match(src,/Q\.create/);
  assert.match(src,/Sel\.createFilter/);
  assert.match(src,/PV\.ui\.validDataFilterMarkup/);
  assert.match(src,/PV\.ui\.bindValidDataFilter/);
  assert.match(src,/axisControls\('cetMapAxes'\)/);
  assert.match(src,/axisControls\('cetHistAxes'/);
  assert.match(src,/axisControls\('cetFitAxes'\)/);
  assert.match(src,/binControls\('cetHistBins'/);
});

test('single-file build includes CET before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const cet=build.indexOf("'src/modules/cet.js'");
  const generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(cet>=0);
  assert.ok(generic>cet);
});