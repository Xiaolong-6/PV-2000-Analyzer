const test=require('node:test'),assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/registry.js');
require('../src/modules/isc.js');

const ISC=PV2000.modules.isc;

test('ISC module registers for ISCMeasurement',()=>{
  assert.equal(PV2000.registry.resolve('ISCMeasurement'),ISC);
});

test('ISC result reconstruction applies offset and VSB correction in vendor-observed order',()=>{
  const r=ISC.reconstructSite([1,2,3],[0,1,2],0.5,1.2);
  assert.equal(r.darkMean,2);
  assert.equal(r.lightMean,1);
  assert.equal(r.dark,1.5);
  assert.ok(Math.abs(r.vsb-1.2)<1e-12);
  assert.ok(Math.abs(r.light-0.3)<1e-12);
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
