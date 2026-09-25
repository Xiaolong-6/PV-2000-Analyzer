const test=require('node:test'),assert=require('node:assert/strict');

global.PV2000={};
require('../src/core/geometry.js');

test('roundGrid keeps the strict inward-epsilon boundary contract',()=>{
  const radius=1+2.5e-10,
    points=PV2000.geometry.roundGrid(radius,1,1);
  assert.ok(1<radius*radius,'axis grid sites are mathematically inside this radius');
  assert.deepEqual(points,[{x:0,y:0}]);
});

test('pseudoSquareGrid keeps the inclusive outward-epsilon boundary contract',()=>{
  const radius=1-2.5e-10,
    points=PV2000.geometry.pseudoSquareGrid(1,0,radius,1,1);
  assert.ok(1>radius*radius,'axis grid sites are mathematically just outside this radius');
  assert.deepEqual(points.map(({x,row,col})=>({x,row,col})),[
    {x:-1,row:0,col:0},
    {x:0,row:0,col:1},
    {x:1,row:0,col:2}
  ]);
  assert.ok(points.every(point=>point.y===0));
});

test('HighDensity circle clipping stays strict with no artificial epsilon',()=>{
  const nearInside=1-2.5e-10,
    geometry=PV2000.geometry.resolveMeasurementGeometry({
      patternType:'HighDensityPattern',
      targetType:'RoundWafer',
      rawCoefficients:[{x:1,y:0},{x:nearInside,y:0}],
      pointCount:1,
      diameter:2,
      edgeExclusion:0
    });
  assert.equal(geometry.geometryStatus,'complete');
  assert.equal(geometry.pointsMm.length,1);
  assert.ok(Math.abs(geometry.pointsMm[0].x-nearInside)<1e-15);
  assert.ok(geometry.pointsMm[0].x**2>1-1e-9,
    'the retained point would be lost if roundGrid inward-epsilon semantics were reused');
});

test('known parity anchors retain their established schedule counts',()=>{
  assert.equal(PV2000.geometry.roundGrid(50,5,5).length,305);
  assert.equal(PV2000.geometry.pseudoSquareGrid(59.5,59.5,72,0.5,0.5).length,54449);
  const coeff=[];
  for(let row=0;row<35;row++)for(let col=0;col<35;col++){
    coeff.push({x:-1+2*col/34,y:-1+2*row/34});
  }
  const highDensity=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'HighDensityPattern',
    targetType:'RoundWafer',
    rawCoefficients:coeff,
    pointCount:893,
    diameter:100,
    edgeExclusion:7
  });
  assert.equal(highDensity.pointsMm.length,893);
  assert.equal(highDensity.geometryStatus,'complete');
});
