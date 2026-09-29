const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DOMParser}=require('@xmldom/xmldom');
global.PV2000={};
require('../src/core/xml.js');
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/validity.js');
require('../src/core/quantity.js');
require('../src/core/selection.js');
require('../src/core/measurement.js');
require('../src/core/profiles.js');
require('../src/core/registry.js');
require('../src/profiles/geometry.js');
PV2000.ui={escapeHtml:String,help(){return''},cssVar(){return''}};
PV2000.plot={};
PV2000.exporter={csv(){}};
require('../src/profiles/cet.js');
require('../src/modules/cet.js');

test('CET module registers dedicated measurement type',()=>{
  assert.deepEqual(PV2000.modules.cet.types,['CETMeasurement']);
});

test('CET parse maps a vendor-shaped XML fixture through the real XML helpers',()=>{
  const xml=fs.readFileSync(path.join(__dirname,'fixtures','cet-minimal.xml'),'utf8');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  const job=doc.documentElement,measurement=PV2000.xml.direct(job,'Measurement');
  const d=PV2000.modules.cet.parse({doc,job,measurement,type:PV2000.xml.attrType(measurement)});
  assert.equal(d.type,'CETMeasurement');
  assert.equal(d.resultName,'CET parser fixture');
  assert.equal(d.substrateId,'cet-wafer');
  assert.equal(d.patternType,'OnePointPattern');
  assert.equal(d.targetType,'RoundWafer');
  assert.equal(d.iterationCount,1);
  assert.equal(d.coronaCharge,1e11);
  assert.equal(d.offset,0.01);
  assert.equal(d.sites.length,1);
  assert.deepEqual(d.sites[0].lightMeans,[-1.1,-2.1,-3.1]);
  assert.deepEqual(d.coords,[{x:0,y:0}]);
  assert.equal(d.temperatureC,25);
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

test('CET starts with EOT as the synchronized displayed/filter quantity',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/cet.js'),'utf8');
  assert.match(src,/metricKey:'eot'/);
  assert.match(src,/linkedSelect:'#cetMetric'/);
});

test('single-file build includes CET before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const cet=build.indexOf("'src/modules/cet.js'");
  const generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(cet>=0);
  assert.ok(generic>cet);
});
test('CET calculation validation is independent from geometry',()=>{
  const calc=PV2000.profiles.resolveCalculation('cet',{
    type:'CETMeasurement',
    iterationCount:1,
    sites:[{}],
    coronaCharge:1e11,
    patternType:'OnePointPattern',
    targetType:'RoundWafer'
  });
  assert.equal(calc?.id,'CET-CALC-001');
  assert.equal(PV2000.profiles.resolveCalculation('cet',{
    type:'CETMeasurement',iterationCount:2,sites:[{}],coronaCharge:1e11
  }),null);
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'NinePointPattern',
    targetType:'SquareCell',
    rawCoefficients:[
      {x:0,y:0},{x:-Math.sqrt(.4),y:0},{x:0,y:-Math.sqrt(.4)},
      {x:Math.sqrt(.4),y:0},{x:0,y:Math.sqrt(.4)},
      {x:-Math.sqrt(.4),y:Math.sqrt(.4)},{x:Math.sqrt(.4),y:Math.sqrt(.4)},
      {x:Math.sqrt(.4),y:-Math.sqrt(.4)},{x:-Math.sqrt(.4),y:-Math.sqrt(.4)}
    ],
    pointCount:9,targetWidth:156,targetHeight:156,edgeExclusion:4
  });
  assert.equal(PV2000.profiles.resolveGeometry({geometryModel:g})?.id,'GEOM-NINEPOINT-SQUARE-001');
});

test('CET source resolves calculation and geometry axes separately',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/cet.js'),'utf8');
  assert.match(src,/Profiles\.resolveCalculation\('cet',data\)/);
  assert.match(src,/Profiles\.resolveGeometry\(data\)/);
  assert.doesNotMatch(src,/Profiles\.resolve\('cet',data\)/);
});
