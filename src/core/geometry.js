(function(root){
  const PV=root.PV2000=root.PV2000||{};

  function roundGrid(radius,pitchX,pitchY,count){
    if(![radius,pitchX,pitchY].every(Number.isFinite)||radius<=0||pitchX<=0||pitchY<=0)return[];
    const pts=[],nx=Math.ceil(radius/pitchX),ny=Math.ceil(radius/pitchY),eps=1e-9;
    // MapPattern/RoundWafer uses a strict interior. The inward epsilon is a floating-point guard;
    // do not share this predicate with pseudoSquareGrid or HighDensity circular clipping.
    for(let iy=-ny;iy<=ny;iy++){
      const y=iy*pitchY;
      for(let ix=-nx;ix<=nx;ix++){
        const x=ix*pitchX;
        if(x*x+y*y < radius*radius-eps)pts.push({x,y});
      }
    }
    return count==null||pts.length===count?pts:[];
  }

  function rectGrid(x,y,width,height,nx,ny,count,yDirection=-1){
    if(![x,y,width,height,nx,ny].every(Number.isFinite)||nx<1||ny<1)return[];
    nx=Math.trunc(nx);ny=Math.trunc(ny);if(nx<1||ny<1)return[];
    const dx=nx>1?width/(nx-1):0,dy=ny>1?height/(ny-1):0,pts=[];
    for(let row=0;row<ny;row++)for(let col=0;col<nx;col++)pts.push({x:x+col*dx,y:y+yDirection*row*dy,row,col});
    return count==null||pts.length===count?pts:[];
  }

  function centeredRectGrid(halfWidth,halfHeight,pitchX,pitchY,count){
    if(![halfWidth,halfHeight,pitchX,pitchY].every(Number.isFinite)||halfWidth<0||halfHeight<0||pitchX<=0||pitchY<=0)return[];
    const nx=Math.floor(halfWidth/pitchX+1e-9),ny=Math.floor(halfHeight/pitchY+1e-9),pts=[];
    for(let iy=-ny;iy<=ny;iy++){
      const y=iy*pitchY;
      for(let ix=-nx;ix<=nx;ix++)pts.push({x:ix*pitchX,y});
    }
    return count==null||pts.length===count?pts:[];
  }

  function pseudoSquareGrid(halfWidth,halfHeight,radius,pitchX,pitchY,count){
    if(![halfWidth,halfHeight,radius,pitchX,pitchY].every(Number.isFinite)||halfWidth<0||halfHeight<0||radius<=0||pitchX<=0||pitchY<=0)return[];
    const nx=Math.floor(halfWidth/pitchX+1e-9),
      ny=Math.floor(halfHeight/pitchY+1e-9),
      pts=[],
      r2=radius*radius,
      eps=1e-9;
    for(let iy=-ny;iy<=ny;iy++){
      const y=iy*pitchY;
      for(let ix=-nx;ix<=nx;ix++){
        const x=ix*pitchX;
        // PseudoSquare MapPattern keeps boundary sites inclusive and guards outward for round-off.
        // This is intentionally different from roundGrid and HighDensity circular clipping.
        if(x*x+y*y<=r2+eps)pts.push({x,y,row:iy+ny,col:ix+nx});
      }
    }
    return count==null||pts.length===count?pts:[];
  }

  function bounds(points){
    const xs=(points||[]).map(p=>p.x).filter(Number.isFinite),
      ys=(points||[]).map(p=>p.y).filter(Number.isFinite);
    return xs.length&&ys.length
      ?{xmin:Math.min(...xs),xmax:Math.max(...xs),ymin:Math.min(...ys),ymax:Math.max(...ys)}
      :{xmin:NaN,xmax:NaN,ymin:NaN,ymax:NaN};
  }

  function effectiveRadius(diameter,edgeExclusion=0){
    const radius=diameter/2;
    if(!Number.isFinite(radius)||!(radius>0))return NaN;
    if(!Number.isFinite(edgeExclusion))edgeExclusion=0;
    return edgeExclusion>=0&&edgeExclusion<radius?radius-edgeExclusion:NaN;
  }

  function effectiveHalfExtent(size,edgeExclusion=0){
    const half=size/2;
    if(!Number.isFinite(half)||!(half>0))return NaN;
    if(!Number.isFinite(edgeExclusion))edgeExclusion=0;
    return edgeExclusion>=0&&edgeExclusion<half?half-edgeExclusion:NaN;
  }

  function finiteCoefficients(points){
    return Array.isArray(points)&&points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
  }

  function pointInPolygon(point,vertices){
    let inside=false;
    for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
      const a=vertices[i],b=vertices[j],
        cross=(point.x-a.x)*(b.y-a.y)-(point.y-a.y)*(b.x-a.x);
      if(Math.abs(cross)<1e-9&&point.x>=Math.min(a.x,b.x)-1e-9&&point.x<=Math.max(a.x,b.x)+1e-9&&
        point.y>=Math.min(a.y,b.y)-1e-9&&point.y<=Math.max(a.y,b.y)+1e-9)return true;
      if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  }

  function scheduleForPointCount(points,pointCount,{allowPartialPrefix=false}={}){
    const scheduled=Array.isArray(points)?points:[],
      expected=scheduled.length,
      actual=Number.isFinite(pointCount)?Math.trunc(pointCount):null;
    if(actual==null){
      return{
        points:scheduled,
        geometryStatus:expected?'complete':'unavailable',
        expectedPointCount:expected||NaN,
        acquiredPointCount:expected||NaN,
        completionFraction:expected?1:NaN,
        coordinateCompleteness:expected?'complete':'unavailable'
      };
    }
    if(actual===expected){
      return{
        points:scheduled,
        geometryStatus:expected?'complete':'unavailable',
        expectedPointCount:expected,
        acquiredPointCount:actual,
        completionFraction:expected?1:NaN,
        coordinateCompleteness:expected?'complete':'unavailable'
      };
    }
    if(allowPartialPrefix&&actual>0&&actual<expected){
      return{
        points:scheduled.slice(0,actual),
        geometryStatus:'partial',
        expectedPointCount:expected,
        acquiredPointCount:actual,
        completionFraction:actual/expected,
        coordinateCompleteness:'prefix-inferred'
      };
    }
    return{
      points:[],
      geometryStatus:'mismatch',
      expectedPointCount:expected||NaN,
      acquiredPointCount:actual,
      completionFraction:expected&&actual>=0?actual/expected:NaN,
      coordinateCompleteness:'unavailable'
    };
  }

  function isIncompleteAcquisitionStatus(status){
    return /^(terminated|aborted|interrupted|cancelled|canceled)$/i.test(String(status||'').trim());
  }

  function scaleTargetRelativeCoefficients(coefficients,scaleX,scaleY,count,{circular=false}={}){
    if(!finiteCoefficients(coefficients)||
      !Number.isFinite(scaleX)||!Number.isFinite(scaleY)||!(scaleX>0)||!(scaleY>0))return[];
    const selected=circular
      ?coefficients.filter(point=>point.x*point.x+point.y*point.y<1)
      :coefficients.slice();
    if(count!=null&&selected.length!==count)return[];
    return selected.map(point=>({x:point.x*scaleX,y:point.y*scaleY}));
  }

  function absolutePointSchedule(points,count){
    if(!finiteCoefficients(points))return[];
    return count==null||points.length===count?points.map(point=>({x:point.x,y:point.y})):[];
  }

  function targetEnvelope({
    targetType='',
    diameter=NaN,
    targetWidth=NaN,
    targetHeight=NaN,
    edgeExclusion=NaN,
    substrateShape='',
    substrateRadius=NaN
  }={}){
    const edge=Number.isFinite(edgeExclusion)?edgeExclusion:0;
    if(targetType==='RoundWafer'&&Number.isFinite(diameter)&&diameter>0){
      const radius=diameter/2,scheduledRadius=effectiveRadius(diameter,edge);
      return{
        shape:'circle',
        source:'target',
        nominal:{radius},
        scheduled:Number.isFinite(scheduledRadius)?{radius:scheduledRadius}:null
      };
    }
    if(targetType==='PseudoSquareCell'&&
      Number.isFinite(targetWidth)&&Number.isFinite(targetHeight)&&targetWidth>0&&targetHeight>0&&
      Number.isFinite(diameter)&&diameter>0){
      const halfWidth=targetWidth/2,
        halfHeight=targetHeight/2,
        radius=diameter/2,
        scheduledHalfWidth=effectiveHalfExtent(targetWidth,edge),
        scheduledHalfHeight=effectiveHalfExtent(targetHeight,edge),
        scheduledRadius=effectiveRadius(diameter,edge);
      return{
        shape:'pseudo-square',
        source:'target',
        nominal:{halfWidth,halfHeight,radius},
        scheduled:Number.isFinite(scheduledHalfWidth)&&Number.isFinite(scheduledHalfHeight)&&Number.isFinite(scheduledRadius)
          ?{halfWidth:scheduledHalfWidth,halfHeight:scheduledHalfHeight,radius:scheduledRadius}
          :null
      };
    }
    if(targetType==='SquareCell'&&Number.isFinite(targetWidth)&&Number.isFinite(targetHeight)&&targetWidth>0&&targetHeight>0){
      const halfWidth=targetWidth/2,
        halfHeight=targetHeight/2,
        scheduledHalfWidth=effectiveHalfExtent(targetWidth,edge),
        scheduledHalfHeight=effectiveHalfExtent(targetHeight,edge);
      return{
        shape:'rect',
        source:'target',
        nominal:{halfWidth,halfHeight},
        scheduled:Number.isFinite(scheduledHalfWidth)&&Number.isFinite(scheduledHalfHeight)
          ?{halfWidth:scheduledHalfWidth,halfHeight:scheduledHalfHeight}
          :null
      };
    }
    if((substrateShape==='Circle'||substrateShape==='RoundWafer')&&Number.isFinite(substrateRadius)&&substrateRadius>0){
      const scheduledRadius=edge>=0&&edge<substrateRadius?substrateRadius-edge:NaN;
      return{
        shape:'circle',
        source:'substrate',
        nominal:{radius:substrateRadius},
        scheduled:Number.isFinite(scheduledRadius)?{radius:scheduledRadius}:null
      };
    }
    return{shape:'unknown',source:'unavailable',nominal:null,scheduled:null};
  }

  function envelope({
    patternType='',
    targetType='',
    shape='unknown',
    nominal=null,
    scheduled=null,
    points=[],
    pointsMm=null,
    rawCoefficients=[],
    exclusionPolygons=[],
    edgeExclusion=NaN,
    acquisitionOrder='unknown',
    provenance='unavailable',
    sourceSpace='unknown',
    interpretation='unresolved',
    evidenceStatus='unclassified',
    validationStatus='inferred',
    geometryStatus='unavailable',
    expectedPointCount=NaN,
    acquiredPointCount=NaN,
    completionFraction=NaN,
    coordinateCompleteness='unavailable'
  }={}){
    const physical=Array.from(pointsMm||points||[]);
    return{
      patternType,
      targetType,
      shape,
      nominal,
      scheduled,
      points:physical,
      pointsMm:physical,
      rawCoefficients:Array.from(rawCoefficients||[]),
      exclusionPolygons:Array.from(exclusionPolygons||[]),
      edgeExclusion,
      acquisitionOrder,
      provenance,
      sourceSpace,
      interpretation,
      evidenceStatus,
      validationStatus,
      geometryStatus,
      expectedPointCount,
      acquiredPointCount,
      completionFraction,
      coordinateCompleteness
    };
  }

  function resolveMeasurementGeometry({
    patternType='',
    targetType='',
    rawCoefficients=[],
    exclusionPolygons=[],
    absolutePoints=[],
    pointCount=null,
    diameter=NaN,
    targetWidth=NaN,
    targetHeight=NaN,
    edgeExclusion=NaN,
    substrateShape='',
    substrateRadius=NaN,
    pitchX=NaN,
    pitchY=NaN,
    regionX=NaN,
    regionY=NaN,
    regionWidth=NaN,
    regionHeight=NaN,
    nx=NaN,
    ny=NaN,
    allowPartialPrefix=false
  }={}){
    const boundary=targetEnvelope({
      targetType,diameter,targetWidth,targetHeight,edgeExclusion,substrateShape,substrateRadius
    });
    let pointsMm=[],
      resolvedScheduled=boundary.scheduled,
      sourceSpace='none',
      interpretation='unresolved',
      evidenceStatus='unclassified',
      acquisitionOrder='unknown',
      scheduleMeta={
        geometryStatus:'unavailable',
        expectedPointCount:NaN,
        acquiredPointCount:Number.isFinite(pointCount)?Math.trunc(pointCount):NaN,
        completionFraction:NaN,
        coordinateCompleteness:'unavailable'
      };
    const useSchedule=scheduled=>{
      scheduleMeta=scheduleForPointCount(scheduled,pointCount,{allowPartialPrefix});
      pointsMm=scheduleMeta.points;
    },
      validPitch=Number.isFinite(pitchX)&&pitchX>0&&Number.isFinite(pitchY)&&pitchY>0;

    if(patternType==='MapPattern'){
      if(boundary.shape==='circle'&&boundary.scheduled&&validPitch){
        useSchedule(roundGrid(boundary.scheduled.radius,pitchX,pitchY));
        sourceSpace='generated-target-mm';
        interpretation='target-pitch-grid';
        acquisitionOrder='x-fast / ascending-y';
      }else if(boundary.shape==='rect'&&boundary.scheduled&&validPitch){
        useSchedule(centeredRectGrid(boundary.scheduled.halfWidth,boundary.scheduled.halfHeight,pitchX,pitchY));
        sourceSpace='generated-target-mm';
        interpretation='centered-target-pitch-grid';
        acquisitionOrder='x-fast / ascending-y';
      }else if(boundary.shape==='pseudo-square'&&boundary.scheduled&&validPitch){
        useSchedule(pseudoSquareGrid(
          boundary.scheduled.halfWidth,
          boundary.scheduled.halfHeight,
          boundary.scheduled.radius,
          pitchX,
          pitchY
        ));
        sourceSpace='generated-target-mm';
        interpretation='pseudo-square-target-pitch-grid';
        acquisitionOrder='x-fast / ascending-y';
      }
    }else if(patternType==='SquareRegionPattern'){
      useSchedule(rectGrid(regionX,regionY,regionWidth,regionHeight,nx,ny,null,1));
      if(pointsMm.length){
        sourceSpace='absolute-region-mm';
        interpretation='explicit-region-grid';
        acquisitionOrder='x-fast / ascending-y';
        if(boundary.shape==='rect'&&[regionX,regionY,regionWidth,regionHeight].every(Number.isFinite)){
          resolvedScheduled={xMin:regionX,xMax:regionX+regionWidth,yMin:regionY,yMax:regionY+regionHeight};
        }
      }
    }else if(patternType==='FixedPointsPattern'){
      pointsMm=absolutePointSchedule(absolutePoints,pointCount);
      if(pointsMm.length){
        sourceSpace='absolute-point-mm';
        interpretation='explicit-fixed-points';
        evidenceStatus='inferred';
        acquisitionOrder='xml point order';
      }
    }else if(patternType==='HighDensityPattern'&&boundary.scheduled&&['circle','rect','pseudo-square'].includes(boundary.shape)){
      const scaleX=boundary.shape==='circle'?boundary.scheduled.radius:boundary.scheduled.halfWidth,
        scaleY=boundary.shape==='circle'?boundary.scheduled.radius:boundary.scheduled.halfHeight,
        candidates=scaleTargetRelativeCoefficients(rawCoefficients,scaleX,scaleY);
      // HighDensity circular clipping is vendor-parity-sensitive: use strict < r² directly on
      // stored/scaled coefficients with no epsilon. Odd-grid rounding changes real schedule counts.
      const scheduled=candidates.filter(point=>
        (boundary.shape!=='circle'&&boundary.shape!=='pseudo-square'||
          point.x*point.x+point.y*point.y<boundary.scheduled.radius**2)&&
        !exclusionPolygons.some(vertices=>pointInPolygon(point,vertices))
      );
      useSchedule(scheduled);
      if(pointsMm.length){
        sourceSpace='normalized-target-coefficient';
        interpretation='target-relative-high-density';
        evidenceStatus='inferred';
        acquisitionOrder='xml coefficient order';
      }
    }else if((patternType==='NinePointPattern'||patternType==='FivePointPattern')&&boundary.scheduled&&(boundary.shape==='circle'||boundary.shape==='rect')){
      const scaleX=boundary.shape==='circle'?boundary.scheduled.radius:boundary.scheduled.halfWidth,
        scaleY=boundary.shape==='circle'?boundary.scheduled.radius:boundary.scheduled.halfHeight;
      pointsMm=scaleTargetRelativeCoefficients(rawCoefficients,scaleX,scaleY,pointCount);
      if(pointsMm.length){
        sourceSpace='normalized-target-coefficient';
        interpretation='target-relative-fixed-point-pattern';
        evidenceStatus='inferred';
        acquisitionOrder='xml coefficient order';
      }
    }else if(patternType==='OnePointPattern'&&pointCount===1){
      const p=finiteCoefficients(rawCoefficients)&&rawCoefficients.length
        ?rawCoefficients[0]
        :{x:0,y:0},
        centered=Math.abs(p.x)<=1e-12&&Math.abs(p.y)<=1e-12;
      if(centered){
        pointsMm=[{x:0,y:0}];
        sourceSpace='origin';
        interpretation='single-center-point';
        evidenceStatus='inferred';
        acquisitionOrder='single point';
      }else if(boundary.scheduled&&['circle','rect','pseudo-square'].includes(boundary.shape)){
        const scaleX=boundary.shape==='circle'?boundary.scheduled.radius:boundary.scheduled.halfWidth,
          scaleY=boundary.shape==='circle'?boundary.scheduled.radius:boundary.scheduled.halfHeight;
        pointsMm=scaleTargetRelativeCoefficients([p],scaleX,scaleY,1,{
          circular:boundary.shape==='circle'
        });
        if(pointsMm.length){
          sourceSpace='normalized-target-coefficient';
          interpretation='single-target-relative-point';
          evidenceStatus='inferred';
          acquisitionOrder='single point';
        }
      }
    }

    if(pointsMm.length&&scheduleMeta.geometryStatus==='unavailable'){
      scheduleMeta=scheduleForPointCount(pointsMm,pointCount);
    }

    return envelope({
      patternType,
      targetType,
      shape:boundary.shape,
      nominal:boundary.nominal,
      scheduled:resolvedScheduled,
      pointsMm,
      rawCoefficients,
      exclusionPolygons,
      edgeExclusion,
      acquisitionOrder,
      provenance:boundary.source,
      sourceSpace,
      interpretation,
      evidenceStatus,
      validationStatus:evidenceStatus==='inferred'?'inferred':'unclassified',
      ...scheduleMeta
    });
  }

  PV.geometry={
    roundGrid,
    rectGrid,
    centeredRectGrid,
    pseudoSquareGrid,
    bounds,
    effectiveRadius,
    effectiveHalfExtent,
    scheduleForPointCount,
    isIncompleteAcquisitionStatus,
    scaleTargetRelativeCoefficients,
    pointInPolygon,
    absolutePointSchedule,
    targetEnvelope,
    resolveMeasurementGeometry,
    envelope
  };
})(typeof window!=='undefined'?window:globalThis);
