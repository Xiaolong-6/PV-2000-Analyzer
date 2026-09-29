const fs=require('fs');
const path=require('path');

const repoRoot=path.resolve(__dirname,'..');
const srcRoot=path.join(repoRoot,'src');
const files=[];

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.isFile()&&entry.name.endsWith('.js'))files.push(full);
  }
}

walk(srcRoot);
const failures=[];
for(const file of files){
  const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
  lines.forEach((line,index)=>{
    const trimmed=line.trimStart();
    const semicolons=(line.match(/;/g)||[]).length;
    const standaloneMarkup=trimmed.startsWith('<');
    const denseStatement=line.length>300&&semicolons>=3&&!standaloneMarkup&&!line.includes('`');
    const denseFunction=line.length>500&&/\bfunction\s+[A-Za-z_$]/.test(line);
    const denseTemplate=line.length>1200&&!standaloneMarkup&&line.includes('`');
    const denseMarkup=standaloneMarkup&&line.length>1200;
    if(denseStatement||denseFunction||denseTemplate||denseMarkup){
      failures.push(path.relative(repoRoot,file)+':'+(index+1)+' ('+line.length+' chars, '+semicolons+' semicolons)');
    }
  });
}

if(failures.length){
  console.error('Dense source lines detected. Split executable statements or oversized single-line templates before committing:');
  failures.forEach(item=>console.error('  - '+item));
  process.exitCode=1;
}else{
  console.log('Source-density check passed for '+files.length+' JavaScript files.');
}
