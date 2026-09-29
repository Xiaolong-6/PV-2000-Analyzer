const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('generated dist output is ignored instead of tracked as source',()=>{
  const ignore=fs.readFileSync(require.resolve('../.gitignore'),'utf8');
  assert.match(ignore,/^dist\/$/m);
});

test('repository exposes lint and source-density quality gates',()=>{
  const pkg=JSON.parse(fs.readFileSync(require.resolve('../package.json'),'utf8'));
  assert.equal(pkg.scripts.lint,'eslint src scripts tests');
  assert.equal(pkg.scripts['style:check'],'node scripts/check-source-density.js');
  assert.match(pkg.scripts.check,/npm run lint/);
  assert.match(pkg.scripts.check,/npm run style:check/);
  assert.match(pkg.scripts.check,/npm test/);
});
