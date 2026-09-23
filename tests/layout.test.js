const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('desktop/multicolumn sidebar has its own viewport scroll container',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid>\.side\{[^}]*position:sticky[^}]*height:calc\(100dvh - 66px\)[^}]*overflow-y:scroll/);
  assert.match(css,/\.module-grid>\.side>\*\{flex:0 0 auto\}/);
  assert.doesNotMatch(css,/@media\(max-width:1200px\)\{\.module-grid>\.side\{position:static/);
  assert.match(css,/@media\(max-width:700px\),\(pointer:coarse\) and \(orientation:portrait\) and \(max-width:950px\)\{\.module-grid>\.side\{position:static/);
});

test('measurement domain primitives load before profile and module code',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const validity=build.indexOf("'src/core/validity.js'");
  const quantity=build.indexOf("'src/core/quantity.js'");
  const selection=build.indexOf("'src/core/selection.js'");
  const measurement=build.indexOf("'src/core/measurement.js'");
  const profiles=build.indexOf("'src/core/profiles.js'");
  const iscProfile=build.indexOf("'src/profiles/isc.js'");
  const iscModule=build.indexOf("'src/modules/isc.js'");
  assert.ok(validity>=0&&quantity>validity&&selection>quantity&&measurement>selection&&profiles>measurement);
  assert.ok(iscProfile>profiles&&iscModule>iscProfile);
});

test('single-file build includes ISC and LBIC before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const isc=build.indexOf("'src/modules/isc.js'");
  const lbic=build.indexOf("'src/modules/lbic.js'");
  const generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(isc>=0);
  assert.ok(lbic>isc);
  assert.ok(generic>lbic);
});


test('single-file build includes Dual QSS before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const dual=build.indexOf("'src/modules/dual-qss.js'");
  const generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(dual>=0);
  assert.ok(generic>dual);
});

test('Dual QSS exposes XML lifetime semantics, transient voltage units and inline overlay legend',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dual-qss.js'),'utf8');
  assert.match(src,/types:\['DualQssMeasurement'\]/);
  assert.match(src,/Lifetime vs QSS intensity/);
  assert.doesNotMatch(src,/id="dqLifetimeSource"/);
  assert.match(src,/CSV\/raw exports are development-validation evidence and are never runtime inputs/);
  assert.match(src,/Voltage \[mV\]/);
  assert.match(src,/id="dqCurveLegend"/);
  assert.match(src,/axisControls\('dqCurveAxes'\)/);
  assert.match(src,/axisControls\('dqTransientAxes'\)/);
  assert.doesNotMatch(src,/Raw signal \[XML units\]/);
  assert.match(src,/life\(q\)<=0\)\{[^}]*started=false/);
});

test('Dual QSS measurement-position visualization stays out of the sidebar',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dual-qss.js'),'utf8');
  const asideStart=src.indexOf('<aside class="side">');
  const asideEnd=src.indexOf('</aside>',asideStart);
  const position=src.indexOf('${positionHtml(d)}');
  assert.ok(asideStart>=0&&asideEnd>asideStart);
  assert.ok(position>asideEnd,'Measurement position belongs in the right plot area, not the sidebar');
  assert.match(src,/dual-qss-position-panel/);
});

test('Dual QSS initial render draws immediately without a control change',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dual-qss.js'),'utf8');
  assert.match(src,/host\.querySelector\('#dqExportTransient'\)\.onclick=[^]*\n    \}\n    redraw\(\);\n  \}/);
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
  assert.match(html,/QSS Injection/);
  assert.match(html,/ISC/);
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
  const isc=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8');
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.match(build,/'src\/core\/plot\.js'/);
  assert.equal((dit.match(/PV\.plot\.bind\(/g)||[]).length,4);
  assert.equal((qss.match(/PV\.plot\.bind\(/g)||[]).length,3);
  assert.equal((isc.match(/PV\.plot\.bind\(/g)||[]).length,3);
  assert.equal((lbic.match(/PV\.plot\.bind\(/g)||[]).length,3);
  assert.match(dit,/onReset:\(\)=>\{zoom\.vcpd=\{x:null,y:null\}/);
  assert.match(qss,/onReset:\(\)=>onZoom\?\.\(\{x:null,y:null\}\)/);
  assert.match(isc,/onReset:\(\)=>onZoom\?\.\(\{x:null,y:null\}\)/);
  assert.match(lbic,/onReset:\(\)=>onZoom\?\.\(\{x:null,y:null\}\)/);
});

test('LBIC Distribution defaults to Count on X and keeps Swap/Bins in header controls',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.match(src,/histSwapped=true/);
  assert.match(src,/histBins=30/);
  assert.match(src,/axisControls\('lHistAxes',\{distribution:true,swapped:histSwapped\}\)/);
  assert.match(src,/binControls\('lHistBins',histBins\)/);
  assert.match(src,/onSwap:\(\)=>\{histSwapped=!histSwapped/);
  assert.match(src,/bindBinControls\(host,'lHistBins',histBins/);
  assert.match(src,/drawHist\(host\.querySelector\('#lHist'\),metric,histBins,histSwapped/);
  assert.doesNotMatch(src,/id="lSwapHistAxes"/);
});

test('persistent scientific explanatory paragraphs are moved into hover help',()=>{
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.doesNotMatch(lbic,/<p class="note">Default quantities mirror/);
  assert.doesNotMatch(lbic,/<p class="note">All point X\/Y coordinates/);
  assert.match(lbic,/View \$\{help\('Primary quantities follow the active XML measurement flags/);
  assert.doesNotMatch(qss,/<p class="note">These results describe the 305-point reference only/);
  assert.doesNotMatch(qss,/Algorithm notes/);
});

test('Vcpd-Qc is point-line and data markers stay smaller than the initial marker',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/pointsXY\(qc,vd,X,Y,'var\(--red\)',2\.5\)/);
  assert.match(src,/pointsXY\(qc,vl,X,Y,'var\(--blue\)',2\.5\)/);
  assert.match(src,/r="4" fill="var\(--yellow\)"/);
});


test('PCHIP outlier input is optional, blank by default, and keeps E notation for finite manual limits',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/id="ditReject"[^>]*placeholder="disabled"/);
  assert.match(src,/Number\.isFinite\(o\.ditReject\)\?o\.ditReject\.toExponential\(3\)\.replace\('e','E'\):''/);
  assert.match(src,/ditReject=Number\.isFinite\(opts\.ditReject\)\?opts\.ditReject:Infinity/);
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


test('landing page has a structured product shell, compact README-style shortcuts and same-row build provenance',()=>{
  const html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8');
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.ok(html.includes('class="landing-shell"'));
  assert.ok(html.includes('PV-2000 XML analysis and visualization'));
  assert.ok(html.includes('class="drop-icon"'));
  assert.ok(html.includes('class="btn drop-open"'));
  assert.ok(html.includes('Local processing'));
  assert.ok(html.includes('class="landing-status"'));
  assert.ok(html.includes('class="project-shortcuts"'));
  assert.ok(html.includes('class="readme-badge"'));
  assert.ok(html.includes('>Guide</span>'));
  assert.ok(html.includes('>Source</span>'));
  assert.ok(html.includes('>Contribute</span>'));
  assert.ok(html.includes('PV-2000 data'));
  assert.ok(html.includes('>Report</span>'));
  assert.ok(html.includes('>Download</span>'));
  assert.ok(html.includes('href="./PV-2000-Analyzer.html"'));
  assert.ok(html.includes('download="PV-2000-Analyzer.html"'));
  assert.ok(!html.includes('class="landing-repo"'));
  assert.ok(!html.includes('project-live'));
  assert.ok(!html.includes('>Live</a>'));
  assert.ok(html.includes('__BUILD_COMMIT_SHORT__'));
  assert.ok(html.includes('__BUILD_COMMIT_URL__'));
  assert.ok(html.includes('class="app-footer"'));
  assert.ok(css.includes('.landing-shell{'));
  assert.ok(css.includes('.drop::before{'));
  assert.ok(css.includes('.drop-open{'));
  assert.ok(css.includes('.landing-status{'));
  assert.ok(css.includes('.readme-badge{'));
});

test('build injects exact CI commit provenance and has an explicit local fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  assert.match(build,/process\.env\.PV2000_BUILD_SHA\|\|process\.env\.GITHUB_SHA\|\|'local'/);
  assert.match(build,/replaceAll\('__BUILD_COMMIT_SHORT__'/);
  assert.match(build,/replaceAll\('__BUILD_COMMIT_URL__'/);
});

test('build emits the same single-file analyzer for Pages and offline download',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  assert.match(build,/const outputs=\['index\.html','PV-2000-Analyzer\.html'\]/);
  assert.match(build,/for\(const output of outputs\) fs\.writeFileSync/);
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
  const isc=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8');
  assert.match(dit,/equalAspectRanges\(rawX,rawY,W-m\.l-m\.r,H-m\.t-m\.b\)/);
  assert.match(lbic,/equalAspectRanges\(rawX,rawY,availW,availH\)/);
  assert.match(qss,/plot=Math\.min\(W-p\.l-p\.r,H-p\.t-p\.b\)/);
  assert.match(isc,/equalAspectRanges\(autoX,autoY,W-p\.l-p\.r,H-p\.t-p\.b\)/);
});

test('landing page removes the redundant deployed-site Live shortcut and its dead runtime handling',()=>{
  const html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8');
  const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8');
  assert.ok(!html.includes('project-live'));
  assert.ok(!app.includes('project-live'));
  assert.ok(!app.includes('xiaolong-6.github.io'));
});


test('toolbar XML arrows navigate only within an explicitly authorized folder',()=>{
  const html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8');
  const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8');
  const prev=html.indexOf('id="prevXml"'),open=html.indexOf('id="openTop"'),next=html.indexOf('id="nextXml"');
  assert.ok(prev>=0&&prev<open&&open<next);
  assert.match(html,/id="folderXmlAccess"/);
  assert.match(html,/id="folderXmlFallback"[^>]*webkitdirectory/);
  assert.match(app,/showDirectoryPicker/);
  assert.match(app,/Load previous XML in the authorized folder/);
  assert.match(app,/Load next XML in the authorized folder/);
  assert.match(app,/folderXmlAccess'\)\.onclick=\(\)=>authorizeFolder\(\)/);
  const nav=app.match(/async function navigateFolder\(step\)\{([\s\S]*?)\n  \}/)?.[1]||'';
  assert.doesNotMatch(nav,/showDirectoryPicker|folderXmlFallback.*click/);
  assert.match(nav,/never open a picker/);
  assert.match(app,/\.filter\(file=>\/\\\.xml\$\/i\.test\(file\.name\)\)/);
});

test('QSS runtime omits fixed reference-validation card and exposes manual axes on data plots',()=>{
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.doesNotMatch(qss,/Algorithm validation — reference dataset/);
  assert.match(qss,/axisControls\('qMapAxes'\)/);
  assert.match(qss,/axisControls\('qHistAxes'/);
  assert.match(qss,/axisControls\('qProfileAxes'\)/);
  assert.ok(qss.indexOf('Current dataset')<qss.indexOf('</aside><section class="plots">'));
  assert.match(qss,/edgeExclusion=X\.num\(target,'EdgeExclusion'/);
});

test('LBIC distribution and profiles render numeric ticks, manual axes and no forced blank canvas height',()=>{
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(lbic,/function niceTicks\(/);
  assert.match(lbic,/fillText\(axisFmt\(v\)/);
  assert.match(lbic,/axisControls\('lMapAxes'\)/);
  assert.match(lbic,/axisControls\('lHistAxes'/);
  assert.match(lbic,/axisControls\('lXProfileAxes'/);
  assert.match(lbic,/axisControls\('lYProfileAxes'/);
  assert.match(lbic,/class="lbic-workspace"/);
  assert.ok(lbic.indexOf('Selected pixel')<lbic.indexOf('</aside><section class="lbic-workspace">'));
  assert.ok(lbic.indexOf('Channel provenance')<lbic.indexOf('</aside><section class="lbic-workspace">'));
  assert.match(lbic,/H=canvas\.height=430,p=\{l:64,r:18,t:24,b:52\}/);
  assert.match(css,/\.lbic-module \.canvas-wrap\{min-height:0\}/);
  assert.match(css,/\.lbic-module \.lbic-workspace\{grid-column:2 \/ 4/);
});

test('Dit numeric line plots expose manual X and Y limits',()=>{
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(dit,/axisControls\('ditVcpdAxes'\)/);
  assert.match(dit,/axisControls\('ditVsbAxes'\)/);
  assert.match(dit,/axisControls\('ditDitAxes'\)/);
  assert.match(dit,/axisControls\('ditMapAxes'\)/);
  assert.match(dit,/analysisOpen=true,resultsOpen=true/);
  assert.match(dit,/id="ditResultsSummary" class="panel results-summary-panel" \$\{resultsOpen\?'open':''\}/);
  assert.match(dit,/bindAxisControls\(host,'ditDitAxes'[^]*\{yLog:true\}/);
});


test('QSS Distribution draws numeric tick labels on both axes in normal and swapped modes',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.match(src,/histXRange=swapped\?cr:mr/);
  assert.match(src,/histYRange=swapped\?mr:cr/);
  assert.match(src,/niceTicks\(histXRange\[0\],histXRange\[1\],5\)/);
  assert.match(src,/niceTicks\(histYRange\[0\],histYRange\[1\],5\)/);
  assert.match(src,/ctx\.fillText\(axisFmt\(t\),x,H-17\)/);
  assert.match(src,/ctx\.fillText\(axisFmt\(t\),p\.l-8,y\+4\)/);
});

test('QSS Distribution defaults to Count on X and exposes Swap/Bins through shared controls',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.match(src,/histSwapped=true/);
  assert.match(src,/histBins=30/);
  assert.match(src,/axisControls\('qHistAxes',\{distribution:true,swapped:histSwapped\}\)/);
  assert.match(src,/binControls\('qHistBins',histBins\)/);
  assert.match(src,/bindBinControls\(host,'qHistBins',histBins/);
  assert.match(src,/drawHist\(host\.querySelector\('#qHist'\),a,metricKey,mask,filterKey,filterLo,filterHi,histBins,histSwapped/);
  assert.doesNotMatch(src,/id="qSwapHistAxes"/);
});


test('ISC keeps validated quantities, geometry-aware map and standardized Distribution controls',()=>{
  const isc=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8');
  assert.match(isc,/types:\['ISCMeasurement','VcpdMeasurement'\]/);
  assert.match(isc,/Vcpd Dark/);
  assert.match(isc,/Vcpd Light/);
  assert.match(isc,/VSB/);
  assert.match(isc,/Raw readings/);
  assert.match(isc,/histSwapped=true/);
  assert.match(isc,/histBins=30/);
  assert.match(isc,/axisControls\('iHistAxes',\{distribution:true,swapped:histSwapped\}\)/);
  assert.match(isc,/binControls\('iHistBins',histBins\)/);
  assert.match(isc,/bindBinControls\(host,'iHistBins',histBins/);
  assert.match(isc,/drawHist\(host\.querySelector\('#iHist'\),a,metricKey,histBins,histSwapped/);
  assert.doesNotMatch(isc,/id="iSwapHistAxes"/);
  assert.match(isc,/axisControls\('iMapAxes'\)/);
  assert.match(isc,/axisControls\('iRawAxes'\)/);
  assert.match(isc,/equalAspectRanges\(autoX,autoY/);
  assert.match(isc,/targetGeometry\(d\)/);
  assert.match(isc,/setLineDash\(\[6,4\]\)/);
  assert.match(isc,/geometry\.nominal/);
  assert.match(isc,/geometry\.scheduled/);
});


test('all plot Axes controls are rendered in chart headers immediately before export controls',()=>{
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  const isc=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8');
  for(const src of [dit,qss,lbic,isc]){
    assert.doesNotMatch(src,/class="(?:canvas-wrap|chart-stage)[^"]*"[^>]*>\$\{PV\.plot\.axisControls/);
  }
  assert.match(dit,/axisControls\('ditVcpdAxes'\)\}<button id="e1"/);
  assert.match(dit,/axisControls\('ditDitAxes'\)\}<button id="e2"/);
  assert.match(dit,/axisControls\('ditVsbAxes'\)\}<button id="e3"/);
  assert.match(dit,/axisControls\('ditMapAxes'\)\}<button id="e4"/);
  assert.match(qss,/axisControls\('qMapAxes'\)\}<button id="qExportMap"/);
  assert.match(qss,/binControls\('qHistBins',histBins\)\}<button id="qExportHist"/);
  assert.match(qss,/axisControls\('qProfileAxes'\)\}<button id="qExportProfile"/);
  assert.match(lbic,/axisControls\('lMapAxes'\)\}<button id="lExportMap"/);
  assert.match(lbic,/binControls\('lHistBins',histBins\)\}<button id="lExportHist"/);
  assert.match(lbic,/axisControls\('lYProfileAxes',\{label:'Y axes'\}\)\}<button id="lExportProfile"/);
  assert.match(isc,/axisControls\('iMapAxes'\)\}<button id="iExportMap"/);
  assert.match(isc,/binControls\('iHistBins',histBins\)\}<button id="iExportHist"/);
  assert.match(isc,/axisControls\('iRawAxes'\)\}<button id="iExportRaw"/);
});

test('chart popovers are not clipped and plot wrappers do not force blank vertical space',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.panel\.chart\{[^}]*overflow:visible[^}]*position:relative/);
  assert.match(css,/\.axis-popover-card\{[^}]*z-index:60/);
  assert.doesNotMatch(css,/\.canvas-wrap\{[^}]*min-height:300px/);
});

test('QSS Distribution uses valid counts only and axis swap cannot change filter state',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.match(src,/autoCount=\[0,Math\.max\(\.\.\.bins\.map\(b=>b\.valid\),1\)\]/);
  assert.doesNotMatch(src,/autoCount=\[0,Math\.max\(\.\.\.bins\.map\(b=>b\.valid\+b\.invalid\)/);
  const start=src.indexOf("onSwap:()=>{histSwapped=!histSwapped");
  const end=src.indexOf("PV.plot.bindBinControls",start);
  assert.ok(start>=0&&end>start);
  const swapBlock=src.slice(start,end);
  assert.doesNotMatch(swapBlock,/mask\s*=|filterKey\s*=|filterLo\s*=|filterHi\s*=/);
});
