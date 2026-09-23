const test=require('node:test'),assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/validity.js');
require('../src/core/quantity.js');
require('../src/core/measurement.js');
require('../src/core/profiles.js');

test('quantity keeps values and availability as separate concepts',()=>{
  const q=PV2000.quantity.create({
    id:'lifetime',
    unit:'us',
    values:[10,NaN,20],
    provenance:PV2000.quantity.PROVENANCE.STORED_CONTROLLER
  });
  assert.deepEqual(q.values,[10,NaN,20]);
  assert.deepEqual(PV2000.validity.mask(q.availability),[true,false,true]);
  assert.equal(q.availability[1].reason,PV2000.validity.REASONS.NON_FINITE);
  assert.equal(PV2000.quantity.summary(q).mean,15);
});

test('measurement envelope keeps common identity, geometry and profile metadata explicit',()=>{
  const geometry=PV2000.geometry.envelope({
    patternType:'MapPattern',
    targetType:'RoundWafer',
    shape:'circle',
    nominal:{radius:100},
    scheduled:{radius:92},
    points:[{x:0,y:0}],
    validationStatus:'validated'
  });
  const m=PV2000.measurement.create({
    type:'VcpdMeasurement',
    familyId:'vcpd',
    identity:{resultName:'example'},
    geometry,
    profile:{id:'VCPD-MAP-001',status:'validated'}
  });
  assert.equal(m.schemaVersion,1);
  assert.equal(m.source,'xml');
  assert.equal(m.geometry.scheduled.radius,92);
  assert.deepEqual(m.profile,{id:'VCPD-MAP-001',status:'validated'});
});

test('profile registry resolves semantic matches without numeric identity whitelists',()=>{
  PV2000.profiles.register({
    id:'TEST-PROFILE',
    familyId:'test',
    status:'validated',
    matches:data=>data?.mode==='a'
  });
  assert.equal(PV2000.profiles.resolve('test',{mode:'a'}).id,'TEST-PROFILE');
  assert.equal(PV2000.profiles.resolve('test',{mode:'b'}),null);
});
