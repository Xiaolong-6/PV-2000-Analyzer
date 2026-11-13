const test=require('node:test');
const assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/roi.js');

const ROI=PV2000.roi;
const pt=(x,y)=>({x,y});

test('circle includes physical boundary and excludes nonfinite coordinates',()=>{
  const circle={type:'circle',geometry:{cx:5,cy:-3,radius:10}};
  assert.equal(ROI.contains(circle,pt(15,-3)),true);
  assert.equal(ROI.contains(circle,pt(15.01,-3)),false);
  assert.equal(ROI.contains(circle,pt(NaN,-3)),false);
});

test('rectangle rotation is evaluated in physical coordinates',()=>{
  const rect={type:'rectangle',geometry:{cx:0,cy:0,width:10,height:2,rotation:90}};
  assert.equal(ROI.contains(rect,pt(0,4.9)),true);
  assert.equal(ROI.contains(rect,pt(3,0)),false);
  assert.equal(ROI.contains(rect,pt(1,5)),true);
});

test('sector angles are counterclockwise from +X and wrap through 0 degrees',()=>{
  const sector={type:'sector',geometry:{cx:0,cy:0,radius:10,startDeg:315,sweepDeg:90}};
  assert.equal(ROI.contains(sector,pt(8,0)),true);
  assert.equal(ROI.contains(sector,pt(0,8)),false);
  assert.equal(ROI.contains(sector,pt(5,-5)),true);
  assert.equal(ROI.contains(sector,pt(-4,0)),false);
});

test('sector with sweep 360 includes a complete disk',()=>{
  const sector={type:'sector',geometry:{cx:0,cy:0,radius:10,startDeg:80,sweepDeg:360}};
  assert.equal(ROI.contains(sector,pt(-9,0)),true);
  assert.equal(ROI.contains(sector,pt(11,0)),false);
});

test('ROI mask intersects but never mutates the valid-data filter mask',()=>{
  const coords=[pt(-2,0),pt(2,0),pt(2,2),null],
    valid=[true,true,false,true],
    circle={type:'circle',geometry:{cx:0,cy:0,radius:2}};
  assert.deepEqual(ROI.selectMask(coords,circle),[true,true,false,false]);
  assert.deepEqual(ROI.combineMasks(valid,coords,circle),[true,true,false,false]);
  assert.deepEqual(ROI.combineMasks(valid,coords,null),valid);
  assert.deepEqual(valid,[true,true,false,true]);
  assert.throws(()=>ROI.combineMasks([true],coords,circle),/site-index space/);
});

test('editing one ROI does not change other ROI memberships',()=>{
  const coords=[pt(1,1),pt(-1,-1),pt(9,9)],
    session=ROI.create({coords});
  session.add('circle',{cx:0,cy:0,radius:3});
  const first=session.rois()[0];
  session.add('rectangle',{cx:9,cy:9,width:2,height:2,rotation:0});
  assert.deepEqual(session.mask([true,true,true]),[false,false,true]);
  assert.deepEqual(ROI.selectMask(coords,first),[true,true,false]);
  assert.equal(session.scope(),'roi');
  assert.equal(session.label(),'ROI: ROI 2');
  session.remove();
  assert.deepEqual(session.mask([true,true,true]),[true,true,false]);
});


test('every sector includes its vertex without including off-angle nearby sites',()=>{
  for(const startDeg of [0,45,90,180,270,350,-90,450]){
    const sector={type:'sector',geometry:{cx:5,cy:-3,radius:10,startDeg,sweepDeg:30}};
    assert.equal(ROI.contains(sector,pt(5,-3)),true);
    const outside=(startDeg+180)*Math.PI/180;
    assert.equal(ROI.contains(sector,pt(5+1e-6*Math.cos(outside),-3+1e-6*Math.sin(outside))),false);
    assert.deepEqual(ROI.combineMasks([true,false],[pt(5,-3),pt(5,-3)],sector),[true,false]);
  }
});

test('shared Canvas/SVG overlay inherits hit testing from inspect or edit mode',()=>{
  const documentBefore=global.document;
  const overlays=[];
  global.document={createElementNS:()=>{
    const el={style:{},attributes:{},classList:{add(){}},addEventListener(){},
      setAttribute(key,value){this.attributes[key]=value;},remove(){}};
    overlays.push(el);return el;
  }};
  try{
    for(const tagName of ['CANVAS','svg']){
      const parent={style:{},appendChild(el){el.parentElement=this;}};
      const session=ROI.create({coords:[pt(0,0)]});
      const projection={surface:{tagName,parentElement:parent},W:200,H:200,
        X:x=>100+x,Y:y=>100-y,plotRect:{x0:0,x1:200,y0:0,y1:200}};
      session.attach(projection);
      const overlay=overlays.at(-1);
      assert.equal(overlay.style.pointerEvents,'none');
      // An explicit descendant override would intercept the underlying site map.
      assert.doesNotMatch(overlay.innerHTML,/pointer-events=["'](?:all|auto)["']/);
      session.add('circle',{cx:0,cy:0,radius:10});
      session.attach(projection);
      assert.equal(overlay.style.pointerEvents,'auto');
      assert.match(overlay.innerHTML,/roi-hit-plane/);
      assert.match(overlay.innerHTML,/roi-handle/);
      assert.equal(overlays.at(-1),overlay);
    }
  }finally{global.document=documentBefore;}
});
