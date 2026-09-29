const {spawnSync}=require('node:child_process');

const requireData=process.argv[2]==='--require-data';
const scriptIndex=requireData?3:2;
const script=process.argv[scriptIndex],args=process.argv.slice(scriptIndex+1);
if(!script){
  console.error('Usage: node scripts/run_python.js [--require-data] <script.py> [args...]');
  process.exit(2);
}

const candidates=process.platform==='win32'
  ? [['py',['-3']],['python',[]],['python3',[]]]
  : [['python3',[]],['python',[]]];

let last=null;
for(const [cmd,prefix] of candidates){
  const r=spawnSync(cmd,[...prefix,script,...args],{encoding:'utf8'});
  if(r.error&&r.error.code==='ENOENT'){last=r.error;continue}
  if(r.stdout)process.stdout.write(r.stdout);
  if(r.stderr)process.stderr.write(r.stderr);
  if(r.status===0){
    const output=(r.stdout||'')+'\n'+(r.stderr||'');
    if(requireData&&/\bSKIP\b/.test(output)&&!/\bPASS\b/.test(output)){
      console.error('Required private-reference validation did not run: validator reported SKIP without any PASS.');
      process.exit(3);
    }
    process.exit(0);
  }
  // Windows Store python aliases can exist but fail without running Python.
  if(process.platform==='win32'&&cmd==='python'){
    last=new Error('python command failed; trying next interpreter');
    continue;
  }
  process.exit(Number.isInteger(r.status)?r.status:1);
}
console.error('No usable Python interpreter found.',last?.message||'');
process.exit(127);
