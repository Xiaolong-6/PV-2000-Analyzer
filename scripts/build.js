const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const files=[
  'src/core/stats.js',
  'src/core/xml.js',
  'src/core/geometry.js',
  'src/core/validity.js',
  'src/core/quantity.js',
  'src/core/selection.js',
  'src/core/measurement.js',
  'src/core/profiles.js',
  'src/core/export.js',
  'src/core/theme.js',
  'src/core/ui.js',
  'src/core/plot.js',
  'src/core/registry.js',
  'src/profiles/isc.js',
  'src/profiles/vcpd.js',
  'src/profiles/cet.js',
  'src/modules/dit.js',
  'src/modules/qss-upcd.js',
  'src/modules/dual-qss.js',
  'src/modules/jzero.js',
  'src/modules/isc.js',
  'src/modules/lbic.js',
  'src/modules/cet.js',
  'src/modules/generic.js',
  'src/app.js'
];

const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const js=files.map(file=>`// ${file}\n${fs.readFileSync(path.join(root,file),'utf8')}`).join('\n');

const rawSha=String(process.env.PV2000_BUILD_SHA||process.env.GITHUB_SHA||'local').trim();
const fullSha=/^[0-9a-f]{7,40}$/i.test(rawSha)?rawSha:'local';
const shortSha=fullSha==='local'?'local':fullSha.slice(0,7);
const commitUrl=fullSha==='local'
  ?'https://github.com/Xiaolong-6/PV-2000-Analyzer/commits/main'
  :`https://github.com/Xiaolong-6/PV-2000-Analyzer/commit/${fullSha}`;

const html=template
  .replace('/*__CSS__*/',css)
  .replace('/*__JS__*/',js)
  .replaceAll('__BUILD_COMMIT_SHORT__',shortSha)
  .replaceAll('__BUILD_COMMIT_FULL__',fullSha)
  .replaceAll('__BUILD_COMMIT_URL__',commitUrl);

fs.mkdirSync(path.join(root,'dist'),{recursive:true});
const outputs=['index.html','PV-2000-Analyzer.html'];
for(const output of outputs) fs.writeFileSync(path.join(root,'dist',output),html);
console.log(`Built ${outputs.map(output=>`dist/${output}`).join(', ')} [${shortSha}]`);
