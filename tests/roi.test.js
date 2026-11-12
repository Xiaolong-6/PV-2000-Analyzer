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
