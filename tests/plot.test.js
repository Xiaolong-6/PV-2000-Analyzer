const test=require('node:test'),assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/plot.js');
const P=PV2000.plot;

test('linear and logarithmic zoom ranges stay anchored around the cursor fraction',()=>{
  const linear=P.zoomRange([0,100],0.5,0.25,false);
  assert.deepEqual(linear,[12.5,62.5]);
  const log=P.zoomRange([1,100],0.5,0.5,true);
  assert.ok(Math.abs(log[0]-Math.sqrt(10))<1e-12);
  assert.ok(Math.abs(log[1]-10*Math.sqrt(10))<1e-11);
});

function fakeElement(){
  return {
    dataset:{},style:{},
    getBoundingClientRect(){return{left:0,top:0,width:100,height:100}}
  };
}

test('wheel inside plot zooms both axes, axis hover zooms one axis, and double click resets',()=>{
  const el=fakeElement(),events=[],resets=[];
  P.bind(el,{W:100,H:100,plotRect:{x0:20,x1:90,y0:10,y1:80},ranges:{x:[0,10],y:[0,20]},onChange:(n,mode)=>events.push({n,mode}),onReset:()=>resets.push(true)});
  let prevented=false;
  el.onwheel({clientX:50,clientY:50,deltaY:-1,preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(events.at(-1).mode,'both');
  assert.notDeepEqual(events.at(-1).n.x,[0,10]);
  assert.notDeepEqual(events.at(-1).n.y,[0,20]);

  el.onwheel({clientX:50,clientY:90,deltaY:-1,preventDefault(){}});
  assert.equal(events.at(-1).mode,'x');
  assert.notDeepEqual(events.at(-1).n.x,[0,10]);
  assert.deepEqual(events.at(-1).n.y,[0,20]);

  el.onwheel({clientX:10,clientY:40,deltaY:-1,preventDefault(){}});
  assert.equal(events.at(-1).mode,'y');
  assert.deepEqual(events.at(-1).n.x,[0,10]);
  assert.notDeepEqual(events.at(-1).n.y,[0,20]);

  el.ondblclick({preventDefault(){}});
  assert.equal(resets.length,1);
});

test('downward-Y maps anchor vertical zoom in screen-down direction',()=>{
  const el=fakeElement(),events=[];
  P.bind(el,{W:100,H:100,plotRect:{x0:20,x1:90,y0:10,y1:80},ranges:{x:[0,10],y:[0,100]},yDown:true,onChange:n=>events.push(n)});
  el.onwheel({clientX:10,clientY:20,deltaY:-1,preventDefault(){}});
  const next=events.at(-1).y;
  assert.ok(next[0] < 10);
  assert.ok(next[1] < 100);
});
