(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,GEO=PV.geometry,Sel=PV.selection,Profiles=PV.profiles;
  const q=1.602176634e-19,k=1.380649e-23,KB_EV=8.617333262145e-5;
  const PV2000_Q=1.602e-19,PV2000_K=1.38066e-23,PV2000_NI=1.22e10,PV2000_T_OFFSET=272.15;
  const NI300_MANUAL=1.02e10;
  const NI300_GE=2e13;
  const safe=s=>String(s||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');
  const esc=value=>PV.ui.escapeHtml(value);
  const fmt=(v,n=3)=>!Number.isFinite(v)?'—':Math.abs(v)>=1e4||Math.abs(v)<1e-2?v.toExponential(n):v.toFixed(n);
  const help=text=>PV.ui.help(text);
  const css=name=>PV.ui.cssVar(name);

  function effectiveMapRadius(diameter,edgeExclusion=0){return GEO.effectiveRadius(diameter,edgeExclusion)}
  function effectiveMapHalfExtent(size,edgeExclusion=0){return GEO.effectiveHalfExtent(size,edgeExclusion)}
  function targetGeometry(d){
    const resolved=d?.geometryModel;
    if(resolved?.shape==='circle'&&resolved.nominal){
      return{shape:'circle',nominal:resolved.nominal,scheduled:resolved.scheduled,extent:resolved.nominal.radius};
    }
    if(resolved?.shape==='rect'&&resolved.nominal){
      return{shape:'rect',nominal:resolved.nominal,scheduled:resolved.scheduled,extent:Math.max(resolved.nominal.halfWidth||0,resolved.nominal.halfHeight||0)};
    }
    if(d.targetType==='RoundWafer'&&Number.isFinite(d.diameter)&&d.diameter>0){
      const radius=d.diameter/2;
      return{
        shape:'circle',
        nominal:{radius},
        scheduled:Number.isFinite(d.mapRadius)?{radius:d.mapRadius}:null,
        extent:radius
      };
    }
    if(d.targetType==='SquareCell'&&Number.isFinite(d.targetWidth)&&Number.isFinite(d.targetHeight)&&d.targetWidth>0&&d.targetHeight>0){
      const halfWidth=d.targetWidth/2,
        halfHeight=d.targetHeight/2,
        regionScheduled=d.patternType==='SquareRegionPattern'&&
          [d.regionX,d.regionY,d.regionWidth,d.regionHeight].every(Number.isFinite)&&
          d.regionWidth>=0&&d.regionHeight>=0
          ?{xMin:d.regionX,xMax:d.regionX+d.regionWidth,yMin:d.regionY,yMax:d.regionY+d.regionHeight}
          :null,
        centeredScheduled=Number.isFinite(d.mapHalfWidth)&&Number.isFinite(d.mapHalfHeight)
          ?{halfWidth:d.mapHalfWidth,halfHeight:d.mapHalfHeight}
          :null;
      return{
        shape:'rect',
        nominal:{halfWidth,halfHeight},
        scheduled:regionScheduled||centeredScheduled,
        extent:Math.max(halfWidth,halfHeight)
      };
    }
    return null;
  }
  function insideScheduled(geometry,x,y){
    const scheduled=geometry?.scheduled;
    if(!geometry||!scheduled)return true;
    if(geometry.shape==='circle')return x*x+y*y<scheduled.radius*scheduled.radius;
    if(geometry.shape==='rect'){
      if([scheduled.xMin,scheduled.xMax,scheduled.yMin,scheduled.yMax].every(Number.isFinite)){
        return x>=scheduled.xMin&&x<=scheduled.xMax&&y>=scheduled.yMin&&y<=scheduled.yMax;
      }
      return Math.abs(x)<=scheduled.halfWidth&&Math.abs(y)<=scheduled.halfHeight;
    }
    return true;
  }
  function gridPitch(size,count){
    return Number.isFinite(size)&&Number.isFinite(count)&&count>1?size/(count-1):NaN;
  }
  function highDensityCoords(coefficients,scaleX,scaleY,count,circular=false){
    return GEO.scaleTargetRelativeCoefficients(coefficients,scaleX,scaleY,count,{circular});
  }
  function parse(parsed){
    const m=parsed.measurement,c=X.common(parsed),md=X.direct(m,'MeasurementData'),itd=X.direct(md,'IterationData'),iter=X.direct(itd,'Iteration'),data=X.direct(iter,'Data');
    const values=X.children(data).filter(e=>X.lname(e)==='DataItem').map(e=>X.num(e,'Value')).filter(Number.isFinite);
    const pattern=X.direct(m,'Pattern'),
      patternType=X.attrType(pattern),
      coefficientsNode=X.direct(pattern,'Coefficients'),
      coefficients=coefficientsNode?X.children(coefficientsNode).map(point=>({x:X.num(point,'X',NaN),y:X.num(point,'Y',NaN)})):[],
      region=X.direct(pattern,'Region'),
      location=X.direct(region,'Location'),
      regionSize=X.direct(region,'Size'),
      dimension=X.direct(pattern,'Dimension'),
      highDensityDimension=dimension?Number(dimension.textContent):NaN,
      regionX=X.num(region,'X',X.num(location,'X',NaN)),
      regionY=X.num(region,'Y',X.num(location,'Y',NaN)),
      regionWidth=X.num(region,'Width',X.num(regionSize,'Width',NaN)),
      regionHeight=X.num(region,'Height',X.num(regionSize,'Height',NaN)),
      nx=X.num(dimension,'X',NaN),
      ny=X.num(dimension,'Y',NaN),
      target=X.direct(m,'Target'),
      targetType=X.attrType(target),
      targetSize=X.direct(target,'Size'),
      targetWidth=X.num(targetSize,'Width',NaN),
      targetHeight=X.num(targetSize,'Height',NaN),
      pitch=X.direct(pattern,'Pitch'),
      diameter=X.num(target,'Diameter',Number.isFinite(c.radius)?2*c.radius:NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',0)),
      mapRadius=effectiveMapRadius(diameter,edgeExclusion),
      mapHalfWidth=effectiveMapHalfExtent(targetWidth,edgeExclusion),
      mapHalfHeight=effectiveMapHalfExtent(targetHeight,edgeExclusion),
      rawPitchX=X.num(pitch,'X'),
      rawPitchY=X.num(pitch,'Y'),
      highDensityScaleX=targetType==='RoundWafer'?mapRadius:targetType==='SquareCell'?mapHalfWidth:NaN,
      highDensityScaleY=targetType==='RoundWafer'?mapRadius:targetType==='SquareCell'?mapHalfHeight:NaN,
      highDensitySpanX=Number.isFinite(highDensityScaleX)?2*highDensityScaleX:NaN,
      highDensitySpanY=Number.isFinite(highDensityScaleY)?2*highDensityScaleY:NaN,
      pitchX=Number.isFinite(rawPitchX)?rawPitchX:patternType==='HighDensityPattern'?gridPitch(highDensitySpanX,highDensityDimension):gridPitch(regionWidth,nx),
      pitchY=Number.isFinite(rawPitchY)?rawPitchY:patternType==='HighDensityPattern'?gridPitch(highDensitySpanY,highDensityDimension):gridPitch(regionHeight,ny);
      
    const geometryModel=GEO.resolveMeasurementGeometry({
      patternType,
      targetType,
      rawCoefficients:coefficients,
      pointCount:values.length,
      diameter,
      targetWidth,
      targetHeight,
      edgeExclusion,
      substrateShape:c.shapeType,
      substrateRadius:c.radius,
      pitchX,
      pitchY,
      regionX,
      regionY,
      regionWidth,
      regionHeight,
      nx,
      ny,
      allowPartialPrefix:GEO.isIncompleteAcquisitionStatus(c.status)
    }),
      coords=geometryModel.pointsMm,
      resolvedGeometryProfile=geometryModel.geometryStatus==='complete'
        ?Profiles.resolveGeometry({geometryModel})
        :null,
      geometryProfile=resolvedGeometryProfile
        ?{id:resolvedGeometryProfile.id,status:resolvedGeometryProfile.status}
        :{id:null,status:geometryModel.geometryStatus==='partial'?'partial':coords.length?'inferred':'unsupported'};
      
    const preArray=X.direct(X.direct(m,'PreProcessings'),'ArrayOfPreProcessSettings'),pre0=preArray?X.children(preArray)[0]:null;
    const avgIndex=X.num(m,'Averaging',NaN),
      avgValues=X.direct(m,'AveragingValues'),
      avgList=avgValues?X.children(avgValues).map(e=>Number(e.textContent)).filter(Number.isFinite):[],
      avgMode=Number.isInteger(avgIndex)&&avgIndex>=0&&avgIndex<avgList.length?avgList[avgIndex]:Number(c.header['uPCD Avg Mode']);
      
    const evalIndex=X.num(m,'EvalutationMode',NaN),
      evalNode=X.direct(m,'EvaluationModes'),
      evalList=evalNode?X.children(evalNode).map(e=>e.textContent.trim()):[],
      evaluationMode=Number.isInteger(evalIndex)&&evalIndex>=0&&evalIndex<evalList.length?evalList[evalIndex]:'';
      
    const qssRange=X.direct(m,'QSSRange');
    return{...c,values,coords,geometryModel,geometryProfile,rawCoefficients:coefficients,patternType,patternName:X.text(pattern,'Name',''),regionX,regionY,regionWidth,regionHeight,nx,ny,highDensityDimension,coefficientCount:coefficients.length,targetType,targetWidth,targetHeight,pitchX,pitchY,diameter,edgeExclusion,mapRadius,mapHalfWidth,mapHalfHeight,
      waferThickness:X.num(m,'WaferThickness',Number(c.header['Wafer Thickness'])),opticalFactor:X.num(m,'OpticalFactor',1),doping:X.num(m,'Doping',NaN),dopingType:X.text(m,'DopingType',''),laserPower:X.num(m,'LaserPower',NaN),
      avgMode,averagingIndex:avgIndex,evaluationMode,autoset:X.text(m,'DoAutoSetting',''),qssMilli:X.num(pre0,'QssLampIntensity',Number(c.header['QSS Intensity'])),temperatureC:X.num(iter,'ChuckTemperature',NaN),measurementVelocity:X.num(iter,'MeasurementVelocity',NaN),tauSteadyStateFactor:X.num(iter,'TauSteadyStateFactor',NaN),qdcValue:X.num(iter,'QDCValue',NaN),
      probe:X.text(m,'ProbeSelection',''),bias:X.text(m,'QssBiasSelection',''),doRastering:X.text(m,'DoRastering',''),saveTransient:X.text(m,'SaveTransient',''),transient:c.header['Transient']||'',pointAverage:X.text(m,'DoPointAveraging',''),pointAverageCount:X.num(m,'PointAverageCount',NaN),
      feConstant:X.num(m,'FeConstant',NaN),lidConstant:X.num(m,'LIDConstant',NaN),qssRangeMin:X.num(qssRange,'Min',NaN),qssRangeMax:X.num(qssRange,'Max',NaN),raw:parsed};
  }
  function smax(tauUs,Wum){return (Wum*1e-4)/(2*tauUs*1e-6)}
  function pv2000SmaxResult(tauUs,Wum){
    if(!Number.isFinite(tauUs)||!Number.isFinite(Wum)||Wum<=0)return NaN;
    return tauUs<=0?0:smax(tauUs,Wum);
  }
  function generation(I_sun,Wum,OF){return 2.38e17*I_sun/(Wum*1e-4)*OF}
  function egSi(T){return 1.17-4.73e-4*T*T/(T+636)}
  function niCompat(){return PV2000_NI}
  function impliedVoc(tauUs,d){
    const I=(d.qssMilli||0)/1000,W=Number.isFinite(d.waferThickness)&&d.waferThickness>0?d.waferThickness:200,OF=d.opticalFactor,Nd=d.doping;
    let tempC=Number.isFinite(d.temperatureC)?d.temperatureC:27;
    if(tempC===0)tempC=27;
    const TK=tempC+PV2000_T_OFFSET;
    if(![tauUs,I,W,OF,Nd,TK].every(Number.isFinite)||tauUs<=0||I<=0||Nd<=0)return NaN;
    const dn=generation(I,W,OF)*tauUs*1e-6;
    return PV2000_K*TK/PV2000_Q*Math.log(dn*(Nd+dn)/(PV2000_NI*PV2000_NI)+1);
  }
  function pv2000ImpliedVocResult(tauUs,d){
    if(!Number.isFinite(tauUs))return NaN;
    return tauUs<=0?0:impliedVoc(tauUs,d);
  }
  function impliedVocManual(tauUs,d){
    const I=(d.qssMilli||0)/1000,W=d.waferThickness,OF=d.opticalFactor,Nd=d.doping,TK=Number.isFinite(d.temperatureC)?d.temperatureC+273.15:300;
    if(![tauUs,I,W,OF,Nd,TK].every(Number.isFinite)||tauUs<=0||I<=0||W<=0||Nd<=0)return NaN;
    const dn=generation(I,W,OF)*tauUs*1e-6;return k*TK/q*Math.log(dn*(Nd+dn)/(NI300_MANUAL*NI300_MANUAL));
  }
  function egGe(T){return 0.7437-4.774e-4*T*T/(T+235)}
  function niFromModel(ni300,eg,T){
    const ref=300,ratio=(T/ref)**1.5*Math.exp(-eg(T)/(2*KB_EV*T)+eg(ref)/(2*KB_EV*ref));
    return ni300*ratio;
  }
  function niPhysical(material,T){
    return material==='Ge'?niFromModel(NI300_GE,egGe,T):niFromModel(NI300_MANUAL,egSi,T);
  }
  function impliedVocPhysical(tauUs,d,material='Si'){
    const I=(d.qssMilli||0)/1000,W=d.waferThickness,OF=d.opticalFactor,Nd=d.doping,TK=Number.isFinite(d.temperatureC)?d.temperatureC+273.15:300;
    if(![tauUs,I,W,OF,Nd,TK].every(Number.isFinite)||tauUs<=0||I<=0||W<=0||Nd<=0)return NaN;
    const dn=generation(I,W,OF)*tauUs*1e-6,ni=niPhysical(material,TK);
    return k*TK/q*Math.log(dn*(Nd+dn)/(ni*ni));
  }
  function surfaceRecombinationVelocity(tauUs,Wum,options={}){
    const mode=options.mode==='planar'?'planar':'textured',
      bulkLifetimeUs=Number.isFinite(options.bulkLifetimeUs)&&options.bulkLifetimeUs>0?options.bulkLifetimeUs:Infinity,
      planarSrv=Number.isFinite(options.planarSrv)?options.planarSrv:5,
      minLifetimeUs=Number.isFinite(options.minLifetimeUs)&&options.minLifetimeUs>0?options.minLifetimeUs:0;
    if(!Number.isFinite(tauUs)||!Number.isFinite(Wum)||tauUs<=0||Wum<=0||tauUs<minLifetimeUs)return NaN;
    const tau=tauUs*1e-6,W=Wum*1e-4,bulkTerm=Number.isFinite(bulkLifetimeUs)?1/(bulkLifetimeUs*1e-6):0,
      raw=(mode==='planar'?W/2:W)*(1/tau-bulkTerm)-(mode==='planar'?0:planarSrv);
    if(!Number.isFinite(raw))return NaN;
    return Math.max(0,raw);
  }
  function intrinsicLifetimeMask(values,excludeInvalid=true){
    return values.map(v=>Number.isFinite(v)&&(!excludeInvalid||v>0));
  }
  function applyAnalysisOptions(d,a,options={}){
    const opts={
      vocModel:options.vocModel||'pv2000',
      srvEnabled:options.srvEnabled===true,
      surfaceMode:options.surfaceMode==='textured'?'textured':'planar',
      bulkLifetimeUs:Number.isFinite(options.bulkLifetimeUs)&&options.bulkLifetimeUs>0?options.bulkLifetimeUs:Infinity,
      planarSrv:Number.isFinite(options.planarSrv)?options.planarSrv:5,
      minLifetimeUs:Number.isFinite(options.minLifetimeUs)&&options.minLifetimeUs>0?options.minLifetimeUs:0
    },lifetime=a.metrics.lifetime.values;
    const vocMaterial=opts.vocModel==='physical-ge'?'Ge':'Si',
      physical=opts.vocModel==='physical-si'||opts.vocModel==='physical-ge';
    a.metrics.voc.values=lifetime.map(v=>physical?impliedVocPhysical(v,d,vocMaterial):pv2000ImpliedVocResult(v,d));
    a.metrics.voc.profileId=physical?`QSS-ANALYZER-VOC-${vocMaterial.toUpperCase()}-001`:'QSS-CALC-IMPLIED-VOC-002';
    a.metrics.voc.validation=physical?'analyzer-optional':'validated';
    a.metrics.voc.label=`Implied Voc (${((d.qssMilli||0)/1000).toFixed(2)} sun)`;
    a.metrics.voc.help=physical
      ?`Physical ${vocMaterial} estimate using a material-specific intrinsic-carrier model; this path is not PV-2000-regressed.`
      :'PV-2000-compatible implied Voc recovered from the managed DLL using its fixed ni, temperature offset, and physical constants.';
    a.metrics.srv.values=opts.srvEnabled
      ?lifetime.map(v=>surfaceRecombinationVelocity(v,d.waferThickness,{
        mode:opts.surfaceMode,bulkLifetimeUs:opts.bulkLifetimeUs,planarSrv:opts.planarSrv,minLifetimeUs:opts.minLifetimeUs
      }))
      :lifetime.map(()=>NaN);
    a.metrics.srv.help=opts.surfaceMode==='planar'
      ?'Planar SRV = W/2 × (1/τeff − 1/τbulk). Blank bulk lifetime means ∞.'
      :'Textured/black-surface SRV = W × (1/τeff − 1/τbulk) − planar-reference SRV, clamped at zero. Blank bulk lifetime means ∞.';
    a.options=opts;
    return a;
  }
  function analyze(d,options={}){
    const lifetime=d.values.slice(),
      smaxVals=lifetime.map(v=>pv2000SmaxResult(v,d.waferThickness)),
      vocManual=lifetime.map(v=>impliedVocManual(v,d)),
      calculationProfile={
        id:'QSS-CALC-LIFETIME-SMAX-001',
        status:'validated'
      },
      a={metrics:{
        lifetime:{key:'lifetime',profileId:'QSS-STORED-LIFETIME-001',validation:'stored-controller',label:`τeff.d (${((d.qssMilli||0)/1000).toFixed(2)} sun)`,short:'τeff.d',unit:'µs',values:lifetime,help:'Small-perturbation (differential) carrier lifetime stored by the controller. Raw XML sentinel values such as −1 µs are preserved for provenance; paired PV-2000 result exports represent those sites as Ud.'},
        smax:{key:'smax',profileId:calculationProfile.id,validation:calculationProfile.status,label:`Smax (${((d.qssMilli||0)/1000).toFixed(2)} sun)`,short:'Smax',unit:'cm/s',values:smaxVals,help:'PV-2000-compatible Smax = W/(2τ) for positive lifetime. Paired exports show controller sentinel sites as a numeric 0 placeholder while lifetime itself is Ud.; scientific filtering remains separate from result placeholders.'},
        voc:{key:'voc',profileId:null,validation:'inferred',label:'Implied Voc',short:'Implied Voc',unit:'V',values:[],help:''},
        srv:{key:'srv',profileId:'QSS-ANALYZER-SRV-001',validation:'analyzer-optional',label:'SRV',short:'SRV',unit:'cm/s',values:[],help:''}
      },calculationProfile,geometryProfile:d.geometryProfile||null,audit:{
        vocManualStats:S.summary(vocManual.filter(Number.isFinite)),
        rawLifetimeStats:S.summary(lifetime.filter(Number.isFinite)),
        rawSmaxStats:S.summary(smaxVals.filter(Number.isFinite)),
        invalidLifetimeCount:lifetime.filter(v=>Number.isFinite(v)&&v<=0).length,
        pv2000Ni:PV2000_NI,pv2000TemperatureOffset:PV2000_T_OFFSET,ni300Manual:NI300_MANUAL,ni300Ge:NI300_GE
      }};
    return applyAnalysisOptions(d,a,options);
  }
  function summaryMasked(values,mask){return S.summary(values.filter((_,i)=>mask[i]&&Number.isFinite(values[i])))}
  function color(t){t=Math.max(0,Math.min(1,t));
    const stops=[[0,[49,54,149]],[.25,[39,127,142]],[.5,[63,175,109]],[.75,[218,200,50]],[1,[220,55,55]]];
    let i=0;
    while(i<stops.length-2&&t>stops[i+1][0])i++;
    const[a,c1]=stops[i],
    [b,c2]=stops[i+1],
    u=(t-a)/(b-a);
    return`rgb(${c1.map((v,j)=>Math.round(v+(c2[j]-v)*u)).join(',')})`}
  function niceTicks(lo,hi,n=5){
    if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo===hi)return[lo];
    const raw=(hi-lo)/n,
    p=10**Math.floor(Math.log10(Math.abs(raw))),
    q=raw/p,
    step=(q<=1?1:q<=2?2:q<=5?5:10)*p,
    start=Math.ceil(lo/step)*step,
    out=[];
    for(let x=start;x<=hi+step*1e-9;x+=step)out.push(x);
    return out}
  function axisFmt(v){if(!Number.isFinite(v))return'';const a=Math.abs(v);return a>=1e4||a>0&&a<1e-2?v.toExponential(1):Number(v.toPrecision(4)).toString()}
  const setupTooltip=canvas=>PV.ui.setupTooltip(canvas);
  const showTip=(tip,event,html)=>PV.ui.showTooltip(tip,event,html);
  const hideTip=tip=>PV.ui.hideTooltip(tip);
  function smoothValueAt(x,y,coords,values,mask,maxDist){
    let nearestSiteSq=Infinity,nearestSiteValid=false,nearestValidSq=Infinity,num=0,den=0;
    for(let i=0;i<coords.length;i++){
      const pt=coords[i];if(!pt)continue;
      const dist2=(x-pt.x)**2+(y-pt.y)**2,allowed=!!mask[i]&&Number.isFinite(values[i]);
      if(dist2<nearestSiteSq){nearestSiteSq=dist2;nearestSiteValid=allowed}
      if(!allowed)continue;
      nearestValidSq=Math.min(nearestValidSq,dist2);
      const weight=1/(dist2+0.25);num+=weight*values[i];den+=weight;
    }
    return nearestSiteValid&&nearestValidSq<=maxDist*maxDist&&den?num/den:NaN;
  }
  function drawMap(canvas,d,a,key,mode,mask,selected,zoom,onZoom,onSelect,supportMask=null){
    const {ctx,W,H}=PV.plot.canvasFrame(canvas),
      m=a.metrics[key],
      vals=m.values,
      p={l:54,r:76,t:28,b:46},
      geometry=targetGeometry(d),
      extent=(geometry?.extent||d.diameter/2||50)*1.06,
      plot=Math.min(W-p.l-p.r,H-p.t-p.b),
      cx=p.l+(W-p.l-p.r)/2,
      cy=p.t+(H-p.t-p.b)/2,
      R=plot/2,
      autoX=[-extent,extent],
      autoY=[-extent,extent],
      xr=PV.plot.resolve(autoX,zoom?.x),
      yr=PV.plot.resolve(autoY,zoom?.y),
      X=x=>cx-R+(x-xr[0])/(xr[1]-xr[0]||1)*2*R,
      Y=y=>cy+R-(y-yr[0])/(yr[1]-yr[0]||1)*2*R;
      
    const validVals=vals.filter((v,i)=>mask[i]&&Number.isFinite(v)),
      lo=validVals.length?Math.min(...validVals):0,
      hi=validVals.length?Math.max(...validVals):1;
    ctx.clearRect(0,0,W,H);ctx.fillStyle=css('--chart-bg');ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=css('--grid2');
      ctx.lineWidth=1;
      for(const t of niceTicks(xr[0],xr[1],5)){const x=X(t);
      ctx.beginPath();
      ctx.moveTo(x,cy-R);
      ctx.lineTo(x,cy+R);
      ctx.stroke()}for(const t of niceTicks(yr[0],yr[1],5)){const y=Y(t);
      ctx.beginPath();
      ctx.moveTo(cx-R,y);
      ctx.lineTo(cx+R,y);
      ctx.stroke()}
    ctx.save();ctx.beginPath();ctx.rect(cx-R,cy-R,2*R,2*R);ctx.clip();
    if(mode==='smooth'&&d.coords.length===vals.length&&validVals.length>=3){
      const step=3,
        maxDist=2.2*Math.max(d.pitchX||5,d.pitchY||5);
      for(let py=Math.floor(cy-R);py<=Math.ceil(cy+R);py+=step){
        for(let px=Math.floor(cx-R);px<=Math.ceil(cx+R);px+=step){
          const x=xr[0]+(px-(cx-R))/(2*R)*(xr[1]-xr[0]),
            y=yr[1]-(py-(cy-R))/(2*R)*(yr[1]-yr[0]);
          if(!insideScheduled(geometry,x,y))continue;
          const v=smoothValueAt(x,y,d.coords,vals,mask,maxDist);
          if(!Number.isFinite(v))continue;
          ctx.fillStyle=color((v-lo)/(hi-lo||1));
          ctx.fillRect(px,py,step,step);
        }
      }
    }
    for(let i=0;i<d.coords.length;i++){
      const pt=d.coords[i],
      v=vals[i];
      if(!pt||!Number.isFinite(v))continue;
      const x=X(pt.x),
      y=Y(pt.y);
      if(x<cx-R||x>cx+R||y<cy-R||y>cy+R)continue;
      if(mode==='points'||validVals.length<3||!mask[i]){ctx.beginPath();
        ctx.arc(x,y,mask[i]?5:3.2,0,2*Math.PI);
        ctx.fillStyle=mask[i]?color((v-lo)/(hi-lo||1)):css('--soft');
        ctx.globalAlpha=mask[i]?1:.45;
        ctx.fill();
        ctx.globalAlpha=1;
        if(!mask[i]){ctx.strokeStyle=css('--bad');
          ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(x-3,y-3);
          ctx.lineTo(x+3,y+3);
          ctx.moveTo(x+3,y-3);
          ctx.lineTo(x-3,y+3);
          ctx.stroke()}}}
    ctx.restore();
    const selectedPoint=d.coords[selected];
    if(selectedPoint){
      const sx=X(selectedPoint.x),sy=Y(selectedPoint.y);
      if(sx>=cx-R&&sx<=cx+R&&sy>=cy-R&&sy<=cy+R){ctx.beginPath();ctx.arc(sx,sy,7,0,2*Math.PI);ctx.strokeStyle=css('--yellow');ctx.lineWidth=2;ctx.stroke()}
    }
    if(geometry){
      const traceBoundary=boundary=>{
        ctx.beginPath();
        if(geometry.shape==='circle'){
          const rx=Math.abs(X(boundary.radius)-X(0)),
            ry=Math.abs(Y(boundary.radius)-Y(0));
          ctx.ellipse(X(0),Y(0),rx,ry,0,0,2*Math.PI);
        }else{
          const useRegion=[boundary.xMin,boundary.xMax,boundary.yMin,boundary.yMax].every(Number.isFinite),
            x0=X(useRegion?boundary.xMin:-boundary.halfWidth),x1=X(useRegion?boundary.xMax:boundary.halfWidth),
            y0=Y(useRegion?boundary.yMax:boundary.halfHeight),y1=Y(useRegion?boundary.yMin:-boundary.halfHeight);
          ctx.rect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0));
        }
        ctx.stroke();
      };
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx-R,cy-R,2*R,2*R);
      ctx.clip();
      ctx.strokeStyle=css('--soft');
      ctx.lineWidth=1.7;
      ctx.setLineDash([]);
      traceBoundary(geometry.nominal);
      if(d.edgeExclusion>0&&geometry.scheduled){
        ctx.strokeStyle=css('--muted');
        ctx.lineWidth=1.1;
        ctx.setLineDash([6,4]);
        traceBoundary(geometry.scheduled);
      }
      ctx.restore();
    }
    ctx.strokeStyle=css('--grid2');
    ctx.lineWidth=.75;
    ctx.strokeRect(cx-R,cy-R,2*R,2*R);
    ctx.fillStyle=css('--muted');
      ctx.font='11px system-ui';
      ctx.textAlign='center';
      niceTicks(xr[0],xr[1],5).forEach(t=>ctx.fillText(axisFmt(t),X(t),H-17));
      ctx.fillText('X [mm]',cx,H-3);
      ctx.save();
      ctx.translate(14,cy);
      ctx.rotate(-Math.PI/2);
      ctx.fillText('Y [mm]',0,0);
      ctx.restore();
      ctx.textAlign='right';
      niceTicks(yr[0],yr[1],5).forEach(t=>ctx.fillText(axisFmt(t),p.l-8,Y(t)+4));
      
    const cbx=W-45,
      cby=p.t+12,
      cbh=H-p.t-p.b-24,
      cbw=12,
      grad=ctx.createLinearGradient(0,cby+cbh,0,cby);
      for(let j=0;j<=10;j++)grad.addColorStop(j/10,
      color(j/10));
      ctx.fillStyle=grad;
      ctx.fillRect(cbx,cby,cbw,cbh);
      ctx.strokeStyle=css('--soft');
      ctx.strokeRect(cbx,cby,cbw,cbh);
      ctx.fillStyle=css('--muted');
      ctx.textAlign='left';
      ctx.fillText(axisFmt(hi),cbx+17,cby+4);
      ctx.fillText(axisFmt(lo),cbx+17,cby+cbh);
      ctx.save();
      ctx.translate(W-8,cy);
      ctx.rotate(-Math.PI/2);
      ctx.textAlign='center';
      ctx.fillText(`${m.short} [${m.unit}]`,0,0);
      ctx.restore();
      
    const tip=setupTooltip(canvas);
      canvas.onmouseleave=()=>hideTip(tip);
      canvas.onmousemove=e=>{
      const rect=canvas.getBoundingClientRect(),
      mx=(e.clientX-rect.left)*W/rect.width,
      my=(e.clientY-rect.top)*H/rect.height;
      let best=-1,
      bd=Infinity;
      for(let i=0;i<d.coords.length;i++){
        const pt=d.coords[i];
        if(!pt)continue;
        const dx=mx-X(pt.x),
        dy=my-Y(pt.y),
        dd=dx*dx+dy*dy;
        if(dd<bd){bd=dd;
          best=i}}if(best>=0&&bd<140){
        const pt=d.coords[best],
        v=vals[best];
        const available=!supportMask||supportMask[best],
          state=available?(mask[best]?'VALID':'FILTERED'):'UNAVAILABLE';
        showTip(tip,e,`<b>Point ${best+1}</b><br>X ${fmt(pt.x,1)} mm · Y ${fmt(pt.y,1)} mm<br>${esc(m.short)} = ${fmt(v,4)} ${esc(m.unit)}<br><span class="${mask[best]?'good':'bad'}">${state}</span>`)}else hideTip(tip)};
      canvas.onclick=e=>{
        const rect=canvas.getBoundingClientRect(),
          mx=(e.clientX-rect.left)*W/rect.width,
          my=(e.clientY-rect.top)*H/rect.height;
        let best=-1,bestD=Infinity;
        d.coords.forEach((pt,i)=>{
          if(!pt)return;
          const dd=(X(pt.x)-mx)**2+(Y(pt.y)-my)**2;
          if(dd<bestD){
            bestD=dd;
            best=i;
          }
        });
        if(best>=0&&bestD<500)onSelect?.(best);
      };
    PV.plot.bind(canvas,{W,H,plotRect:{x0:cx-R,x1:cx+R,y0:cy-R,y1:cy+R},ranges:{x:xr,y:yr},onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});
      
    return{lo,hi};
  }
  function histogram(values,mask,bins=28,supportMask=null){
    const all=values.map((v,i)=>({v,i})).filter(x=>Number.isFinite(x.v)&&(!supportMask||supportMask[x.i]));
    if(!all.length)return[];
    const lo=Math.min(...all.map(x=>x.v)),
    hi=Math.max(...all.map(x=>x.v)),
    w=(hi-lo||1)/bins,
    out=Array.from({length:bins},(_,i)=>({lo:lo+i*w,hi:lo+(i+1)*w,valid:0,invalid:0}));
    all.forEach(x=>{
      let j=Math.floor((x.v-lo)/(hi-lo||1)*bins);j=Math.max(0,Math.min(bins-1,j));out[j][mask[x.i]?'valid':'invalid']++});
    return out}
  function drawHist(canvas,a,key,mask,filterKey,filterLo,filterHi,binCount=30,swapped=true,zoom,onZoom,supportMask=null){
    const {ctx,W,H}=PV.plot.canvasFrame(canvas),
      m=a.metrics[key],
      bins=histogram(m.values,mask,binCount,supportMask),
      p={l:58,r:18,t:24,b:48};
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle=css('--chart-bg');
      ctx.fillRect(0,0,W,H);
      if(!bins.length)return bins;
      
    const autoMetric=[bins[0].lo,bins[bins.length-1].hi],
      autoCount=[0,Math.max(...bins.map(b=>b.valid),1)],
      mr=PV.plot.resolve(autoMetric,swapped?zoom?.y:zoom?.x),
      cr=PV.plot.resolve(autoCount,swapped?zoom?.x:zoom?.y),
      plotW=W-p.l-p.r,
      plotH=H-p.t-p.b,
      metricPos=v=>(v-mr[0])/(mr[1]-mr[0]||1),
      countPos=v=>(v-cr[0])/(cr[1]-cr[0]||1);
      
    const validVals=m.values.filter((v,i)=>mask[i]&&Number.isFinite(v)),
      scaleLo=Math.min(...validVals),
      scaleHi=Math.max(...validVals),
      barColor=b=>validVals.length?color(scaleHi===scaleLo?0:((b.lo+b.hi)/2-scaleLo)/(scaleHi-scaleLo)):css('--soft'),
      histXRange=swapped?cr:mr,
      histYRange=swapped?mr:cr,
      histXPos=v=>p.l+(swapped?countPos(v):metricPos(v))*plotW,
      histYPos=v=>H-p.b-(swapped?metricPos(v):countPos(v))*plotH;
      ctx.font='11px system-ui';
      ctx.strokeStyle=css('--grid2');
      ctx.fillStyle=css('--muted');
      ctx.textAlign='center';
      niceTicks(histXRange[0],histXRange[1],5).forEach(t=>{
        const x=histXPos(t);
        ctx.beginPath();
        ctx.moveTo(x,p.t);
        ctx.lineTo(x,H-p.b);
        ctx.stroke();
        ctx.fillText(axisFmt(t),x,H-17)});
      ctx.strokeStyle=css('--grid');
      ctx.textAlign='right';
      niceTicks(histYRange[0],histYRange[1],5).forEach(t=>{
        const y=histYPos(t);
        ctx.beginPath();
        ctx.moveTo(p.l,y);
        ctx.lineTo(W-p.r,y);
        ctx.stroke();
        ctx.fillText(axisFmt(t),p.l-8,y+4)});
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.l,p.t,plotW,plotH);
      ctx.clip();
      
    bins.forEach(b=>{
      if(swapped){
        const y1=H-p.b-metricPos(b.lo)*plotH,
        y2=H-p.b-metricPos(b.hi)*plotH,
        xBase=p.l+countPos(0)*plotW,
        xValid=p.l+countPos(b.valid)*plotW;
        ctx.fillStyle=barColor(b);
        ctx.fillRect(Math.min(xBase,xValid),Math.min(y1,y2),Math.abs(xValid-xBase),Math.max(1,Math.abs(y2-y1)-1));
      }else{
        const x1=p.l+metricPos(b.lo)*plotW,
        x2=p.l+metricPos(b.hi)*plotW,
        yBase=H-p.b-countPos(0)*plotH,
        yValid=H-p.b-countPos(b.valid)*plotH;
        ctx.fillStyle=barColor(b);
        ctx.fillRect(Math.min(x1,x2),Math.min(yBase,yValid),Math.max(1,Math.abs(x2-x1)-1),Math.abs(yValid-yBase));
      }
    });
          
      
    if(key===filterKey){ctx.strokeStyle=css('--yellow');
      ctx.setLineDash([5,4]);
      [filterLo,filterHi].forEach(v=>{
        if(v>=mr[0]&&v<=mr[1]){
          if(swapped){
            const y=H-p.b-metricPos(v)*plotH;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(W-p.r,y);ctx.stroke()}else{
            const x=p.l+metricPos(v)*plotW;ctx.beginPath();ctx.moveTo(x,p.t);ctx.lineTo(x,H-p.b);ctx.stroke()}}});
      ctx.setLineDash([])}ctx.restore();
      
    ctx.strokeStyle=css('--soft');
      ctx.strokeRect(p.l,p.t,plotW,plotH);
      ctx.fillStyle=css('--muted');
      ctx.textAlign='center';
      ctx.fillText(swapped?'Count':`${m.short} [${m.unit}]`,(p.l+W-p.r)/2,H-3);
      ctx.save();
      ctx.translate(13,(p.t+H-p.b)/2);
      ctx.rotate(-Math.PI/2);
      ctx.fillText(swapped?`${m.short} [${m.unit}]`:'Count',0,0);
      ctx.restore();
      
    const tip=setupTooltip(canvas);
      canvas.onmouseleave=()=>hideTip(tip);
      canvas.onmousemove=e=>{
      const rect=canvas.getBoundingClientRect(),
      mx=(e.clientX-rect.left)*W/rect.width,
      my=(e.clientY-rect.top)*H/rect.height;
      if(mx<p.l||mx>W-p.r||my<p.t||my>H-p.b){hideTip(tip);
        return}const metricValue=swapped?mr[0]+(H-p.b-my)/plotH*(mr[1]-mr[0]):mr[0]+(mx-p.l)/plotW*(mr[1]-mr[0]),
      i=Math.max(0,Math.min(bins.length-1,Math.floor((metricValue-autoMetric[0])/(autoMetric[1]-autoMetric[0]||1)*bins.length))),
      bb=bins[i];
      showTip(tip,e,`<b>${axisFmt(bb.lo)}–${axisFmt(bb.hi)} ${esc(m.unit)}</b><br>Valid ${bb.valid}<br>Filter-excluded ${bb.invalid}`)};
      PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:swapped?cr:mr,y:swapped?mr:cr},onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});
      return bins;
      
  }
  function drawProfile(canvas,d,a,key,mask,zoom,onZoom,supportMask=null){
    const {ctx,W,H}=PV.plot.canvasFrame(canvas),
      m=a.metrics[key],
      vals=m.values.filter((v,i)=>Number.isFinite(v)&&(!supportMask||supportMask[i])),
      all=a.metrics[key].values,
      p={l:62,r:18,t:24,b:48},
      autoX=[1,Math.max(1,all.length)],
      autoY=vals.length?[Math.min(...vals),Math.max(...vals)]:[0,1],
      xr=PV.plot.resolve(autoX,zoom?.x),
      yr=PV.plot.resolve(autoY,zoom?.y),
      X=i=>p.l+(i+1-xr[0])/(xr[1]-xr[0]||1)*(W-p.l-p.r),
      Y=v=>H-p.b-(v-yr[0])/(yr[1]-yr[0]||1)*(H-p.t-p.b);
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle=css('--chart-bg');
      ctx.fillRect(0,0,W,H);
      
    ctx.strokeStyle=css('--grid');
      ctx.fillStyle=css('--muted');
      ctx.font='11px system-ui';
      for(const yv of niceTicks(yr[0],yr[1],5)){
      const y=Y(yv);
      ctx.beginPath();
      ctx.moveTo(p.l,y);
      ctx.lineTo(W-p.r,y);
      ctx.stroke();
      ctx.textAlign='right';
      ctx.fillText(axisFmt(yv),p.l-7,y+3)}for(const xv of niceTicks(xr[0],xr[1],5)){
      const x=p.l+(xv-xr[0])/(xr[1]-xr[0]||1)*(W-p.l-p.r);
      ctx.strokeStyle=css('--grid2');
      ctx.beginPath();
      ctx.moveTo(x,p.t);
      ctx.lineTo(x,H-p.b);
      ctx.stroke();
      ctx.fillStyle=css('--muted');
      ctx.textAlign='center';
      ctx.fillText(String(Math.round(xv)),x,H-18)}
    ctx.save();
      ctx.beginPath();
      ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
      ctx.clip();
      ctx.strokeStyle=css('--blue');
      ctx.lineWidth=1.4;
      ctx.beginPath();
      let pen=false;
      all.forEach((v,i)=>{
      const xx=i+1;if(!mask[i]||!Number.isFinite(v)||xx<xr[0]||xx>xr[1]||v<yr[0]||v>yr[1]){pen=false;return}const x=X(i),
      y=Y(v);pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true});
      ctx.stroke();
      all.forEach((v,i)=>{
      const xx=i+1;if(!Number.isFinite(v)||xx<xr[0]||xx>xr[1]||v<yr[0]||v>yr[1])return;ctx.beginPath();ctx.arc(X(i),Y(v),mask[i]?1.8:2.4,0,2*Math.PI);ctx.fillStyle=mask[i]?css('--blue'):css('--bad');ctx.globalAlpha=mask[i]?.8:.55;ctx.fill();ctx.globalAlpha=1});
      ctx.restore();
      ctx.strokeStyle=css('--soft');
      ctx.strokeRect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
      ctx.fillStyle=css('--muted');
      ctx.textAlign='center';
      ctx.fillText('Acquisition index',(p.l+W-p.r)/2,H-3);
      ctx.save();
      ctx.translate(13,(p.t+H-p.b)/2);
      ctx.rotate(-Math.PI/2);
      ctx.fillText(`${m.short} [${m.unit}]`,0,0);
      ctx.restore();
      
    const tip=setupTooltip(canvas);
      canvas.onmouseleave=()=>hideTip(tip);
      canvas.onmousemove=e=>{
      const rect=canvas.getBoundingClientRect(),
      mx=(e.clientX-rect.left)*W/rect.width,
      idx=Math.round(xr[0]-1+(mx-p.l)/(W-p.l-p.r)*(xr[1]-xr[0]));
      if(idx<0||idx>=all.length){hideTip(tip);
        return}const pt=d.coords[idx]||{},
      v=all[idx];
      const available=!supportMask||supportMask[idx],
        state=available?(mask[idx]?'VALID':'FILTERED'):'UNAVAILABLE';
      showTip(tip,e,`<b>Point ${idx+1}</b><br>X ${fmt(pt.x,1)} mm · Y ${fmt(pt.y,1)} mm<br>${esc(m.short)} = ${fmt(v,4)} ${esc(m.unit)}<br><span class="${mask[idx]?'good':'bad'}">${state}</span>`)};
      PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});
      
  }
  function downloadMetric(d,a,key,mask,supportMask){const m=a.metrics[key];
    PV.exporter.csv(
      `${safe(d.resultName)}_${key}.csv`,
      ['Index','X [mm]','Y [mm]','Raw lifetime [µs]',`${m.label} [${m.unit}]`,'Lifetime available','Active filter valid'],
      m.values.map((v,i)=>[i+1,d.coords[i]?.x??'',d.coords[i]?.y??'',d.values[i],v,supportMask[i]?'YES':'NO',mask[i]?'YES':'NO'])
    )}
  function render(host,d,a){
    let analysisOptions={vocModel:'pv2000',srvEnabled:false,surfaceMode:'planar',bulkLifetimeUs:Infinity,planarSrv:5,minLifetimeUs:0},
      excludeInvalid=true,
      metricKey='lifetime',
      selected=0,
      histSwapped=true,
      histBins=30,
      mapMode='smooth',
      zoom={map:{x:null,y:null},hist:{x:null,y:null},profile:{x:null,y:null}};
    a=applyAnalysisOptions(d,a,analysisOptions);
    const visibleMetrics=()=>Object.fromEntries(
      Object.entries(a.metrics).filter(([key])=>key!=='srv'||analysisOptions.srvEnabled)
    );
    let supportMask=intrinsicLifetimeMask(d.values,excludeInvalid),
      filterController=Sel.createFilter({
        metrics:visibleMetrics(),
        siteCount:d.values.length,
        intrinsicMask:supportMask,
        metricKey:'lifetime'
      });
      
    const activeMask=()=>filterController.snapshot().selection.activeMask,
      statsFor=k=>summaryMasked(a.metrics[k].values,activeMask());
    const targetSummary=()=>{
      if(d.targetType==='SquareCell'&&Number.isFinite(d.targetWidth)&&Number.isFinite(d.targetHeight)){
        const geometryLabel=d.patternType==='SquareRegionPattern'?'explicit SquareRegion raster':d.patternType==='HighDensityPattern'?'inferred HighDensity coefficients':'inferred centered MapPattern';
        return `${fmt(d.targetWidth)} × ${fmt(d.targetHeight)} mm square · edge ${fmt(d.edgeExclusion)} mm · ${fmt(d.waferThickness)} µm · ${geometryLabel}`;
      }
      return `${fmt(d.diameter)} mm round · edge ${fmt(d.edgeExclusion)} mm · ${fmt(d.waferThickness)} µm`;
    };
    function summaryCards(){
      return Object.values(visibleMetrics()).map(m=>{
        const st=statsFor(m.key),
          primary=Number.isFinite(st.mean)?`${fmt(st.mean)} ± ${fmt(st.stdev)} ${m.unit}`:'—',
          secondary=Number.isFinite(st.median)?`median ${fmt(st.median)} · range ${fmt(st.min)}–${fmt(st.max)} ${m.unit}`:'unavailable';
        return`<dt>${esc(m.short)} ${help(m.help)}</dt><dd><strong>${esc(primary)}</strong><small>${esc(secondary)}</small></dd>`;
      }).join('');
    }
    function metaRow(k,v,h=''){return`<dt>${esc(k)}${h?` ${help(h)}`:''}</dt><dd>${esc(v||'—')}</dd>`}
    function selectedHtml(){
      const state=filterController.snapshot(),
        pt=d.coords[selected],
        support=state.selection.supportMask[selected],
        active=state.selection.activeMask[selected],
        status=support?(active?'VALID':'FILTERED'):'UNAVAILABLE',
        coordinate=pt?`X ${fmt(pt.x,2)} mm · Y ${fmt(pt.y,2)} mm`:'—',
        values=Object.values(visibleMetrics()).map(m=>{
          const value=Number.isFinite(m.values[selected])?`${fmt(m.values[selected])} ${m.unit}`:'—';
          return metaRow(m.short,value);
        }).join('');
      return `<dl class="meta">${metaRow('Point',String(selected+1))}${metaRow('Valid-data state',status)}${metaRow('Coordinate',coordinate)}${values}</dl>`;
    }
    function renderShell(){
      const filterState=filterController.snapshot(),
        validN=filterState.validCount,
        onePoint=d.values.length===1,
        mapHelpText=[
          'The solid outline follows the XML target type and nominal size; when EdgeExclusion is present, the dashed inner outline shows the scheduled measurement region.',
          'The faint rectangular frame is only the plot boundary.',
          'Scroll normally moves this pane. Hold Ctrl/⌘ while scrolling inside the map to zoom both spatial axes; hold Ctrl/⌘ over one axis to zoom only that direction; double-click restores auto scale.',
          'Smooth mode is clipped to the scheduled region and uses only valid measured points for interpolation. Points mode shows actual sites.'
        ].join(' ');
      host.innerHTML=`<div class="module-grid qss-module"><aside class="side">
        <section class="panel"><h3>Measurement ${help('Core XML measurement identity and sample context. Timing and acquisition settings are kept under Full metadata.')}</h3><dl class="meta">
          ${metaRow('Result',d.resultName,'Result identifier stored in the PV-2000 job XML.')}
          ${metaRow('Recipe',d.name,'PV-2000 recipe/job name used for this measurement.')}
          ${metaRow('Substrate',d.substrateId,'Substrate identifier stored with the result.')}
          ${metaRow('Status',d.status,'PV-2000 execution status recorded in the result XML.')}
          ${metaRow('Pattern',`${d.patternName} · ${fmt(d.pitchX)} × ${fmt(d.pitchY)} mm`,'Measurement pattern and effective X/Y site pitch.')}
          ${metaRow('Target',targetSummary(),'Nominal target geometry stored by the XML.')}
          ${metaRow('Doping',`${fmt(d.doping)} cm⁻³ ${d.dopingType}`,'Base doping concentration and conductivity type used by derived lifetime quantities.')}
        </dl></section>
        <section class="panel current-dataset-panel"><h3>Current dataset ${help('Completeness and active-population counts for the imported XML; these are not vendor-export validation claims.')}</h3><div class="validation">
          <div><b>${d.values.length}</b><span>XML points</span></div>
          <div><b>${validN} / ${d.values.length}</b><span>pass valid-data filter</span></div>
          <div><b>${d.coords.length} / ${d.values.length}</b><span>coordinates generated</span></div>
          <div><b>${a.audit.invalidLifetimeCount}</b><span>raw τ ≤ 0 sentinel</span></div>
        </div></section>
        <section class="panel"><h3>Analysis controls ${help('These are Analyzer interpretation controls, not PV-2000 recipe parameters. Lifetime handling changes only scientific availability; raw XML lifetime values remain preserved. PV-2000 compatible is the vendor-comparison path for Implied Voc, while Physical Si/Ge are optional Analyzer estimates.')}</h3>
          <div class="filter-grid qss-analysis-grid">
            <label>Lifetime handling<select id="qInvalidMode"><option value="exclude"${excludeInvalid?' selected':''}>Scientific — exclude τ ≤ 0</option><option value="raw"${excludeInvalid?'':' selected'}>Raw XML/controller values</option></select></label>
            <label>Implied Voc model<select id="qVocModel"><option value="pv2000"${analysisOptions.vocModel==='pv2000'?' selected':''}>PV-2000 compatible</option><option value="physical-si"${analysisOptions.vocModel==='physical-si'?' selected':''}>Physical Si · Analyzer</option><option value="physical-ge"${analysisOptions.vocModel==='physical-ge'?' selected':''}>Physical Ge · Analyzer</option></select></label>
          </div>
          <div class="filter-actions"><span class="grow"></span><button id="qApplyAnalysis">Apply analysis</button></div>
        </section>
        <details class="panel qss-srv-panel">
          <summary>Additional SRV analysis ${help('Analyzer-only lifetime-to-SRV post-processing. It is not a PV-2000 result or recipe parameter. SRV is disabled by default and must be enabled explicitly.')}</summary>
          <div class="qss-srv-body">
            <label class="check-row"><input id="qSrvEnabled" type="checkbox"${analysisOptions.srvEnabled?' checked':''}> Calculate SRV</label>
            <div class="filter-grid qss-analysis-grid">
              <label>Surface geometry<select id="qSrvMode"><option value="planar"${analysisOptions.surfaceMode==='planar'?' selected':''}>Planar</option><option value="textured"${analysisOptions.surfaceMode==='textured'?' selected':''}>Textured / black</option></select></label>
              <label>Bulk lifetime [µs]<input id="qSrvBulk" type="number" min="0" step="any" placeholder="∞" value="${Number.isFinite(analysisOptions.bulkLifetimeUs)?analysisOptions.bulkLifetimeUs:''}"></label>
              <label id="qSrvPlanarWrap" style="display:${analysisOptions.surfaceMode==='textured'?'':'none'}">Planar-reference SRV [cm/s]<input id="qSrvPlanar" type="number" min="0" step="any" value="${analysisOptions.planarSrv}"></label>
              <label>Minimum lifetime for SRV [µs]<input id="qSrvMinTau" type="number" min="0" step="any" value="${analysisOptions.minLifetimeUs||''}" placeholder="0"></label>
            </div>
            <div class="filter-actions"><span class="grow"></span><button id="qApplySrv">Apply SRV analysis</button></div>
          </div>
        </details>
        ${PV.ui.validDataFilterMarkup({
          prefix:'qFilter',
          metrics:visibleMetrics(),
          state:filterState,
          helpText:'Use a physically meaningful distribution range to exclude locations that are not on the measured sample, for example when measuring a quarter wafer or a small coupon. The same valid-point mask is then applied to every derived parameter and all summary statistics.',
          centralTitle:'Set limits to the 1st–99th percentile of the selected filter metric. This is only a convenience starting point; inspect the distribution before accepting it.',
          resetTitle:'Reset the range to include every point available under the current lifetime-validity mode.',
          applyTitle:'Recalculate the valid-point mask and all summary statistics using the entered lower/upper limits.'
        })}
        <section class="panel qss-results-panel"><h3>Results summary ${help('Each row shows mean ± sample standard deviation for the active valid population; median and min–max range remain available on the compact second line. SRV appears only when Additional SRV analysis is explicitly enabled.')}</h3><dl class="meta compact-summary">${summaryCards()}</dl></section>
        <details class="panel">\
<summary>Full metadata</summary>\
<dl class="meta meta-detail">${metaRow('Lot ID',d.lotId||'—','Lot identifier stored with the result; it may be empty for manually measured samples.')}\
${metaRow('Result time',d.end,'Measurement completion timestamp from ExecutionInfo/EndTime.')}\
${metaRow('Elapsed',d.elapsed,'Total elapsed execution time recorded by PV-2000.')}\
${metaRow('QSS intensity',`${fmt((d.qssMilli||0)/1000)} sun`,'Steady-state illumination intensity used during the QSS-µPCD map measurement.')}\
${metaRow('Laser power',`${fmt(d.laserPower)} E11`,'PV-2000 pulsed-laser power setting used for the small-perturbation decay measurement.')}\
${metaRow('uPCD avg mode',fmt(d.avgMode),'Transient averaging mode resolved from the XML Averaging index/AveragingValues list.')}\
${metaRow('Transient',d.transient||'—','Transient acquisition mode reported in the PV-2000 HeaderInfo.')}\
${metaRow('Optical factor',fmt(d.opticalFactor),'Correction factor used in the generation-rate calculation for optical losses such as reflection/transmission.')}\
${metaRow('Probe / bias',`${d.probe||'—'} / ${d.bias||'—'}`,'Microwave probe side and QSS-bias illumination side stored in the XML.')}\
${metaRow('Chuck temperature',`${fmt(d.temperatureC)} °C`,'Measured chuck temperature. The analyzer uses it in the temperature-dependent implied-Voc compatibility calculation.')}\
${metaRow('Measurement velocity',fmt(d.measurementVelocity),'PV-2000 motion/measurement velocity recorded for the iteration.')}\
${metaRow('Tau steady-state factor',fmt(d.tauSteadyStateFactor,6),'PV-2000 iteration-level steady-state lifetime factor stored in the XML; displayed for traceability and not substituted for the measured τeff.d map values.')}\
${metaRow('QDC value',fmt(d.qdcValue,6),'Iteration-level Quality of Decay control value. QD near 1 indicates a decay close to ideal exponential behavior.')}\
${metaRow('Evaluation mode',d.evaluationMode||'—','Transient lifetime evaluation mode selected by the XML EvalutationMode index, e.g. SL/64 or 1/e.')}\
${metaRow('Do autosetting',d.autoset,'Whether PV-2000 automatic measurement setting was enabled.')}\
${metaRow('Rastering',d.doRastering,'Whether the PV-2000 recipe requested rastering. Coordinate reconstruction still follows the pattern/order stored by this result type.')}\
${metaRow('Save transient',d.saveTransient,'Whether individual transient waveforms were requested to be saved by the recipe.')}\
${metaRow('Point averaging',`${d.pointAverage||'—'} (${fmt(d.pointAverageCount)})`,'Whether repeated point averaging was enabled and the configured repeat count.')}\
${metaRow('QSS range',`${fmt(d.qssRangeMin)}–${fmt(d.qssRangeMax)}`,'Configured QSS illumination operating range from the XML.')}\
${metaRow('Fe constant',fmt(d.feConstant),'Calibration constant used only when Fe-concentration processing is enabled in an appropriate QSS-µPCD/ALID workflow.')}\
${metaRow('LID constant',fmt(d.lidConstant),'Calibration constant used only when LID-defect processing is enabled in an appropriate QSS-µPCD/ALID workflow.')}</dl>\
</details>
      </aside><section class="plots overview">
        <div class="panel chart"><header>
          <b>${onePoint?'Measurement position':'Wafer map'}</b>
          ${help(mapHelpText)}
          <span class="grow"></span>
          <select id="qMetric">
            <option value="lifetime">τeff.d</option>
            <option value="smax">Smax</option>
            <option value="voc">Implied Voc</option>
            ${analysisOptions.srvEnabled?'<option value="srv">SRV</option>':''}
          </select>
          <select id="qMapMode"><option value="smooth">Smooth</option><option value="points">Points</option></select>
          ${PV.plot.axisControls('qMapAxes')}
          <button id="qExportMap" title="Export all sites for the selected metric, including X/Y coordinates and the current validity flag.">Export</button>
        </header><div class="canvas-wrap"><canvas id="qMap"></canvas></div></div>
        ${onePoint?'':`<div class="panel chart"><header><b>Distribution</b>${help('Count is the default X axis. Open Axes for manual X/Y limits, Swap axes, and Bins; fewer bins make wider bars and more bins make narrower bars. Bars count only points that pass the active Valid-data filter and use the wafer-map color scale. Excluded points are omitted from the plotted Count; yellow lines show the active validity limits.')}<span class="grow"></span>${PV.plot.axisControls('qHistAxes',{distribution:true,swapped:histSwapped})}${PV.plot.binControls('qHistBins',histBins)}<button id="qExportHist" title="Export histogram bins with valid and excluded counts.">Export</button></header><div class="canvas-wrap"><canvas id="qHist"></canvas></div></div>
        <div class="panel chart"><header><b>Acquisition profile</b>${help('This is a whole-dataset acquisition-order profile. Scroll normally moves this pane. Hold Ctrl/⌘ while scrolling inside the profile to zoom both axes; hold Ctrl/⌘ over one axis to zoom only that axis; double-click restores auto scale. Axes opens manual numeric X/Y limits.')}<span class="grow"></span>${PV.plot.axisControls('qProfileAxes')}<button id="qExportProfile" title="Export point-by-point values, coordinates and validity state.">Export</button></header><div class="canvas-wrap"><canvas id="qProfile"></canvas></div></div>`}
      </section><section class="plots detail"><section class="panel"><h3>${d.values.length===1?'Measurement point':'Selected site'}</h3><div id="qSelected">${selectedHtml()}</div></section></section></div>`;
      host.querySelector('#qMetric').value=metricKey;host.querySelector('#qMapMode').value=mapMode;
        host.querySelector('#qMapMode').onchange=e=>{mapMode=e.target.value;
        redraw()};
        
      PV.ui.bindValidDataFilter(host,{
        prefix:'qFilter',
        controller:filterController,
        linkedSelect:'#qMetric',
        onChange:state=>{metricKey=state.metricKey;zoom={map:{x:null,y:null},hist:{x:null,y:null},profile:{x:null,y:null}};renderShell()},
        onError:message=>alert(
          message==='Valid-data filter requires finite lower and upper bounds.'
            ?'Enter finite lower and upper limits.'
            :message
        )
      });
      const srvMode=host.querySelector('#qSrvMode'),
        srvPlanarWrap=host.querySelector('#qSrvPlanarWrap');
      srvMode.onchange=()=>{srvPlanarWrap.style.display=srvMode.value==='textured'?'':'none'};
      const applyControls=()=>{
        const srvEnabled=host.querySelector('#qSrvEnabled').checked,
          bulkText=host.querySelector('#qSrvBulk').value.trim(),
          bulk=bulkText===''?Infinity:Number(bulkText),
          planarSrv=Number(host.querySelector('#qSrvPlanar').value),
          minTauText=host.querySelector('#qSrvMinTau').value.trim(),
          minTau=minTauText===''?0:Number(minTauText),
          surfaceMode=srvMode.value;
        if(srvEnabled&&(Number.isFinite(bulk)&&bulk<=0||!Number.isFinite(bulk)&&bulk!==Infinity))return alert('Bulk lifetime must be positive or blank for infinity.');
        if(srvEnabled&&surfaceMode==='textured'&&(!Number.isFinite(planarSrv)||planarSrv<0))return alert('Planar-reference SRV must be a finite non-negative value.');
        if(srvEnabled&&(!Number.isFinite(minTau)||minTau<0))return alert('Minimum lifetime must be a finite non-negative value.');
        excludeInvalid=host.querySelector('#qInvalidMode').value!=='raw';
        analysisOptions={
          vocModel:host.querySelector('#qVocModel').value,
          srvEnabled,
          surfaceMode,
          bulkLifetimeUs:bulk,
          planarSrv,
          minLifetimeUs:minTau
        };
        const previousFilterMetric=filterController.snapshot().metricKey;
        a=applyAnalysisOptions(d,a,analysisOptions);
        supportMask=intrinsicLifetimeMask(d.values,excludeInvalid);
        const nextMetrics=visibleMetrics(),
          nextFilterMetric=nextMetrics[previousFilterMetric]?previousFilterMetric:'lifetime';
        if(!nextMetrics[metricKey])metricKey='lifetime';
        const synchronizedMetric=nextMetrics[metricKey]?metricKey:nextFilterMetric;
        metricKey=synchronizedMetric;
        filterController=Sel.createFilter({
          metrics:nextMetrics,
          siteCount:d.values.length,
          intrinsicMask:supportMask,
          metricKey:synchronizedMetric
        });
        zoom={map:{x:null,y:null},hist:{x:null,y:null},profile:{x:null,y:null}};
        renderShell();
      };
      host.querySelector('#qApplyAnalysis').onclick=applyControls;
      host.querySelector('#qApplySrv').onclick=applyControls;
      redraw();
    }
    function redraw(){
      const filterState=filterController.snapshot(),
        mask=filterState.selection.activeMask,
        filterKey=filterState.metricKey,
        filterLo=filterState.lower,
        filterHi=filterState.upper,
        histCanvas=host.querySelector('#qHist'),
        profileCanvas=host.querySelector('#qProfile'),
        bins=histCanvas
          ?drawHist(histCanvas,a,metricKey,mask,filterKey,filterLo,filterHi,histBins,histSwapped,zoom.hist,n=>{zoom.hist=n;redraw()},supportMask)
          :[];
      drawMap(host.querySelector('#qMap'),d,a,metricKey,mapMode,mask,selected,zoom.map,n=>{zoom.map=n;redraw()},i=>{
        selected=i;
        host.querySelector('#qSelected').innerHTML=selectedHtml();
        redraw();
      },supportMask);
      if(profileCanvas)drawProfile(profileCanvas,d,a,metricKey,mask,zoom.profile,n=>{zoom.profile=n;redraw()},supportMask);
      PV.plot.bindAxisControls(host,'qMapAxes',zoom.map,n=>{zoom.map=n;redraw()});
      if(histCanvas){
        PV.plot.bindAxisControls(host,'qHistAxes',zoom.hist,n=>{zoom.hist=n;redraw()},{
          swapped:histSwapped,
          onSwap:()=>{histSwapped=!histSwapped;zoom.hist={x:null,y:null};redraw()}
        });
        PV.plot.bindBinControls(host,'qHistBins',histBins,n=>{histBins=n;zoom.hist={x:null,y:null};redraw()});
      }
      if(profileCanvas)PV.plot.bindAxisControls(host,'qProfileAxes',zoom.profile,n=>{zoom.profile=n;redraw()});
      host.querySelector('#qExportMap').onclick=()=>downloadMetric(d,a,metricKey,mask,supportMask);
      const profileExport=host.querySelector('#qExportProfile');
      if(profileExport)profileExport.onclick=()=>downloadMetric(d,a,metricKey,mask,supportMask);
      const histExport=host.querySelector('#qExportHist');
      if(histExport)histExport.onclick=()=>{
        const unit=a.metrics[metricKey].unit;
        PV.exporter.csv(`${safe(d.resultName)}_${metricKey}_histogram.csv`,[`Bin low [${unit}]`,`Bin high [${unit}]`,'Valid count','Filter-excluded count'],bins.map(b=>[b.lo,b.hi,b.valid,b.invalid]));
      };
    }
    document.addEventListener('pv-theme-change',()=>{if(host.isConnected)redraw()});renderShell();
    PV.plot.observeResize(host,redraw);
  }
  PV.modules=PV.modules||{};
    PV.modules.qss={types:['QssUpcdMeasurement'],parse,analyze,render,smax,pv2000SmaxResult,generation,impliedVoc,pv2000ImpliedVocResult,impliedVocPhysical,niCompat,niPhysical,surfaceRecombinationVelocity,applyAnalysisOptions,intrinsicLifetimeMask,histogram,smoothValueAt,effectiveMapRadius,effectiveMapHalfExtent,highDensityCoords,targetGeometry,insideScheduled,constants:{NI300_MANUAL,NI300_GE,PV2000_NI,PV2000_T_OFFSET,PV2000_K,PV2000_Q}};
    PV.registry.register(PV.modules.qss);
    
})(typeof window!=='undefined'?window:globalThis);
