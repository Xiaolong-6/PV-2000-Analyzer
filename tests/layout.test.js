const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('desktop/multicolumn sidebar has its own viewport scroll container',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid>\.side\{[^}]*position:sticky[^}]*height:calc\(100dvh - 66px\)[^}]*overflow-y:scroll/);
  assert.match(css,/\.module-grid>\.side>\*\{flex:0 0 auto\}/);
  assert.doesNotMatch(css,/@media\(max-width:900px\)\{\.module-grid>\.side\{position:static/);
  assert.match(css,/@media\(max-width:700px\),\(pointer:coarse\) and \(orientation:portrait\) and \(max-width:950px\)\{\.module-grid>\.side\{position:static/);
});

test('single-file build includes LBIC before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const lbic=build.indexOf("'src/modules/lbic.js'");
  const generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(lbic>=0);
  assert.ok(generic>lbic);
});


test('Dit results summary is card-based and does not depend on a wide three-column table',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(src,/results-summary-panel/);
  assert.match(src,/result-card-values/);
  assert.doesNotMatch(src,/Results summary[^]*<table><thead><tr><th>Parameter<\/th><th>Valid-site mean<\/th><th>Current site<\/th>/);
  assert.match(css,/\.dit-module \.result-card-values\{[^}]*grid-template-columns:minmax\(0,1\.45fr\) minmax\(0,\.55fr\)/);
});

test('desktop zoom does not use portrait-only mobile fallback on fine pointers',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.doesNotMatch(css,/@media\(max-width:700px\),\(orientation:portrait\) and \(max-width:950px\)/);
  assert.match(css,/@media\(max-width:700px\),\(pointer:coarse\) and \(orientation:portrait\) and \(max-width:950px\)/);
});


test('landing page advertises supported analyzers without overclaiming generic inspection',()=>{
  const html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8');
  assert.match(html,/feature-tags/);
  assert.match(html,/Dit \/ COCOS/);
  assert.match(html,/QSS-µPCD/);
  assert.match(html,/LBIC/);
  assert.match(html,/Generic XML inspector/);
});


test('zoom-width layout keeps a dedicated sidebar column instead of a stretched two-column sidebar grid',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/@media\(max-width:900px\)\{\.module-grid\{grid-template-columns:minmax\(260px,300px\) minmax\(0,1fr\)\}\.module-grid>\.side\{grid-column:1;grid-row:1 \/ span 2;display:flex\}\.module-grid>\.plots\{grid-column:2\}/);
  assert.doesNotMatch(css,/\.side\{grid-column:1\/-1;display:grid;grid-template-columns:1fr 1fr\}/);
});


test('sidebar panels cannot flex-shrink away their overflow',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid>\.side>\*\{flex:0 0 auto\}/);
  assert.match(css,/\.module-grid>\.side\{[^}]*overflow-y:scroll/);
});


test('Dit explanatory prose lives in hover help instead of persistent note paragraphs',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.doesNotMatch(src,/<p class="note min-dit-note">/);
  assert.doesNotMatch(src,/COCOS-II and PCHIP can be used together:[^']*<\/p>/);
  assert.doesNotMatch(src,/<p class="note analysis-note">/);
  assert.match(src,/Optional Midgap Dit \(PCHIP\).*help\('COCOS-II and PCHIP can be used together/);
  assert.match(src,/COCOS-II .*help\('Inferred, not vendor-exact/);
});


test('all scientific plots expose shared zoom interactions and reset semantics',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.match(build,/'src\/core\/plot\.js'/);
  assert.equal((dit.match(/PV\.plot\.bind/g)||[]).length,4);
  assert.equal((qss.match(/PV\.plot\.bind/g)||[]).length,3);
  assert.equal((lbic.match(/PV\.plot\.bind/g)||[]).length,3);
  assert.match(dit,/onReset:\(\)=>\{zoom\.vcpd=\{x:null,y:null\}/);
  assert.match(qss,/onReset:\(\)=>onZoom\?\.\(\{x:null,y:null\}\)/);
  assert.match(lbic,/onReset:\(\)=>onZoom\?\.\(\{x:null,y:null\}\)/);
});

test('LBIC Distribution supports axis swapping',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.match(src,/id="lSwapHistAxes"/);
  assert.match(src,/histSwapped=!histSwapped/);
  assert.match(src,/drawHist\(host\.querySelector\('#lHist'\),metric,histSwapped/);
});

test('persistent scientific explanatory paragraphs are moved into hover help',()=>{
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.doesNotMatch(lbic,/<p class="note">Default quantities mirror/);
  assert.doesNotMatch(lbic,/<p class="note">All point X\/Y coordinates/);
  assert.match(lbic,/View \$\{help\('Default quantities mirror/);
  assert.doesNotMatch(qss,/<p class="note">These results describe the 305-point reference only/);
  assert.doesNotMatch(qss,/<details class="panel"><summary>Algorithm notes<\/summary><p class="note">/);
});

test('Vcpd-Qc is point-line and data markers stay smaller than the initial marker',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/pointsXY\(qc,vd,X,Y,'var\(--red\)',2\.5\)/);
  assert.match(src,/pointsXY\(qc,vl,X,Y,'var\(--blue\)',2\.5\)/);
  assert.match(src,/r="4" fill="var\(--yellow\)"/);
});


test('PCHIP outlier input is rendered in E scientific notation',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/ditReject[^>]*value="\$\{Number\.isFinite\(o\.ditReject\)\?o\.ditReject\.toExponential\(3\)\.replace\('e','E'\)/);
});
