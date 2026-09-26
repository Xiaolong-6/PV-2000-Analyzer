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

test('plain wheel scroll is left to the pane; Ctrl/Cmd+wheel zooms plots and double click resets',()=>{
  const el=fakeElement(),events=[],resets=[];
  P.bind(el,{W:100,H:100,plotRect:{x0:20,x1:90,y0:10,y1:80},ranges:{x:[0,10],y:[0,20]},onChange:(n,mode)=>events.push({n,mode}),onReset:()=>resets.push(true)});
  let prevented=false;
  el.onwheel({clientX:50,clientY:50,deltaY:-1,ctrlKey:false,metaKey:false,preventDefault(){prevented=true}});
  assert.equal(prevented,false);
  assert.equal(events.length,0);

  el.onwheel({clientX:50,clientY:50,deltaY:-1,ctrlKey:true,metaKey:false,preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(events.at(-1).mode,'both');
  assert.notDeepEqual(events.at(-1).n.x,[0,10]);
  assert.notDeepEqual(events.at(-1).n.y,[0,20]);

  el.onwheel({clientX:50,clientY:90,deltaY:-1,ctrlKey:false,metaKey:true,preventDefault(){}});
  assert.equal(events.at(-1).mode,'x');
  assert.notDeepEqual(events.at(-1).n.x,[0,10]);
  assert.deepEqual(events.at(-1).n.y,[0,20]);

  el.onwheel({clientX:10,clientY:40,deltaY:-1,ctrlKey:true,metaKey:false,preventDefault(){}});
  assert.equal(events.at(-1).mode,'y');
  assert.deepEqual(events.at(-1).n.x,[0,10]);
  assert.notDeepEqual(events.at(-1).n.y,[0,20]);

  el.ondblclick({preventDefault(){}});
  assert.equal(resets.length,1);
});

test('downward-Y maps anchor vertical zoom in screen-down direction',()=>{
  const el=fakeElement(),events=[];
  P.bind(el,{W:100,H:100,plotRect:{x0:20,x1:90,y0:10,y1:80},ranges:{x:[0,10],y:[0,100]},yDown:true,onChange:n=>events.push(n)});
  el.onwheel({clientX:10,clientY:20,deltaY:-1,ctrlKey:true,metaKey:false,preventDefault(){}});
  const next=events.at(-1).y;
  assert.ok(next[0] < 10);
  assert.ok(next[1] < 100);
});


test('equal-aspect auto ranges expand only the constrained axis and preserve centers',()=>{
  const wide=P.equalAspectRanges([-1,1],[-1,1],600,300);
  assert.deepEqual(wide.y,[-1,1]);
  assert.deepEqual(wide.x,[-2,2]);
  assert.equal((wide.x[0]+wide.x[1])/2,0);

  const tall=P.equalAspectRanges([0,4],[10,12],300,300);
  assert.deepEqual(tall.x,[0,4]);
  assert.deepEqual(tall.y,[9,13]);

  const sx=600/(wide.x[1]-wide.x[0]),sy=300/(wide.y[1]-wide.y[0]);
  assert.ok(Math.abs(sx-sy)<1e-12);
});


test('manual axis control markup is a reusable header popover with independent X/Y limits',()=>{
  const html=P.axisControls('demoAxes');
  assert.match(html,/class="axis-popover"/);
  assert.match(html,/class="axis-popover-card"/);
  assert.match(html,/data-axis-toggle="demoAxes"/);
  assert.match(html,/data-axis-controls="demoAxes" hidden/);
  for(const k of ['xmin','xmax','ymin','ymax'])assert.match(html,new RegExp(`data-axis="${k}"`));
  assert.match(html,/data-axis-apply/);
  assert.match(html,/data-axis-auto/);
});

test('Distribution controls keep Swap axes inside Axes and expose a separate Bins popover',()=>{
  const axes=P.axisControls('histAxes',{distribution:true,swapped:true});
  const bins=P.binControls('histBins',42);
  assert.match(axes,/data-axis-swap/);
  assert.match(axes,/aria-pressed="true"/);
  assert.match(axes,/class="axis-limit-actions">.*data-axis-swap.*data-axis-auto.*data-axis-apply/);
  assert.doesNotMatch(axes,/axis-extra-row/);
  assert.doesNotMatch(axes,/data-bin-count/);
  assert.match(bins,/data-bin-toggle="histBins"/);
  assert.match(bins,/>Bins<\/button>/);
  assert.match(bins,/data-bin-controls="histBins" hidden/);
  assert.match(bins,/data-bin-count/);
  assert.match(bins,/value="42"/);
});


test('canvasFrame sizes scientific canvases in CSS pixels and scales backing pixels for device density',()=>{
  const ctx={setTransform(...args){this.args=args}};
  const canvas={style:{},width:0,height:0,parentElement:{getBoundingClientRect(){return{width:640}}},getContext(){return ctx}};
  const frame=P.canvasFrame(canvas);
  assert.equal(frame.W,640);
  assert.equal(frame.H,360);
  assert.equal(canvas.style.width,'100%');
  assert.equal(canvas.style.height,'360px');
  assert.equal(canvas.width,640);
  assert.equal(canvas.height,360);
  assert.deepEqual(ctx.args,[1,0,0,1,0,0]);
});

test('shared plot core exposes a resize observer lifecycle for responsive redraws',()=>{
  assert.equal(typeof P.observeResize,'function');
});


test('axis controls delegate numeric display/read semantics to the shared UI helper when available',()=>{
  const src=require('node:fs').readFileSync(require.resolve('../src/core/plot.js'),'utf8');
  assert.match(src,/PV\.ui\?\.setNumericInputValue/);
  assert.match(src,/PV\.ui\?\.readNumericInputValue/);
  assert.doesNotMatch(src,/input\(loKey\)\.value=r\?String\(r\[0\]\)/);
});
