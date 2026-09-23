const test=require('node:test'),assert=require('node:assert/strict');
global.PV2000={};
require('../src/core/stats.js');
require('../src/core/registry.js');
PV2000.xml={direct(){return null},children(){return[]}};
PV2000.ui={};
PV2000.plot={};
PV2000.exporter={csv(){}};
require('../src/modules/dual-qss.js');

test('Dual QSS range classification separates supplied low/high schedules',()=>{
  assert.equal(PV2000.modules.dualQss.classifyRange([1,2,3,5,464]),'Low-range injection');
  assert.equal(PV2000.modules.dualQss.classifyRange([30,33,46,3162]),'High-range injection');
});

test('Dual QSS canonical lifetime comes from XML TransientInfo with Values fallback',()=>{
  const p={lifetime:1.479406693,transient:{lifetime:1.5}};
  assert.equal(PV2000.modules.dualQss.lifetimeValue(p),1.5);
  assert.equal(PV2000.modules.dualQss.lifetimeValue(p,'transient'),1.5);
  assert.equal(PV2000.modules.dualQss.lifetimeValue(p,'values'),1.479406693);
  assert.equal(PV2000.modules.dualQss.lifetimeLabel('transient'),'Lifetime');
  assert.equal(PV2000.modules.dualQss.lifetimeLabel('values'),'XML Values lifetime');
});

test('Dual QSS raw lifetime falls back to XML Values when TransientInfo LifeTime is missing',()=>{
  const p={lifetime:42,transient:{lifetime:NaN}};
  assert.equal(PV2000.modules.dualQss.lifetimeValue(p),42);
});

test('Dual QSS analysis preserves invalid points and audits Values versus TransientInfo separately',()=>{
  const d={points:[
    {lifetime:100,transient:{lifetime:99.998}},
    {lifetime:-1,transient:{lifetime:-1.003}},
    {lifetime:50,transient:{lifetime:50.004}}
  ]};
  const raw=PV2000.modules.dualQss.analyze(d);
  assert.deepEqual(raw.valid,[true,false,true]);
  assert.equal(raw.validCount,2);
  assert.equal(raw.invalidCount,1);
  assert.ok(Math.abs(raw.summary.mean-75.001)<1e-12);
  assert.ok(Math.abs(raw.maxTransientDelta-.004)<1e-12);
});

test('Dual QSS export rows retain both XML lifetime fields and transient metadata',()=>{
  const d={points:[{
    intensityMilli:30,intensitySun:.03,lifetime:100,power:150,
    transient:{lifetime:99.999,evaluation:'Sl/1024',delta:5000,preTrigger:100,timeCursor:1200,average:128,amplitude:20,microwave:10.4,laserPower:1.5e13,voltage:100,offset:30,timeBase:10000,points:[{x:0,y:1},{x:5,y:2}]}
  }]};
  const row=PV2000.modules.dualQss.pointRows(d)[0];
  assert.equal(row[0],1);
  assert.equal(row[1],30);
  assert.equal(row[3],100);
  assert.equal(row[5],99.999);
  assert.equal(row.at(-1),2);
});

test('missing transient attributes stay missing instead of becoming numeric zero',()=>{
  const info={getAttribute(){return null}};
  const parsed=PV2000.modules.dualQss.parseTransient(info);
  assert.ok(Number.isNaN(parsed.lifetime));
  assert.ok(Number.isNaN(parsed.timeCursor));
  assert.deepEqual(parsed.points,[]);
});


test('Dual QSS OnePoint geometry falls back to circular substrate metadata',()=>{
  const g=PV2000.modules.dualQss.measurementGeometry({
    patternType:'OnePointPattern',shapeType:'Circle',radius:50,diameter:100,edgeExclusion:7,coord:{x:0,y:0}
  });
  assert.equal(g.onePoint,true);
  assert.equal(g.kind,'round');
  assert.equal(g.radius,50);
  assert.equal(g.innerRadius,43);
  assert.deepEqual(g.coord,{x:0,y:0});
});
