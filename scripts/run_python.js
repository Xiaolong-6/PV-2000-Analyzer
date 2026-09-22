const {spawnSync}=require('node:child_process');

const script=process.argv[2],args=process.argv.slice(3);
if(!script){console.error('Usage: node scripts/run_python.js <script.py> [args...]');process.exit(2)}

const candidates=process.platform==='win32'
  ? [['py',['-3']],['python',[]],['python3',[]]]
  : [['python3',[]],['python',[]]];

let last=null;
for(const [cmd,prefix] of candidates){
  const r=spawnSync(cmd,[...prefix,script,...args],{stdio:'inherit'});
  if(r.error&&r.error.code==='ENOENT'){last=r.error;continue}
  if(r.status===0)process.exit(0);
  // Windows Store python aliases can exist but fail without running Python.
  if(process.platform==='win32'&&cmd==='python'){last=new Error('python command failed; trying next interpreter');continue}
  process.exit(Number.isInteger(r.status)?r.status:1);
}
console.error('No usable Python interpreter found.',last?.message||'');
process.exit(127);
