const test=require('node:test'),assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/registry.js');
PV2000.xml={
  common:parsed=>({type:parsed.type,resultName:'Unknown result',name:'Recipe',substrateId:'S1',status:'Completed'}),
  children:e=>e?.children||[],
  lname:e=>e?.localName||e?.nodeName||''
};
require('../src/modules/generic.js');

test('unknown measurement type resolves to Generic Inspector fallback',()=>{
  const mod=PV2000.registry.resolve('FutureMeasurementType');
  assert.ok(mod);
  assert.equal(mod.fallback,true);
  const parsed={type:'FutureMeasurementType',measurement:{children:[]}};
  const data=mod.parse(parsed);
  assert.equal(data.type,'FutureMeasurementType');
  assert.equal(mod.analyze(data),data);
});
