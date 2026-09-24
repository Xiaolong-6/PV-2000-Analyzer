const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const roots=[
  ...fs.readdirSync(root).filter(name=>name.endsWith('.md')).map(name=>path.join(root,name)),
  ...['docs','wiki','reference_data'].flatMap(dir=>{
    const full=path.join(root,dir);
    if(!fs.existsSync(full))return[];
    return fs.readdirSync(full).filter(name=>name.endsWith('.md')).map(name=>path.join(full,name));
  })
];

const failures=[];
const linkRe=/!?\[[^\]]*\]\(([^)]+)\)/g;

function normalizeTarget(source,raw){
  let target=raw.trim();
  if(!target||target.startsWith('#')||/^[a-z]+:/i.test(target))return null;
  if(target.startsWith('<')&&target.endsWith('>'))target=target.slice(1,-1);
  target=target.split('#')[0].split('?')[0];
  if(!target)return null;
  try{target=decodeURIComponent(target)}catch{}
  const sourceDir=path.dirname(source);
  let resolved=path.resolve(sourceDir,target);
  if(fs.existsSync(resolved))return resolved;
  if(source.includes(path.sep+'wiki'+path.sep) && !path.extname(target)){
    resolved=path.resolve(sourceDir,target+'.md');
    if(fs.existsSync(resolved))return resolved;
  }
  return false;
}

for(const file of roots){
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(linkRe)){
    const result=normalizeTarget(file,match[1]);
    if(result===false){
      failures.push(path.relative(root,file)+': '+match[1]);
    }
  }
}

const requiredWikiPages=[
  'Home.md','Getting-Started.md','Using-the-Analyzer.md','Measurement-Families.md',
  'DIT.md','QSS-uPCD.md','Dual-QSS.md','Emitter-J0.md','ISC-and-VCPD.md',
  'CV-and-CET.md','LBIC.md','SPV.md','Leakage.md','Scientific-Foundations.md',
  'Validation-and-Reference-Profiles.md','_Sidebar.md'
];
for(const name of requiredWikiPages){
  if(!fs.existsSync(path.join(root,'wiki',name)))failures.push('missing Wiki page: wiki/'+name);
}

if(failures.length){
  console.error('Documentation check failed:');
  for(const failure of failures)console.error(' - '+failure);
  process.exit(1);
}
console.log('Documentation links/page inventory OK ('+roots.length+' Markdown files).');
