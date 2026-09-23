const test=require('node:test'),assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/validity.js');
require('../src/core/quantity.js');
require('../src/core/selection.js');
require('../src/core/measurement.js');
require('../src/core/profiles.js');
require('../src/core/registry.js');
require('../src/profiles/isc.js');
require('../src/profiles/vcpd.js');
require('../src/modules/isc.js');

const ISC=PV2000.modules.isc;

test('ISC family module registers ISCMeasurement and VcpdMeasurement',()=>{
  assert.equal(PV2000.registry.resolve('ISCMeasurement'),ISC);
  assert.equal(PV2000.registry.resolve('VcpdMeasurement'),ISC);
});

test('ISC result reconstruction applies offset and VSB correction in vendor-observed order',()=>{
  const r=ISC.reconstructSite([1,2,3],[0,1,2],0.5,1.2);
  assert.equal(r.darkMean,2);
  assert.equal(r.lightMean,1);
  assert.equal(r.dark,1.5);
  assert.ok(Math.abs(r.vsb-1.2)<1e-12);
  assert.ok(Math.abs(r.light-0.3)<1e-12);
});

test('VcpdMeasurement direct readings preserve the vendor-observed scalar path',()=>{
  const r=ISC.reconstructVcpdSite([0.478138298]);
  assert.equal(r.dark,0.478138298);
  assert.equal(r.darkMean,0.478138298);
  assert.ok(Number.isNaN(r.light));
  assert.ok(Number.isNaN(r.vsb));
});

test('missing VcpdOffset does not silently become zero',()=>{
  const r=ISC.reconstructSite([0.2,0.4],[0.1,0.2],NaN,1.2);
  assert.ok(Number.isNaN(r.dark));
  assert.ok(Number.isNaN(r.light));
  assert.ok(Number.isNaN(r.vsb));
});

test('ISC target geometry exposes nominal and EdgeExclusion boundaries',()=>{
  const square=ISC.targetGeometry({
    targetType:'SquareCell',
    targetWidth:100,
    targetHeight:80,
    edgeExclusion:10
  });
  assert.deepEqual(square,{
    shape:'rect',
    nominal:{halfWidth:50,halfHeight:40},
    scheduled:{halfWidth:40,halfHeight:30}
  });

  const round=ISC.targetGeometry({
    targetType:'RoundWafer',
    diameter:200,
    edgeExclusion:5
  });
  assert.deepEqual(round,{
    shape:'circle',
    nominal:{radius:100},
    scheduled:{radius:95}
  });
});

test('Vcpd RoundWafer reference geometry gives the validated 1649-site schedule',()=>{
  const radius=ISC.effectiveHalf(200,8);
  assert.equal(radius,92);
  const coords=PV2000.geometry.roundGrid(radius,4,4,1649);
  assert.equal(coords.length,1649);
  assert.deepEqual(coords[0],{x:-24,y:-88});
  assert.deepEqual(coords.at(-1),{x:24,y:88});
});

test('terminated RoundWafer reconstructs a leading partial acquisition prefix without claiming completeness',()=>{
  assert.equal(PV2000.geometry.isIncompleteAcquisitionStatus('Terminated'),true);
  assert.equal(PV2000.geometry.isIncompleteAcquisitionStatus('Completed'),false);
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'MapPattern',
    targetType:'RoundWafer',
    pointCount:10947,
    diameter:200,
    edgeExclusion:4,
    pitchX:1,
    pitchY:1,
    allowPartialPrefix:true
  });
  assert.equal(g.geometryStatus,'partial');
  assert.equal(g.coordinateCompleteness,'prefix-inferred');
  assert.equal(g.expectedPointCount,28913);
  assert.equal(g.acquiredPointCount,10947);
  assert.equal(g.pointsMm.length,10947);
  assert.ok(Math.abs(g.completionFraction-10947/28913)<1e-15);
  assert.deepEqual(g.pointsMm[0],{x:-13,y:-95});
  assert.deepEqual(g.pointsMm.at(-1),{x:-81,y:-18});
});

test('RoundWafer point-count mismatch remains unavailable without explicit partial-prefix permission',()=>{
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'MapPattern',
    targetType:'RoundWafer',
    pointCount:10947,
    diameter:200,
    edgeExclusion:4,
    pitchX:1,
    pitchY:1
  });
  assert.equal(g.geometryStatus,'mismatch');
  assert.equal(g.expectedPointCount,28913);
  assert.equal(g.pointsMm.length,0);
});

test('ISC SquareCell example geometry gives a centered 13x13 schedule',()=>{
  const half=ISC.effectiveHalf(100,30);
  assert.equal(half,20);
  const coords=PV2000.geometry.centeredRectGrid(half,half,3,3,169);
  assert.equal(coords.length,169);
  assert.deepEqual(coords[0],{x:-18,y:-18});
  assert.deepEqual(coords[12],{x:18,y:-18});
  assert.deepEqual(coords[13],{x:-18,y:-15});
  assert.deepEqual(coords.at(-1),{x:18,y:18});
});

test('Vcpd analysis exposes only Vcpd Dark and preserves sample statistics',()=>{
  const d={
    measurementKind:'vcpd',
    sites:[
      {dark:0.3,light:NaN,vsb:NaN},
      {dark:0.4,light:NaN,vsb:NaN},
      {dark:0.5,light:NaN,vsb:NaN}
    ]
  };
  const a=ISC.analyze(d);
  assert.deepEqual(Object.keys(a.metrics),['dark']);
  assert.ok(Math.abs(a.summaries.dark.mean-0.4)<1e-12);
  assert.equal(a.summaries.dark.median,0.4);
  assert.ok(Math.abs(a.summaries.dark.stdev-0.1)<1e-12);
});

test('ISC analysis exposes the three manual-defined result quantities with sample statistics',()=>{
  const d={sites:[
    {dark:1,light:0.5,vsb:0.5},
    {dark:2,light:1.25,vsb:0.75},
    {dark:3,light:2,vsb:1}
  ]};
  const a=ISC.analyze(d);
  assert.deepEqual(Object.keys(a.metrics),['dark','light','vsb']);
  assert.equal(a.summaries.dark.mean,2);
  assert.equal(a.summaries.dark.median,2);
  assert.equal(a.summaries.dark.stdev,1);
  assert.equal(a.summaries.vsb.min,0.5);
  assert.equal(a.summaries.vsb.max,1);
});


test('ISC quantities expose provenance and profile metadata without changing values',()=>{
  const d={
    measurementKind:'isc',
    profile:{id:'ISC-MAP-001',status:'validated'},
    sites:[
      {dark:1,light:.5,vsb:.5},
      {dark:2,light:1.25,vsb:.75}
    ]
  };
  const a=ISC.analyze(d);
  assert.equal(a.metrics.dark.provenance,PV2000.quantity.PROVENANCE.CORRECTED);
  assert.equal(a.metrics.light.provenance,PV2000.quantity.PROVENANCE.DERIVED_COMPATIBILITY);
  assert.equal(a.metrics.vsb.profileId,'ISC-MAP-001');
  assert.equal(a.metrics.vsb.validation,'validated');
  assert.deepEqual(a.metrics.vsb.values,[.5,.75]);
  assert.deepEqual(PV2000.validity.mask(a.metrics.vsb.availability),[true,true]);
});

test('ISC domain attachment preserves geometry and resolves the validated profile envelope',()=>{
  const d={
    type:'ISCMeasurement',
    measurementKind:'isc',
    name:'n',
    resultName:'r',
    substrateId:'s',
    lotId:'',
    iterationCount:1,
    sites:[{darkRaw:[1],lightRaw:[.5],coord:{x:0,y:0}}],
    coords:[{x:0,y:0}],
    offset:0,
    factor:1,
    coordinateSource:'MapPattern + SquareCell',
    patternType:'MapPattern',
    targetType:'SquareCell',
    targetWidth:100,
    targetHeight:100,
    edgeExclusion:30,
    readingsPerSite:1,
    measurementInterval:.02,
    lightOn:'',
    temperatureC:23
  };
  ISC.attachDomain(d);
  assert.equal(d.profile.id,'ISC-MAP-001');
  assert.equal(d.domain.familyId,'isc');
  assert.equal(d.domain.profile.status,'validated');
  assert.equal(d.domain.geometry.shape,'rect');
  assert.equal(d.domain.geometry.validationStatus,'validated');
  assert.deepEqual(d.domain.geometry.points,[{x:0,y:0}]);
});

test('registry exposes migrated module metadata while preserving type resolution',()=>{
  const meta=PV2000.registry.describe('ISCMeasurement');
  assert.equal(meta.familyId,'kelvin-probe');
  assert.equal(meta.capabilities.map,true);
  assert.equal(PV2000.registry.resolve('VcpdMeasurement'),ISC);
});


test('explicit coefficient geometry does not inherit the validated ISC profile',()=>{
  const d={
    type:'ISCMeasurement',
    measurementKind:'isc',
    name:'n',
    resultName:'r',
    substrateId:'s',
    lotId:'',
    iterationCount:1,
    sites:[{darkRaw:[1],lightRaw:[.5],coord:{x:0,y:0}}],
    coords:[{x:0,y:0}],
    offset:0,
    factor:1,
    coordinateSource:'XML coefficients',
    patternType:'MapPattern',
    targetType:'SquareCell',
    targetWidth:100,
    targetHeight:100,
    edgeExclusion:30,
    readingsPerSite:1,
    measurementInterval:.02,
    lightOn:'',
    temperatureC:23
  };
  ISC.attachDomain(d);
  assert.equal(d.profile,null);
  assert.equal(d.domain.profile,null);
  assert.equal(d.domain.geometry.validationStatus,'inferred');
});


test('ISC and VCPD render through the shared valid-data filter contract',()=>{
  const fs=require('node:fs');
  const src=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8');
  assert.match(src,/Sel\.createFilter\(\{metrics:a\.metrics,siteCount:d\.sites\.length,metricKey:'dark'\}\)/);
  assert.match(src,/PV\.ui\.validDataFilterMarkup/);
  assert.match(src,/PV\.ui\.bindValidDataFilter/);
  assert.match(src,/filterController\.metricMask\(a\.metrics\[metricKey\]\)/);
  assert.match(src,/m\.values\.filter\(\(value,index\)=>mask\[index\]&&Number\.isFinite\(value\)\)/);
  assert.match(src,/Metric available','Pass valid-data filter','Displayed'/);
  assert.match(src,/validDataFilter:true/);
});
