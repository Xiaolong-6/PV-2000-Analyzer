const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DOMParser}=require('@xmldom/xmldom');
global.PV2000={};
require('../src/core/xml.js');
require('../src/core/stats.js');
require('../src/core/selection.js');
require('../src/core/geometry.js');
require('../src/core/profiles.js');
require('../src/profiles/geometry.js');
require('../src/core/registry.js');
PV2000.ui={escapeHtml:String,help(){return''},cssVar(){return''}};
PV2000.plot={};
PV2000.exporter={csv(){}};
require('../src/modules/jzero.js');

test('JZero module registers dedicated measurement type',()=>{
  assert.deepEqual(PV2000.modules.jzero.types,['JZeroMeasurement']);
});

test('JZero parse maps paired lifetime iterations from a vendor-shaped XML fixture',()=>{
  const xml=fs.readFileSync(path.join(__dirname,'fixtures','jzero-minimal.xml'),'utf8');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  const job=doc.documentElement,measurement=PV2000.xml.direct(job,'Measurement');
  const d=PV2000.modules.jzero.parse({doc,job,measurement,type:PV2000.xml.attrType(measurement)});
  assert.equal(d.type,'JZeroMeasurement');
  assert.equal(d.resultName,'JZero parser fixture');
  assert.equal(d.substrateId,'jzero-wafer');
  assert.equal(d.patternType,'OnePointPattern');
  assert.equal(d.targetType,'RoundWafer');
  assert.equal(d.iterations,2);
  assert.deepEqual(d.values,[[200.25],[125.5]]);
  assert.deepEqual(d.qssMilli,[1000,3000]);
  assert.deepEqual(d.coords,[{x:0,y:0}]);
  assert.equal(d.waferThickness,200);
  assert.equal(d.doping,1.5e16);
  assert.deepEqual(d.temperatures,[25,26]);
});

test('JZero explicit non-uPCD iteration subtype stays calculation-inferred',()=>{
  const source=fs.readFileSync(path.join(__dirname,'fixtures','jzero-minimal.xml'),'utf8')
    .replace('<Iteration><ChuckTemperature>25</ChuckTemperature>','<Iteration xsi:type="OtherIterationData"><ChuckTemperature>25</ChuckTemperature>');
  const doc=new DOMParser().parseFromString(source,'application/xml');
  const job=doc.documentElement,measurement=PV2000.xml.direct(job,'Measurement');
  const d=PV2000.modules.jzero.parse({doc,job,measurement,type:PV2000.xml.attrType(measurement)});
  assert.deepEqual(d.iterationTypes,['OtherIterationData','']);
  assert.equal(d.calculationProfile.id,null);
  assert.equal(d.calculationProfile.status,'inferred');
  const a=PV2000.modules.jzero.analyze(d);
  assert.equal(a.metrics.voc1.profileId,null);
  assert.equal(a.metrics.voc1.validation,'inferred');
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


test('HighDensity RoundWafer keeps raw floating-point strict-circle membership',()=>{
  const coefficients=n=>Array.from({length:n*n},(_,index)=>({
    x:-1+2*(index%n)/(n-1),
    y:-1+2*Math.floor(index/n)/(n-1)
  }));
  for(const [dimension,count] of [[15,145],[20,276],[35,893]]){
    const g=PV2000.geometry.resolveMeasurementGeometry({
      patternType:'HighDensityPattern',
      targetType:'RoundWafer',
      rawCoefficients:coefficients(dimension),
      pointCount:count,
      diameter:100,
      edgeExclusion:7,
      allowPartialPrefix:true
    });
    assert.equal(g.geometryStatus,'complete');
    assert.equal(g.expectedPointCount,count);
    assert.equal(g.pointsMm.length,count);
  }
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
  assert.ok(Math.abs(a.metrics.voc1.values[0]-0.682745286002936)<1e-12);
  assert.ok(Math.abs(a.metrics.voc2.values[0]-0.70227764869422)<1e-12);
  assert.equal(Object.keys(a.metrics).length,7);
});

test('JZero implied-Voc vendor compatibility is pointwise exact across real paired geometry families',()=>{
  const cases=[
    {
      profile:'MapPattern + PseudoSquareCell',
      tau:200.31474788960881,intensity:1000,w:200,of:1,doping:1.5e16,temp:28.468013468013467,
      expected:0.682745286002936
    },
    {
      profile:'OnePointPattern + RoundWafer',
      tau:536.656537,intensity:1000,w:380,of:0.7,doping:4e15,temp:23.576675849403124,
      expected:0.645647575442322
    },
    {
      profile:'SquareRegionPattern + SquareCell',
      tau:19.82035527,intensity:1000,w:525,of:1,doping:6.5e14,temp:23.619528619528619,
      expected:0.507700006644697
    },
    {
      profile:'NinePointPattern + SquareCell',
      tau:53.1231591,intensity:1000,w:150,of:0.7,doping:5e15,temp:23.925619834710744,
      expected:0.607850293285686
    },
    {
      profile:'HighDensityPattern + RoundWafer',
      tau:187.5707712,intensity:1000,w:400,of:0.7,doping:4.55e15,temp:23.931741659014385,
      expected:0.613816402992686
    }
  ];
  for(const c of cases){
    const d={waferThickness:c.w,opticalFactor:c.of,doping:c.doping,temperatures:[c.temp]};
    const actual=PV2000.modules.jzero.impliedVoc(c.tau,c.intensity,d,0);
    assert.ok(Math.abs(actual-c.expected)<1e-12,`${c.profile}: ${actual} vs ${c.expected}`);
  }
});

test('JZero implied-Voc compatibility preserves vendor historical constants',()=>{
  const c=PV2000.modules.jzero.constants.JZERO_VOC_COMPAT;
  assert.deepEqual(c,{
    K:1.38066e-23,Q:1.602e-19,NI_SI:1.22e10,KELVIN_OFFSET:272.15,
    DEFAULT_TEMP_C:27,DEFAULT_WAFER_UM:200
  });
  const src=fs.readFileSync(require.resolve('../src/modules/jzero.js'),'utf8');
  assert.match(src,/Math\.log\(ratio\+1\)/);
  assert.match(src,/Changing 272\.15 to 273\.15 .* breaks vendor parity/);
  assert.doesNotMatch(src,/NI_VOC_300|niAtTemperature|egSi\(/);
});

test('JZero implied-Voc compatibility preserves vendor missing-input fallbacks',()=>{
  const base={opticalFactor:1,doping:1.5e16};
  const missing=PV2000.modules.jzero.impliedVoc(200,1000,{...base,waferThickness:0,temperatures:[0]},0);
  const explicit=PV2000.modules.jzero.impliedVoc(200,1000,{...base,waferThickness:200,temperatures:[27]},0);
  assert.equal(missing,explicit);

  const absent=PV2000.modules.jzero.impliedVoc(200,1000,{...base,waferThickness:200,temperatures:[]},0);
  assert.equal(absent,explicit);
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
  assert.doesNotMatch(src,/GEOM-MAP-PSEUDOSQUARE-001/);
  assert.match(src,/JZERO-VOC-COMPAT-001/);
  assert.match(src,/Measurement position/);
});


test('JZero Voc validation follows the calculation profile, not geometry identity',()=>{
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
  assert.equal(a.metrics.voc1.profileId,'JZERO-VOC-COMPAT-001');
  assert.equal(a.metrics.voc1.validation,'validated');

  d.geometryProfile={id:'GEOM-MAP-PSEUDOSQUARE-001',status:'validated'};
  const map=PV2000.modules.jzero.analyze(d);
  assert.equal(map.metrics.voc1.profileId,'JZERO-VOC-COMPAT-001');
  assert.equal(map.metrics.voc1.validation,'validated');

  d.calculationProfile={id:null,status:'inferred'};
  const incomplete=PV2000.modules.jzero.analyze(d);
  assert.equal(incomplete.metrics.voc1.profileId,null);
  assert.equal(incomplete.metrics.voc1.validation,'inferred');
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



test('JZero private validator enforces cross-profile vendor Voc parity',()=>{
  const src=fs.readFileSync(require.resolve('../scripts/validate_jzero_reference.py'),'utf8');
  assert.match(src,/resolve_xml_geometry/);
  assert.doesNotMatch(src,/xtype\(pattern\)!=['"]MapPattern['"]/);
  assert.doesNotMatch(src,/xtype\(target\)!=['"]PseudoSquareCell['"]/);
  assert.match(src,/VOC_NI_SI=1\.22e10/);
  assert.match(src,/VOC_KELVIN_OFFSET=272\.15/);
  assert.match(src,/TOL_VOC=1e-9/);
  assert.match(src,/JZERO-VOC-COMPAT-001/);
  assert.doesNotMatch(src,/diagnostic\/inferred|TOL_VOC_PROFILE|NI_VOC_300/);
});
