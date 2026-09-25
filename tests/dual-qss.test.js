const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {DOMParser}=require('@xmldom/xmldom');
global.PV2000={};
require('../src/core/stats.js');
require('../src/core/profiles.js');
require('../src/profiles/geometry.js');
require('../src/core/geometry.js');
require('../src/core/registry.js');
require('../src/core/xml.js');
PV2000.ui={};
PV2000.plot={};
PV2000.exporter={csv(){}};
require('../src/modules/dual-qss.js');

function parseFixture(xmlText){
  const doc=new DOMParser().parseFromString(xmlText,'application/xml');
  const job=doc.documentElement,measurement=PV2000.xml.direct(job,'Measurement');
  return PV2000.modules.dualQss.parse({
    doc,job,measurement,type:PV2000.xml.attrType(measurement)
  });
}

test('Dual QSS parse maps a vendor-shaped XML fixture through the real XML helpers',()=>{
  const xml=fs.readFileSync(path.join(__dirname,'fixtures','dual-qss-minimal.xml'),'utf8');
  const d=parseFixture(xml);
  assert.equal(d.type,'DualQssMeasurement');
  assert.equal(d.resultName,'Dual QSS parser fixture');
  assert.equal(d.substrateId,'fixture-wafer');
  assert.equal(d.patternType,'OnePointPattern');
  assert.equal(d.targetType,'RoundWafer');
  assert.equal(d.points.length,2);
  assert.deepEqual(d.intensity,[681,1000]);
  assert.equal(d.points[0].lifetime,216.4370125);
  assert.equal(d.points[1].power,2.5e13);
  assert.equal(d.points[0].transient.lifetime,216.431);
  assert.deepEqual(d.points[0].transient.points,[{x:0,y:10},{x:5,y:12}]);
  assert.equal(d.waferThickness,180);
  assert.equal(d.doping,1e15);
  assert.equal(d.coord.x,0);
  assert.equal(d.coord.y,0);
});

test('Dual QSS vector parsing accepts direct numeric children as well as vendor array wrappers',()=>{
  const xml=fs.readFileSync(path.join(__dirname,'fixtures','dual-qss-minimal.xml'),'utf8')
    .replaceAll('<ArrayOfDouble>','').replaceAll('</ArrayOfDouble>','');
  const d=parseFixture(xml);
  assert.deepEqual(d.intensity,[681,1000]);
  assert.equal(d.points[0].lifetime,216.4370125);
  assert.equal(d.points[1].power,2.5e13);
});

test('Dual QSS parser preserves point-average lifetime vectors and applies vendor mean semantics',()=>{
  const xml=fs.readFileSync(path.join(__dirname,'fixtures','dual-qss-point-average-minimal.xml'),'utf8');
  const d=parseFixture(xml);
  assert.equal(d.patternType,'FixedPointsPattern');
  assert.equal(d.targetType,'PseudoSquareCell');
  assert.equal(d.doPointAveraging,'true');
  assert.equal(d.pointAverageCount,3);
  assert.equal(d.fixedPointCount,1);
  assert.equal(d.lifetimeVectors.length,3);
  assert.deepEqual(d.lifetimeVectors[0],[210,183,150]);
  assert.deepEqual(d.points.map(p=>p.lifetime),[210,180,150]);
  assert.deepEqual(d.points[1].lifetimeRepeats,[183,180,177]);
  assert.equal(d.points[1].lifetimeFirst,183);
  assert.deepEqual(d.geometryModel.pointsMm,[{x:0,y:0}]);
});

test('Dual QSS point averaging is controlled by DoPointAveraging, not PointAverageCount alone',()=>{
  const rows=[[100,200],[110,190],[90,210]];
  assert.deepEqual(PV2000.modules.dualQss.effectiveLifetimeVector(rows,'false'),[100,200]);
  assert.deepEqual(PV2000.modules.dualQss.effectiveLifetimeVector(rows,'true'),[100,200]);
  assert.deepEqual(PV2000.modules.dualQss.effectiveLifetimeVector([[100,200],[120,220]],'true'),[110,210]);
});

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


test('Dual QSS paired teff.d 1-sun result uses exact XML Values at 1000 mSun',()=>{
  const d={
    patternType:'OnePointPattern',targetType:'RoundWafer',probe:'Back',bias:'Back',
    points:[
      {intensityMilli:681,lifetime:216.4370125},
      {intensityMilli:1000,lifetime:188.5463167},
      {intensityMilli:1468,lifetime:166.8739284}
    ]
  };
  const result=PV2000.modules.dualQss.pairedTeffdOneSun(d);
  assert.equal(result.available,true);
  assert.equal(result.validation,'validated');
  assert.equal(result.rule,'exact-1000');
  assert.equal(result.value,188.5463167);
});

test('Dual QSS paired teff.d 1-sun result preserves observed below-target endpoint behavior',()=>{
  const d={
    patternType:'OnePointPattern',targetType:'RoundWafer',probe:'Back',bias:'Back',
    points:[
      {intensityMilli:464,lifetime:299.8272103},
      {intensityMilli:681,lifetime:236.991629}
    ]
  };
  const result=PV2000.modules.dualQss.pairedTeffdOneSun(d);
  assert.equal(result.available,true);
  assert.equal(result.rule,'right-endpoint-below-1000');
  assert.equal(result.value,236.991629);
});

test('Dual QSS does not invent unpaired interior interpolation or profile variants',()=>{
  const base={patternType:'OnePointPattern',targetType:'RoundWafer',probe:'Back',bias:'Back'};
  const interior=PV2000.modules.dualQss.pairedTeffdOneSun({
    ...base,
    points:[
      {intensityMilli:681,lifetime:250},
      {intensityMilli:1468,lifetime:150}
    ]
  });
  assert.equal(interior.available,false);
  assert.equal(interior.rule,'unvalidated-target-placement');

  const squareTarget=PV2000.modules.dualQss.pairedTeffdOneSun({
    ...base,targetType:'SquareCell',
    points:[{intensityMilli:1000,lifetime:200}]
  });
  assert.equal(squareTarget.available,true);
  assert.equal(squareTarget.value,200);
  const fixedOne=PV2000.modules.dualQss.pairedTeffdOneSun({
    ...base,patternType:'FixedPointsPattern',fixedPointCount:1,
    points:[{intensityMilli:1000,lifetime:200}]
  });
  assert.equal(fixedOne.available,true);
  assert.equal(fixedOne.value,200);
  const fixedMany=PV2000.modules.dualQss.pairedTeffdOneSun({
    ...base,patternType:'FixedPointsPattern',fixedPointCount:2,
    points:[{intensityMilli:1000,lifetime:200}]
  });
  assert.equal(fixedMany.available,false);
  assert.equal(fixedMany.rule,'outside-paired-profile');
  const wrongPattern=PV2000.modules.dualQss.pairedTeffdOneSun({
    ...base,patternType:'SquareRegionPattern',
    points:[{intensityMilli:1000,lifetime:200}]
  });
  assert.equal(wrongPattern.available,false);
  assert.equal(wrongPattern.rule,'outside-paired-profile');
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


test('Dual QSS OnePoint SquareCell resolves geometry independently from final-result calculation',()=>{
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'OnePointPattern',
    targetType:'SquareCell',
    rawCoefficients:[{x:0,y:0}],
    pointCount:1,
    targetWidth:100,
    targetHeight:80,
    edgeExclusion:5
  });
  assert.equal(PV2000.profiles.resolveGeometry({geometryModel:g}).id,'GEOM-ONEPOINT-CENTER-001');
  const view=PV2000.modules.dualQss.measurementGeometry({
    patternType:'OnePointPattern',
    geometryModel:g,
    coord:g.pointsMm[0]
  });
  assert.equal(view.kind,'rect');
  assert.equal(view.halfWidth,50);
  assert.equal(view.halfHeight,40);
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


test('Dual QSS no-J0 result keeps vendor teff.SS Max and Smax Max unavailable',()=>{
  const transient=()=>({
    amplitude:5,
    points:Array.from({length:20},(_,i)=>({x:i,y:20-i}))
  });
  const d={
    patternType:'OnePointPattern',targetType:'RoundWafer',probe:'Back',bias:'Back',
    augerCorrection:'false',calculateJ0:'false',includeKsJ0:'true',
    waferThickness:450,opticalFactor:1,doping:1e16,temperatureC:25,
    validQdcRange:{min:.9,max:1.1},jZeroIntensity:{min:1,max:5},
    points:[
      {intensityMilli:681,lifetime:190,transient:transient()},
      {intensityMilli:1000,lifetime:1731.481394,transient:transient()},
      {intensityMilli:1468,lifetime:1600,transient:transient()}
    ]
  };
  const r=PV2000.modules.dualQss.pairedDualResults(d);
  assert.equal(r.available,true);
  assert.equal(r.teffSSMax.available,false);
  assert.equal(r.teffSSMax.rule,'not-requested');
  assert.equal(r.smaxMax.available,false);
  assert.equal(r.smaxMax.rule,'not-requested');
});

test('Dual QSS final-result calculation accepts only paired one-site FixedPoints semantics',()=>{
  const transient=()=>({
    amplitude:5,
    points:Array.from({length:20},(_,i)=>({x:i,y:20-i}))
  });
  const base={
    patternType:'FixedPointsPattern',fixedPointCount:1,targetType:'PseudoSquareCell',
    probe:'Back',bias:'Back',augerCorrection:'false',calculateJ0:'false',includeKsJ0:'true',
    waferThickness:450,opticalFactor:1,doping:1e16,temperatureC:25,
    validQdcRange:{min:.9,max:1.1},jZeroIntensity:{min:1,max:5},
    points:[
      {intensityMilli:681,lifetime:190,transient:transient()},
      {intensityMilli:1000,lifetime:1731.481394,transient:transient()},
      {intensityMilli:1468,lifetime:1600,transient:transient()}
    ]
  };
  assert.equal(PV2000.modules.dualQss.pairedDualResults(base).available,true);
  const multiple=PV2000.modules.dualQss.pairedDualResults({...base,fixedPointCount:2});
  assert.equal(multiple.available,false);
  assert.equal(multiple.rule,'outside-paired-profile');
});


test('Dual QSS result validator separates paired single-site calculation parity from diagnostics',()=>{
  const src=fs.readFileSync(require.resolve('../scripts/validate_dual_qss_result_reference.py'),'utf8');
  assert.match(src,/DUAL-QSS DIAGNOSTIC/);
  assert.match(src,/legacy Laser Power \/ Lifetime-only result branch/);
  assert.match(src,/zero acquired result rows/);
  assert.match(src,/saved lifetime\s+vectors pointwise/);
  assert.match(src,/FixedPointsPattern/);
  assert.doesNotMatch(src,/outside QSS-INJ-RESULT-001 OnePoint calculation envelope/);
  assert.match(src,/CalculateJZeroParams=false expects teff\.SS Max \/ Smax Max to be Ud\./);
  assert.match(src,/resolve_xml_geometry/);
  assert.doesNotMatch(src,/paired result profile expects RoundWafer/);
});
