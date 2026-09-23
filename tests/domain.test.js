const test=require('node:test'),assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/validity.js');
require('../src/core/quantity.js');
require('../src/core/selection.js');
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


test('unknown coefficient semantics never become physical mm implicitly',()=>{
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'UnclassifiedPattern',
    targetType:'RoundWafer',
    rawCoefficients:[{x:-0.6,y:0},{x:0.6,y:0}],
    pointCount:2,
    diameter:100,
    edgeExclusion:4
  });
  assert.deepEqual(g.rawCoefficients,[{x:-0.6,y:0},{x:0.6,y:0}]);
  assert.deepEqual(g.pointsMm,[]);
  assert.equal(g.interpretation,'unresolved');
});


test('shared selection keeps intrinsic support, user filter and active mask separate',()=>{
  const Q=PV2000.quantity,V=PV2000.validity;
  const lifetime=Q.create({
    id:'lifetime',
    values:[100,-1,50,NaN],
    availability:[
      V.state(100),
      V.state(-1,{available:false,reason:V.REASONS.CONTROLLER_SENTINEL}),
      V.state(50),
      V.state(NaN,{available:false,reason:V.REASONS.NON_FINITE})
    ]
  });
  const selection=PV2000.selection.evaluate({
    metrics:{lifetime},
    intrinsicMask:[true,true,true,true],
    filter:{metricKey:'lifetime',lower:-2,upper:120}
  });
  assert.deepEqual(selection.supportMask,[true,false,true,false]);
  assert.deepEqual(selection.filterMask,[true,true,true,false]);
  assert.deepEqual(selection.activeMask,[true,false,true,false]);
});

test('shared selection enforces one site index space across metrics and masks',()=>{
  const Q=PV2000.quantity;
  const metrics={
    a:Q.create({id:'a',values:[1,2,3]}),
    b:Q.create({id:'b',values:[10,20,30]})
  };
  assert.doesNotThrow(()=>PV2000.selection.assertAligned(metrics,3));
  assert.throws(
    ()=>PV2000.selection.assertAligned({...metrics,b:Q.create({id:'short',values:[10,20]})},3),
    /shared site index space/
  );
  assert.throws(
    ()=>PV2000.selection.evaluate({metrics,siteCount:3,intrinsicMask:[true,false]}),
    /shared site index space/
  );
});

test('displayed metric availability is applied after the shared active mask',()=>{
  const Q=PV2000.quantity,V=PV2000.validity;
  const filterMetric=Q.create({id:'filter',values:[1,2,3]}),
    displayed=Q.create({
      id:'displayed',
      values:[10,20,30],
      availability:[V.state(10),V.state(20,{available:false,reason:V.REASONS.NOT_COMPUTABLE}),V.state(30)]
    }),
    selection=PV2000.selection.evaluate({
      metrics:{filter:filterMetric,displayed},
      filter:{metricKey:'filter',lower:1,upper:3}
    });
  assert.deepEqual(selection.activeMask,[true,true,true]);
  assert.deepEqual(PV2000.selection.maskForMetric(selection,displayed),[true,false,true]);
});

test('selection reset and percentile helpers ignore unsupported sites',()=>{
  const Q=PV2000.quantity,V=PV2000.validity;
  const metric=Q.create({
    id:'x',
    values:[-100,0,10,20,30,1000],
    availability:[
      V.state(-100,{available:false,reason:V.REASONS.CONTROLLER_SENTINEL}),
      V.state(0),V.state(10),V.state(20),V.state(30),
      V.state(1000,{available:false,reason:V.REASONS.NOT_COMPUTABLE})
    ]
  });
  assert.deepEqual(PV2000.selection.resetRange({metrics:{x:metric},metricKey:'x'}),{min:0,max:30});
  assert.deepEqual(
    PV2000.selection.centralRange({metrics:{x:metric},metricKey:'x',lowerQuantile:0,upperQuantile:1}),
    {min:0,max:30}
  );
});


test('shared geometry resolver reproduces JZero pseudo-square schedule',()=>{
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'MapPattern',
    targetType:'PseudoSquareCell',
    pointCount:5017,
    targetWidth:156,
    targetHeight:156,
    diameter:205,
    edgeExclusion:7,
    pitchX:2,
    pitchY:2
  });
  assert.equal(g.shape,'pseudo-square');
  assert.deepEqual(g.nominal,{halfWidth:78,halfHeight:78,radius:102.5});
  assert.deepEqual(g.scheduled,{halfWidth:71,halfHeight:71,radius:95.5});
  assert.equal(g.pointsMm.length,5017);
  assert.deepEqual(g.pointsMm[0],{x:-64,y:-70,row:0,col:3});
  assert.deepEqual(g.pointsMm.at(-1),{x:64,y:70,row:70,col:67});
  assert.equal(g.interpretation,'pseudo-square-target-pitch-grid');
});


test('quantity presentation tier is independent from provenance and validation',()=>{
  const q=PV2000.quantity.create({
    id:'xml-hidden',
    values:[1,2],
    provenance:PV2000.quantity.PROVENANCE.RAW,
    validation:PV2000.quantity.VALIDATION.INFERRED,
    tier:PV2000.quantity.TIER.ADVANCED,
    evidence:{xmlStored:true,vendorExported:false,vendorDisplayed:false}
  });
  assert.equal(q.tier,'advanced');
  assert.equal(q.provenance,'raw');
  assert.equal(q.validation,'inferred');
  assert.deepEqual(q.evidence,{xmlStored:true,vendorExported:false,vendorDisplayed:false});
});
