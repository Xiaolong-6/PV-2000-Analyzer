(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,GEO=PV.geometry,Sel=PV.selection,Profiles=PV.profiles;
  const Q=1.602176634e-19,K=1.380649e-23,KB_EV=8.617333262145e-5;
  const NI_BASORE_COMPAT=8.626227186463587e9;
  const NI_VOC_300=[1.1136399052670412e10,1.107764334152709e10];
  const safe=s=>String(s||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');
  const esc=v=>PV.ui.escapeHtml(v),help=t=>PV.ui.help(t),css=n=>PV.ui.cssVar(n);
  const fmt=(v,n=3)=>!Number.isFinite(v)?'—':Math.abs(v)>=1e4||Math.abs(v)<1e-2?v.toExponential(n):v.toFixed(n);

  function qssIntensities(m,c){
    const pre=X.direct(m,'PreProcessings'),out=[];
    for(const group of X.children(pre)){
      const setting=X.children(group)[0],v=X.num(setting,'QssLampIntensity',NaN);
      if(Number.isFinite(v))out.push(v);
    }
    if(out.length>=2)return out.slice(0,2);
    const raw=c.header['QSS Intensity (1st,2nd)']||'';
    return raw.split(',').map(Number).filter(Number.isFinite).slice(0,2);
  }
  function iterationValues(iter){
    const data=X.direct(iter,'Data');
    return X.children(data).filter(e=>X.lname(e)==='DataItem').map(e=>X.num(e,'Value',NaN));
  }
  function parse(parsed){
    const m=parsed.measurement,
      c=X.common(parsed),
      md=X.direct(m,'MeasurementData'),
      itd=X.direct(md,'IterationData'),
      iterations=X.children(itd).filter(e=>X.lname(e)==='Iteration'),
      values=iterations.slice(0,2).map(iterationValues),
      pattern=X.direct(m,'Pattern'),
      target=X.direct(m,'Target'),
      size=X.direct(target,'Size'),
      pitch=X.direct(pattern,'Pitch'),
      region=X.direct(pattern,'Region'),
      regionLocation=X.direct(region,'Location'),
      regionSize=X.direct(region,'Size'),
      dimension=X.direct(pattern,'Dimension'),
      patternType=X.attrType(pattern),
      targetType=X.attrType(target),
      targetWidth=X.num(size,'Width',NaN),
      targetHeight=X.num(size,'Height',NaN),
      diameter=X.num(target,'Diameter',NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',0)),
      rawPitchX=X.num(pitch,'X',NaN),
      rawPitchY=X.num(pitch,'Y',NaN),
      regionX=X.num(region,'X',X.num(regionLocation,'X',NaN)),
      regionY=X.num(region,'Y',X.num(regionLocation,'Y',NaN)),
      regionWidth=X.num(region,'Width',X.num(regionSize,'Width',NaN)),
      regionHeight=X.num(region,'Height',X.num(regionSize,'Height',NaN)),
      nx=X.num(dimension,'X',NaN),
      ny=X.num(dimension,'Y',NaN),
      regionPitchX=Number.isFinite(nx)&&nx>1&&Number.isFinite(regionWidth)?regionWidth/(nx-1):NaN,
      regionPitchY=Number.isFinite(ny)&&ny>1&&Number.isFinite(regionHeight)?regionHeight/(ny-1):NaN,
      pitchX=Number.isFinite(rawPitchX)?rawPitchX:regionPitchX,
      pitchY=Number.isFinite(rawPitchY)?rawPitchY:regionPitchY,
      coefficientNode=X.direct(pattern,'Coefficients'),
      rawCoefficients=coefficientNode?X.children(coefficientNode).map(p=>({
        x:X.num(p,'X',NaN),
        y:X.num(p,'Y',NaN)
      })):[],
      incompleteStatus=GEO.isIncompleteAcquisitionStatus(c.status),
      siteCount=Math.max(0,...values.map(v=>v.length)),
      qssMilli=qssIntensities(m,c);

    if(!iterations.length)throw new Error('JZeroMeasurement contains no lifetime iterations.');
    if(iterations.length>2)throw new Error(
      `JZeroMeasurement currently supports at most two QSS lifetime iterations; found ${iterations.length} iterations.`
    );
    if(!values[0]?.length)throw new Error('JZeroMeasurement first lifetime iteration contains no sites.');
    if(iterations.length<2&&!incompleteStatus)throw new Error(
      `JZeroMeasurement requires two lifetime iterations for a completed acquisition; found ${iterations.length}.`
    );
    if(values.length>=2&&values[0].length!==values[1].length&&!incompleteStatus)throw new Error(
      'JZeroMeasurement completed lifetime iterations must contain the same number of sites.'
    );
    if(!Number.isFinite(qssMilli[0])||qssMilli[0]<=0)throw new Error(
      'JZeroMeasurement requires a finite positive first QSS intensity.'
    );
    if(iterations.length>=2&&(!Number.isFinite(qssMilli[1])||qssMilli[1]<=0))throw new Error(
      'JZeroMeasurement requires a finite positive second QSS intensity when the second lifetime iteration is present.'
    );

    const geometryModel=GEO.resolveMeasurementGeometry({
        patternType,
        targetType,
        rawCoefficients,
        pointCount:siteCount,
        diameter,
        targetWidth,
        targetHeight,
        edgeExclusion,
        substrateShape:c.shapeType,
        substrateRadius:c.radius,
        pitchX:rawPitchX,
        pitchY:rawPitchY,
        regionX,
        regionY,
        regionWidth,
        regionHeight,
        nx,
        ny,
        allowPartialPrefix:incompleteStatus
      }),
      coords=geometryModel.pointsMm,
      mapHalfWidth=geometryModel.scheduled?.halfWidth,
      mapHalfHeight=geometryModel.scheduled?.halfHeight,
      mapRadius=geometryModel.scheduled?.radius;

    if(coords.length!==siteCount)throw new Error(
      `JZeroMeasurement data are supported, but geometry could not resolve ${patternType||'unknown pattern'} + ${targetType||'unknown target'}: ${coords.length} coordinates for ${siteCount} lifetime sites.`
    );

    const avgIndex=X.num(m,'Averaging',NaN),
      avgValues=X.direct(m,'AveragingValues'),
      avgList=avgValues?X.children(avgValues).map(e=>Number(e.textContent)).filter(Number.isFinite):[],
      avgMode=Number.isInteger(avgIndex)&&avgIndex>=0&&avgIndex<avgList.length?avgList[avgIndex]:NaN,
      secondAvgIndex=X.num(m,'SecondAveraging',NaN),
      secondAvgMode=Number.isInteger(secondAvgIndex)&&secondAvgIndex>=0&&secondAvgIndex<avgList.length?avgList[secondAvgIndex]:NaN,
      evalIndex=X.num(m,'EvalutationMode',NaN),
      evalNode=X.direct(m,'EvaluationModes'),
      evalList=evalNode?X.children(evalNode).map(e=>e.textContent.trim()):[],
      evaluationMode=Number.isInteger(evalIndex)&&evalIndex>=0&&evalIndex<evalList.length?evalList[evalIndex]:'',
      completePair=values.length===2&&values[0].length>0&&values[0].length===values[1].length,
      validatedCalculation=completePair&&!incompleteStatus,
      resolvedGeometryProfile=geometryModel.geometryStatus==='complete'
        ?Profiles.resolveGeometry({geometryModel})
        :null,
      geometryStatus=resolvedGeometryProfile?.status||
        (geometryModel.geometryStatus==='partial'?'partial':'inferred'),
      pairedSiteCount=values.length>=2?Math.min(values[0].length,values[1].length):0;

    return{
      ...c,
      values,
      coords,
      siteCount,
      pairedSiteCount,
      iterationSiteCounts:values.map(v=>v.length),
      geometryModel,
      rawCoefficients,
      calculationProfile:{
        id:validatedCalculation?'JZERO-CALC-001':null,
        status:validatedCalculation?'validated':completePair?'inferred':'incomplete'
      },
      geometryProfile:{
        id:resolvedGeometryProfile?.id||null,
        status:geometryStatus
      },
      iterations:iterations.length,
      patternType,
      patternName:X.text(pattern,'Name',''),
      patternDisplayName:X.text(pattern,'DisplayName',''),
      targetType,
      targetWidth,
      targetHeight,
      diameter,
      edgeExclusion,
      pitchX,
      pitchY,
      regionX,
      regionY,
      regionWidth,
      regionHeight,
      nx,
      ny,
      mapHalfWidth,
      mapHalfHeight,
      mapRadius,
      qssMilli,
      waferThickness:X.num(m,'WaferThickness',NaN),
      doping:X.num(m,'Doping',NaN),
      dopingType:X.text(m,'DopingType',''),
      opticalFactor:X.num(m,'OpticalFactor',1),
      laserPower:X.num(m,'LaserPower',NaN),
      avgMode,
      secondAvgMode,
      evaluationMode,
      probe:X.text(m,'ProbeSelection',''),
      bias:X.text(m,'QssBiasSelection',''),
      doRastering:X.text(m,'DoRastering',''),
      autoset:X.text(m,'DoAutoSetting',''),
      saveTransient:X.text(m,'SaveTransient',''),
      temperatures:iterations.slice(0,2).map(it=>X.num(it,'ChuckTemperature',NaN)),
      measurementVelocities:iterations.slice(0,2).map(it=>X.num(it,'MeasurementVelocity',NaN)),
      tauSteadyStateFactors:iterations.slice(0,2).map(it=>X.num(it,'TauSteadyStateFactor',NaN)),
      qdcValues:iterations.slice(0,2).map(it=>X.num(it,'QDCValue',NaN)),
      raw:parsed
    };
  }
  function generation(intensityMilli,Wum,OF=1){
    const I=intensityMilli/1000,W=Wum*1e-4;
    return [I,W,OF].every(Number.isFinite)&&I>0&&W>0&&OF>0?2.38e17*I/W*OF:NaN;
  }
  function smax(tauUs,Wum){return tauUs>0&&Wum>0?(Wum*1e-4)/(2*tauUs*1e-6):NaN}
  function egSi(T){return 1.17-4.73e-4*T*T/(T+636)}
  function niAtTemperature(ni300,T){
    const ref=300;
    return ni300*(T/ref)**1.5*Math.exp(-egSi(T)/(2*KB_EV*T)+egSi(ref)/(2*KB_EV*ref));
  }
  function impliedVoc(tauUs,intensityMilli,d,index){
    const G=generation(intensityMilli,d.waferThickness,d.opticalFactor),T=Number.isFinite(d.temperatures[index])?d.temperatures[index]+273.15:300,N=d.doping;
    if(![tauUs,G,T,N].every(Number.isFinite)||tauUs<=0||G<=0||T<=0||N<=0)return NaN;
    const dn=G*tauUs*1e-6,ni=niAtTemperature(NI_VOC_300[Math.min(index,1)],T);
    return K*T/Q*Math.log(dn*(N+dn)/(ni*ni));
  }
  function basoreJ0(tau1Us,tau2Us,d){
    const G1=generation(d.qssMilli[0],d.waferThickness,d.opticalFactor),G2=generation(d.qssMilli[1],d.waferThickness,d.opticalFactor),W=d.waferThickness*1e-4;
    if(![tau1Us,tau2Us,G1,G2,W].every(Number.isFinite)||tau1Us<=0||tau2Us<=0||G2===G1||W<=0)return NaN;
    const t1=tau1Us*1e-6,t2=tau2Us*1e-6,slope=((1/t2)**2-(1/t1)**2)/(G2-G1);
    return Q*NI_BASORE_COMPAT*NI_BASORE_COMPAT*(W/4)*slope*1e15;
  }
  function analyze(d){
    const calcProfileId=d.calculationProfile?.id||null,
      calcValidation=d.calculationProfile?.status==='validated'?'validated':'inferred',
      vocValidated=d.geometryProfile?.id==='GEOM-MAP-PSEUDOSQUARE-001'&&calcValidation==='validated',
      vocProfileId=vocValidated?'JZERO-VOC-MAP-PSEUDOSQUARE-001':null,
      vocValidation=vocValidated?'reproduced-at-shown-precision':'inferred',
      tau1=d.values[0]||[],
      tau2=d.values[1]||[],
      n=Math.max(d.siteCount||0,tau1.length,tau2.length),
      tau1Full=Array.from({length:n},(_,i)=>Number.isFinite(tau1[i])?tau1[i]:NaN),
      tau2Full=Array.from({length:n},(_,i)=>Number.isFinite(tau2[i])?tau2[i]:NaN),
      j0=[],
      sm1=[],
      sm2=[],
      v1=[],
      v2=[];
    for(let i=0;i<n;i++){
      j0.push(basoreJ0(tau1Full[i],tau2Full[i],d));
      sm1.push(smax(tau1Full[i],d.waferThickness));
      sm2.push(smax(tau2Full[i],d.waferThickness));
      v1.push(impliedVoc(tau1Full[i],d.qssMilli[0],d,0));
      v2.push(impliedVoc(tau2Full[i],d.qssMilli[1],d,1));
    }
    const sun=i=>Number.isFinite(d.qssMilli[i])?`${fmt(d.qssMilli[i]/1000,2)} sun`:`QSS ${i+1}`;
    return{metrics:{
      j0:{
        key:'j0',
        profileId:calcProfileId,
        validation:calcValidation,
        short:'Basore J0',
        label:'Basore J0',
        unit:'fA/cm²',
        values:j0,
        help:'Emitter saturation current requires finite lifetime values at both QSS intensities for the same site. It remains unavailable when an acquisition ends before the paired second-intensity data are stored.'
      },
      tau1:{
        key:'tau1',
        profileId:calcProfileId,
        validation:calcValidation,
        short:`τeff.d (${sun(0)})`,
        label:`τeff.d (${sun(0)})`,
        unit:'µs',
        values:tau1Full,
        help:'Small-perturbation lifetime measured at the first QSS intensity.'
      },
      tau2:{
        key:'tau2',
        profileId:calcProfileId,
        validation:calcValidation,
        short:`τeff.d (${sun(1)})`,
        label:`τeff.d (${sun(1)})`,
        unit:'µs',
        values:tau2Full,
        help:'Small-perturbation lifetime measured at the second QSS intensity; unavailable at sites that were not acquired.'
      },
      smax1:{
        key:'smax1',
        profileId:calcProfileId,
        validation:calcValidation,
        short:`Smax (${sun(0)})`,
        label:`Smax (${sun(0)})`,
        unit:'cm/s',
        values:sm1,
        help:'Maximum surface recombination velocity estimate W/(2τ) at the first QSS intensity.'
      },
      smax2:{
        key:'smax2',
        profileId:calcProfileId,
        validation:calcValidation,
        short:`Smax (${sun(1)})`,
        label:`Smax (${sun(1)})`,
        unit:'cm/s',
        values:sm2,
        help:'Maximum surface recombination velocity estimate W/(2τ) at the second QSS intensity; unavailable where second-intensity lifetime is missing.'
      },
      voc1:{
        key:'voc1',
        profileId:vocProfileId,
        validation:vocValidation,
        short:`Implied Voc (${sun(0)})`,
        label:`Implied Voc (${sun(0)})`,
        unit:'V',
        values:v1,
        help:'Implied open-circuit voltage derived from the first QSS lifetime using the JZero compatibility calibration.'
      },
      voc2:{
        key:'voc2',
        profileId:vocProfileId,
        validation:vocValidation,
        short:`Implied Voc (${sun(1)})`,
        label:`Implied Voc (${sun(1)})`,
        unit:'V',
        values:v2,
        help:'Implied open-circuit voltage derived from the second QSS lifetime using the JZero compatibility calibration; unavailable where the second iteration is missing.'
      }
    }};
  }
  const summaryMasked=(values,mask)=>S.summary(values.filter((_,i)=>mask[i]));
  function color(t){
    t=Math.max(0,Math.min(1,t));
    const stops=[[0,[49,54,149]],[.25,[39,127,142]],[.5,[63,175,109]],[.75,[218,200,50]],[1,[220,55,55]]];
    let i=0;while(i<stops.length-2&&t>stops[i+1][0])i++;
    const[a,c1]=stops[i],[b,c2]=stops[i+1],u=(t-a)/(b-a);
    return`rgb(${c1.map((v,j)=>Math.round(v+(c2[j]-v)*u)).join(',')})`;
  }
  function ticks(lo,hi,n=5){
    if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo===hi)return[lo];
    const raw=(hi-lo)/n,p=10**Math.floor(Math.log10(Math.abs(raw))),q=raw/p,step=(q<=1?1:q<=2?2:q<=5?5:10)*p,start=Math.ceil(lo/step)*step,out=[];
    for(let x=start;x<=hi+step*1e-9;x+=step)out.push(x);return out;
  }
  function axisFmt(v){if(!Number.isFinite(v))return'';const a=Math.abs(v);return a>=1e4||a>0&&a<1e-2?v.toExponential(1):Number(v.toPrecision(4)).toString()}
  function insideTarget(d,x,y,scheduled=true){
    const g=d.geometryModel,
      boundary=scheduled?g?.scheduled:g?.nominal,
      shape=g?.shape;
    if(shape==='pseudo-square'&&boundary)return Math.abs(x)<=boundary.halfWidth&&Math.abs(y)<=boundary.halfHeight&&x*x+y*y<=boundary.radius*boundary.radius+1e-9;
    if(shape==='circle'&&boundary)return x*x+y*y<=boundary.radius*boundary.radius+1e-9;
    if(shape==='rect'&&boundary)return Math.abs(x)<=boundary.halfWidth&&Math.abs(y)<=boundary.halfHeight;
    return true;
  }
  function strokeTarget(ctx,d,Xp,Yp,scheduled=false){
    const hw=scheduled?d.mapHalfWidth:d.targetWidth/2,hh=scheduled?d.mapHalfHeight:d.targetHeight/2,r=scheduled?d.mapRadius:d.diameter/2;
    if(scheduled)ctx.setLineDash([6,4]);else ctx.setLineDash([]);
    ctx.strokeStyle=scheduled?css('--muted'):css('--text');ctx.lineWidth=scheduled?1:1.5;
    if(d.targetType==='PseudoSquareCell'){
      ctx.save();ctx.beginPath();ctx.rect(Xp(-hw),Yp(hh),Xp(hw)-Xp(-hw),Yp(-hh)-Yp(hh));ctx.clip();ctx.beginPath();ctx.ellipse(Xp(0),Yp(0),Math.abs(Xp(r)-Xp(0)),Math.abs(Yp(r)-Yp(0)),0,0,2*Math.PI);ctx.stroke();ctx.restore();
      ctx.save();ctx.beginPath();ctx.ellipse(Xp(0),Yp(0),Math.abs(Xp(r)-Xp(0)),Math.abs(Yp(r)-Yp(0)),0,0,2*Math.PI);ctx.clip();ctx.strokeRect(Xp(-hw),Yp(hh),Xp(hw)-Xp(-hw),Yp(-hh)-Yp(hh));ctx.restore();
    }else if(d.targetType==='RoundWafer'){
      ctx.beginPath();ctx.ellipse(Xp(0),Yp(0),Math.abs(Xp(r)-Xp(0)),Math.abs(Yp(r)-Yp(0)),0,0,2*Math.PI);ctx.stroke();
    }else if(d.targetType==='SquareCell')ctx.strokeRect(Xp(-hw),Yp(hh),Xp(hw)-Xp(-hw),Yp(-hh)-Yp(hh));
    ctx.setLineDash([]);
  }
  function clipScheduledTarget(ctx,d,Xp,Yp){
    const hw=d.mapHalfWidth,hh=d.mapHalfHeight,r=d.mapRadius;
    if(d.targetType==='PseudoSquareCell'){
      ctx.beginPath();
      ctx.rect(Xp(-hw),Yp(hh),Xp(hw)-Xp(-hw),Yp(-hh)-Yp(hh));
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(Xp(0),Yp(0),Math.abs(Xp(r)-Xp(0)),Math.abs(Yp(r)-Yp(0)),0,0,2*Math.PI);
      ctx.clip();
    }
  }
  function drawMap(canvas,d,a,key,mask,zoom,onZoom,pointsMode=false){
    const ctx=canvas.getContext('2d'),m=a.metrics[key],vals=m.values,W=canvas.width=760,H=canvas.height=440,p={l:56,r:82,t:24,b:46},plotW=W-p.l-p.r,plotH=H-p.t-p.b;
    const nominalHalf=Math.max(d.targetWidth/2||0,d.targetHeight/2||0,d.diameter/2||0,1)*1.06;
    let auto=PV.plot.equalAspectRanges([-nominalHalf,nominalHalf],[-nominalHalf,nominalHalf],plotW,plotH),xr=PV.plot.resolve(auto.x,zoom?.x),yr=PV.plot.resolve(auto.y,zoom?.y);
    const Xp=x=>p.l+(x-xr[0])/(xr[1]-xr[0]||1)*plotW,Yp=y=>p.t+(yr[1]-y)/(yr[1]-yr[0]||1)*plotH;
    ctx.fillStyle=css('--chart-bg');ctx.fillRect(0,0,W,H);ctx.strokeStyle=css('--grid2');ctx.lineWidth=1;
    for(const t of ticks(xr[0],xr[1])){const x=Xp(t);ctx.beginPath();ctx.moveTo(x,p.t);ctx.lineTo(x,H-p.b);ctx.stroke()}
    for(const t of ticks(yr[0],yr[1])){const y=Yp(t);ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(W-p.r,y);ctx.stroke()}
    const good=vals.filter((v,i)=>mask[i]&&Number.isFinite(v)),lo=good.length?Math.min(...good):0,hi=good.length?Math.max(...good):1;
    ctx.save();ctx.beginPath();ctx.rect(p.l,p.t,plotW,plotH);ctx.clip();clipScheduledTarget(ctx,d,Xp,Yp);
    const sx=Math.max(1.2,Math.abs(Xp((d.pitchX||1)/2)-Xp(-(d.pitchX||1)/2))),sy=Math.max(1.2,Math.abs(Yp((d.pitchY||1)/2)-Yp(-(d.pitchY||1)/2)));
    for(let i=0;i<d.coords.length;i++){
      const pt=d.coords[i],v=vals[i];if(!pt||!Number.isFinite(v)||!mask[i])continue;
      const x=Xp(pt.x),y=Yp(pt.y);if(pointsMode){ctx.beginPath();ctx.arc(x,y,2.1,0,2*Math.PI);ctx.fillStyle=color((v-lo)/(hi-lo||1));ctx.fill()}else{ctx.fillStyle=color((v-lo)/(hi-lo||1));ctx.fillRect(x-sx/2-.4,y-sy/2-.4,sx+.8,sy+.8)}
    }
    ctx.restore();strokeTarget(ctx,d,Xp,Yp,false);if(d.edgeExclusion>0)strokeTarget(ctx,d,Xp,Yp,true);
    ctx.fillStyle=css('--muted');
    ctx.textAlign='center';
    for(const t of ticks(xr[0],xr[1]))ctx.fillText(axisFmt(t),Xp(t),H-24);
    ctx.textAlign='right';
    for(const t of ticks(yr[0],yr[1]))ctx.fillText(axisFmt(t),p.l-7,Yp(t)+4);
    ctx.textAlign='center';
    ctx.fillText('X [mm]',p.l+plotW/2,H-4);
    ctx.save();ctx.translate(14,p.t+plotH/2);ctx.rotate(-Math.PI/2);ctx.fillText('Y [mm]',0,0);ctx.restore();
    const bx=W-50,by=p.t+12,bh=plotH-24,bw=13,grad=ctx.createLinearGradient(0,by+bh,0,by);for(let i=0;i<=10;i++)grad.addColorStop(i/10,color(i/10));ctx.fillStyle=grad;ctx.fillRect(bx,by,bw,bh);ctx.fillStyle=css('--muted');ctx.textAlign='left';ctx.fillText(axisFmt(hi),bx+bw+5,by+8);ctx.fillText(axisFmt(lo),bx+bw+5,by+bh);ctx.save();ctx.translate(W-7,by+bh/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.fillText(`${m.short} [${m.unit}]`,0,0);ctx.restore();
    const tip=PV.ui.setupTooltip(canvas);canvas.onmouseleave=()=>PV.ui.hideTooltip(tip);canvas.onmousemove=e=>{const r=canvas.getBoundingClientRect(),mx=(e.clientX-r.left)*W/r.width,my=(e.clientY-r.top)*H/r.height,x=xr[0]+(mx-p.l)/plotW*(xr[1]-xr[0]),y=yr[1]-(my-p.t)/plotH*(yr[1]-yr[0]);let bi=-1,bd=Infinity;for(let i=0;i<d.coords.length;i++){const pt=d.coords[i];if(!pt)continue;const dd=(pt.x-x)**2+(pt.y-y)**2;if(dd<bd){bd=dd;bi=i}}if(bi<0||bd>Math.max(d.pitchX||2,d.pitchY||2)**2*2){PV.ui.hideTooltip(tip);return}const pt=d.coords[bi],v=vals[bi];PV.ui.showTooltip(tip,e,`<b>Point ${bi+1}</b><br>X ${fmt(pt.x,1)} mm · Y ${fmt(pt.y,1)} mm<br>${esc(m.short)} = ${fmt(v,4)} ${esc(m.unit)}<br><span class="${mask[bi]?'good':'bad'}">${mask[bi]?'VALID':'EXCLUDED'}</span>`)};
    PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:onZoom,onReset:()=>onZoom({x:null,y:null})});
  }
  function histogram(values,mask,bins){
    const valid=values.filter((v,i)=>mask[i]&&Number.isFinite(v));if(!valid.length)return[];
    let lo=Math.min(...valid),hi=Math.max(...valid);if(lo===hi){lo-=.5;hi+=.5}const w=(hi-lo)/bins,c=Array(bins).fill(0);
    valid.forEach(v=>{let i=Math.floor((v-lo)/w);if(i===bins)i--;c[Math.max(0,Math.min(bins-1,i))]++});return c.map((count,i)=>({lo:lo+i*w,hi:lo+(i+1)*w,count}));
  }
  function drawHist(canvas,a,key,mask,bins,swapped,zoom,onZoom){
    const rows=histogram(a.metrics[key].values,mask,bins),ctx=canvas.getContext('2d'),W=canvas.width=760,H=canvas.height=440,p={l:66,r:20,t:24,b:52},max=Math.max(1,...rows.map(r=>r.count));
    const qlo=rows[0]?.lo??0,qhi=rows.at(-1)?.hi??1,autoX=swapped?[0,max*1.08]:[qlo,qhi],autoY=swapped?[qlo,qhi]:[0,max*1.08],xr=PV.plot.resolve(autoX,zoom?.x),yr=PV.plot.resolve(autoY,zoom?.y),Xv=x=>p.l+(x-xr[0])/(xr[1]-xr[0]||1)*(W-p.l-p.r),Yv=y=>p.t+(yr[1]-y)/(yr[1]-yr[0]||1)*(H-p.t-p.b);
    ctx.fillStyle=css('--chart-bg');ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=css('--grid2');
    for(const t of ticks(xr[0],xr[1])){ctx.beginPath();ctx.moveTo(Xv(t),p.t);ctx.lineTo(Xv(t),H-p.b);ctx.stroke()}
    for(const t of ticks(yr[0],yr[1])){ctx.beginPath();ctx.moveTo(p.l,Yv(t));ctx.lineTo(W-p.r,Yv(t));ctx.stroke()}
    ctx.fillStyle=css('--blue');
    for(const r of rows){
      if(swapped){
        const y0=Yv(r.lo),y1=Yv(r.hi),x0=Xv(0),x1=Xv(r.count);
        ctx.fillRect(Math.min(x0,x1),Math.min(y0,y1)+1,Math.abs(x1-x0),Math.max(1,Math.abs(y1-y0)-2));
      }else{
        const x0=Xv(r.lo),x1=Xv(r.hi),y0=Yv(0),y1=Yv(r.count);
        ctx.fillRect(Math.min(x0,x1)+1,Math.min(y0,y1),Math.max(1,Math.abs(x1-x0)-2),Math.abs(y1-y0));
      }
    }
    ctx.fillStyle=css('--muted');ctx.textAlign='center';for(const t of ticks(xr[0],xr[1]))ctx.fillText(axisFmt(t),Xv(t),H-28);ctx.textAlign='right';for(const t of ticks(yr[0],yr[1]))ctx.fillText(axisFmt(t),p.l-8,Yv(t)+4);const m=a.metrics[key];ctx.textAlign='center';ctx.fillText(swapped?'Count':`${m.short} [${m.unit}]`,p.l+(W-p.l-p.r)/2,H-5);ctx.save();ctx.translate(14,p.t+(H-p.t-p.b)/2);ctx.rotate(-Math.PI/2);ctx.fillText(swapped?`${m.short} [${m.unit}]`:'Count',0,0);ctx.restore();PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:onZoom,onReset:()=>onZoom({x:null,y:null})});return rows;
  }
  function render(host,d,a){
    const onePoint=d.coords.length===1,
      defaultMetric=a.metrics.j0.values.some(Number.isFinite)?'j0':'tau1';
    let metricKey=defaultMetric,
      histBins=30,
      histSwapped=true,
      pointsMode=onePoint,
      zoom={map:{x:null,y:null},hist:{x:null,y:null}},
      filterController=Sel.createFilter({
        metrics:a.metrics,
        siteCount:a.metrics[defaultMetric].values.length,
        metricKey:defaultMetric
      });
    const options=()=>Object.values(a.metrics).map(m=>`<option value="${m.key}">${esc(m.short)}</option>`).join('');
    const meta=(k,v,h='')=>`<dt>${esc(k)}${h?` ${help(h)}`:''}</dt><dd>${esc(v??'—')}</dd>`;
    const target=()=>{
      if(d.targetType==='PseudoSquareCell')return `${fmt(d.targetWidth)} × ${fmt(d.targetHeight)} mm pseudo-square · Ø${fmt(d.diameter)} mm mask · edge ${fmt(d.edgeExclusion)} mm`;
      if(d.targetType==='SquareCell')return `${fmt(d.targetWidth)} × ${fmt(d.targetHeight)} mm square · edge ${fmt(d.edgeExclusion)} mm`;
      if(d.targetType==='RoundWafer')return `Ø${fmt(d.diameter)} mm round · edge ${fmt(d.edgeExclusion)} mm`;
      return d.targetType||'—';
    };
    const pattern=()=>{
      if(d.patternType==='SquareRegionPattern'){
        return[
          d.patternDisplayName||'Square Region',
          Number.isFinite(d.nx)&&Number.isFinite(d.ny)?`${fmt(d.nx,0)} × ${fmt(d.ny,0)} schedule`:null,
          Number.isFinite(d.pitchX)&&Number.isFinite(d.pitchY)?`${fmt(d.pitchX)} × ${fmt(d.pitchY)} mm step`:null
        ].filter(Boolean).join(' · ');
      }
      return[
        d.patternName||d.patternType,
        Number.isFinite(d.pitchX)&&Number.isFinite(d.pitchY)?`${fmt(d.pitchX)} × ${fmt(d.pitchY)} mm`:null
      ].filter(Boolean).join(' · ');
    };
    const statsRows=()=>Object.values(a.metrics).map(m=>{const st=summaryMasked(m.values,filterController.metricMask(m));return`<tr><td>${esc(m.short)} ${help(m.help)}</td><td>${fmt(st.mean)}</td><td>${fmt(st.median)}</td><td>${fmt(st.stdev)}</td><td>${fmt(st.min)}</td><td>${fmt(st.max)}</td></tr>`}).join('');
    function shell(){
      const filterState=filterController.snapshot(),
        validN=filterState.validCount,
        n=filterState.siteCount,
        expected=d.geometryModel.expectedPointCount,
        geometryText=[
          d.geometryProfile.status,
          d.geometryProfile.id||null,
          d.geometryProfile.status==='partial'&&Number.isFinite(expected)?`${d.coords.length} / ${expected} sites`:null
        ].filter(Boolean).join(' · '),
        calcText=[
          d.calculationProfile.status,
          d.calculationProfile.id||null,
          `${d.pairedSiteCount} paired sites`
        ].filter(Boolean).join(' · '),
        qssText=[0,1].map(i=>Number.isFinite(d.qssMilli[i])?`${fmt(d.qssMilli[i]/1000,2)} sun`:'—').join(' / ');
      host.innerHTML=`<div class="module-grid jzero-module"><aside class="side">
        <section class="panel">\
<h3>Measurement ${help('JZeroMeasurement stores one or two QSS-µPCD lifetime iterations. Basore J0 is available only where both intensities were acquired for the same site; incomplete runs still retain their available lifetime, Smax and implied-Voc results.')}</h3>\
<dl class="meta">${meta('Result',d.resultName)}${meta('Recipe',d.name)}${meta('Substrate',d.substrateId)}${meta('Status',d.status)}${meta('Pattern',pattern())}${meta('Target',target())}${meta('Geometry',geometryText,'Calculation and geometry validation are tracked separately. SquareRegionPattern uses its structured Region + Dimension fields; incomplete terminated schedules are prefix-inferred and not vendor-validated.')}${meta('Calculation',calcText,'Validated Basore J0 requires the complete established two-intensity path. If the second iteration is missing or shorter, available first-iteration quantities remain usable while J0 is unavailable at unpaired sites.')}${meta('QSS intensities',qssText)}${meta('Wafer thickness',`${fmt(d.waferThickness)} µm`)}${meta('Doping',`${fmt(d.doping)} cm⁻³ ${d.dopingType}`)}${meta('Optical factor',fmt(d.opticalFactor))}${meta('Probe / bias',`${d.probe||'—'} / ${d.bias||'—'}`)}</dl>\
</section>
        ${PV.ui.validDataFilterMarkup({prefix:'jFilter',metrics:a.metrics,state:filterState,helpText:'Choose any available JZero result quantity as the filter metric. One site-level mask is shared across all seven result quantities, summaries, maps, distributions and exports; missing second-iteration/J0 values remain unavailable rather than shifting site indices.'})}
        <section class="panel"><h3>Results summary ${help('Statistics use only points that pass the active valid-data filter. Stdev is sample standard deviation.')}</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>${statsRows()}</tbody></table></div></section>
        <section class="panel current-dataset-panel"><h3>Current dataset</h3><div class="validation"><div><b>${n}</b><span>XML sites</span></div><div><b>${d.pairedSiteCount} / ${n}</b><span>paired QSS sites</span></div><div><b>${d.coords.length} / ${Number.isFinite(expected)?expected:n}</b><span>coordinates / schedule</span></div><div><b>${d.iterations} / 2</b><span>iterations acquired</span></div><div><b>${validN} / ${n}</b><span>pass filter</span></div></div></section>
        <details class="panel"><summary>Acquisition metadata</summary><dl class="meta meta-detail">${meta('Result time',d.end)}${meta('Elapsed',d.elapsed)}${meta('Laser power',fmt(d.laserPower))}${meta('uPCD averaging 1 / 2',`${fmt(d.avgMode,0)} / ${fmt(d.secondAvgMode,0)}`)}${meta('Evaluation mode',d.evaluationMode||'—')}${meta('Chuck temperature 1 / 2',`${fmt(d.temperatures[0])} / ${fmt(d.temperatures[1])} °C`)}${meta('Measurement velocity 1 / 2',`${fmt(d.measurementVelocities[0])} / ${fmt(d.measurementVelocities[1])}`)}${meta('Tau steady-state factor 1 / 2',`${fmt(d.tauSteadyStateFactors[0],6)} / ${fmt(d.tauSteadyStateFactors[1],6)}`)}${meta('QDC 1 / 2',`${fmt(d.qdcValues[0],6)} / ${fmt(d.qdcValues[1],6)}`)}${meta('Autosetting',d.autoset||'—')}${meta('Rastering',d.doRastering||'—')}${meta('Save transient',d.saveTransient||'—')}</dl></details>
      </aside><section class="plots"><div class="panel chart"><header><b>${onePoint?'Measurement position':'Wafer map'}</b><span class="grow"></span><select id="jMetric">${options()}</select>${onePoint?'':`<select id="jMapMode"><option value="filled">Filled</option><option value="points">Points</option></select>`}${PV.plot.axisControls('jMapAxes')}<button id="jExportMap">Export</button></header><div class="canvas-wrap"><canvas id="jMap"></canvas></div></div></section><section class="plots"><div class="panel chart"><header><b>Distribution</b><span class="grow"></span>${PV.plot.axisControls('jHistAxes',{distribution:true,swapped:histSwapped})}${PV.plot.binControls('jHistBins',histBins)}<button id="jExportHist">Export</button></header><div class="canvas-wrap"><canvas id="jHist"></canvas></div></div></section></div>`;
      host.querySelector('#jMetric').value=metricKey;if(!onePoint)host.querySelector('#jMapMode').value=pointsMode?'points':'filled';
      host.querySelector('#jMetric').onchange=e=>{metricKey=e.target.value;zoom={map:{x:null,y:null},hist:{x:null,y:null}};redraw()};
      if(!onePoint)host.querySelector('#jMapMode').onchange=e=>{pointsMode=e.target.value==='points';redraw()};
      PV.ui.bindValidDataFilter(host,{prefix:'jFilter',controller:filterController,onChange:()=>{zoom={map:{x:null,y:null},hist:{x:null,y:null}};shell()}});redraw();
    }
    function exportMetric(filterState,displayMask){
      const m=a.metrics[metricKey],filterMetric=a.metrics[filterState.metricKey];
      PV.exporter.csv(
        `${safe(d.resultName)}_${metricKey}.csv`,
        ['Index','X [mm]','Y [mm]',`${m.label} [${m.unit}]`,'Metric available','Pass valid-data filter','Displayed','Filter metric','Filter lower','Filter upper'],
        m.values.map((v,i)=>[
          i+1,d.coords[i]?.x??'',d.coords[i]?.y??'',v,Number.isFinite(v),
          !!filterState.selection.activeMask[i],!!displayMask[i],
          filterMetric?.short||filterState.metricKey,filterState.lower,filterState.upper
        ])
      );
    }
    function redraw(){
      const filterState=filterController.snapshot(),
        displayMask=filterController.metricMask(a.metrics[metricKey]),
        rows=drawHist(
          host.querySelector('#jHist'),a,metricKey,displayMask,histBins,histSwapped,zoom.hist,
          next=>{zoom.hist=next;redraw()}
        );
      drawMap(
        host.querySelector('#jMap'),d,a,metricKey,displayMask,zoom.map,
        next=>{zoom.map=next;redraw()},pointsMode
      );
      PV.plot.bindAxisControls(host,'jMapAxes',zoom.map,n=>{zoom.map=n;redraw()});
      PV.plot.bindAxisControls(host,'jHistAxes',zoom.hist,n=>{zoom.hist=n;redraw()},{
        swapped:histSwapped,
        onSwap:()=>{histSwapped=!histSwapped;zoom.hist={x:null,y:null};redraw()}
      });
      PV.plot.bindBinControls(host,'jHistBins',histBins,n=>{histBins=n;zoom.hist={x:null,y:null};redraw()});
      host.querySelector('#jExportMap').onclick=()=>exportMetric(filterState,displayMask);
      host.querySelector('#jExportHist').onclick=()=>{
        const m=a.metrics[metricKey];
        PV.exporter.csv(
          `${safe(d.resultName)}_${metricKey}_histogram.csv`,
          [`Bin low [${m.unit}]`,`Bin high [${m.unit}]`,'Count','Filter metric','Filter lower','Filter upper'],
          rows.map(r=>[r.lo,r.hi,r.count,a.metrics[filterState.metricKey]?.short||filterState.metricKey,filterState.lower,filterState.upper])
        );
      };
    }
    document.addEventListener('pv-theme-change',()=>{if(host.isConnected)redraw()});shell();
  }
  PV.modules=PV.modules||{};
  PV.modules.jzero={
    familyId:'jzero',
    capabilities:{map:true,onePoint:true,distribution:true,validDataFilter:true},
    types:['JZeroMeasurement'],
    parse,
    analyze,
    render,
    generation,
    smax,
    basoreJ0,
    impliedVoc,
    insideTarget,
    constants:{NI_BASORE_COMPAT,NI_VOC_300}
  };
  PV.registry.register(PV.modules.jzero);
})(typeof window!=='undefined'?window:globalThis);
