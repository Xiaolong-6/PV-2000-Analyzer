(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,G=PV.geometry,Q=PV.quantity,M=PV.measurement,P=PV.profiles;
  const esc=v=>PV.ui.escapeHtml(v),fmt=(v,n=4)=>Number.isFinite(v)?(Math.abs(v)>=1e5||(Math.abs(v)>0&&Math.abs(v)<1e-3)?v.toExponential(n):v.toFixed(n)):'—';
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
  function lnl(x,ratio,ratioOk){
    return Math.log(1+x)/Math.log(1+x/ratioOk)-ratio;
  }
  function linearityFactor(spv8Global,spv8ReducedGlobal,linearityRatioOk){
    const ratio=spv8Global/spv8ReducedGlobal,rok=linearityRatioOk-.03,lo=.001,hi=400,tol=1e-15;
    let fhi=lnl(hi,ratio,rok),flo=lnl(lo,ratio,rok);
    if(!Number.isFinite(fhi)||!Number.isFinite(flo)||flo*fhi>=0)return-1;
    let root,dx;
    if(flo<0){root=lo;dx=hi-lo}else{root=hi;dx=lo-hi}
    for(let i=1;i<=200;i++){
      dx*=.5;
      const mid=root+dx,fmid=lnl(mid,ratio,rok);
      if(fmid<=0)root=mid;
      if(Math.abs(dx)<tol||fmid===0)break;
    }
    return root;
  }
  function penetrationDepth(wavelengthNm,temperatureC){
    const deltaT=(temperatureC<15||temperatureC>45)?0:temperatureC-21,
      wavelengthA=wavelengthNm*10,
      energy=12395/wavelengthA,
      correctedEnergy=energy+(1.3*energy-1)*.001*deltaT,
      alpha=84.732*correctedEnergy/1.2395-76.417;
    return 10000/(alpha*alpha);
  }
  function nSilicon(wavelengthA){
    if(wavelengthA<7500)return 3.67;
    if(wavelengthA>10300)return 3.53;
    return 3.55+(10000-wavelengthA)*5e-5;
  }
  function oxideReflectance(oxideThickness,wavelengthUm){
    const nOxide=1.46,r1=.187,wavelengthA=wavelengthUm*10000,
      nSi=nSilicon(wavelengthA),r2=(nSi-nOxide)/(nSi+nOxide),
      cross=r1*r2*Math.cos((4*nOxide*oxideThickness/wavelengthA-1)*Math.PI);
    return(r1*r1+r2*r2+2*cross)/(1+r1*r1*r2*r2+2*cross);
  }
  function oxideCorrection(wavelengthNm,oxideThickness){
    const wavelengthUm=wavelengthNm/1000;
    return(1-oxideReflectance(oxideThickness,wavelengthUm))/(1-oxideReflectance(0,wavelengthUm));
  }
  function lifetimeFromDl(dlUm,isPType){
    if(!Number.isFinite(dlUm)||dlUm<=0)return NaN;
    const mobility=isPType?1288.07:461.511;
    return dlUm*dlUm*.01/(.0259*mobility);
  }
  function calculatePoint(spv8,spv6,settings){
    let corrected8=spv8,corrected6=spv6,undefinedValue=false;
    const factor=linearityFactor(settings.spv8Global,settings.spv8ReducedGlobal,settings.linearityRatioOk),
      z6=penetrationDepth(settings.wavelength6,settings.chuckTemperature),
      z8=penetrationDepth(settings.wavelength8,settings.chuckTemperature);
    let depth6=z6,depth8=z8;
    if(settings.useTextureCorrection&&settings.textureCorrection>0&&settings.textureCorrection<=1){
      depth6*=settings.textureCorrection;
      depth8*=settings.textureCorrection;
    }
    if(factor!==-1&&Number.isFinite(factor)){
      corrected8=spv8*factor/Math.log(1+factor);
      corrected6=spv8/Math.log(1+factor)*(Math.pow(1+factor,spv6/spv8)-1);
    }
    const temp8=1/(1+settings.temperatureCorrection8*(settings.ledTemperature-26)),
      temp6=1/(1+settings.temperatureCorrection6*(settings.ledTemperature-26));
    if(settings.oxideThickness<=0){
      const r8=Math.max(0,Math.min(1,settings.reflectivity8)),
        r6=Math.max(0,Math.min(1,settings.reflectivity6));
      if(r8!==1&&r6!==1){
        corrected8/=1-r8;
        corrected6/=1-r6;
      }
    }else{
      corrected8*=oxideCorrection(settings.wavelength8,settings.oxideThickness);
      corrected6*=oxideCorrection(settings.wavelength6,settings.oxideThickness);
    }
    corrected8/=temp8;
    corrected6/=temp6;
    let dl=NaN;
    if(spv8>spv6&&corrected6!==0&&!settings.useEnhancedMode){
      const ratio=corrected8/corrected6;
      dl=(depth6-ratio*depth8)/(ratio-1);
      if(!(dl>0)||dl>2500){dl=NaN;undefinedValue=true}
    }else{
      undefinedValue=true;
    }
    return{
      dl,
      tau:undefinedValue?NaN:lifetimeFromDl(dl,settings.isPType),
      spv8,
      spv6,
      corrected8,
      corrected6,
      undefinedValue
    };
  }
  function parse(parsed){
    const m=parsed.measurement,common=X.common(parsed),md=X.direct(m,'MeasurementData'),
      iterationData=X.direct(md,'IterationData'),
      iteration=iterationData?X.children(iterationData).find(e=>X.lname(e)==='Iteration'):null,
      dataNode=X.direct(iteration,'Data'),
      items=dataNode?X.children(dataNode).filter(e=>X.lname(e)==='DataItem'):[],
      pattern=X.direct(m,'Pattern'),target=X.direct(m,'Target'),pitch=X.direct(pattern,'Pitch'),
      targetSize=X.direct(target,'Size'),
      settings={
        multiplier:X.num(m,'Multiplier',1000),
        oxideThickness:X.num(md,'OxideThickness',X.num(m,'OxideThickness',0)),
        wavelength8:X.num(md,'Wavelength8',NaN),
        wavelength6:X.num(md,'Wavelenght6',NaN),
        temperatureCorrection8:X.num(md,'TemperatureCorrectionCoefficientLED8',0),
        temperatureCorrection6:X.num(md,'TemperatureCorrectionCoefficientLED6',0),
        chuckTemperature:X.num(iteration,'ChuckTemperature',NaN),
        ledTemperature:X.num(iteration,'LEDTemperature',NaN),
        spv8Global:X.num(iteration,'SPV8Global',NaN),
        spv8ReducedGlobal:X.num(iteration,'SPV8ReducedGlobal',NaN),
        linearityRatioOk:X.num(iteration,'LineartiyRatioOK',NaN),
        reflectivity8:X.num(m,'ReflectivityCorrection8',0),
        reflectivity6:X.num(m,'ReflectivityCorrection6',0),
        useTextureCorrection:bool(X.text(m,'UseTextureCorrection','false')),
        textureCorrection:X.num(m,'TextureCorrection',NaN),
        useEnhancedMode:bool(X.text(m,'UseEnhancedMode','false')),
        isPType:X.text(m,'DopingType','PType')==='PType'
      },
      sites=items.map((item,index)=>{
        const means=signalMeans(item),spv8=means[0]*settings.multiplier,spv6=means[1]*settings.multiplier;
        return{index,...calculatePoint(spv8,spv6,settings),coord:null};
      }),
      patternType=X.attrType(pattern),targetType=X.attrType(target),
      geometryModel=G.resolveMeasurementGeometry({
        patternType,targetType,pointCount:sites.length,
        diameter:X.num(target,'Diameter',Number.isFinite(common.radius)?2*common.radius:NaN),
        targetWidth:X.num(targetSize,'Width',NaN),targetHeight:X.num(targetSize,'Height',NaN),
        edgeExclusion:X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',NaN)),
        substrateShape:common.shapeType,substrateRadius:common.radius,
        pitchX:X.num(pitch,'X',NaN),pitchY:X.num(pitch,'Y',NaN)
      }),coords=geometryModel.pointsMm,
      result={...common,...settings,sites,coords,geometryModel,patternType,targetType,
        patternName:X.text(pattern,'Name','')||X.text(pattern,'DisplayName',''),
        parseSignals:bool(X.text(m,'ParseSignals','false')),
        waferThickness:X.num(m,'WaferThickness',NaN),bsrVelocity:X.num(m,'BSRVelocity',NaN),
        dopingType:X.text(m,'DopingType',''),temperatureC:settings.chuckTemperature};
    sites.forEach((site,index)=>{site.coord=coords[index]||null});
    const calc=P.resolveCalculation('spv',result),geom=P.resolveGeometry(result);
    result.calculationProfile=calc?{id:calc.id,status:calc.status}:null;
    result.geometryProfile=geom?{id:geom.id,status:geom.status}:null;
    result.profile=result.calculationProfile;
    result.geometryModel.validationStatus=result.geometryProfile?.status||(coords.length?'inferred':'unsupported');
    result.domain=M.create({
      type:result.type,familyId:'spv',
      identity:{name:result.name,resultName:result.resultName,substrateId:result.substrateId,lotId:result.lotId},
      environment:{temperatureC:result.temperatureC},geometry:result.geometryModel,
      acquisition:{siteCount:sites.length,parseSignals:result.parseSignals},
      channels:{spv8:'Signal[0]',spv6:'Signal[1]'},
      settings:{wavelength8:result.wavelength8,wavelength6:result.wavelength6,oxideThickness:result.oxideThickness,
        useEnhancedMode:result.useEnhancedMode,useTextureCorrection:result.useTextureCorrection,dopingType:result.dopingType},
      calculationProfile:result.calculationProfile,geometryProfile:result.geometryProfile
    });
    return result;
  }
  function analyze(data){
    const profileId=data.calculationProfile?.id||null,validation=data.calculationProfile?.status||Q.VALIDATION.INFERRED,
      make=(id,key,label,short,unit,values,provenance)=>Q.create({id,key,label,short,unit,values,provenance,
        modelId:key==='dl'||key==='tau'?'spv-two-wavelength-dl-v1':null,profileId,validation});
    return{metrics:{
      dl:make('spv-dl','dl','Diffusion length','DL','µm',data.sites.map(s=>s.dl),Q.PROVENANCE.DERIVED_COMPATIBILITY),
      tau:make('spv-tau','tau','Lifetime derived from diffusion length','Tau','µs',data.sites.map(s=>s.tau),Q.PROVENANCE.DERIVED_COMPATIBILITY),
      spv8:make('spv8','spv8','SPV8 signal','SPV8','mV',data.sites.map(s=>s.spv8),Q.PROVENANCE.RAW),
      spv6:make('spv6','spv6','SPV6 signal','SPV6','mV',data.sites.map(s=>s.spv6),Q.PROVENANCE.RAW)
    }};
  }
  function render(host,data,analysis){
    if(!data.sites.length){
      host.innerHTML='<section class="panel"><h3>SPVMeasurement</h3><p class="note">No SPV site data found.</p></section>';
      return;
    }
    const stats=Object.values(analysis.metrics).map(metric=>{
      const s=Q.summary(metric);
      return '<tr><td>'+esc(metric.short)+'</td><td>'+fmt(s.mean)+'</td><td>'+fmt(s.median)+'</td><td>'+fmt(s.stdev)+'</td><td>'+fmt(s.min)+'</td><td>'+fmt(s.max)+'</td></tr>';
    }).join('');
    host.innerHTML='<div class="module-grid spv-module"><aside class="side"><section class="panel"><h3>Measurement</h3><dl class="meta">'+
      '<dt>Result</dt><dd>'+esc(data.resultName)+'</dd><dt>Recipe</dt><dd>'+esc(data.name)+'</dd><dt>Substrate</dt><dd>'+esc(data.substrateId)+'</dd>'+
      '<dt>Pattern</dt><dd>'+esc(data.patternName||data.patternType)+'</dd><dt>Calculation profile</dt><dd>'+esc(data.calculationProfile?.id||'inferred')+'</dd>'+
      '<dt>Geometry profile</dt><dd>'+esc(data.geometryProfile?.id||'inferred')+'</dd><dt>Channels</dt><dd>'+fmt(data.wavelength8,0)+' / '+fmt(data.wavelength6,0)+' nm</dd>'+
      '<dt>Chuck temperature</dt><dd>'+fmt(data.chuckTemperature,2)+' °C</dd><dt>Linearity ratio</dt><dd>'+fmt(data.spv8Global/data.spv8ReducedGlobal,4)+'</dd></dl></section>'+
      '<section class="panel"><h3>Results summary</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>'+stats+'</tbody></table></div></section></aside>'+
      '<section class="plots"><section class="panel"><h3>SPV result channels</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>X [mm]</th><th>Y [mm]</th><th>DL [µm]</th><th>Tau [µs]</th><th>SPV8 [mV]</th><th>SPV6 [mV]</th></tr></thead><tbody>'+
      data.sites.slice(0,5000).map((s,i)=>'<tr><td>'+(i+1)+'</td><td>'+fmt(s.coord?.x,2)+'</td><td>'+fmt(s.coord?.y,2)+'</td><td>'+fmt(s.dl)+'</td><td>'+fmt(s.tau)+'</td><td>'+fmt(s.spv8)+'</td><td>'+fmt(s.spv6)+'</td></tr>').join('')+
      '</tbody></table></div></section><section class="panel"><h3>Compatibility model</h3><p class="note">DL follows the PV-2000 two-wavelength SPV path: measured-linearity correction, wavelength penetration depth, optional optical corrections, and the standard DL ratio equation. Tau is derived from DL with the vendor minority-carrier mobility constant. Raw SPV8/SPV6 remain available even where DL/Tau are undefined.</p></section></section></div>';
  }

  PV.modules=PV.modules||{};
  PV.modules.spv={types:['SPVMeasurement'],familyId:'spv',capabilities:{map:true,distribution:true,profile:true},parse,analyze,render,
    calculatePoint,linearityFactor,penetrationDepth,oxideCorrection,lifetimeFromDl};
  PV.registry.register(PV.modules.spv);
})(typeof window!=='undefined'?window:globalThis);
