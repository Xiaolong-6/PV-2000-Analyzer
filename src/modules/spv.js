(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,G=PV.geometry,Q=PV.quantity,Sel=PV.selection,M=PV.measurement,P=PV.profiles;
  const esc=v=>PV.ui.escapeHtml(v),css=n=>PV.ui.cssVar(n),safe=v=>String(v||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');
  const fmt=(v,n=4)=>Number.isFinite(v)?(Math.abs(v)>=1e5||(Math.abs(v)>0&&Math.abs(v)<1e-3)?v.toExponential(n):v.toFixed(n)):'—';
  const bool=v=>String(v||'').toLowerCase()==='true';

  function vectorMean(node){
    const values=node?X.children(node).map(e=>Number(e.textContent)).filter(Number.isFinite):[];
    return values.length?S.mean(values):NaN;
  }
  function signalMeans(item){
    const signal=X.direct(item,'Signal');
    if(!signal)return[NaN,NaN];
    const vectors=X.children(signal);
    return[vectorMean(vectors[0]),vectorMean(vectors[1])];
  }
  function lnl(x,ratio,ratioOk){return Math.log(1+x)/Math.log(1+x/ratioOk)-ratio}
  function linearityFactor(spv8Global,spv8ReducedGlobal,linearityRatioOk){
    const ratio=spv8Global/spv8ReducedGlobal,rok=linearityRatioOk-.03,lo=.001,hi=400,tol=1e-15;
    let fhi=lnl(hi,ratio,rok),flo=lnl(lo,ratio,rok);
    if(!Number.isFinite(fhi)||!Number.isFinite(flo)||flo*fhi>=0)return-1;
    let root,dx;if(flo<0){root=lo;dx=hi-lo}else{root=hi;dx=lo-hi}
    for(let i=1;i<=200;i++){dx*=.5;const mid=root+dx,fmid=lnl(mid,ratio,rok);if(fmid<=0)root=mid;if(Math.abs(dx)<tol||fmid===0)break}
    return root;
  }
  function penetrationDepth(wavelengthNm,temperatureC){
    const dt=(temperatureC<15||temperatureC>45)?0:temperatureC-21,wavelengthA=wavelengthNm*10,
      energy=12395/wavelengthA,corrected=energy+(1.3*energy-1)*.001*dt,alpha=84.732*corrected/1.2395-76.417;
    return 10000/(alpha*alpha);
  }
  function nSilicon(wavelengthA){return wavelengthA<7500?3.67:wavelengthA>10300?3.53:3.55+(10000-wavelengthA)*5e-5}
  function oxideReflectance(oxideThickness,wavelengthUm){
    const nox=1.46,r1=.187,wavelengthA=wavelengthUm*10000,nsi=nSilicon(wavelengthA),r2=(nsi-nox)/(nsi+nox),
      cross=r1*r2*Math.cos((4*nox*oxideThickness/wavelengthA-1)*Math.PI);
    return(r1*r1+r2*r2+2*cross)/(1+r1*r1*r2*r2+2*cross);
  }
  function oxideCorrection(wavelengthNm,oxideThickness){
    const u=wavelengthNm/1000;return(1-oxideReflectance(oxideThickness,u))/(1-oxideReflectance(0,u));
  }
  function lifetimeFromDl(dlUm,isPType){
    if(!Number.isFinite(dlUm)||dlUm<=0)return NaN;
    const mobility=isPType?1288.07:461.511;
    return dlUm*dlUm*.01/(.0259*mobility);
  }
  function enhancedDlEquation(lengthCm,surfaceVelocity,waferCm,ratio,z6Cm,z8Cm,isPType){
    if(!(lengthCm>0)||!Number.isFinite(surfaceVelocity)||!(waferCm>0)||!Number.isFinite(ratio))return NaN;
    const diffusion=isPType?36.4:12.2,a=diffusion/lengthCm,wl=waferCm/lengthCm;
    let b;
    if(surfaceVelocity!==0){
      const sh=Math.sinh(wl),ch=Math.cosh(wl),as=a/surfaceVelocity;
      b=(as*sh+ch)/(sh+as*ch);
    }else b=Math.tanh(wl);
    return((1-(z6Cm/lengthCm)**2)/(1-(z8Cm/lengthCm)**2))*((1-b*z8Cm/lengthCm)/(1-b*z6Cm/lengthCm))-ratio;
  }
  function enhancedDiffusionLength(ratio,z6Um,z8Um,waferUm,surfaceVelocity,isPType){
    if(![ratio,z6Um,z8Um,waferUm,surfaceVelocity].every(Number.isFinite)||!(waferUm>0))return NaN;
    const waferCm=waferUm*1e-4,z6Cm=z6Um*1e-4,z8Cm=z8Um*1e-4,
      fn=l=>enhancedDlEquation(l,surfaceVelocity,waferCm,ratio,z6Cm,z8Cm,isPType);
    let lo=.001,hi=3,flo=fn(lo),fhi=fn(hi);
    if(!Number.isFinite(flo)||!Number.isFinite(fhi)||flo*fhi>0)return NaN;
    if(flo===0)return lo*1e4;if(fhi===0)return hi*1e4;
    for(let i=0;i<220;i++){
      const mid=(lo+hi)/2,fmid=fn(mid);
      if(!Number.isFinite(fmid))return NaN;
      if(Math.abs(fmid)<1e-14||Math.abs(hi-lo)<1e-15){lo=hi=mid;break}
      if(flo*fmid<=0){hi=mid;fhi=fmid}else{lo=mid;flo=fmid}
    }
    const dl=(lo+hi)/2*1e4;
    return dl>0&&dl<=2500?dl:NaN;
  }
  function calculatePoint(spv8,spv6,s){
    if(s.parseSignals)return{dl:NaN,tau:NaN,spv8,spv6,corrected8:NaN,corrected6:NaN,undefinedValue:true};
    let c8=spv8,c6=spv6;
    const factor=linearityFactor(s.spv8Global,s.spv8ReducedGlobal,s.linearityRatioOk);
    let z6=penetrationDepth(s.wavelength6,s.chuckTemperature),z8=penetrationDepth(s.wavelength8,s.chuckTemperature);
    if(s.useTextureCorrection&&s.textureCorrection>0&&s.textureCorrection<=1){z6*=s.textureCorrection;z8*=s.textureCorrection}
    if(factor!==-1&&Number.isFinite(factor)){
      c8=spv8*factor/Math.log(1+factor);
      c6=spv8/Math.log(1+factor)*(Math.pow(1+factor,spv6/spv8)-1);
    }
    // VENDOR-COMPATIBILITY QUIRK — DO NOT "FIX" THE CROSS-MAPPING.
    // The recovered PV-2000 DLL historically applies the stored LED6 temperature coefficient to SPV8,
    // and the stored LED8 coefficient to SPV6. Keeping this parameter-order mismatch is required for
    // vendor parity; tests/spv.test.js has a nonzero, unequal-coefficient regression that must fail if
    // someone later rewires these coefficients to the seemingly natural LED6->SPV6 / LED8->SPV8 order.
    const t8=1/(1+s.temperatureCorrection6*(s.ledTemperature-26)),t6=1/(1+s.temperatureCorrection8*(s.ledTemperature-26));
    if(s.oxideThickness<=0){
      const r8=Math.max(0,Math.min(1,s.reflectivity8)),r6=Math.max(0,Math.min(1,s.reflectivity6));
      if(r8!==1&&r6!==1){c8/=1-r8;c6/=1-r6}
    }else{
      c8*=oxideCorrection(s.wavelength8,s.oxideThickness);
      c6*=oxideCorrection(s.wavelength6,s.oxideThickness);
    }
    c8/=t8;c6/=t6;
    if(!(spv8>spv6)||c6===0)return{dl:NaN,tau:NaN,spv8,spv6,corrected8:c8,corrected6:c6,undefinedValue:true};
    const ratio=c8/c6,dl=s.useEnhancedMode
      ?enhancedDiffusionLength(ratio,z6,z8,s.waferThickness,s.bsrVelocity,s.isPType)
      :(z6-ratio*z8)/(ratio-1);
    if(!(dl>0)||dl>2500)return{dl:NaN,tau:NaN,spv8,spv6,corrected8:c8,corrected6:c6,undefinedValue:true};
    return{dl,tau:lifetimeFromDl(dl,s.isPType),spv8,spv6,corrected8:c8,corrected6:c6,undefinedValue:false};
  }

  function parse(parsed){
    const m=parsed.measurement,common=X.common(parsed),md=X.direct(m,'MeasurementData'),
      iterationData=X.direct(md,'IterationData'),iteration=iterationData?X.children(iterationData).find(e=>X.lname(e)==='Iteration'):null,
      dataNode=X.direct(iteration,'Data'),items=dataNode?X.children(dataNode).filter(e=>X.lname(e)==='DataItem'):[],
      pattern=X.direct(m,'Pattern'),target=X.direct(m,'Target'),pitch=X.direct(pattern,'Pitch'),targetSize=X.direct(target,'Size'),
      rawCoefficients=X.pointList(X.direct(pattern,'Coefficients')),
      exclusionPolygons=X.exclusionPolygons(target),
      settings={
        multiplier:X.num(m,'Multiplier',1000),oxideThickness:X.num(md,'OxideThickness',X.num(m,'OxideThickness',0)),
        wavelength8:X.num(md,'Wavelength8',NaN),wavelength6:X.num(md,'Wavelenght6',NaN),
        temperatureCorrection8:X.num(md,'TemperatureCorrectionCoefficientLED8',0),temperatureCorrection6:X.num(md,'TemperatureCorrectionCoefficientLED6',0),
        chuckTemperature:X.num(iteration,'ChuckTemperature',NaN),ledTemperature:X.num(iteration,'LEDTemperature',NaN),
        linearityRatioMethod:X.text(m,'LinearityRatioMethod','UseMeasuredLR'),manualLinearityRatioValue:X.num(m,'ManualLinearityRatioValue',NaN),
        spv8Global:X.text(m,'LinearityRatioMethod','UseMeasuredLR')==='UseManualLR'?X.num(m,'ManualLinearityRatioValue',NaN):X.num(iteration,'SPV8Global',NaN),
        spv8ReducedGlobal:X.text(m,'LinearityRatioMethod','UseMeasuredLR')==='UseManualLR'?1:X.num(iteration,'SPV8ReducedGlobal',NaN),
        linearityRatioOk:X.num(iteration,'LineartiyRatioOK',NaN),reflectivity8:X.num(m,'ReflectivityCorrection8',0),reflectivity6:X.num(m,'ReflectivityCorrection6',0),
        useTextureCorrection:bool(X.text(m,'UseTextureCorrection','false')),textureCorrection:X.num(m,'TextureCorrection',NaN),
        useEnhancedMode:bool(X.text(m,'UseEnhancedMode','false')),parseSignals:bool(X.text(m,'ParseSignals','false')),
        waferThickness:X.num(m,'WaferThickness',NaN),bsrVelocity:X.num(m,'BSRVelocity',NaN),
        isPType:X.text(m,'DopingType','PType')==='PType'
      },
      sites=items.map((item,index)=>{const means=signalMeans(item),spv8=means[0]*settings.multiplier,spv6=means[1]*settings.multiplier;return{index,...calculatePoint(spv8,spv6,settings),coord:null}}),
      patternType=X.attrType(pattern),targetType=X.attrType(target),
      diameter=X.num(target,'Diameter',Number.isFinite(common.radius)?2*common.radius:NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',NaN)),
      pitchX=X.num(pitch,'X',NaN),pitchY=X.num(pitch,'Y',NaN),
      geometryModel=G.resolveMeasurementGeometry({patternType,targetType,rawCoefficients,exclusionPolygons,
        pointCount:sites.length,diameter,
        targetWidth:X.num(targetSize,'Width',NaN),targetHeight:X.num(targetSize,'Height',NaN),edgeExclusion,
        substrateShape:common.shapeType,substrateRadius:common.radius,pitchX,pitchY,
        allowPartialPrefix:G.isIncompleteAcquisitionStatus(common.status)}),
      coords=geometryModel.pointsMm,
      result={...common,...settings,sites,coords,geometryModel,patternType,targetType,diameter,edgeExclusion,pitchX,pitchY,
        patternName:X.text(pattern,'Name','')||X.text(pattern,'DisplayName',''),waferThickness:settings.waferThickness,
        bsrVelocity:settings.bsrVelocity,dopingType:X.text(m,'DopingType',''),temperatureC:settings.chuckTemperature};
    sites.forEach((site,index)=>{site.coord=coords[index]||null});
    const calc=P.resolveCalculation('spv',result),geom=P.resolveGeometry(result);
    result.calculationProfile=calc?{id:calc.id,status:calc.status}:null;
    result.geometryProfile=geom?{id:geom.id,status:geom.status}:null;
    result.profile=result.calculationProfile;
    result.geometryModel.validationStatus=result.geometryProfile?.status||(coords.length?'inferred':'unsupported');
    result.domain=M.create({type:result.type,familyId:'spv',identity:{name:result.name,resultName:result.resultName,substrateId:result.substrateId,lotId:result.lotId},
      environment:{temperatureC:result.temperatureC},geometry:result.geometryModel,acquisition:{siteCount:sites.length,parseSignals:result.parseSignals},
      channels:{spv8:'Signal[0]',spv6:'Signal[1]'},settings:{wavelength8:result.wavelength8,wavelength6:result.wavelength6,
        oxideThickness:result.oxideThickness,useEnhancedMode:result.useEnhancedMode,useTextureCorrection:result.useTextureCorrection,dopingType:result.dopingType},
      calculationProfile:result.calculationProfile,geometryProfile:result.geometryProfile});
    return result;
  }

  function analyze(data){
    const profileId=data.calculationProfile?.id||null,validation=data.calculationProfile?.status||Q.VALIDATION.INFERRED,
      make=(id,key,label,short,unit,values,provenance)=>Q.create({id,key,label,short,unit,values,provenance,
        modelId:key==='dl'||key==='tau'?(data.useEnhancedMode?'spv-enhanced-finite-wafer-dl-v1':'spv-two-wavelength-dl-v1'):null,profileId,validation});
    return{metrics:{
      dl:make('spv-dl','dl','Diffusion length','DL','µm',data.sites.map(s=>s.dl),Q.PROVENANCE.DERIVED_COMPATIBILITY),
      tau:make('spv-tau','tau','Lifetime derived from diffusion length','Tau','µs',data.sites.map(s=>s.tau),Q.PROVENANCE.DERIVED_COMPATIBILITY),
      spv8:make('spv8','spv8','SPV8 signal','SPV8','mV',data.sites.map(s=>s.spv8),Q.PROVENANCE.RAW),
      spv6:make('spv6','spv6','SPV6 signal','SPV6','mV',data.sites.map(s=>s.spv6),Q.PROVENANCE.RAW)
    }};
  }

  function color(t){
    t=Math.max(0,Math.min(1,Number.isFinite(t)?t:.5));
    return `rgb(${Math.round(58+190*t)},${Math.round(120-45*t)},${Math.round(235-125*t)})`;
  }
  function ticks(lo,hi,n=5){
    if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo===hi)return[lo];
    return Array.from({length:n+1},(_,i)=>lo+(hi-lo)*i/n);
  }
  function finiteRange(values){
    const v=values.filter(Number.isFinite);if(!v.length)return[0,1];
    let lo=Math.min(...v),hi=Math.max(...v);if(lo===hi){lo-=.5;hi+=.5}return[lo,hi];
  }
  function drawMap(canvas,data,metric,mask,selected,zoom,onZoom,onSelect){
    const {ctx,W,H}=PV.plot.canvasFrame(canvas),p={l:56,r:78,t:24,b:46},plotW=W-p.l-p.r,plotH=H-p.t-p.b,
      radius=Math.max(data.diameter/2||0,data.geometryModel.nominal?.radius||0,1)*1.06,
      auto=PV.plot.equalAspectRanges([-radius,radius],[-radius,radius],plotW,plotH),
      xr=PV.plot.resolve(auto.x,zoom.x),yr=PV.plot.resolve(auto.y,zoom.y),
      xp=x=>p.l+(x-xr[0])/(xr[1]-xr[0]||1)*plotW,yp=y=>p.t+(yr[1]-y)/(yr[1]-yr[0]||1)*plotH,
      active=metric.values.filter((v,i)=>mask[i]&&Number.isFinite(v)),vr=finiteRange(active),lo=vr[0],hi=vr[1];
    ctx.font='11px system-ui';ctx.fillStyle=css('--chart-bg');ctx.fillRect(0,0,W,H);ctx.strokeStyle=css('--grid2');ctx.lineWidth=1;
    ticks(xr[0],xr[1]).forEach(t=>{ctx.beginPath();ctx.moveTo(xp(t),p.t);ctx.lineTo(xp(t),H-p.b);ctx.stroke()});
    ticks(yr[0],yr[1]).forEach(t=>{ctx.beginPath();ctx.moveTo(p.l,yp(t));ctx.lineTo(W-p.r,yp(t));ctx.stroke()});
    const sx=Math.max(1.5,Math.abs(xp((data.pitchX||1)/2)-xp(-(data.pitchX||1)/2))),
      sy=Math.max(1.5,Math.abs(yp((data.pitchY||1)/2)-yp(-(data.pitchY||1)/2)));
    data.coords.forEach((pt,i)=>{
      const v=metric.values[i];
      if(!pt||!mask[i]||!Number.isFinite(v))return;
      const x=xp(pt.x),y=yp(pt.y);
      ctx.fillStyle=color((v-lo)/(hi-lo||1));
      ctx.fillRect(x-sx/2,y-sy/2,sx,sy);
      if(i===selected){
        ctx.strokeStyle=css('--yellow');
        ctx.lineWidth=2;
        ctx.strokeRect(x-sx/2,y-sy/2,sx,sy);
      }
    });
    if(data.geometryModel.shape==='circle'){
      ctx.strokeStyle=css('--text');ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(xp(0),yp(0),Math.abs(xp(data.diameter/2)-xp(0)),0,2*Math.PI);ctx.stroke();
      const er=data.geometryModel.scheduled?.radius;if(Number.isFinite(er)){ctx.strokeStyle=css('--muted');ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(xp(0),yp(0),Math.abs(xp(er)-xp(0)),0,2*Math.PI);ctx.stroke();ctx.setLineDash([])}
    }
    ctx.fillStyle=css('--muted');ctx.textAlign='center';ticks(xr[0],xr[1]).forEach(t=>ctx.fillText(fmt(t,1),xp(t),H-24));
    ctx.textAlign='right';ticks(yr[0],yr[1]).forEach(t=>ctx.fillText(fmt(t,1),p.l-7,yp(t)+4));
    ctx.textAlign='center';ctx.fillText('X [mm]',p.l+plotW/2,H-5);ctx.save();ctx.translate(14,p.t+plotH/2);ctx.rotate(-Math.PI/2);ctx.fillText('Y [mm]',0,0);ctx.restore();
    const bx=W-46,by=p.t+12,bh=plotH-24,bw=12,g=ctx.createLinearGradient(0,by+bh,0,by);for(let i=0;i<=10;i++)g.addColorStop(i/10,color(i/10));ctx.fillStyle=g;ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle=css('--muted');ctx.textAlign='left';ctx.fillText(fmt(hi,3),bx+bw+4,by+8);ctx.fillText(fmt(lo,3),bx+bw+4,by+bh);
    canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),mx=(e.clientX-r.left)*W/r.width,my=(e.clientY-r.top)*H/r.height;let bi=-1,bd=Infinity;data.coords.forEach((pt,i)=>{if(!pt)return;const dd=(xp(pt.x)-mx)**2+(yp(pt.y)-my)**2;if(dd<bd){bd=dd;bi=i}});if(bi>=0&&bd<500)onSelect?.(bi)};
    PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:onZoom,onReset:()=>onZoom({x:null,y:null})});
  }
  function histogram(values,mask,bins){
    const valid=values.filter((v,i)=>mask[i]&&Number.isFinite(v));if(!valid.length)return[];
    let lo=Math.min(...valid),hi=Math.max(...valid);if(lo===hi){lo-=.5;hi+=.5}
    const w=(hi-lo)/bins,counts=Array(bins).fill(0);
    valid.forEach(v=>{let i=Math.floor((v-lo)/w);if(i===bins)i--;counts[Math.max(0,Math.min(bins-1,i))]++});
    return counts.map((count,i)=>({lo:lo+i*w,hi:lo+(i+1)*w,count}));
  }
  function drawHist(canvas,metric,mask,bins,swapped,zoom,onZoom){
    const rows=histogram(metric.values,mask,bins),frame=PV.plot.canvasFrame(canvas),ctx=frame.ctx,W=frame.W,H=frame.H,p={l:66,r:20,t:24,b:52},
      max=Math.max(1,...rows.map(r=>r.count)),qlo=rows[0]?.lo??0,qhi=rows.at(-1)?.hi??1,
      xr=PV.plot.resolve(swapped?[0,max*1.08]:[qlo,qhi],zoom.x),yr=PV.plot.resolve(swapped?[qlo,qhi]:[0,max*1.08],zoom.y),
      xp=x=>p.l+(x-xr[0])/(xr[1]-xr[0]||1)*(W-p.l-p.r),yp=y=>p.t+(yr[1]-y)/(yr[1]-yr[0]||1)*(H-p.t-p.b);
    ctx.fillStyle=css('--chart-bg');ctx.fillRect(0,0,W,H);ctx.strokeStyle=css('--grid2');
    ticks(xr[0],xr[1]).forEach(t=>{ctx.beginPath();ctx.moveTo(xp(t),p.t);ctx.lineTo(xp(t),H-p.b);ctx.stroke()});
    ticks(yr[0],yr[1]).forEach(t=>{ctx.beginPath();ctx.moveTo(p.l,yp(t));ctx.lineTo(W-p.r,yp(t));ctx.stroke()});
    ctx.fillStyle=css('--blue');
    rows.forEach(r=>{if(swapped){const y0=yp(r.lo),y1=yp(r.hi);ctx.fillRect(xp(0),Math.min(y0,y1)+1,Math.max(1,xp(r.count)-xp(0)),Math.max(1,Math.abs(y1-y0)-2))}
      else{const x0=xp(r.lo),x1=xp(r.hi);ctx.fillRect(Math.min(x0,x1)+1,yp(r.count),Math.max(1,Math.abs(x1-x0)-2),Math.max(1,yp(0)-yp(r.count)))}
    });
    ctx.fillStyle=css('--muted');ctx.textAlign='center';ticks(xr[0],xr[1]).forEach(t=>ctx.fillText(fmt(t,2),xp(t),H-28));ctx.textAlign='right';ticks(yr[0],yr[1]).forEach(t=>ctx.fillText(fmt(t,2),p.l-8,yp(t)+4));
    ctx.textAlign='center';ctx.fillText(swapped?'Count':`${metric.short} [${metric.unit}]`,p.l+(W-p.l-p.r)/2,H-5);ctx.save();ctx.translate(14,p.t+(H-p.t-p.b)/2);ctx.rotate(-Math.PI/2);ctx.fillText(swapped?`${metric.short} [${metric.unit}]`:'Count',0,0);ctx.restore();
    PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:onZoom,onReset:()=>onZoom({x:null,y:null})});
    return rows;
  }

  function render(host,data,analysis){
    if(!data.sites.length){host.innerHTML='<section class="panel"><h3>SPVMeasurement</h3><p class="note">No SPV site data found.</p></section>';return}
    let metricKey='dl',site=0,histBins=30,histSwapped=true,zoom={map:{x:null,y:null},hist:{x:null,y:null}},
      filterController=Sel.createFilter({metrics:analysis.metrics,siteCount:data.sites.length,metricKey:'dl'});
    const options=()=>Object.values(analysis.metrics).map(m=>`<option value="${m.key}">${esc(m.short)}</option>`).join('');
    const summaryRows=()=>Object.values(analysis.metrics).map(m=>{const st=S.summary(m.values.filter((v,i)=>filterController.metricMask(m)[i]&&Number.isFinite(v)));
      return `<tr><td>${esc(m.short)}</td><td>${fmt(st.mean)}</td><td>${fmt(st.median)}</td><td>${fmt(st.stdev)}</td><td>${fmt(st.min)}</td><td>${fmt(st.max)}</td></tr>`}).join('');
    function shell(){
      const state=filterController.snapshot(),current=data.sites[site],
        calc=data.calculationProfile?`${data.calculationProfile.status} · ${data.calculationProfile.id}`:'inferred',
        geom=data.geometryProfile?`${data.geometryProfile.status} · ${data.geometryProfile.id}`:'inferred',
        targetText=data.targetType==='RoundWafer'&&Number.isFinite(data.diameter)
          ?`Ø${fmt(data.diameter,1)} mm${Number.isFinite(data.edgeExclusion)?` · edge ${fmt(data.edgeExclusion,1)} mm`:''}`
          :data.targetType||'—',
        finiteDl=analysis.metrics.dl.values.filter(Number.isFinite).length;
      host.innerHTML=`<div class="module-grid spv-module"><aside class="side">
        <section class="panel"><h3>Measurement ${PV.ui.help('Core SPV XML identity and sample context. Signal-channel settings and validation profiles are separated below.')}</h3><dl class="meta"><dt>Result</dt><dd>${esc(data.resultName)}</dd><dt>Recipe</dt><dd>${esc(data.name)}</dd><dt>Substrate</dt><dd>${esc(data.substrateId)}</dd><dt>Status</dt><dd>${esc(data.status)}</dd><dt>Pattern</dt><dd>${esc(data.patternName||data.patternType)}</dd><dt>Target</dt><dd>${esc(targetText)}</dd></dl></section>
        <section class="panel current-dataset-panel"><h3>Current dataset</h3><div class="validation"><div><b>${data.sites.length}</b><span>XML sites</span></div><div><b>${finiteDl}</b><span>finite DL/Tau</span></div><div><b>${data.coords.length} / ${data.sites.length}</b><span>coordinates</span></div><div><b>${state.validCount} / ${state.siteCount}</b><span>pass filter</span></div></div></section>
        ${PV.ui.validDataFilterMarkup({prefix:'spvFilter',metrics:analysis.metrics,state,helpText:'One site-level mask is shared by summaries, map, Distribution and export. DL/Tau availability remains quantity-specific, so raw SPV8/SPV6 sites are not discarded merely because DL is undefined.'})}
        <section class="panel"><h3>Results summary</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>${summaryRows()}</tbody></table></div></section>
        <details class="panel"><summary>Acquisition / validation</summary>
          <dl class="meta meta-detail">
            <dt>Calculation profile</dt><dd>${esc(calc)}</dd>
            <dt>Geometry profile</dt><dd>${esc(geom)}</dd>
            <dt>Channels</dt><dd>${fmt(data.wavelength8,0)} / ${fmt(data.wavelength6,0)} nm</dd>
            <dt>Chuck temperature</dt><dd>${fmt(data.chuckTemperature,2)} °C</dd>
            <dt>LED temperature</dt><dd>${fmt(data.ledTemperature,2)} °C</dd>
            <dt>Wafer thickness</dt><dd>${fmt(data.waferThickness,2)} µm</dd>
            <dt>Back-surface velocity</dt><dd>${fmt(data.bsrVelocity,2)} cm/s</dd>
            <dt>Enhanced mode</dt><dd>${data.useEnhancedMode?'On':'Off'}</dd>
            <dt>Doping type</dt><dd>${data.isPType?'P-type':'N-type'}</dd>
          </dl>
          <p class="note meta-detail">LED temperature participates in the wavelength-channel temperature correction. Wafer thickness, back-surface velocity and doping type enter the Enhanced finite-wafer diffusion-length path when Enhanced mode is enabled; doping type also selects the lifetime conversion. Paired PV-2000 output validates the standard two-wavelength profiles and the finite-wafer/back-surface Enhanced N-type profile. Parsed-signal, texture-corrected, manual-linearity and Enhanced P-type branches remain outside the validated envelope.</p>
        </details>
      </aside><section class="plots overview"><div class="panel chart"><header><b>${data.sites.length===1?'Measurement position':'Wafer map'}</b><span class="grow"></span><select id="spvMetric">${options()}</select>${PV.plot.axisControls('spvMapAxes')}<button id="spvExportMap">Export</button></header><div class="canvas-wrap"><canvas id="spvMap"></canvas></div></div>${data.sites.length===1?'':`<div class="panel chart"><header><b>Distribution</b><span class="grow"></span>${PV.plot.axisControls('spvHistAxes',{distribution:true,swapped:histSwapped})}${PV.plot.binControls('spvHistBins',histBins)}<button id="spvExportHist">Export</button></header><div class="canvas-wrap"><canvas id="spvHist"></canvas></div></div>`}</section>
      <section class="plots detail"><section class="panel"><h3>${data.sites.length===1?'Measurement point':'Selected site'}</h3><div class="site-controls"><button id="spvPrev">←</button><select id="spvSite">${data.sites.map((_,i)=>`<option value="${i}">Site ${i+1}</option>`).join('')}</select><button id="spvNext">→</button></div><dl class="meta"><dt>Position</dt><dd>${current.coord?`${fmt(current.coord.x,2)}, ${fmt(current.coord.y,2)} mm`:'—'}</dd>${PV.ui.selectionStateRow(PV.ui.selectionStateFor(state,site))}<dt>DL</dt><dd>${fmt(current.dl)} µm</dd><dt>Tau</dt><dd>${fmt(current.tau)} µs</dd><dt>SPV8</dt><dd>${fmt(current.spv8)} mV</dd><dt>SPV6</dt><dd>${fmt(current.spv6)} mV</dd></dl></section></section></div>`;
      host.querySelector('#spvMetric').value=metricKey;host.querySelector('#spvSite').value=String(site);
      host.querySelector('#spvSite').onchange=e=>{site=Number(e.target.value);shell()};
      host.querySelector('#spvPrev').onclick=()=>{if(site>0){site--;shell()}};
      host.querySelector('#spvNext').onclick=()=>{if(site<data.sites.length-1){site++;shell()}};
      PV.ui.bindValidDataFilter(host,{prefix:'spvFilter',controller:filterController,linkedSelect:'#spvMetric',onChange:state=>{metricKey=state.metricKey;zoom={map:{x:null,y:null},hist:{x:null,y:null}};shell()}});
      redraw();
    }
    function exportMetric(state,mask){
      const m=analysis.metrics[metricKey];
      PV.exporter.csv(`${safe(data.resultName)}_${metricKey}.csv`,['Index','X [mm]','Y [mm]',`${m.label} [${m.unit}]`,'Available','Pass filter'],
        m.values.map((v,i)=>[i+1,data.coords[i]?.x??'',data.coords[i]?.y??'',v,!!mask[i],!!state.selection.activeMask[i]]));
    }
    function redraw(){
      const state=filterController.snapshot(),metric=analysis.metrics[metricKey],mask=filterController.metricMask(metric),
        histCanvas=host.querySelector('#spvHist'),
        rows=histCanvas?drawHist(histCanvas,metric,mask,histBins,histSwapped,zoom.hist,n=>{zoom.hist=n;redraw()}):[];
      drawMap(host.querySelector('#spvMap'),data,metric,mask,site,zoom.map,n=>{zoom.map=n;redraw()},i=>{site=i;shell()});
      PV.plot.bindAxisControls(host,'spvMapAxes',zoom.map,n=>{zoom.map=n;redraw()});
      if(histCanvas){
        PV.plot.bindAxisControls(host,'spvHistAxes',zoom.hist,n=>{zoom.hist=n;redraw()},{swapped:histSwapped,onSwap:()=>{histSwapped=!histSwapped;zoom.hist={x:null,y:null};shell()}});
        PV.plot.bindBinControls(host,'spvHistBins',histBins,n=>{histBins=n;zoom.hist={x:null,y:null};redraw()});
      }
      host.querySelector('#spvExportMap').onclick=()=>exportMetric(state,mask);
      const histExport=host.querySelector('#spvExportHist');
      if(histExport)histExport.onclick=()=>PV.exporter.csv(`${safe(data.resultName)}_${metricKey}_histogram.csv`,[`Bin low [${metric.unit}]`,`Bin high [${metric.unit}]`,'Count'],rows.map(r=>[r.lo,r.hi,r.count]));
    }
    document.addEventListener('pv-theme-change',()=>{if(host.isConnected)redraw()});
    shell();
    PV.plot.observeResize(host,redraw);
  }

  PV.modules=PV.modules||{};
  PV.modules.spv={types:['SPVMeasurement'],familyId:'spv',capabilities:{map:true,distribution:true,validDataFilter:true,profile:true},parse,analyze,render,
    calculatePoint,linearityFactor,penetrationDepth,oxideCorrection,lifetimeFromDl,enhancedDlEquation,enhancedDiffusionLength};
  PV.registry.register(PV.modules.spv);
})(typeof window!=='undefined'?window:globalThis);
