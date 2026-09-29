const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('XML loading commits the new dataset only after its renderer succeeds',()=>{
  const src=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),
    start=src.indexOf('async function openFile'),
    end=src.indexOf('function bindInput',start),
    block=src.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.ok(block.indexOf("mod.render($('#moduleHost'),data,analysis,{file})")<block.indexOf('current=next'));
  assert.match(block,/previousFolderFiles=folderFiles\.slice\(\)/);
  assert.match(block,/folderFiles=previousFolderFiles/);
  assert.match(block,/folderIndex=previousFolderIndex/);
  assert.match(block,/restoreSnapshot\(previous\)/);
  assert.match(block,/return true/);
  assert.match(block,/return false/);
});

test('adjacent XML navigation advances only after openFile reports success',()=>{
  const src=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),
    start=src.indexOf('async function navigateReady'),
    end=src.indexOf('async function authorizeFolder',start),
    block=src.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(block,/ok=await openFile\(file,\{keepFolder:true\}\)/);
  assert.match(block,/if\(!ok\)return;/);
  assert.ok(block.indexOf('if(!ok)return;')<block.indexOf('folderIndex=target'));
  assert.doesNotMatch(block,/folderIndex=target;\s*await openFile/);
});
