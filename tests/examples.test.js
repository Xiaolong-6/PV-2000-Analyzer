const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DOMParser}=require('@xmldom/xmldom');

global.PV2000={};
require('../src/core/stats.js');
require('../src/core/xml.js');
require('../src/core/geometry.js');
require('../src/core/validity.js');
require('../src/core/quantity.js');
require('../src/core/selection.js');
require('../src/core/measurement.js');
require('../src/core/profiles.js');
require('../src/core/registry.js');
require('../src/profiles/geometry.js');
require('../src/profiles/isc.js');
require('../src/profiles/vcpd.js');
require('../src/profiles/cet.js');
require('../src/profiles/leakage.js');
require('../src/profiles/spv.js');
PV2000.ui={escapeHtml:String,help(){return''},cssVar(){return''},metaRow(){return''},selectionStateRow(){return''}};
PV2000.plot={};
PV2000.exporter={csv(){}};
require('../src/modules/dit.js');
require('../src/modules/qss-upcd.js');
require('../src/modules/dual-qss.js');
require('../src/modules/jzero.js');
require('../src/modules/isc.js');
require('../src/modules/lbic.js');
require('../src/modules/cet.js');
require('../src/modules/leakage.js');
require('../src/modules/spv.js');

const cases=[
  ['dit-cocos.xml','DITMeasurement'],
  ['qss-upcd.xml','QssUpcdMeasurement'],
  ['qss-injection.xml','DualQssMeasurement'],
  ['emitter-j0.xml','JZeroMeasurement'],
  ['isc-vcpd.xml','VcpdMeasurement'],
  ['cet-eot.xml','CETMeasurement'],
  ['lbic.xml','LBICMeasurement'],
  ['spv-dl.xml','SPVMeasurement'],
  ['leakage.xml','LeakageMeasurement']
];

function parsedExample(fileName){
  const xml=fs.readFileSync(path.join(__dirname,'..','examples',fileName),'utf8');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  const job=doc.documentElement,measurement=PV2000.xml.direct(job,'Measurement');
  return {
    xml,
    parsed:{doc,job,measurement,type:PV2000.xml.attrType(measurement)}
  };
}

test('all landing examples are explicitly sanitized and use the intended measurement type',()=>{
  for(const [fileName,type] of cases){
    const {xml,parsed}=parsedExample(fileName);
    assert.match(xml,/Built-in (?:sanitized|synthetic).*demo/i);
    assert.match(xml,/Demonstration only; not validation evidence/i);
    assert.equal(parsed.type,type,fileName);
    assert.doesNotMatch(xml,/(Yameng|MarkoY|markoy|Alex_AlN|Hannu|Toni|Paivikki|Guillaume|PB10B|NC6B|QM129|SC_meas|STech|ES552|CSUN)/i,fileName);
    assert.doesNotMatch(xml,/<(?:StartTime|EndTime)>201[3-7]-/,fileName);
  }
});

test('all landing examples pass the real dedicated parser and analyzer',()=>{
  for(const [fileName] of cases){
    const {parsed}=parsedExample(fileName);
    const mod=PV2000.registry.resolve(parsed.type);
    assert.notEqual(mod,PV2000.modules?.generic,fileName);
    const data=mod.parse(parsed);
    const analysis=mod.analyze(data);
    assert.ok(data,fileName);
    assert.ok(analysis,fileName);
    if(parsed.type==='DITMeasurement')assert.equal(analysis.sites[0]?.valid,true,'DIT example must be algorithm-valid');
    if(parsed.type==='DualQssMeasurement')assert.equal(analysis.vendorResult?.available,true,'Dual QSS example must expose a finite vendor-compatible result table');
    if(parsed.type==='QssUpcdMeasurement'){
      assert.ok(analysis.metrics.lifetime.values.filter(Number.isFinite).length>=25,'QSS example must contain a useful finite lifetime population');
    }
    if(parsed.type==='JZeroMeasurement'){
      const j0=analysis.metrics.j0.values;
      assert.ok(j0.length>=5&&j0.every(value=>Number.isFinite(value)&&value>0),'JZero example must expose positive finite Basore J0');
    }
    if(parsed.type==='VcpdMeasurement'){
      const v=analysis.metrics.dark.values[0];
      assert.ok(Number.isFinite(v)&&v>0&&v<2,'VCPD example must have a plausible finite contact potential');
    }
    if(parsed.type==='CETMeasurement'){
      assert.ok(analysis.metrics.eot.values.some(value=>Number.isFinite(value)&&value>0),'CET example must expose finite positive EOT');
      assert.ok(analysis.metrics.r2.values.some(value=>Number.isFinite(value)&&value>.95),'CET example must expose a meaningful fit');
    }
    if(parsed.type==='SPVMeasurement'){
      assert.ok(Number.isFinite(analysis.metrics.dl.values[0])&&analysis.metrics.dl.values[0]>0,'SPV example must expose finite positive DL');
      assert.ok(Number.isFinite(analysis.metrics.tau.values[0])&&analysis.metrics.tau.values[0]>0,'SPV example must expose finite positive lifetime');
    }
    if(parsed.type==='LeakageMeasurement'){
      assert.ok(Number.isFinite(analysis.metrics.positive.values[0]),'Leakage example must expose finite VSASS+');
      assert.ok(Number.isFinite(analysis.metrics.negative.values[0]),'Leakage example must expose finite VSASS-');
      assert.ok(Number.isFinite(analysis.metrics.li.values[0]),'Leakage example must expose finite LI');
    }
  }
});

test('QSS Injection demo has a synthetic completed sweep payload',()=>{
  const {parsed}=parsedExample('qss-injection.xml');
  const data=PV2000.modules.dualQss.parse(parsed);
  assert.ok(data.points.length>=10);
  assert.equal(data.points.length,data.intensity.length);
  assert.ok(data.points.every(point=>Number.isFinite(point.lifetime)));
});
