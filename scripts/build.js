const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const files=['src/core/stats.js','src/core/xml.js','src/core/geometry.js','src/core/export.js','src/core/theme.js','src/core/registry.js','src/modules/dit.js','src/modules/qss-upcd.js','src/modules/lbic.js','src/modules/generic.js','src/app.js'];
const tpl=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8'),css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8'),js=files.map(f=>`// ${f}\n${fs.readFileSync(path.join(root,f),'utf8')}`).join('\n');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist/index.html'),tpl.replace('/*__CSS__*/',css).replace('/*__JS__*/',js));console.log('Built dist/index.html');
