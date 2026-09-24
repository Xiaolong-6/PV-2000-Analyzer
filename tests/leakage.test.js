const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
global.PV2000={};
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/validity.js');
require('../src/core/quantity.js');
require('../src/core/measurement.js');
require('../src/core/profiles.js');
require('../src/core/registry.js');
PV2000.xml={};
PV2000.ui={escapeHtml:String};
require('../src/profiles/leakage.js');
require('../src/modules/leakage.js');

test('Leakage module registers dedicated measurement type',()=>{
  assert.deepEqual(PV2000.modules.leakage.types,['LeakageMeasurement']);
});

test('paired Leakage VSASS regression reproduces vendor values',()=>{
  const offset=0.01085279328375,dt=.1,
    positive=[...Array(10).fill(0),40.4337997,40.4173164,40.4005737,40.3854675,40.3702621],
    negative=[...Array(10).fill(0),-28.1364861,-28.1278248,-28.1210175,-28.1138229,-28.1053314],
    vp=PV2000.modules.leakage.calculateVsass(positive,dt,0.47919107037346925,offset),
    vn=PV2000.modules.leakage.calculateVsass(negative,dt,0.4691023579812518,offset);
  assert.ok(Math.abs(vp-40.4725360173236)<1e-12);
  assert.ok(Math.abs(vn+28.1622298128892)<1e-12);
  assert.ok(Math.abs((vp-vn)-68.6347658302128)<1e-12);
});

test('Leakage build is loaded before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const moduleIndex=build.indexOf("'src/modules/leakage.js'"),generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(moduleIndex>=0);
  assert.ok(generic>moduleIndex);
});

test('Leakage calculation profile matches paired 0.1 s acquisition branch',()=>{
  const p=PV2000.profiles.resolveCalculation('leakage',{
    type:'LeakageMeasurement',
    sites:[{}],
    measurePositive:true,
    measureNegative:false,
    positiveSettings:{intervalSeconds:.1},
    negativeSettings:{intervalSeconds:.1}
  });
  assert.equal(p?.id,'LEAKAGE-CALC-VSASS-001');
});

test('ordinary interval changes stay inside the Leakage profile',()=>{
  const p=PV2000.profiles.resolveCalculation('leakage',{
    type:'LeakageMeasurement',
    sites:[{}],
    measurePositive:true,
    measureNegative:true,
    positiveSettings:{intervalSeconds:.02},
    negativeSettings:{intervalSeconds:.05}
  });
  assert.equal(p?.id,'LEAKAGE-CALC-VSASS-001');
});
