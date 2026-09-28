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

test('Pages and PR preview writers serialize access to pages-store without cancelling each other',()=>{
  const pages=fs.readFileSync(require.resolve('../.github/workflows/pages.yml'),'utf8'),
    preview=fs.readFileSync(require.resolve('../.github/workflows/pr-preview.yml'),'utf8');
  for(const src of [pages,preview]){
    assert.match(src,/group: pages-store-writer/);
    assert.match(src,/cancel-in-progress: false/);
  }
  assert.match(pages,/PREVIEW_STORE_BRANCH: pages-store/);
  assert.match(pages,/! -name 'preview'/);
  assert.match(pages,/ref: pages-store/);
  assert.match(pages,/actions\/upload-pages-artifact@v4/);
  assert.match(pages,/actions\/deploy-pages@v4/);
});
