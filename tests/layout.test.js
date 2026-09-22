const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('desktop/multicolumn sidebar has its own viewport scroll container',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid>\.side\{[^}]*position:sticky[^}]*height:calc\(100dvh - 66px\)[^}]*overflow-y:scroll/);
  assert.match(css,/\.module-grid>\.side>\*\{flex:0 0 auto\}/);
  assert.doesNotMatch(css,/@media\(max-width:1200px\)\{\.module-grid>\.side\{position:static/);
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


test('medium-width layout stacks the two analysis columns while keeping the sidebar dedicated',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/@media\(max-width:1200px\)\{\.module-grid\{grid-template-columns:minmax\(260px,300px\) minmax\(0,1fr\)\}\.module-grid>\.side\{grid-column:1;grid-row:1 \/ span 2;display:flex\}\.module-grid>\.plots\{grid-column:2\}/);
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
  assert.match(src,/Optional Midgap Dit \(PCHIP\).*help\('Optional analysis\./);
  assert.match(src,/COCOS-II .*help\('Inferred, not vendor-exact/);
});


test('all scientific plots expose shared zoom interactions and reset semantics',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.match(build,/'src\/core\/plot\.js'/);
  assert.equal((dit.match(/PV\.plot\.bind\(/g)||[]).length,4);
  assert.equal((qss.match(/PV\.plot\.bind\(/g)||[]).length,3);
  assert.equal((lbic.match(/PV\.plot\.bind\(/g)||[]).length,3);
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


test('Optional Midgap Dit is always visible with a default-on checkbox, not collapsible',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/id="ditUsePchip" type="checkbox"/);
  assert.match(src,/o\.pchipEnabled\?'checked':''/);
  assert.doesNotMatch(src,/id="ditMidgapControls"/);
  assert.doesNotMatch(src,/midgapOpen/);
  assert.match(src,/pchipEnabled=opts\.pchipEnabled!==false/);
});

test('legacy COCOS-II controls are removed completely',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.doesNotMatch(src,/Advanced \/ legacy methods/);
  assert.doesNotMatch(src,/Use Legacy COCOS-II/);
  assert.doesNotMatch(src,/value="guide"/);
  assert.doesNotMatch(src,/function cocosII\(/);
});


test('Optional Midgap Dit exposes original and median-binned PCHIP methods with a 10 mV default window',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/Median-binned PCHIP/);
  assert.match(src,/PCHIP \(original\)/);
  assert.match(src,/id="ditPchipMethod"/);
  assert.match(src,/id="ditPchipMedianMv"/);
  assert.match(src,/pchipMedianWindowV=.*\.010/);
});


test('landing page has a structured product shell, local-processing message and concise project provenance',()=>{
  const html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8');
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.ok(html.includes('class="landing-shell"'));
  assert.ok(html.includes('PV-2000 XML analysis and visualization'));
  assert.ok(html.includes('class="drop-icon"'));
  assert.ok(html.includes('class="btn drop-open"'));
  assert.ok(html.includes('Local processing'));
  assert.ok(html.includes('class="project-strip"'));
  assert.ok(html.includes('https://github.com/Xiaolong-6/PV-2000-Analyzer'));
  assert.ok(html.includes('Contribute'));
  assert.ok(html.includes('Share data'));
  assert.ok(html.includes('Report issue'));
  assert.ok(!html.includes('project-live'));
  assert.ok(!html.includes('>Live</a>'));
  assert.ok(html.includes('__BUILD_COMMIT_SHORT__'));
  assert.ok(html.includes('__BUILD_COMMIT_URL__'));
  assert.ok(html.includes('class="app-footer"'));
  assert.ok(css.includes('.landing-shell{'));
  assert.ok(css.includes('.drop::before{'));
  assert.ok(css.includes('.drop-open{'));
  assert.ok(css.includes('.landing-privacy{'));
  assert.ok(css.includes('.project-link{'));
});

test('build injects exact CI commit provenance and has an explicit local fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  assert.match(build,/process\.env\.PV2000_BUILD_SHA\|\|process\.env\.GITHUB_SHA\|\|'local'/);
  assert.match(build,/replaceAll\('__BUILD_COMMIT_SHORT__'/);
  assert.match(build,/replaceAll\('__BUILD_COMMIT_URL__'/);
});


test('Median Vsb window stays user-editable for Median-binned PCHIP',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/id="ditPchipMedianMv" type="number" min="0\.1" step="any"/);
  assert.match(src,/ditPchipMedianMv.*oninput=markDirty|\['#ditCocosEotA'[^\]]*'#ditPchipMedianMv'/);
  assert.match(src,/pchipMedianWindowV=medianMv\*1e-3/);
});


test('all spatial maps preserve equal physical X/Y scale by default',()=>{
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.match(dit,/equalAspectRanges\(rawX,rawY,W-m\.l-m\.r,H-m\.t-m\.b\)/);
  assert.match(lbic,/equalAspectRanges\(rawX,rawY,availW,availH\)/);
  assert.match(qss,/plot=Math\.min\(W-p\.l-p\.r,H-p\.t-p\.b\)/);
});

test('landing page removes the redundant deployed-site Live shortcut and its dead runtime handling',()=>{
  const html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8');
  const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8');
  assert.ok(!html.includes('project-live'));
  assert.ok(!app.includes('project-live'));
  assert.ok(!app.includes('xiaolong-6.github.io'));
});


test('QSS runtime omits fixed reference-validation card and exposes manual axes on data plots',()=>{
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.doesNotMatch(qss,/Algorithm validation — reference dataset/);
  assert.match(qss,/axisControls\('qHistAxes'\)/);
  assert.match(qss,/axisControls\('qProfileAxes'\)/);
  assert.match(qss,/edgeExclusion=X\.num\(target,'EdgeExclusion'/);
});

test('LBIC distribution and profiles render numeric ticks, manual axes and no forced blank canvas height',()=>{
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(lbic,/function niceTicks\(/);
  assert.match(lbic,/fillText\(axisFmt\(v\)/);
  assert.match(lbic,/axisControls\('lHistAxes'\)/);
  assert.match(lbic,/axisControls\('lXProfileAxes'\)/);
  assert.match(lbic,/axisControls\('lYProfileAxes'\)/);
  assert.match(css,/\.lbic-module \.canvas-wrap\{min-height:0\}/);
});

test('Dit numeric line plots expose manual X and Y limits',()=>{
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(dit,/axisControls\('ditVcpdAxes'\)/);
  assert.match(dit,/axisControls\('ditVsbAxes'\)/);
  assert.match(dit,/axisControls\('ditDitAxes'\)/);
  assert.match(dit,/bindAxisControls\(host,'ditDitAxes'[^]*\{yLog:true\}/);
});
