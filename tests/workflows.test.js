const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('PR previews publish only validated same-repository CI artifacts',()=>{
  const src=fs.readFileSync(require.resolve('../.github/workflows/pr-preview.yml'),'utf8');
  assert.match(src,/workflow_run:/);
  assert.match(src,/conclusion == 'success'/);
  assert.match(src,/head_repository\.full_name == github\.repository/);
  assert.match(src,/gh run download/);
  assert.match(src,/gh release create/);
  assert.match(src,/--prerelease/);
  assert.match(src,/preview\/pr-\$\{PR_NUMBER\}\//);
  assert.match(src,/gh workflow run pages\.yml --ref main/);
});

test('Pages deployment preserves PR previews while refreshing main',()=>{
  const src=fs.readFileSync(require.resolve('../.github/workflows/pages.yml'),'utf8');
  assert.match(src,/PREVIEW_STORE_BRANCH: pages-store/);
  assert.match(src,/! -name 'preview'/);
  assert.match(src,/ref: pages-store/);
  assert.match(src,/actions\/upload-pages-artifact@v4/);
  assert.match(src,/actions\/deploy-pages@v4/);
});
