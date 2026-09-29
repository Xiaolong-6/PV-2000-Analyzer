const test=require('node:test'),assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/selection.js');

test('selection availability falls back to finite values when per-site state is missing',()=>{
  const metrics={
      value:{
        values:[1,2,NaN,4,5],
        availability:[
          {available:true},
          {},
          null,
          {available:false},
          {available:null}
        ]
      }
    },
    selection=PV2000.selection.evaluate({
      metrics,
      siteCount:5,
      filter:{metricKey:'value',lower:0,upper:10}
    });

  assert.deepEqual(selection.supportMask,[true,true,false,false,true]);
  assert.deepEqual(selection.activeMask,[true,true,false,false,true]);
});

test('selection uses finite-value availability when no availability array is provided',()=>{
  const metrics={value:{values:[1,NaN,3]}},
    selection=PV2000.selection.evaluate({
      metrics,
      siteCount:3,
      filter:{metricKey:'value'}
    });

  assert.deepEqual(selection.supportMask,[true,false,true]);
});

test('evaluate and createFilter apply normalize reversed bounds identically',()=>{
  const metrics={value:{values:[1,2,3,4]}},
    direct=PV2000.selection.evaluate({
      metrics,
      siteCount:4,
      filter:{metricKey:'value',lower:3,upper:1}
    }),
    controller=PV2000.selection.createFilter({
      metrics,
      siteCount:4,
      metricKey:'value'
    }).apply(3,1);

  assert.deepEqual(direct.filter,{metricKey:'value',lower:1,upper:3});
  assert.deepEqual(controller.selection.filter,direct.filter);
  assert.deepEqual(controller.selection.activeMask,[true,true,true,false]);
});

test('selection still rejects misaligned availability arrays',()=>{
  assert.throws(
    ()=>PV2000.selection.evaluate({
      metrics:{value:{values:[1,2],availability:[{available:true}]}},
      siteCount:2,
      filter:{metricKey:'value'}
    }),
    /availability is not aligned/
  );
});
