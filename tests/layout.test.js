const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('desktop/multicolumn sidebar has its own viewport scroll container',()=>{
  const css=fs.readFileSync(require.resolve('../src/styles.css'),'utf8');
  assert.match(css,/\.module-grid>\.side\{[^}]*position:sticky[^}]*height:calc\(100dvh - 66px\)[^}]*overflow-y:auto/);
  assert.doesNotMatch(css,/@media\(max-width:900px\)\{\.module-grid>\.side\{position:static/);
  assert.match(css,/@media\(max-width:700px\),\(orientation:portrait\) and \(max-width:950px\)\{\.module-grid>\.side\{position:static/);
});

test('single-file build includes LBIC before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const lbic=build.indexOf("'src/modules/lbic.js'");
  const generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(lbic>=0);
  assert.ok(generic>lbic);
});
