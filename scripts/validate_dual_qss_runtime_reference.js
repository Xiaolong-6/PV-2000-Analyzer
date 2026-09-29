const fs=require('fs');
const path=require('path');

global.PV2000={
  xml:{},stats:{},geometry:{},ui:{},plot:{},exporter:{},
  registry:{register(){}}
};
require('../src/modules/dual-qss.js');
const D=PV2000.modules.dualQss;

const ABS_TOL=2e-8;
const REL_TOL=3e-12;

function tag(text,name,def=''){
  const m=text.match(new RegExp('<'+name+'>([\\s\\S]*?)<\\/'+name+'>'));
  return m?m[1].trim():def;
}
function numTag(text,name,def=NaN){
  const v=Number(tag(text,name,''));
  return Number.isFinite(v)?v:def;
}
function boolTag(text,name){return tag(text,name,'').toLowerCase()==='true'}
function attr(attrs,name,def=NaN){
  const m=attrs.match(new RegExp('\\b'+name+'="([^"]*)"'));
  if(!m)return def;
  const v=Number(m[1]);
  return Number.isFinite(v)?v:def;
}
function typeAttr(text,element){
  const m=text.match(new RegExp('<'+element+'\\b[^>]*\\b(?:xsi:)?type="([^"]+)"'));
  return m?m[1].split(':').pop():'';
}
function rangeTag(text,name,lo,hi){
  const block=tag(text,name,'');
  return{min:numTag(block,'Min',lo),max:numTag(block,'Max',hi)};
}
function vectors(text,name){
  const block=tag(text,name,'');
  const wrapped=[...block.matchAll(/<([A-Za-z_][\w.:-]*)[^>]*>([\s\S]*?)<\/\1>/g)]
    .filter(row=>/<double>/.test(row[2]))
    .map(row=>[...row[2].matchAll(/<double>([^<]+)<\/double>/g)].map(m=>Number(m[1])));
  if(wrapped.length)return wrapped;
  const direct=[...block.matchAll(/<double>([^<]+)<\/double>/g)].map(m=>Number(m[1]));
  return direct.length?[direct]:[];
}
function vector(text,name){return vectors(text,name)[0]||[]}
function effectiveLifetime(rows,pointAveraging){
  if(!rows.length)return[];
  if(!pointAveraging||rows.length===1)return rows[0].slice();
  return rows[0].map((_,i)=>{
    const column=rows.map(row=>Number(row[i]));
    return column.every(Number.isFinite)?column.reduce((sum,v)=>sum+v,0)/column.length:NaN;
  });
}
function fixedPointCount(text){
  if(typeAttr(text,'Pattern')!=='FixedPointsPattern')return NaN;
  const block=tag(text,'PointValues','');
  return [...block.matchAll(/<(?:SDI\.Math\.)?Point\b/g)].length;
}
function transientRows(text){
  const out=[];
  const re=/<TransientInfo\b([^>]*)>([\s\S]*?)<\/TransientInfo>/g;
  for(const m of text.matchAll(re)){
    const attrs=m[1],body=m[2],holder=tag(body,'Transient','');
    const points=[...holder.matchAll(/<SmallPoint\b([^>]*)\/?>(?:<\/SmallPoint>)?/g)]
      .map(p=>({x:attr(p[1],'X'),y:attr(p[1],'Y')}))
      .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    out.push({amplitude:attr(attrs,'Amplitude'),lifetime:attr(attrs,'LifeTime'),points});
  }
  return out;
}
function parseCase(xmlPath){
  const text=fs.readFileSync(xmlPath,'utf8'),
    intensity=vector(text,'Intensity'),
    lifetimeVectors=vectors(text,'Values'),
    pointAveraging=boolTag(text,'DoPointAveraging'),
    values=effectiveLifetime(lifetimeVectors,pointAveraging),
    transients=transientRows(text);
  return{
    patternType:typeAttr(text,'Pattern'),
    fixedPointCount:fixedPointCount(text),
    targetType:typeAttr(text,'Target'),
    doPointAveraging:String(pointAveraging),
    pointAverageCount:numTag(text,'PointAverageCount'),
    probe:tag(text,'ProbeSelection',''),
    bias:tag(text,'QssBiasSelection',''),
    waferThickness:numTag(text,'WaferThickness'),
    opticalFactor:numTag(text,'OpticalFactor'),
    doping:numTag(text,'Doping'),
    dopingType:tag(text,'DopingType',''),
    temperatureC:numTag(text,'ChuckTemperature',27),
    validQdcRange:rangeTag(text,'ValidQdcRange',.9,1.1),
    jZeroIntensity:rangeTag(text,'JZeroIntensity',1,5),
    calculateJ0:String(boolTag(text,'CalculateJZeroParams')),
    includeKsJ0:String(boolTag(text,'IncludeKSJ0')),
    augerCorrection:String(boolTag(text,'UseAugerCorrection')),
    defaultDeltaN:numTag(text,'DefaultDeltaN'),
    defaultDeltaNRange:numTag(text,'DefaultDeltaNRangeInPercentage'),
    points:intensity.map((x,i)=>({
      intensityMilli:x,
      lifetime:values[i],
      lifetimeFirst:lifetimeVectors[0]?.[i],
      lifetimeRepeats:lifetimeVectors.map(row=>row[i]),
      transient:transients[i]||null
    }))
  };
}
function norm(s){
  return String(s||'').replaceAll('μ','u').replaceAll('µ','u').replaceAll('Δ','delta').toLowerCase().trim();
}
function csvNumber(s){
  const t=String(s||'').trim();
  if(!t||/^ud\.?$/i.test(t)||/^nan$/i.test(t))return NaN;
  return Number(t);
}
function vendorResult(csvPath){
  const lines=fs.readFileSync(csvPath,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/),
    hi=lines.findIndex(line=>norm(line).startsWith('point.x[mm]'));
  if(hi<0)throw new Error(csvPath+': point result header missing');
  const delimiter=(lines[hi].match(/;/g)||[]).length>(lines[hi].match(/,/g)||[]).length?';':',',
    header=lines[hi].split(delimiter),
    row=lines.slice(hi+1).find(line=>line.trim())?.split(delimiter)||[],
    names=header.map(norm);
  const value=fn=>{const i=names.findIndex(fn);return i>=0?csvNumber(row[i]):NaN};
  return{
    teffD:value(s=>s.startsWith('teff.d')&&s.includes('1 sun')),
    teffSS:value(s=>s.startsWith('teff.ss')&&s.includes('1 sun')&&!s.includes('max')),
    teffSSMax:value(s=>s.startsWith('teff.ss max')),
    basoreJ0:value(s=>s.startsWith('basore')),
    dn:value(s=>s.startsWith('deltan')),
    smax:value(s=>s.startsWith('smax')&&s.includes('1 sun')),
    smaxMax:value(s=>s.startsWith('smax')&&!s.includes('1 sun')),
    voc:value(s=>s.startsWith('implied voc')),
    ksJ0:value(s=>s.startsWith('k-s'))
  };
}
function close(calc,expected){
  if(!Number.isFinite(expected))return !Number.isFinite(calc)||calc===0;
  return Number.isFinite(calc)&&Math.abs(calc-expected)<=Math.max(ABS_TOL,REL_TOL*Math.abs(expected));
}
function scalar(result,key){
  const item=result[key];
  return item?.available?item.value:NaN;
}
function casePaths(arg){
  const stat=fs.statSync(arg);
  return stat.isDirectory()
    ?{xml:path.join(arg,'result.xml'),csv:path.join(arg,'result.csv')}
    :{xml:arg,csv:arg.replace(/\.xml$/i,'.csv')};
}

const args=process.argv.slice(2);
if(!args.length){
  console.log('Dual QSS runtime-result validator: SKIP (provide paired case directories or XML paths)');
  process.exit(0);
}
let failed=false;
for(const arg of args){
  const files=casePaths(arg),data=parseCase(files.xml),result=D.pairedDualResults(data),vendor=vendorResult(files.csv);
  if(!result.available){
    console.error('FAIL '+path.basename(path.dirname(files.xml))+': result unavailable: '+result.rule);
    failed=true;
    continue;
  }
  const keys=['teffD','teffSS','teffSSMax','basoreJ0','dn','smax','smaxMax','voc','ksJ0'];
  const messages=[];
  for(const key of keys){
    const calc=scalar(result,key),expected=vendor[key],ok=close(calc,expected);
    if(!ok)failed=true;
    messages.push(key+'='+(Number.isFinite(calc)?calc.toPrecision(15):'Ud.')+
      ' vendor='+(Number.isFinite(expected)?expected.toPrecision(15):'Ud.')+
      ' '+(ok?'PASS':'FAIL'));
  }
  console.log('DUAL-QSS RUNTIME RESULT '+(failed?'CHECK':'PASS')+' '+path.basename(path.dirname(files.xml)));
  for(const message of messages)console.log('  '+message);
}
if(failed)process.exitCode=1;
