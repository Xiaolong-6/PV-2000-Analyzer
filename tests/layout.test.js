const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('desktop/multicolumn sidebar has its own viewport scroll container',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid>\.side\{[^}]*position:sticky[^}]*height:calc\(100dvh - 66px\)[^}]*overflow-y:auto/);
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
