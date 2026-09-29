const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('canonical version uses date/ordinal scheme and package.json does not reintroduce SemVer',()=>{
  const version=fs.readFileSync(require.resolve('../VERSION'),'utf8').trim();
  const pkg=JSON.parse(fs.readFileSync(require.resolve('../package.json'),'utf8'));
  assert.match(version,/^v\d{8}\.\d+(?:\.\d+)?$/);
  assert.equal(Object.prototype.hasOwnProperty.call(pkg,'version'),false);
});

test('agent instructions preserve branch and merge version semantics',()=>{
  const agents=fs.readFileSync(require.resolve('../AGENTS.md'),'utf8');
  assert.match(agents,/vYYYYMMDD\.N/);
  assert.match(agents,/\.52\.2/);
  assert.match(agents,/\.55/);
  assert.match(agents,/\.56/);
  assert.match(agents,/Prefer squash merges/);
});
