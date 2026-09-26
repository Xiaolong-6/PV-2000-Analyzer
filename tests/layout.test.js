const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('wide app shell fixes toolbar/footer and gives all three equal-width panes their own scroll',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/#app:not\(\.hidden\)\{[^}]*height:100dvh[^}]*display:grid[^}]*grid-template-rows:46px minmax\(0,1fr\) auto[^}]*overflow:hidden/);
  assert.match(css,/#app:not\(\.hidden\)>\.content\{[^}]*max-width:none[^}]*overflow:hidden/);
  assert.match(css,/\.module-grid\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) minmax\(0,1fr\)[^}]*align-items:stretch/);
  assert.match(css,/\.module-grid>\.side,\.module-grid>\.plots\{[^}]*height:100%[^}]*overflow-y:auto/);
  assert.match(css,/\.app-footer\{[^}]*margin:0[^}]*background:var\(--bg\)/);
});

test('Current dataset adapts cleanly to three, four or five summary items',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8'),
    isc=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8'),
    dual=fs.readFileSync(require.resolve('../src/modules/dual-qss.js'),'utf8'),
    jzero=fs.readFileSync(require.resolve('../src/modules/jzero.js'),'utf8');
  assert.match(css,/\.current-dataset-panel \.validation\{display:flex;gap:0\}/);
  assert.match(css,/\.current-dataset-panel \.validation>div\{flex:1 1 0;[^}]*border:0[^}]*border-radius:0[^}]*padding:2px 9px[^}]*text-align:left/);
  assert.match(css,/@media\(max-width:1200px\)\{[^}]*\.current-dataset-panel \.validation\{display:grid;grid-template-columns:1fr;gap:0\}/);
  assert.match(css,/\.current-dataset-panel \.validation>div\{display:grid;grid-template-columns:minmax\(0,1fr\) auto;[^}]*border-top:1px solid var\(--border\)/);
  const dualPanel=dual.slice(dual.indexOf('current-dataset-panel'),dual.indexOf('</section>',dual.indexOf('current-dataset-panel'))),
    jzeroPanel=jzero.slice(jzero.indexOf('current-dataset-panel'),jzero.indexOf('</section>',jzero.indexOf('current-dataset-panel')));
  assert.equal((dualPanel.match(/<\/span><\/div>/g)||[]).length,3);
  assert.equal((jzeroPanel.match(/<div><b>/g)||[]).length,5);
  assert.match(isc,/:'Complete'}<\/b><span>acquisition schedule/);
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
  assert.match(src,/host\.querySelector\('#dqExportTransient'\)\.onclick=[^]*\r?\n    \}\r?\n    redraw\(\);\r?\n    PV\.plot\.observeResize\(host,redraw\);\r?\n  \}/);
});

test('Dit results summary uses compact Selected-site-style rows without repeated labels',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(src,/id="ditResultsSummary"[^]*<dl class="meta compact-summary">\$\{summaryRows\}<\/dl>/);
  assert.doesNotMatch(src,/Valid-site mean ± stdev/);
  assert.doesNotMatch(src,/result-card-values/);
  assert.match(css,/\.compact-summary\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
  const summary=src.slice(src.indexOf('id="ditResultsSummary"'),src.indexOf('<summary>Acquisition metadata'));
  assert.doesNotMatch(summary,/Current site|midgapCoverageText\(s\)/);
});

test('desktop zoom does not use portrait-only mobile fallback on fine pointers',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.doesNotMatch(css,/@media\(max-width:700px\),\(orientation:portrait\) and \(max-width:950px\)/);
  assert.match(css,/@media\(max-width:700px\),\(pointer:coarse\) and \(orientation:portrait\) and \(max-width:950px\)/);
});


test('landing page separates supported analyzers from fallback and validation boundary',()=>{
  const html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8');
  assert.match(html,/feature-tags/);
  assert.match(html,/Supported analyzers/);
  assert.match(html,/Dit \/ COCOS/);
  assert.match(html,/QSS-µPCD/);
  assert.match(html,/QSS Injection/);
  assert.match(html,/Emitter J0/);
  assert.match(html,/ISC \/ VCPD/);
  assert.match(html,/CET \/ EOT/);
  assert.match(html,/LBIC/);
  assert.match(html,/Fallback \/ reference/);
  assert.match(html,/Generic XML inspector/);
  assert.match(html,/Validation boundary: PV-2000 v1\.3\.0\.5/);
  assert.ok(html.indexOf('Supported analyzers')<html.indexOf('Fallback / reference'));
});



test('dedicated analyzer sidebars follow the shared information hierarchy where applicable',()=>{
  const sources={
    dit:fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8'),
    qss:fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8'),
    dual:fs.readFileSync(require.resolve('../src/modules/dual-qss.js'),'utf8'),
    jzero:fs.readFileSync(require.resolve('../src/modules/jzero.js'),'utf8'),
    isc:fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8'),
    lbic:fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8'),
    cet:fs.readFileSync(require.resolve('../src/modules/cet.js'),'utf8'),
    spv:fs.readFileSync(require.resolve('../src/modules/spv.js'),'utf8'),
    leakage:fs.readFileSync(require.resolve('../src/modules/leakage.js'),'utf8')
  };
  const sidebar=src=>{
    const start=src.indexOf('<aside class="side">'),
      end=src.indexOf('</aside>',start);
    assert.ok(start>=0&&end>start,'dedicated analyzer sidebar not found');
    return src.slice(start,end);
  };
  const ordered=(src,labels)=>{
    const side=sidebar(src);
    let last=-1;
    for(const label of labels){
      const next=side.indexOf(label,last+1);
      assert.ok(next>last,`expected sidebar order item ${label}`);
      last=next;
    }
  };
  ordered(sources.dit,['<h3>Measurement ','<h3>Current dataset ','${analysisControls()}','validDataFilterMarkup','Results summary','<summary>Acquisition metadata ','Recipe charge sequence']);
  ordered(sources.qss,['<h3>Measurement ','<h3>Current dataset ','<h3>Analysis controls ','Additional SRV analysis','validDataFilterMarkup','<h3>Results summary ','<summary>Full metadata']);
  ordered(sources.dual,['<h3>Measurement ','<h3>Current dataset</h3>','<h3>Comparison overlay</h3>','<h3>Results summary</h3>','<summary>Acquisition metadata</summary>']);
  ordered(sources.jzero,['<h3>Measurement ','<h3>Current dataset</h3>','validDataFilterMarkup','<h3>Results summary ','<summary>Validation / provenance</summary>','<summary>Acquisition metadata</summary>']);
  ordered(sources.isc,['<h3>Measurement ','<h3>Current dataset ','validDataFilterMarkup','<h3>Results summary ','<summary>Acquisition metadata</summary>']);
  ordered(sources.lbic,['<h3>Measurement ','<h3>Current dataset</h3>','<h3>View ','validDataFilterMarkup','<h3>Results summary ','<summary>Channel provenance</summary>','<summary>Acquisition / validation ']);
  ordered(sources.cet,['<h3>Measurement ','<h3>Current dataset</h3>','validDataFilterMarkup','<h3>Results summary ','<summary>Acquisition / validation</summary>']);
  ordered(sources.spv,['<h3>Measurement ','<h3>Current dataset</h3>','validDataFilterMarkup','<h3>Results summary</h3>','<summary>Acquisition / validation</summary>']);
  ordered(sources.leakage,['<h3>Measurement</h3>','<h3>Current dataset</h3>','<h3>Results summary</h3>','<summary>Acquisition / validation</summary>']);
});

test('Current dataset filter counts stay live in ISC and LBIC without forcing a shell rebuild',()=>{
  const isc=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8'),
    lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.match(isc,/id="iDatasetValid"/);
  assert.match(isc,/datasetValid\.textContent=\`\$\{state\.validCount\} \/ \$\{state\.siteCount\}\`/);
  assert.match(lbic,/id="lDatasetValid"/);
  assert.match(lbic,/datasetValid\.textContent=\`\$\{state\.validCount\} \/ \$\{state\.siteCount\}\`/);
});

test('Measurement panels remain compact identity blocks instead of metadata catch-alls',()=>{
  const files=['dit.js','qss-upcd.js','dual-qss.js','jzero.js','isc.js','lbic.js','cet.js','spv.js','leakage.js'];
  for(const file of files){
    const src=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8'),
      start=src.indexOf('<h3>Measurement'),
      end=src.indexOf('</section>',start),
      panel=src.slice(start,end);
    assert.ok(start>=0&&end>start,`Measurement panel not found in ${file}`);
    assert.doesNotMatch(panel,/Result time|Elapsed|Chuck temperature|Measurement velocity|Calculation profile|Geometry profile|Vcpd offset|Photon flux/,`${file} Measurement panel contains lower-priority metadata`);
  }
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.doesNotMatch(dit,/Measurement metadata/);
  assert.match(dit,/<summary>Acquisition metadata /);
});

test('scientific calculation inputs remain visible in collapsed sidebar metadata',()=>{
  const sidebar=file=>{
    const src=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8'),
      start=src.indexOf('<aside class="side">'),
      end=src.indexOf('</aside>',start);
    assert.ok(start>=0&&end>start,`sidebar not found in ${file}`);
    return src.slice(start,end);
  };
  const spv=sidebar('spv.js'),
    leakage=sidebar('leakage.js');
  assert.match(spv,/<summary>Acquisition \/ validation<\/summary>/);
  for(const label of ['LED temperature','Wafer thickness','Back-surface velocity','Enhanced mode','Doping type']){
    assert.match(spv,new RegExp('<dt>'+label+'</dt>'),`SPV sidebar must expose scientific input: ${label}`);
  }
  assert.match(leakage,/<summary>Acquisition \/ validation<\/summary>/);
  for(const label of ['Material','Physical thickness']){
    assert.match(leakage,new RegExp('<dt>'+label+'</dt>'),`Leakage sidebar must expose parsed setting: ${label}`);
  }
});

test('medium-width layout stacks the two analysis columns while keeping the sidebar dedicated',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/@media\(max-width:1200px\)\{#app:not\(\.hidden\)\{[^}]*display:block[^}]*overflow:visible/);
  assert.match(css,/\.module-grid\{height:auto;grid-template-columns:minmax\(260px,300px\) minmax\(0,1fr\);align-items:start\}/);
  assert.match(css,/\.module-grid>\.side\{grid-column:1;grid-row:1 \/ span 2;display:flex;position:sticky/);
  assert.match(css,/\.module-grid>\.plots\{grid-column:2;position:static[^}]*overflow:visible/);
  assert.doesNotMatch(css,/\.side\{grid-column:1\/-1;display:grid;grid-template-columns:1fr 1fr\}/);
});


test('pane panels cannot flex-shrink away their overflow',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid>\.side>\*,\.module-grid>\.plots>\*\{flex:0 0 auto\}/);
  assert.match(css,/\.module-grid>\.side,\.module-grid>\.plots\{[^}]*overflow-y:auto/);
});


test('Dit explanatory prose lives in hover help instead of persistent note paragraphs',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.doesNotMatch(src,/<p class="note min-dit-note">/);
  assert.doesNotMatch(src,/COCOS-II and PCHIP can be used together:[^']*<\/p>/);
  assert.doesNotMatch(src,/<p class="note analysis-note">/);
  assert.match(src,/Optional Midgap Dit \(PCHIP\).*help\('Optional analysis\./);
  assert.match(src,/COCOS-II .*help\('Current-DLL reconstruction is vendor-validated/);
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
  assert.match(src,/drawHist\(host\.querySelector\('#lHist'\),metric,displayMask,histBins,histSwapped/);
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
  assert.ok(qss.indexOf('Current dataset')<qss.indexOf('</aside><section class="plots overview">'));
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
  assert.match(lbic,/class="plots overview"/);
  assert.match(lbic,/class="plots detail"/);
  assert.ok(lbic.indexOf('Selected pixel')>lbic.indexOf('</aside><section class="plots overview">'));
  assert.ok(lbic.indexOf('Channel provenance')<lbic.indexOf('</aside><section class="plots overview">'));
  assert.match(lbic,/PV\.plot\.canvasFrame\(canvas\)/);
  assert.match(lbic,/surface:'compact'/);
  assert.match(css,/\.lbic-module \.canvas-wrap\{min-height:0\}/);
});

test('Dit numeric line plots expose manual X and Y limits',()=>{
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(dit,/axisControls\('ditVcpdAxes'\)/);
  assert.match(dit,/axisControls\('ditVsbAxes'\)/);
  assert.match(dit,/axisControls\('ditDitAxes'\)/);
  assert.match(dit,/axisControls\('ditMapAxes'\)/);
  assert.match(dit,/analysisOpen=true,[\s\S]*resultsOpen=true/);
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
  assert.match(src,/histCanvas\s*\?drawHist\(histCanvas,a,metricKey,mask,filterKey,filterLo,filterHi,histBins,histSwapped/);
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
  assert.match(isc,/histCanvas\?drawHist\(histCanvas,a,metricKey,displayMask,histBins,histSwapped/);
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
  assert.match(dit,/axisControls\('ditMapAxes'\)\}\s*<button id="e4"/);
  assert.match(qss,/axisControls\('qMapAxes'\)\}\s*<button id="qExportMap"/);
  assert.match(qss,/binControls\('qHistBins',histBins\)\}<button id="qExportHist"/);
  assert.match(qss,/axisControls\('qProfileAxes'\)\}<button id="qExportProfile"/);
  assert.match(lbic,/axisControls\('lMapAxes'\)\}<button id="lExportMap"/);
  assert.match(lbic,/binControls\('lHistBins',histBins\)\}<button id="lExportHist"/);
  assert.match(lbic,/axisControls\('lYProfileAxes',\{label:'Y axes'\}\)\}<button id="lExportProfile"/);
  assert.match(isc,/axisControls\('iMapAxes'\)\}<button id="iExportMap"/);
  assert.match(isc,/binControls\('iHistBins',histBins\)\}<button id="iExportHist"/);
  assert.match(isc,/axisControls\('iRawAxes'\)\}<button id="iExportRaw"/);
});

test('chart settings expand in normal header flow without viewport-width popovers',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.panel\.chart\{[^}]*overflow:visible[^}]*position:relative/);
  assert.match(css,/\.chart header\{[^}]*flex-wrap:wrap/);
  assert.match(css,/\.axis-popover-card\{[^}]*order:20;[^}]*flex:1 0 100%;[^}]*width:100%;[^}]*max-width:100%/);
  assert.match(css,/\.axis-popover-card\[hidden\]\{display:none\}/);
  assert.doesNotMatch(css,/\.axis-popover-card\{[^}]*position:absolute/);
  assert.doesNotMatch(css,/\.axis-popover-card\{[^}]*100vw/);
  assert.doesNotMatch(css,/has-axis-popover-open|padding-bottom:112px|padding-bottom:168px/);
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


test('ISC establishes semantic desktop columns and keeps selected-site detail out of the dataset sidebar',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8');
  const asideEnd=src.indexOf('</aside>');
  const selected=src.indexOf("?'Measurement point':'Selected site'");
  assert.match(src,/section class="plots overview"/);
  assert.match(src,/section class="plots detail"/);
  assert.ok(asideEnd>=0&&selected>asideEnd);
  assert.match(src,/linkedSelect:'#iMetric'/);
  assert.match(src,/metricKey=state\.metricKey/);
});


test('JZero, SPV and LBIC follow overview/detail columns and synchronize active quantity with filtering',()=>{
  for(const file of ['jzero.js','spv.js','lbic.js']){
    const src=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8');
    assert.match(src,/class="plots overview"/);
    assert.match(src,/class="plots detail"/);
    assert.match(src,/linkedSelect:/);
  }
  const spv=fs.readFileSync(require.resolve('../src/modules/spv.js'),'utf8');
  const lbic=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  assert.ok(spv.indexOf('Selected site')>spv.indexOf('</aside>'));
  assert.ok(lbic.indexOf('Selected pixel')>lbic.indexOf('</aside>'));
});


test('CET and DIT separate overview from selected-point detail and link filter/display quantities',()=>{
  for(const file of ['cet.js','dit.js']){
    const src=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8');
    assert.match(src,/class="plots overview"/);
    assert.match(src,/class="plots detail"/);
    assert.match(src,/linkedSelect:/);
  }
  const cet=fs.readFileSync(require.resolve('../src/modules/cet.js'),'utf8');
  const dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.ok(cet.indexOf("'Selected site'")>cet.indexOf('</aside>')||cet.indexOf("?'Measurement point':'Selected site'")>cet.indexOf('</aside>'));
  assert.ok(dit.indexOf("?'Measurement point':'Selected site'")>dit.indexOf('</aside>'));
  assert.match(cet,/metricKey:'eot'/);
});


test('QSS, Dual QSS and Leakage respect overview/detail semantics',()=>{
  for(const file of ['qss-upcd.js','dual-qss.js','leakage.js']){
    const src=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8');
    assert.match(src,/class="plots overview"/);
    assert.match(src,/class="plots detail"/);
  }
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  const dual=fs.readFileSync(require.resolve('../src/modules/dual-qss.js'),'utf8');
  const leakage=fs.readFileSync(require.resolve('../src/modules/leakage.js'),'utf8');
  assert.match(qss,/linkedSelect:'#qMetric'/);
  assert.ok(qss.indexOf("'Selected site'")>qss.indexOf('</aside>')||qss.indexOf("?'Measurement point':'Selected site'")>qss.indexOf('</aside>'));
  assert.ok(dual.indexOf('<h3>Selected injection point</h3>')>dual.indexOf('</aside>'));
  assert.match(leakage,/Raw leakage readings/);
  assert.match(leakage,/PV\.plot\.canvasFrame\(canvas\)/);
});

test('one-point analyzers suppress population-only plots and use measurement-point wording',()=>{
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  const isc=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8');
  const spv=fs.readFileSync(require.resolve('../src/modules/spv.js'),'utf8');
  assert.match(qss,/onePoint=d\.values\.length===1/);
  assert.match(qss,/onePoint\?'Measurement position':'Wafer map'/);
  assert.match(qss,/onePoint\?'':`<div class="panel chart"><header><b>Distribution/);
  assert.match(isc,/d\.sites\.length===1\?'Measurement position'/);
  assert.match(isc,/d\.sites\.length===1\?'Measurement point':'Selected site'/);
  assert.match(spv,/data\.sites\.length===1\?'Measurement position':'Wafer map'/);
  assert.match(spv,/data\.sites\.length===1\?'':`<div class="panel chart"><header><b>Distribution/);
});

test('QSS smooth rendering is compatible with high-DPI canvas transforms',()=>{
  const qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.doesNotMatch(qss,/createImageData|putImageData/);
  assert.match(qss,/ctx\.fillRect\(px,py,step,step\)/);
});

test('DIT analysis rebuild keeps the displayed map metric and filter metric synchronized',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/const key=metrics\[preferredKey\]\?preferredKey:'Qtot';\r?\n      mapKey=key;/);
  assert.match(src,/linkedSelect:'#ditMapMetric'/);
});

test('LBIC stacked local profiles use a horizontal divider at wide and medium widths',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.lbic-module \.lbic-profile-columns\{[^}]*grid-template-columns:1fr/);
  assert.match(css,/\.lbic-module \.profile-pane\+\.profile-pane\{[^}]*border-left:0;[^}]*border-top:1px solid var\(--border\)/);
});

test('LBIC View uses the same compact stacked-label control language as Valid-data filter',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/lbic.js'),'utf8');
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(src,/class="sidebar-control-grid"/);
  assert.match(src,/class="sidebar-control-toggle"/);
  assert.match(css,/\.sidebar-control-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.sidebar-control-grid label,\.filter-grid label\{[^}]*flex-direction:column/);
  assert.match(css,/\.sidebar-control-grid input,\.sidebar-control-grid select,\.filter-grid input,\.filter-grid select\{[^}]*height:30px/);
});


test('wide desktop equal columns are literal equal tracks, not a narrow-sidebar approximation',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.doesNotMatch(css,/grid-template-columns:minmax\(320px,360px\) minmax\(0,1fr\) minmax\(0,1fr\)/);
});

test('DIT keeps all three local scientific plots visible in the independently scrollable detail pane',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.doesNotMatch(src,/data-dit-view=|data-dit-detail=|detailView=/);
  assert.match(src,/<b>Vcpd–Qc<\/b>/);
  assert.match(src,/<b>Dit–Vsb<\/b>/);
  assert.match(src,/<b>Vsb–Qc<\/b>/);
  assert.match(src,/viewBox="0 0 640 \$\{d\.patternType==='OnePointPattern'\?300:500\}"/);
  assert.match(src,/H=d\.patternType==='OnePointPattern'\?300:500/);
  assert.match(src,/paneScroll=\{/);
  assert.match(src,/detailPane\.scrollTop=paneScroll\.detail/);
  assert.match(css,/\.dit-module>\.overview \.map-stage\{height:500px\}/);
  assert.match(css,/\.dit-module\.dit-one-point>\.overview \.map-stage\{height:300px\}/);
  assert.doesNotMatch(css,/dit-detail-tabs|data-dit-detail/);
});

test('right-side selected-site typography matches the sidebar hierarchy',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid \.side \.panel,\.module-grid>\.plots\.detail>\.panel:not\(\.chart\)\{font-size:11\.5px/);
  assert.match(css,/\.module-grid>\.plots\.detail \.site-controls \.coord\{font-size:10px\}/);
});

test('DIT does not duplicate Follow XML mapping as a persistent status row',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.doesNotMatch(src,/<b>XML:<\/b> UseCocosII/);
  assert.match(src,/Follow XML setting maps UseCocosII=false to Standard COCOS/);
});

test('QSS compact summary keeps all statistics without repeating five labels per metric',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.match(src,/<dl class="meta compact-summary">\$\{summaryCards\(\)\}<\/dl>/);
  assert.match(src,/median \$\{fmt\(st\.median\)\} · range/);
  assert.doesNotMatch(src,/qss-result-values/);
});

test('chart metadata can shrink without pushing Axes or Export controls outside a pane',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.chart-meta\{[^}]*min-width:0;[^}]*overflow:hidden;[^}]*text-overflow:ellipsis;[^}]*white-space:nowrap/);
});


test('Axes and Bins use one full-width natural-flow settings row and remain mutually exclusive',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8'),
    plot=fs.readFileSync(require.resolve('../src/core/plot.js'),'utf8');
  assert.match(plot,/data-axis-toggle=/);
  assert.match(plot,/data-bin-toggle=/);
  assert.match(plot,/data-axis-controls=.* hidden/);
  assert.match(plot,/data-bin-controls=.* hidden/);
  assert.match(plot,/header\.querySelectorAll\('\.axis-popover-card:not\(\[hidden\]\)'\)/);
  assert.match(plot,/if\(peer!==box\)setOpen\(peer,false\)/);
  assert.match(plot,/panel\.hidden=!open/);
  assert.match(plot,/aria-expanded/);
  assert.match(css,/\.axis-popover-card\{[^}]*flex:1 0 100%/);
});

test('selected-point panels use explicit state badges across filter and non-filter families',()=>{
  const ui=fs.readFileSync(require.resolve('../src/core/ui.js'),'utf8');
  assert.match(ui,/function selectionStateFor\(/);
  assert.match(ui,/function selectionStateBadge\(/);
  assert.match(ui,/function selectionStateRow\(/);
  for(const file of ['dit.js','qss-upcd.js','jzero.js','isc.js','lbic.js','cet.js','spv.js']){
    const src=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8');
    assert.match(src,/selectionStateRow\(/,file+' must render a selected-point state badge');
  }
  const leakage=fs.readFileSync(require.resolve('../src/modules/leakage.js'),'utf8');
  assert.match(leakage,/id="leakDataState"/);
  assert.match(leakage,/dataState=availableResults\.length===3\?'AVAILABLE':availableResults\.length\?'PARTIAL':'UNAVAILABLE'/);
  assert.match(leakage,/Available: \$\{availableResults\.join\(', '\)\}/);
  assert.match(ui,/label='Filter quantity'/);
  assert.match(ui,/Outside the current range; local data remains inspectable/);
  for(const file of ['dit.js','qss-upcd.js','jzero.js','isc.js','lbic.js','cet.js','spv.js']){
    const src=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8');
    assert.match(src,/selectionStateRow\([^\n]*metric:/,file+' must name the filter quantity beside its state');
  }
});


test('selection badges are readable and algorithm-invalid is visually distinct',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8'),
    ui=fs.readFileSync(require.resolve('../src/core/ui.js'),'utf8');
  assert.match(css,/\.selection-state\{[^}]*font-size:10\.5px;[^}]*font-weight:650/);
  assert.match(css,/\.selection-state-invalid\{[^}]*var\(--bad\)/);
  assert.match(ui,/invalid=raw==='ALGORITHM INVALID'/);
  assert.match(ui,/tone=invalid\?'invalid'/);
});


test('visual acceptance follow-up improves hierarchy while preserving multi-point equal columns',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8'),
    dit=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8'),
    qss=fs.readFileSync(require.resolve('../src/modules/qss-upcd.js'),'utf8');
  assert.match(css,/:root\{[^}]*--bg:#f4f6f9;[^}]*--panel:#fff/);
  assert.match(css,/\.panel\{[^}]*border-radius:9px;[^}]*padding:10px/);
  assert.match(css,/\.dit-module \.analysis-method-row label\{[^}]*grid-template-columns:1fr;[^}]*align-items:stretch/);
  assert.match(css,/@container \(max-width:520px\)\{\.axis-limit-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\}/);
  assert.match(dit,/dit-one-point/);
  assert.match(qss,/surface:d\.values\.length===1\?'compact':'standard'/);
  assert.match(qss,/qss-one-point/);
});


test('single-point analyzers use a sidebar plus two-column analysis grid while multi-point defaults stay equal-three-column',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid\.single-point-workspace\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,2fr\)/);
  assert.match(css,/\.module-grid\.single-point-workspace>\.side\{[^}]*grid-column:1;[^}]*grid-row:1/);
  assert.match(css,/\.module-grid\.single-point-workspace>\.single-analysis-workspace\{[^}]*grid-column:2;[^}]*grid-row:1/);
  assert.match(css,/\.single-analysis-workspace\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.single-analysis-workspace>\.plots\{display:contents\}/);
  assert.match(css,/\.dit-module\.single-point-workspace \.detail>\.chart:last-of-type,\.dit-module\.single-point-workspace \.detail>details\{grid-column:1\/-1\}/);
  const checks=[
    ['qss-upcd.js',/qss-one-point single-point-workspace/],
    ['jzero.js',/onePoint\?'single-point-workspace'/],
    ['spv.js',/data\.sites\.length===1\?'single-point-workspace'/],
    ['isc.js',/d\.sites\.length===1\?'single-point-workspace'/],
    ['cet.js',/data\.sites\.length===1\?'single-point-workspace'/],
    ['leakage.js',/data\.sites\.length===1\?'single-point-workspace'/],
    ['dit.js',/dit-one-point single-point-workspace/]
  ];
  for(const [file,pattern] of checks){
    const src=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8');
    assert.match(src,pattern,file+' must opt into the single-point workspace only when appropriate');
    assert.match(src,/single-analysis-workspace/,file+' must wrap single-point overview and detail in the shared analysis grid');
  }
});

test('sparse selected-point plots render compact explanatory states instead of empty axes',()=>{
  const isc=fs.readFileSync(require.resolve('../src/modules/isc.js'),'utf8'),
    cet=fs.readFileSync(require.resolve('../src/modules/cet.js'),'utf8'),
    css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(isc,/surface:sparse\?'compact':'standard'/);
  assert.match(isc,/n===1/);
  assert.match(isc,/1 raw reading/);
  assert.match(isc,/rawAxesToggle\.hidden=rawCount<=1/);
  assert.match(cet,/activeValues\.length<=1/);
  assert.match(cet,/distribution not meaningful/);
  assert.match(cet,/points\.length<=1/);
  assert.match(cet,/At least two points are required to display a fitted trend/);
  assert.match(cet,/histAxes\.hidden=activeCount<=1/);
  assert.match(cet,/fitAxes\.hidden=fitCount<=1/);
  assert.match(cet,/histExport\.hidden=activeCount<=1/);
  assert.match(cet,/fitExport\.hidden=fitCount===0/);
  assert.match(css,/\.axis-popover-toggle\[hidden\],\.bin-popover-toggle\[hidden\]\{display:none!important\}/);
  assert.match(css,/\.sparse-stage\{height:168px!important\}/);
});

test('DIT never invents a center marker when spatial coordinates are absent',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.doesNotMatch(src,/coord=s\.coord\|\|\{x:0,y:0\}/);
  assert.doesNotMatch(src,/analysis\.sites\.map\(x=>x\.coord\|\|\{x:0,y:0\}\)/);
  assert.match(src,/finiteCoords=coords\.filter/);
  assert.match(src,/No spatial coordinates/);
  assert.match(src,/if\(!Number\.isFinite\(p\?\.x\)\|\|!Number\.isFinite\(p\?\.y\)\)return/);
  assert.match(src,/coordinateN===0\?'<b>Target geometry<\/b>'/);
});

test('semantic Current dataset values can wrap and scroll panes expose continuation space',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8'),
    dual=fs.readFileSync(require.resolve('../src/modules/dual-qss.js'),'utf8');
  assert.match(css,/\.current-dataset-panel \.validation b\.validation-text\{[^}]*white-space:normal;[^}]*overflow:visible;[^}]*text-overflow:clip/);
  assert.match(dual,/class="validation-text" title="\$\{esc\(d\.rangeClass\)\}"/);
  assert.match(css,/\.module-grid>\.side,\.module-grid>\.plots\{[^}]*padding-bottom:16px;[^}]*box-shadow:inset/);
});
