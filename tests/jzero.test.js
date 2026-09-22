const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
global.PV2000={};
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/registry.js');
PV2000.xml={};
PV2000.ui={escapeHtml:String,help(){return''},cssVar(){return''}};
PV2000.plot={};
PV2000.exporter={csv(){}};
require('../src/modules/jzero.js');

test('JZero module registers dedicated measurement type',()=>{
  assert.deepEqual(PV2000.modules.jzero.types,['JZeroMeasurement']);
});

test('pseudo-square JZero reference geometry reconstructs 5017 sites',()=>{
  const pts=PV2000.geometry.pseudoSquareGrid(71,71,95.5,2,2,5017);
  assert.equal(pts.length,5017);
  assert.deepEqual({x:pts[0].x,y:pts[0].y},{x:-64,y:-70});
  assert.deepEqual({x:pts.at(-1).x,y:pts.at(-1).y},{x:64,y:70});
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
  assert.ok(Math.abs(a.metrics.voc1.values[0]-0.682745286002936)<7e-5);
  assert.ok(Math.abs(a.metrics.voc2.values[0]-0.70227764869422)<7e-5);
  assert.equal(Object.keys(a.metrics).length,7);
});

test('JZero UI keeps all seven metrics and shared plot controls',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/jzero.js'),'utf8');
  for(const key of ['j0','tau1','tau2','smax1','smax2','voc1','voc2'])assert.match(src,new RegExp(`key:'${key}'`));
  assert.match(src,/axisControls\('jMapAxes'\)/);
  assert.match(src,/axisControls\('jHistAxes'/);
  assert.match(src,/binControls\('jHistBins'/);
  assert.match(src,/Valid-data filter/);
  assert.match(src,/PseudoSquareCell/);
});

test('single-file build includes JZero before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const jzero=build.indexOf("'src/modules/jzero.js'");
  const generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(jzero>=0);
  assert.ok(generic>jzero);
});
