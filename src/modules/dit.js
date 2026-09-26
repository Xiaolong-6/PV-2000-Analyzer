(function(root){
  const PV=root.PV2000=root.PV2000||{},
    X=PV.xml,
    S=PV.stats,
    GEO=PV.geometry,
    Sel=PV.selection,
    Profiles=PV.profiles,
    q=1.60218e-19,
    k=1.38e-23,
    T=300;
  const MATERIALS=Object.freeze({
    Si:Object.freeze({key:'Si',label:'Silicon',niCm3:9.65e9,epsR:11.68,status:'default analyzer model'}),
    Ge:Object.freeze({key:'Ge',label:'Germanium',niCm3:2e13,epsR:16.2,status:'analyzer-only legacy MATLAB model; PV-2000 has no material selector'})
  });
  const VENDOR_DIT=Object.freeze({
    q:1.602e-19,
    k:1.38066e-23,
    eps0:8.8542e-14,
    epsR:11.9,
    niCm3:1.45e10,
    standardProfileId:'DIT-RESULT-STANDARD-DLL-002',
    cocosIIProfileId:'DIT-RESULT-COCOSII-DLL-003'
  });
  const materialKey=value=>value==='Ge'?'Ge':'Si';
  const materialProfile=value=>MATERIALS[materialKey(value)];
  const standardVsb=(vdark,vlight,factor,type)=>{
    const direct=factor*(vdark-vlight);
    return type==='n'?-direct:direct;
  };
  const finalResultVsb=(vdark,measuredLight,factor)=>
    Number.isFinite(vdark)&&Number.isFinite(measuredLight)&&Number.isFinite(factor)
      ?factor*(vdark-measuredLight)
      :NaN;
  const finalResultVLight=(vdark,measuredLight,factor)=>{
    const vsb=finalResultVsb(vdark,measuredLight,factor);
    return Number.isFinite(vsb)?vdark-vsb:NaN;
  };
  const initialQcFromPreprocess=(darkVectorCount,chargeStep)=>{
    if(!Number.isFinite(darkVectorCount)||darkVectorCount<0||!Number.isFinite(chargeStep))return NaN;
    return (darkVectorCount+1)*chargeStep;
  };
  const midgapTargetV=d=>{
    const material=materialProfile(d?.material);
    return Math.abs(k*T/q*Math.log(d.doping/material.niCm3));
  };
  const finite=a=>(a||[]).filter(Number.isFinite),mean=S.mean;
  const esc=value=>PV.ui.escapeHtml(value);
  const fmt=(v,n=3)=>!Number.isFinite(v)?'—':Math.abs(v)>1e4||Math.abs(v)<1e-2?v.toExponential(n):v.toFixed(n);
  const sci=(v,n=3)=>!Number.isFinite(v)?'—':v.toExponential(n-1).replace('e+','e');
  const help=text=>PV.ui.help(text);
  function scalarMean(e){return e?mean([...e.children].map(x=>Number(x.textContent))):NaN}
  function vectorMeans(e){return e?[...e.children].map(scalarMean):[]}
  function vectorValues(e){
    return e
      ?[...e.children].map(x=>Number(x.textContent)).filter(Number.isFinite)
      :[];
  }
  function vendorOutlierCount(values){
    return values.length>4?Math.round(Math.log2(values.length-1)):0;
  }
  function vendorRejectedMean(values,count=vendorOutlierCount(values)){
    if(!values.length||count>=values.length)return NaN;
    if(count<=0)return mean(values);
    const center=mean(values);
    const ranked=values
      .map((value,index)=>({value,index,distance:Math.abs(value-center)}))
      .sort((a,b)=>a.distance-b.distance||a.index-b.index);
    return mean(ranked.slice(0,values.length-count).map(x=>x.value));
  }
  function vendorProcessMeans(pd){
    const darkNode=X.direct(pd,'VcpdDark'),
      lightNode=X.direct(pd,'VcpdLight'),
      darkVectors=darkNode?[...darkNode.children]:[],
      lightVectors=lightNode?[...lightNode.children]:[],
      n=Math.min(darkVectors.length,lightVectors.length),
      dark=[],
      light=[];
    for(let i=0;i<n;i++){
      const dv=vectorValues(darkVectors[i]),
        lv=vectorValues(lightVectors[i]),
        reject=vendorOutlierCount(dv);
      dark.push(vendorRejectedMean(dv,reject));
      light.push(vendorRejectedMean(lv,reject));
    }
    return{dark,light};
  }
  function vendorLineFit(x,y){
    const n=Math.min(x.length,y.length);
    if(n<2)return{intercept:NaN,slope:NaN};
    const sx=x.slice(0,n).reduce((a,b)=>a+b,0),
      sy=y.slice(0,n).reduce((a,b)=>a+b,0),
      xm=sx/n,
      denom=x.slice(0,n).reduce((a,v)=>a+(v-xm)**2,0);
    if(!denom)return{intercept:NaN,slope:NaN};
    const slope=x.slice(0,n).reduce((a,v,i)=>a+(v-xm)*y[i],0)/denom;
    return{intercept:(sy-sx*slope)/n,slope};
  }
  function vendorFindX(a,value){
    return a.length>1?a.reduce((n,v)=>n+(v<value?1:0),0):-1;
  }
  function vendorEvenGrid(count,low,high){
    if(count<1)return[];
    if(count===1)return[low];
    return Array.from({length:count},(_,i)=>low+(high-low)*i/(count-1));
  }
  function vendorSplineSecond(x,y){
    const n=x.length,y2=new Array(n).fill(0),u=new Array(Math.max(0,n-1)).fill(0);
    if(n<2)return y2;
    for(let i=1;i<n-1;i++){
      const sig=(x[i]-x[i-1])/(x[i+1]-x[i-1]),
        p=sig*y2[i-1]+2;
      y2[i]=(sig-1)/p;
      u[i]=(6*((y[i+1]-y[i])/(x[i+1]-x[i])-(y[i]-y[i-1])/(x[i]-x[i-1]))/
        (x[i+1]-x[i-1])-sig*u[i-1])/p;
    }
    for(let k=n-2;k>=0;k--)y2[k]=y2[k]*y2[k+1]+u[k];
    return y2;
  }
  function vendorSplineEval(x,y,y2,xq){
    let lo=0,hi=x.length-1;
    while(hi-lo>1){
      const mid=(hi+lo)>>1;
      if(x[mid]>xq)hi=mid;else lo=mid;
    }
    const h=x[hi]-x[lo];
    if(!h)return NaN;
    const a=(x[hi]-xq)/h,b=(xq-x[lo])/h;
    return a*y[lo]+b*y[hi]+((a**3-a)*y2[lo]+(b**3-b)*y2[hi])*h*h/6;
  }
  function vendorSpline(x,y,queries){
    if(x.length<2||x.length!==y.length)return queries.map(()=>NaN);
    const pairs=x.map((v,i)=>[v,y[i]]).sort((a,b)=>a[0]-b[0]),
      xx=pairs.map(p=>p[0]),
      yy=pairs.map(p=>p[1]),
      y2=vendorSplineSecond(xx,yy);
    return queries.map(v=>vendorSplineEval(xx,yy,y2,v));
  }
  function vendorDitQsc(vsb,doping,type,temperature=300){
    const C=VENDOR_DIT,
      beta=C.q/(C.k*temperature),
      minorityRatio=(C.niCm3*C.niCm3)/(doping*doping);
    const term=type==='p'
      ?Math.exp(-beta*vsb)+beta*vsb-1+
        minorityRatio*(Math.exp(beta*vsb)-beta*vsb-1)
      :Math.exp(beta*vsb)-beta*vsb-1+
        minorityRatio*(Math.exp(-beta*vsb)+beta*vsb-1);
    if(!(term>0))return 1e10;
    return Math.sqrt(2*C.eps0*C.epsR*C.k*temperature*doping*term)/C.q;
  }
  function vendorIntersection(qc,vdark,vlight,threshold,a,b){
    const a1=vdark[b]-vdark[a],
      a2=qc[b]*(vdark[a]-threshold)-qc[a]*(vdark[b]-threshold),
      b1=vlight[b]-vlight[a],
      b2=vlight[a]*qc[b]-vlight[b]*qc[a],
      denom=a1-b1,
      dx=qc[b]-qc[a];
    if(!denom||!dx)return{x:NaN,y:NaN};
    return{
      x:(b2-a2)/denom,
      y:(b2*a1-a2*b1)/(denom*dx)
    };
  }
  function vendorVfb(qc,vsb,vdark,vlight,threshold){
    const n=qc.length,
      unavailable=()=>({Vfb:NaN,Qcfb:NaN,available:false});
    if(n<4)return unavailable();
    const abs=vsb.map(Math.abs),maxAbs=Math.max(...abs),minAbs=Math.min(...abs);
    if(!abs.some(v=>v>.08)||!abs.some(v=>v<.5)||!maxAbs||minAbs/maxAbs>.7)return unavailable();
    const scaled=qc.map(v=>v/1e10),
      averageHits=pairs=>{
        const hits=pairs.map(([a,b])=>vendorIntersection(scaled,vdark,vlight,threshold,a,b));
        if(hits.some(h=>!Number.isFinite(h.x)||!Number.isFinite(h.y)))return unavailable();
        const Vfb=mean(hits.map(h=>h.y)),
          Qcfb=mean(hits.map(h=>h.x))*1e10;
        return Vfb===0?unavailable():{Vfb,Qcfb,available:true};
      };
    if(Math.abs(vsb[0])>=Math.abs(vsb[n-1])){
      for(let i=1;i<n;i++){
        const v=vsb[i];
        if(v*vsb[i-1]>0&&Math.abs(v)>Math.abs(threshold)*2)continue;
        const index=v*vsb[i-1]<=0?i-1:i;
        if(index===1)return unavailable();
        if(index>=3)return averageHits([[index,index-1],[index-1,index-2],[index,index-2]]);
        if(index===2)return averageHits([[index,index-1]]);
        return unavailable();
      }
      return unavailable();
    }
    for(let i=n-2;i>=0;i--){
      const v=vsb[i+1];
      if(v*vsb[i]>0&&i!==0&&Math.abs(v)>Math.abs(threshold)*2)continue;
      const index=v*vsb[i]<=0?i+1:i;
      if(index>=n)return unavailable();
      if(index<=n-2)return averageHits([[index+1,index],[index+1,index+2],[index,index+2]]);
      return unavailable();
    }
    return unavailable();
  }
  function vendorQcInit(qc,vdark,initialDark){
    const n=Math.min(qc.length,vdark.length);
    if(n<3)return{value:NaN,available:false};
    let index=vendorFindX(vdark,initialDark);
    index=Math.max(1,Math.min(index,n-2));
    const fit=vendorLineFit(qc.slice(index-1,index+2),vdark.slice(index-1,index+2));
    if(!Number.isFinite(fit.slope)||!fit.slope)return{value:NaN,available:false};
    const value=(initialDark-fit.intercept)/fit.slope,
      lo=Math.min(qc[0],qc[n-1]),
      hi=Math.max(qc[0],qc[n-1]);
    return value<lo||value>hi
      ?{value:NaN,available:false}
      :{value,available:true};
  }
  function vendorQit(qc,qscValues,doping,type,qitMin,qitMax){
    if(qc.length<2||!Number.isFinite(qitMin)||!Number.isFinite(qitMax))return NaN;
    const step=qc[1]-qc[0],
      locate=barrier=>{
        if(!(Math.abs(barrier)>=.03&&Math.abs(barrier)<=.5))return NaN;
        const target=vendorDitQsc(barrier,doping,type,300);
        let found=0;
        for(let i=0;i<qscValues.length-1;i++){
          const a=qscValues[i],b=qscValues[i+1];
          if((target>=a&&target<=b)||(target<=a&&target>=b)){found=i;break}
        }
        if(found===0)return NaN;
        const denom=qscValues[found+1]-qscValues[found];
        if(!denom)return NaN;
        const fraction=(target-qscValues[found])/denom;
        return type==='p'
          ?Math.abs(step)*(fraction+found-1)
          :Math.abs(step)*(fraction+qscValues.length-found-1);
      },
      a=locate(qitMin),b=locate(qitMax);
    return Number.isFinite(a)&&Number.isFinite(b)?Math.abs(b-a):NaN;
  }
  function vendorDitMinimum(qc,vsb,qscValues,type,useCocosII=false,minVsb=-.1,maxVsb=.65){
    const values=[];
    for(let i=0;i<vsb.length-1;i++){
      if(useCocosII&&(
        (vsb[i]<minVsb&&vsb[i+1]<minVsb)||
        (vsb[i]>maxVsb&&vsb[i+1]>maxVsb)
      ))continue;
      const dv=vsb[i+1]-vsb[i];
      if(!dv)continue;
      const dqc=(qc[i+1]-qc[i])/dv,
        dqsc=(qscValues[i+1]-qscValues[i])/dv;
      let value=type==='p'?dqc-dqsc:-dqc-dqsc;
      if(value>1e14)value=1e14;
      if(value<1e9)continue;
      values.push(value);
    }
    // Current DLL initializes DitValue to 1e100 and clears DitValueUd after
    // scanning the raw intervals, so an all-invalid COCOS-II trace exports a
    // defined 1e100 sentinel rather than Ud.
    return values.length?Math.min(...values):(useCocosII?1e100:NaN);
  }

  function vendorCocosIIReconstruct(qc,vdark,qcInitial,vdarkInitial,flat,d){
    if(!d.useCocosII)return{enabled:false,available:false};
    const eot=d.cocosIIEOT,
      minVsb=d.cocosIIMinVsb,
      maxVsb=d.cocosIIMaxVsb;
    if(!flat.available||!(eot>0)||!(maxVsb>minVsb)){
      return{enabled:true,available:false,eot,minVsb,maxVsb};
    }
    const cox=3.453e-5/eot,
      light=qc.map(charge=>flat.Vfb+(charge-flat.Qcfb)*VENDOR_DIT.q/cox),
      vsb=vdark.map((value,i)=>value-light[i]),
      qsc=vsb.map(value=>vendorDitQsc(value,d.doping,d.dopingType,300)),
      initialLight=qcInitial.map(charge=>flat.Vfb+(charge-flat.Qcfb)*VENDOR_DIT.q/cox),
      initialVsb=vdarkInitial.map((value,i)=>value-initialLight[i]),
      initialQsc=initialVsb.map(value=>vendorDitQsc(value,d.doping,d.dopingType,300));
    return{enabled:true,available:true,eot,minVsb,maxVsb,cox,light,vsb,qsc,initialLight,initialVsb,initialQsc};
  }
  function vendorResultDownstream(site,d){
    const profileId=d.useCocosII?VENDOR_DIT.cocosIIProfileId:VENDOR_DIT.standardProfileId,
      unavailable={
        profileId:null,
        Vfb:NaN,Qcfb:NaN,QcInit:NaN,Qsc:NaN,Qtot:NaN,Qit:NaN,Dit:NaN,
        analysisVsb:null,cocosII:null
      };
    if(!site.resultProcess)return unavailable;
    const dark=site.resultProcess.dark,
      measuredLight=site.resultProcess.light,
      n=Math.min(dark.length,measuredLight.length)-1;
    if(n<5)return{...unavailable,profileId};
    const vd=dark.slice(1,n+1),
      ml=measuredLight.slice(1,n+1),
      vl=vd.map((v,i)=>finalResultVLight(v,ml[i],d.factor)),
      directVsb=vd.map((v,i)=>v-vl[i]),
      qcInitial=new Array(n).fill(0);
    if(d.dopingType==='p'){
      for(let i=0;i<n;i++)qcInitial[i]=i*d.process.charge;
    }else{
      for(let i=0;i<n;i++)qcInitial[n-1-i]=-i*d.process.charge;
    }
    let qscInitial=[];
    for(let i=0;i<n;i++){
      const temp=i===0&&!(site.chuckTemperature>0)?296.16:300;
      qscInitial.push(vendorDitQsc(directVsb[i],d.doping,d.dopingType,temp));
    }
    const qc=vendorEvenGrid(3*n,qcInitial[0],qcInitial[n-1]),
      vdark=vendorSpline(qcInitial,vd,qc);
    let vlight=vendorSpline(qcInitial,vl,qc),
      denseVsb=vdark.map((v,i)=>v-vlight[i]),
      denseQsc=denseVsb.map(v=>vendorDitQsc(v,d.doping,d.dopingType,300));
    const qcInit=vendorQcInit(qc,vdark,site.VDark),
      initialDirectVsb=finalResultVsb(site.VDark,site.VLight,d.factor),
      resultQsc=vendorDitQsc(initialDirectVsb,d.doping,d.dopingType,300),
      threshold=(d.dopingType==='p'?1:-1)*Math.abs(d.vsbThreshold),
      flat=vendorVfb(qc,denseVsb,vdark,vlight,threshold),
      cocosII=vendorCocosIIReconstruct(qc,vdark,qcInitial,vd,flat,d);
    let rawVsb=directVsb;
    if(cocosII.available){
      vlight=cocosII.light;
      denseVsb=cocosII.vsb;
      denseQsc=cocosII.qsc;
      rawVsb=cocosII.initialVsb;
      qscInitial=cocosII.initialQsc;
    }
    const Qtot=qcInit.available&&flat.available?qcInit.value-flat.Qcfb:NaN,
      // Vendor order is important: Qit is calculated on the reconstructed
      // dense arrays before the N-type analysis-axis sign reversal.
      Qit=vendorQit(qc,denseQsc,d.doping,d.dopingType,d.qitMin,d.qitMax),
      signedVsb=d.dopingType==='p'?rawVsb:rawVsb.map(v=>-v),
      Dit=vendorDitMinimum(
        qcInitial,signedVsb,qscInitial,d.dopingType,d.useCocosII,
        d.cocosIIMinVsb,d.cocosIIMaxVsb
      );
    return{
      profileId,
      Vfb:flat.Vfb,
      Qcfb:flat.Qcfb,
      QcInit:qcInit.value,
      Qsc:resultQsc,
      Qtot,
      Qit,
      Dit,
      analysisVsb:signedVsb,
      cocosII
    };
  }
  function firstNum(parents,names,d=NaN){for(const p of(Array.isArray(parents)?parents:[parents]))for(const n of names){const v=X.num(p,n,NaN);if(Number.isFinite(v))return v}return d}
  function firstBool(parents,names,d=false){for(const p of(Array.isArray(parents)?parents:[parents]))for(const n of names){const v=X.text(p,n,'');if(v!=='')return v.toLowerCase()==='true'}return d}
  function settings(m,name){
    const n=X.direct(m,name),
    s=X.direct(n,'Settings'),
    tr=X.direct(s,'TargetRange');
    return{charge:X.num(s,'CoronaCharge'),attempts:X.num(s,'MaxNumberOfAttemps'),extra:X.num(s,'ExtraScans'),delay:X.num(s,'ChargeDelay'),targetMin:X.text(tr,'Min',''),targetMax:X.text(tr,'Max','')}}

  function parse(parsed){
    const m=parsed.measurement,
      c=X.common(parsed),
      md=X.direct(m,'MeasurementData'),
      off=X.num(md,'VcpdOffsett',0),
      factor=X.num(md,'VsbCorrectionFactor',1.2),
      dopingType=X.text(m,'DopingType','NType').toLowerCase().startsWith('n')?'n':'p',
      proc=X.direct(m,'Process'),
      qstep=X.num(X.direct(proc,'Settings'),'CoronaCharge'),
      pre=X.direct(m,'PreProcess'),
      prestep=X.num(X.direct(pre,'Settings'),'CoronaCharge'),
      iteration=X.direct(X.direct(md,'IterationData'),'Iteration'),
      chuckTemperature=X.num(iteration,'ChuckTemperature',0),
      data=X.direct(iteration,'Data'),
      items=data?X.children(data).filter(e=>X.lname(e)==='DataItem'):[],
      pattern=X.direct(m,'Pattern'),
      patternType=X.attrType(pattern),
      target=X.direct(m,'Target'),
      targetType=X.attrType(target),
      targetSize=X.direct(target,'Size'),
      targetWidth=X.num(targetSize,'Width',NaN),
      targetHeight=X.num(targetSize,'Height',NaN),
      diameter=X.num(target,'Diameter',Number.isFinite(c.radius)?2*c.radius:NaN),
      edgeExclusion=firstNum([target,m],['EdgeExclusion'],NaN),
      coeff=X.direct(pattern,'Coefficients'),
      rawCoefficients=coeff?X.children(coeff).map(p=>({x:X.num(p,'X',NaN),y:X.num(p,'Y',NaN)})):[],
      geometryModel=GEO.resolveMeasurementGeometry({
        patternType,
        targetType,
        rawCoefficients,
        pointCount:items.length,
        diameter,
        targetWidth,
        targetHeight,
        edgeExclusion,
        substrateShape:c.shapeType,
        substrateRadius:c.radius
      }),
      coords=geometryModel.pointsMm,
      resolvedGeometryProfile=geometryModel.geometryStatus==='complete'
        ?Profiles.resolveGeometry({geometryModel})
        :null,
      geometryProfile=resolvedGeometryProfile
        ?{id:resolvedGeometryProfile.id,status:resolvedGeometryProfile.status}
        :{id:null,status:geometryModel.geometryStatus==='partial'?'partial':coords.length?'inferred':'unsupported'},
      sites=[];
      
    items.forEach((it,si)=>{
      const pd=X.direct(it,'ProcessData'),
        pred=X.direct(it,'PreProcessData'),
        d=vectorMeans(X.direct(pd,'VcpdDark')),
        l=vectorMeans(X.direct(pd,'VcpdLight')),
        vendorProcess=vendorProcessMeans(pd),
        resultProcess={
          dark:vendorProcess.dark.map(v=>v-off),
          light:vendorProcess.light.map(v=>v-off)
        },
        rows=[];
      for(let j=1;j<Math.min(d.length,l.length);j++){
        const vd=d[j]-off,
          vl=l[j]-off,
          vsb=standardVsb(vd,vl,factor,dopingType);
        rows.push({Qc:(j-1)*qstep,VDark:vd,VLight:vl,ResultVLight:finalResultVLight(vd,vl,factor),ResultVsb:finalResultVsb(vd,vl,factor),Vsb:vsb,rawDiff:vl-vd});
      }
      const id=scalarMean(X.direct(it,'InitialVcpdDark'))-off,
        il=scalarMean(X.direct(it,'InitialVcpdLight'))-off,
        iv=standardVsb(id,il,factor,dopingType);
      sites.push({
        rows,
        resultProcess,
        chuckTemperature,
        coord:coords[si]||null,
        VDark:id,
        VLight:il,
        ResultVLight:finalResultVLight(id,il,factor),
        ResultVsb:finalResultVsb(id,il,factor),
        Vsb:iv,
        InitialQc:initialQcFromPreprocess(X.children(X.direct(pred,'VcpdDark')).length,prestep)
      });
    });
    const qit=X.direct(m,'QitBarrierRange');
    return{...c,doping:X.num(m,'Doping',1.5e15),dopingType,factor,offset:off,sites,
      useCocosII:X.text(m,'UseCocosII','false').toLowerCase()==='true',cocosIIEOT:X.num(m,'CocosIIEOT',NaN),
      cocosIIMinVsb:firstNum([m,md],['VsbMin','CocosIIMinVsb','CocosIIMinVSB','COCOSIIMinVsb','COCOSIIMinVSB'],-0.1),
      cocosIIMaxVsb:firstNum([m,md],['VsbMax','CocosIIMaxVsb','CocosIIMaxVSB','COCOSIIMaxVsb','COCOSIIMaxVSB'],0.65),
      backSurfaceShift:firstBool([m,md],['DoBackSurfaceShift','BackSurfaceShift'],false),
      vsbThreshold:firstNum([m,md],['VsbThreshold'],.03),
      qitMin:X.num(qit,'Min',NaN),
      qitMax:X.num(qit,'Max',NaN),
      chuckTemperature,
      numberOfDataPoints:X.num(m,'NumberOfDataPoints',NaN),
      measurementInterval:X.num(m,'MeasurementInterval',NaN),
      patternType,patternName:X.text(pattern,'Name',''),targetType,targetWidth,targetHeight,
      diameter,edgeExclusion,coords,rawCoefficients,geometryModel,geometryProfile,
      pre:settings(m,'PreProcess'),process:settings(m,'Process'),post:settings(m,'PostProcess')};
        
  }

  function qsc(vsb,doping,type,material='Si'){
    const profile=materialProfile(material),
      ni=profile.niCm3*1e6,
      eps0=8.85e-12,
      eps=profile.epsR,
      Nd=doping*1e6,
      p0=type==='p'?Nd:ni*ni/Nd,
      n0=type==='n'?Nd:ni*ni/Nd,
      beta=q/(k*T),
      sg=vsb<=0?1:-1,
      maj=type==='p'?p0:n0,
      minrat=type==='p'?n0/p0:p0/n0,
      term=(Math.exp(-beta*vsb)+beta*vsb-1)+minrat*(Math.exp(beta*vsb)-beta*vsb-1);
      
    return sg*Math.sqrt(2*k*T*eps0*eps*maj)*Math.sqrt(Math.max(0,term))*1e-4/q;
  }
  function linSlope(x,y){const n=Math.min(x.length,y.length);
    let sx=0,
    sy=0,
    sxx=0,
    sxy=0,
    kc=0;
    for(let i=0;i<n;i++)if(Number.isFinite(x[i])&&Number.isFinite(y[i])){sx+=x[i];
      sy+=y[i];
      sxx+=x[i]*x[i];
      sxy+=x[i]*y[i];
      kc++}return kc>1?(kc*sxy-sx*sy)/(kc*sxx-sx*sx):NaN}
  function inv(qc,v,t){for(let i=0;i<v.length-1;i++)if((v[i]-t)*(v[i+1]-t)<=0&&v[i+1]!==v[i])return qc[i]+(t-v[i])/(v[i+1]-v[i])*(qc[i+1]-qc[i]);return NaN}
  function interp(qc,v,x){for(let i=0;i<qc.length-1;i++)if(x>=Math.min(qc[i],qc[i+1])&&x<=Math.max(qc[i],qc[i+1])&&qc[i+1]!==qc[i])return v[i]+(x-qc[i])/(qc[i+1]-qc[i])*(v[i+1]-v[i]);return NaN}
  function flat(site,d,accumN=5){
    const r=site.rows;
      if(r.length<8)return{};
      const qc=r.map(x=>x.Qc),
      v=r.map(x=>x.VDark),
      n=Math.max(3,Math.min(20,accumN)),
      start=d.dopingType==='n'?Math.max(0,r.length-n):0,
      end=d.dopingType==='n'?r.length:Math.min(n,r.length),
      mox=linSlope(qc.slice(start,end),v.slice(start,end)),
      eps0=8.8541878128e-14,
      eps=materialProfile(d.material).epsR,
      Cs=Math.sqrt(eps*eps0*q*q*d.doping/(k*T)),
      mfb=mox+q/Cs,
      sl=[];
      
    for(let i=0;i<r.length-1;i++)sl.push((v[i+1]-v[i])/(qc[i+1]-qc[i]));
      let peak=sl.indexOf(Math.max(...sl)),
      ix=-1;
      if(d.dopingType==='n'){for(let i=peak;i<sl.length-1;i++)if(sl[i]>=mfb&&sl[i+1]<=mfb){ix=i;
        break}}else{for(let i=0;i<peak;i++)if(sl[i]<=mfb&&sl[i+1]>=mfb)ix=i}
    const qi=inv(qc,v,site.VDark);if(ix<0||!Number.isFinite(qi)||!Number.isFinite(mox))return{};const qfb=qc[ix]+(mfb-sl[ix])/(sl[ix+1]-sl[ix])*(qc[ix+1]-qc[ix]),Cox=q/mox,eot=3.9*eps0/Cox*1e7;
    return{qinit:qi,qfb,Qtot:qi-qfb,Cox,eot,mox,mfb,slopes:sl,flatIndex:ix,vfbDark:interp(qc,v,qfb)};
  }
  function cocosIIReverse(site,d,f,opts={}){
    const r=site.rows,qc=r.map(x=>x.Qc),vd=r.map(x=>x.VDark);
    const eotA=Number.isFinite(opts.cocosIIEOT_A)?opts.cocosIIEOT_A:(Number.isFinite(d.cocosIIEOT)&&d.cocosIIEOT>0?d.cocosIIEOT:100);
    const minVsb=Number.isFinite(opts.cocosIIMinVsb)?opts.cocosIIMinVsb:(Number.isFinite(d.cocosIIMinVsb)?d.cocosIIMinVsb:-0.1);
    const maxVsb=Number.isFinite(opts.cocosIIMaxVsb)?opts.cocosIIMaxVsb:(Number.isFinite(d.cocosIIMaxVsb)?d.cocosIIMaxVsb:0.65);
    const anchor=Number.isFinite(f.vfbDark)?f.vfbDark:interp(qc,vd,f.qfb);
    if(!Number.isFinite(f.qfb)||!Number.isFinite(anchor)||!(eotA>0)||!(maxVsb>minVsb))return{enabled:true,valid:false,algorithm:'pv2000-re',eotA,minVsb,maxVsb,source:'PV-2000 current-DLL fallback unavailable'};
    const cox=3.453e-5/eotA,
      slope=VENDOR_DIT.q/cox,
      light=qc.map(x=>anchor+slope*(x-f.qfb)),
      polarity=d.dopingType==='p'?-1:1,
      vsb=vd.map((v,i)=>polarity*(light[i]-v));
    return{enabled:true,valid:true,algorithm:'pv2000-re',light,vsb,slope,cox,source:'PV-2000 current-DLL formula with Analyzer flatband fallback',eotA,minVsb,maxVsb,signed:true,backSurfaceShiftRequested:!!opts.backSurfaceShift,backSurfaceShiftApplied:false};
  }
  function windowedMin(vsb,raw,minVsb,maxVsb){
    const accepted=raw.map((v,i)=>{
      const v0=vsb[i],v1=vsb[i+1];
      return Number.isFinite(v)&&Number.isFinite(v0)&&Number.isFinite(v1)&&
        !((v0<minVsb&&v1<minVsb)||(v0>maxVsb&&v1>maxVsb));
    });
    let min=Infinity,minIndex=-1,count=0;
    raw.forEach((v,i)=>{if(accepted[i]){count++;if(v<min){min=v;minIndex=i}}});
    return{min:Number.isFinite(min)?min:NaN,minIndex,accepted,count,total:raw.length};
  }
  function cocosRecommendation(d,accumN=5){
    const fs=d.sites.map(s=>flat(s,d,accumN)),
      eotVals=fs.map(f=>f.eot*10).filter(v=>Number.isFinite(v)&&v>0),
      dataEot=S.median(eotVals),
      eotA=Number.isFinite(dataEot)&&dataEot>0?dataEot:(Number.isFinite(d.cocosIIEOT)&&d.cocosIIEOT>0?d.cocosIIEOT:100),
      all=[];
      
    d.sites.forEach((s,i)=>{const f=fs[i],c=cocosIIReverse(s,d,f,{cocosIIEOT_A:eotA,cocosIIMinVsb:-99,cocosIIMaxVsb:99});if(c.valid)all.push(...c.vsb.filter(Number.isFinite))});
    const lo=all.length?Math.min(...all):NaN,
      hi=all.length?Math.max(...all):NaN,
      step=.05,
      margin=.02,
      minVsb=Number.isFinite(lo)?Math.min(-.1,Math.floor((lo-margin)/step)*step):-.1,
      maxVsb=Number.isFinite(hi)?Math.max(.65,Math.ceil((hi+margin)/step)*step):.65;
      
    return{eotA,minVsb,maxVsb,eotSource:eotVals.length?`dark accumulation median (${eotVals.length} sites)`:'fallback',coverageCount:all.length};
  }

  function pchipSlopes(x,y){
    const n=x.length,
    h=[],
    delta=[];
    for(let i=0;i<n-1;i++){h[i]=x[i+1]-x[i];
      delta[i]=(y[i+1]-y[i])/h[i]}if(n===2)return[delta[0],delta[0]];
    const d=new Array(n).fill(0);
    const edge=(h0,h1,d0,d1)=>{
      let z=((2*h0+h1)*d0-h0*d1)/(h0+h1);
      if(Math.sign(z)!==Math.sign(d0))z=0;
      else if(Math.sign(d0)!==Math.sign(d1)&&Math.abs(z)>3*Math.abs(d0))z=3*d0;
      return z};
    d[0]=edge(h[0],h[1],delta[0],delta[1]);
    d[n-1]=edge(h[n-2],h[n-3],delta[n-2],delta[n-3]);
    for(let i=1;i<n-1;i++){
      if(delta[i-1]===0||delta[i]===0||Math.sign(delta[i-1])!==Math.sign(delta[i]))d[i]=0;
      else{
        const w1=2*h[i]+h[i-1],
        w2=h[i]+2*h[i-1];
        d[i]=(w1+w2)/(w1/delta[i-1]+w2/delta[i])}}return d}
  function pchipEval(x,y,xq){
    if(x.length<2||xq<x[0]||xq>x[x.length-1])return NaN;
    const d=pchipSlopes(x,y);
    let i=x.length-2;
    for(let k=0;k<x.length-1;k++)if(xq>=x[k]&&xq<=x[k+1]){i=k;
      break}const h=x[i+1]-x[i],
    t=(xq-x[i])/h,
    h00=2*t**3-3*t**2+1,
    h10=t**3-2*t**2+t,
    h01=-2*t**3+3*t**2,
    h11=t**3-t**2;
    return h00*y[i]+h10*h*d[i]+h01*y[i+1]+h11*h*d[i+1]}
  function filteredXY(x,y,reject=Infinity){
    const z=x.map((v,i)=>[v,y[i]]).filter(p=>p.every(Number.isFinite)).sort((a,b)=>a[0]-b[0]),
    ux=[],
    uy=[];
    for(let i=0;i<z.length;){
      let j=i+1,
      sum=z[i][1],
      n=1;
      while(j<z.length&&Math.abs(z[j][0]-z[i][0])<1e-12){sum+=z[j][1];
        n++;
        j++}const xx=z[i][0],
      yy=sum/n;
      if((xx<.1||xx>.5)||yy<reject){ux.push(xx);
        uy.push(yy)}i=j}return{ux,uy}}
  function medianBinnedXY(x,y,width){
    if(!(width>0)||x.length!==y.length)return{ux:[],uy:[]};
    const ux=[],uy=[],binKey=v=>Math.floor((v+1e-15)/width);
    for(let i=0;i<x.length;){const key=binKey(x[i]),xs=[],ys=[];let j=i;while(j<x.length&&binKey(x[j])===key){xs.push(x[j]);ys.push(y[j]);j++}ux.push(S.median(xs));uy.push(S.median(ys));i=j}
    return{ux,uy};
  }
  function makeCurve(x,y,d,reject=Infinity,pchipScale='log10',pchipMethod='original',medianWindowV=.010){
    let {ux,uy}=filteredXY(x,y,reject);
    const useLog=pchipScale==='log10';
    if(useLog){const positive=ux.map((v,i)=>[v,uy[i]]).filter(([,v])=>v>0);ux=positive.map(p=>p[0]);uy=positive.map(p=>Math.log10(p[1]))}
    if(pchipMethod==='median'){({ux,uy}=medianBinnedXY(ux,uy,medianWindowV))}
    const target=midgapTargetV(d),
      restore=v=>useLog?10**v:v,
      fitMinVsb=ux.length?ux[0]:NaN,
      fitMaxVsb=ux.length?ux[ux.length-1]:NaN,
      targetInsideFit=Number.isFinite(fitMinVsb)&&target>=fitMinVsb&&target<=fitMaxVsb;
    if(ux.length<2)return{mid:NaN,curve:[],knots:ux.map((v,i)=>({x:v,y:restore(uy[i])})),targetVsb:target,fitMinVsb,fitMaxVsb,midgapCovered:false};
    const mid=targetInsideFit?restore(pchipEval(ux,uy,target)):NaN,curve=[];
    for(let xx=ux[0];xx<=ux[ux.length-1]+1e-12;xx+=.006)curve.push({x:xx,y:restore(pchipEval(ux,uy,xx))});
    return{mid,curve,knots:ux.map((v,i)=>({x:v,y:restore(uy[i])})),targetVsb:target,fitMinVsb,fitMaxVsb,midgapCovered:Number.isFinite(mid)};
  }
  function variation(site,d,reject=Infinity,vsbOverride=null,pchipScale='log10',window=null,pchipEnabled=true,pchipMethod='median',pchipMedianWindowV=.010){
    const r=site.rows,
      vs=vsbOverride&&vsbOverride.length===r.length?vsbOverride:r.map(x=>x.Vsb),
      qc=r.map(x=>x.Qc),
      qs=vs.map(v=>qsc(v,d.doping,d.dopingType,d.material)),
      raw=[];
      for(let i=0;i<r.length-1;i++){
      const dv=vs[i+1]-vs[i],
      dq=Math.abs(qc[i+1]-qc[i])-Math.abs(qs[i+1]-qs[i]);
      raw.push(Math.abs(dv)>0?Math.abs(dq)/Math.abs(dv):NaN)}
    const x=vs.slice(0,-1),
      measuredVsb=finite(vs),
      measuredMinVsb=measuredVsb.length?Math.min(...measuredVsb):NaN,
      measuredMaxVsb=measuredVsb.length?Math.max(...measuredVsb):NaN,
      midgapV=midgapTargetV(d),
      gate=window?windowedMin(vs,raw,window.min,window.max):windowedMin(vs,raw,-Infinity,Infinity),
      fitX=x.filter((_,i)=>gate.accepted[i]),
      fitY=raw.filter((_,i)=>gate.accepted[i]),
      fit=pchipEnabled?makeCurve(fitX,fitY,d,reject,pchipScale,pchipMethod,pchipMedianWindowV):{mid:NaN,curve:[],knots:[],fitMinVsb:NaN,fitMaxVsb:NaN,midgapCovered:false},
      measuredCoversMidgap=Number.isFinite(measuredMinVsb)&&midgapV>=measuredMinVsb&&midgapV<=measuredMaxVsb,
      midgapStatus=!pchipEnabled?'off':!measuredCoversMidgap?'outside-measured':!fit.midgapCovered?'outside-fit':'available';
      let p=0;
      while(p<vs.length&&vs[p]<.010)p++;
      if(p>=vs.length)p=vs.length-1;
      const qsurface=qc[p],
      qeff=qc.map(x=>x-qsurface),
      qit=qs.map((x,i)=>-x-qeff[i]),
      direct=[];
      
    // Historical charge-derivative diagnostic, retained internally for regression only.
    for(let i=0;i<r.length-1;i++){
      const dv=vs[i+1]-vs[i],
      dq=qit[i+1]-qit[i];
      direct.push(Math.abs(dv)>0?Math.abs(dq/dv):NaN)}const dfit=pchipEnabled?makeCurve(x,direct,d,reject,pchipScale,'original',pchipMedianWindowV):{mid:NaN,curve:[]};
      return{vsb:vs,raw,min:gate.min,minIndex:gate.minIndex,minVsbAt:gate.minIndex>=0?x[gate.minIndex]:NaN,accepted:gate.accepted,acceptedCount:gate.count,totalIntervals:gate.total,window,mid:fit.mid,curve:fit.curve,fitKnots:fit.knots||[],directRaw:direct,directMid:dfit.mid,directCurve:dfit.curve,midgapV,midgapStatus,midgapMeasuredMinVsb:measuredMinVsb,midgapMeasuredMaxVsb:measuredMaxVsb,midgapFitMinVsb:fit.fitMinVsb,midgapFitMaxVsb:fit.fitMaxVsb};
      
  }
  function analyze(d,opts={}){
    const accumN=opts.accumN||5,
      ditReject=Number.isFinite(opts.ditReject)?opts.ditReject:Infinity,
      pchipScale=opts.pchipScale==='linear'?'linear':'log10',
      pchipEnabled=opts.pchipEnabled!==false,
      pchipMethod=opts.pchipMethod==='original'?'original':'median',
      pchipMedianWindowV=Number.isFinite(opts.pchipMedianWindowV)?opts.pchipMedianWindowV:.010,
      requested=['xml','standard','pv2000-re'].includes(opts.cocosMode)?opts.cocosMode:'xml',
      effective=requested==='xml'?(d.useCocosII?'pv2000-re':'standard'):requested,
      material=materialKey(opts.material??d.material),
      model={...d,material},
      recommendation=cocosRecommendation(model,accumN);
      
    const eotA=Number.isFinite(opts.cocosIIEOT_A)?opts.cocosIIEOT_A:(Number.isFinite(d.cocosIIEOT)&&d.cocosIIEOT>0?d.cocosIIEOT:recommendation.eotA),
      minVsb=Number.isFinite(opts.cocosIIMinVsb)?opts.cocosIIMinVsb:(Number.isFinite(d.cocosIIMinVsb)?d.cocosIIMinVsb:-0.1),
      maxVsb=Number.isFinite(opts.cocosIIMaxVsb)?opts.cocosIIMaxVsb:(Number.isFinite(d.cocosIIMaxVsb)?d.cocosIIMaxVsb:0.65),
      backSurfaceShift=opts.backSurfaceShift??d.backSurfaceShift??false,
      errors=[];
      
    if(effective==='pv2000-re'&&(!(eotA>0)||!(maxVsb>minVsb)))errors.push(!(eotA>0)?'COCOS-II EOT must be greater than 0 Å.':'COCOS-II Max Vsb must be greater than Min Vsb.');
    if(pchipEnabled&&pchipMethod==='median'&&!(pchipMedianWindowV>0))errors.push('Median Vsb window must be greater than 0 mV.');
    if(pchipEnabled&&Number.isFinite(ditReject)&&!(ditReject>0))errors.push('PCHIP outlier limit must be greater than 0 when set.');
    const settingsError=errors.join(' ');
    const sites=model.sites.map(s=>{
      const f=flat(s,model,accumN),
        vendorResult=vendorResultDownstream(s,d),
        vendorCocosAnalysis=effective==='pv2000-re'
          ?vendorResultDownstream(s,{...d,useCocosII:true,cocosIIEOT:eotA,cocosIIMinVsb:minVsb,cocosIIMaxVsb:maxVsb})
          :null,
        c2=effective==='pv2000-re'
          ?(vendorCocosAnalysis?.cocosII?.available
            ?{...vendorCocosAnalysis.cocosII,valid:true,source:'PV-2000 current-DLL reconstruction'}
            :cocosIIReverse(s,model,f,{cocosIIEOT_A:eotA,cocosIIMinVsb:minVsb,cocosIIMaxVsb:maxVsb,backSurfaceShift}))
          :{enabled:false,valid:false,source:'standard measured light'},
        requiresC2=effective==='pv2000-re',
        usedVsb=requiresC2
          ?(vendorCocosAnalysis?.analysisVsb?.length===s.rows.length
            ?vendorCocosAnalysis.analysisVsb
            :(c2.valid?c2.vsb:Array(s.rows.length).fill(NaN)))
          :null,
        window=effective==='pv2000-re'&&c2.valid?{min:minVsb,max:maxVsb}:null,
        v=variation(s,model,ditReject,usedVsb,pchipScale,window,pchipEnabled,pchipMethod,pchipMedianWindowV),
        mx=finite(v.vsb.map(Math.abs));
      return{
        ...s,
        ...f,
        c2,
        ResultProfile:vendorResult.profileId,
        ResultVfb:vendorResult.Vfb,
        ResultQcfb:vendorResult.Qcfb,
        ResultQcInit:vendorResult.QcInit,
        ResultQsc:vendorResult.Qsc,
        ResultQtot:vendorResult.Qtot,
        ResultQit:vendorResult.Qit,
        ResultDit:vendorResult.Dit,
        analysisVsb:v.vsb,
        Dit:v.min,
        MidgapDit:v.mid,
        ditRaw:v.raw,
        ditAccepted:v.accepted,
        ditWindow:v.window,
        ditCurve:v.curve,
        ditFitKnots:v.fitKnots,
        ditAcceptedCount:v.acceptedCount,
        ditIntervalCount:v.totalIntervals,
        ditMinVsb:v.minVsbAt,
        directRaw:v.directRaw,
        directCurve:v.directCurve,
        directMid:v.directMid,
        midgapV:v.midgapV,
        midgapStatus:v.midgapStatus,
        midgapMeasuredMinVsb:v.midgapMeasuredMinVsb,
        midgapMeasuredMaxVsb:v.midgapMeasuredMaxVsb,
        midgapFitMinVsb:v.midgapFitMinVsb,
        midgapFitMaxVsb:v.midgapFitMaxVsb,
        Qsc:Math.abs(qsc(s.Vsb,model.doping,model.dopingType,material)),
        MaxVsb:mx.length?Math.max(...mx):NaN,
        valid:mx.length&&Math.max(...mx)>.1
      };
    });
      
    const keys=['Qtot','Dit','MidgapDit','eot','Cox','Qsc','InitialQc','MaxVsb'],
      stats={};
      keys.forEach(k=>stats[k]=S.summary(sites.filter(x=>x.valid).map(x=>x[k])));
      const mode=effective==='pv2000-re'?'PV-2000 COCOS-II (current DLL)':'Standard COCOS';
      return{sites,stats,recommendation,error:settingsError,options:{material,accumN,ditReject,pchipScale,pchipEnabled,pchipMethod,pchipMedianWindowV,cocosMode:requested,effectiveCocosMode:effective,cocosIIEOT_A:eotA,cocosIIMinVsb:minVsb,cocosIIMaxVsb:maxVsb,backSurfaceShift},mode};
      
  }

  function svgAxes(W,H,m,xmin,xmax,ymin,ymax,{xFmt=x=>x.toExponential(1),yFmt=y=>y.toFixed(2),logY=false}={}){
    const X=x=>m.l+(x-xmin)/(xmax-xmin||1)*(W-m.l-m.r),
    Y=y=>{
      const yy=logY?Math.log10(y):y,
      a=logY?Math.log10(ymin):ymin,
      b=logY?Math.log10(ymax):ymax;
      return H-m.b-(yy-a)/(b-a||1)*(H-m.t-m.b)};
    let out=`<rect width="${W}" height="${H}" fill="var(--chart-bg)"/>`;
    for(let i=0;i<=4;i++){
      const yy=logY?10**(Math.log10(ymin)+(Math.log10(ymax)-Math.log10(ymin))*i/4):ymin+(ymax-ymin)*i/4,
      py=Y(yy);
      out+=`<line x1="${m.l}" x2="${W-m.r}" y1="${py}" y2="${py}" stroke="var(--grid)"/><text x="${m.l-6}" y="${py+3}" text-anchor="end" fill="var(--muted)" font-size="11">${yFmt(yy)}</text>`}for(let i=0;i<=4;i++){
      const xx=xmin+(xmax-xmin)*i/4,
      px=X(xx);
      out+=`<line x1="${px}" x2="${px}" y1="${m.t}" y2="${H-m.b}" stroke="var(--grid2)"/><text x="${px}" y="${H-12}" text-anchor="middle" fill="var(--muted)" font-size="11">${xFmt(xx)}</text>`}return{X,Y,out}}
  function pathXY(x,y,X,Y,color,w=2,dash=''){const pts=x.map((v,i)=>Number.isFinite(v)&&Number.isFinite(y[i])?`${X(v)},${Y(y[i])}`:null).filter(Boolean).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''}/>`}
  function pointsXY(x,y,X,Y,color,r=2.5){return x.map((v,i)=>Number.isFinite(v)&&Number.isFinite(y[i])?`<circle cx="${X(v)}" cy="${Y(y[i])}" r="${r}" fill="${color}" stroke="var(--chart-bg)" stroke-width=".7"/>`:'').join('')}

  function metric(s,key){if(key==='EOT')return s.eot;return s[key]}
  function mapSpec(k){
    return{Qtot:['Qtot','cm⁻²',true],Dit:['Minimum Dit (PV2000-style)','cm⁻² eV⁻¹',true],MidgapDit:['Midgap Dit (PCHIP)','cm⁻² eV⁻¹',true],EOT:['EOT (SiO₂ eq.)','nm',false],Cox:['Cox','F/cm²',true],Qsc:['Qsc','cm⁻²',true],InitialQc:['Initial Qc','cm⁻²',false],MaxVsb:['Max |Vsb|','V',false]}[k]}
  function mapValue(v,k){if(!Number.isFinite(v))return'—';if(k==='EOT')return v.toFixed(2);if(k==='MaxVsb')return v.toFixed(3);const e=Math.floor(Math.log10(Math.abs(v)||1)),m=v/10**e;return`${m.toFixed(2)}e${e}`}
  function mapColor(t){t=Math.max(0,Math.min(1,t));const a=[79,124,255],b=[255,90,95];return`rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`}
  function spatialEnvelope(d,coords=[]){
    const resolved=d?.geometryModel,
      coordRadius=Math.max(0,...coords.map(p=>Math.hypot(p?.x||0,p?.y||0)));
    if(resolved?.shape==='circle'&&Number.isFinite(resolved.nominal?.radius)){
      return{
        kind:'round',
        onePoint:d?.patternType==='OnePointPattern'&&coords.length<=1,
        radius:resolved.nominal.radius,
        innerRadius:Number.isFinite(resolved.scheduled?.radius)?resolved.scheduled.radius:NaN,
        coordRadius,
        geometrySource:resolved.provenance||'resolver'
      };
    }
    const targetRadius=d?.targetType==='RoundWafer'&&Number.isFinite(d?.diameter)&&d.diameter>0?d.diameter/2:NaN,
      substrateRadius=(d?.shapeType==='Circle'||d?.shapeType==='RoundWafer')&&Number.isFinite(d?.radius)&&d.radius>0?d.radius:NaN,
      nominalRadius=Number.isFinite(targetRadius)?targetRadius:substrateRadius,
      radius=Number.isFinite(nominalRadius)?nominalRadius:Math.max(1,coordRadius),
      innerRadius=Number.isFinite(nominalRadius)&&Number.isFinite(d?.edgeExclusion)?Math.max(0,nominalRadius-d.edgeExclusion):NaN;
    return{kind:Number.isFinite(nominalRadius)?'round':'points',onePoint:d?.patternType==='OnePointPattern'&&coords.length<=1,radius,innerRadius,coordRadius,geometrySource:Number.isFinite(targetRadius)?'target':Number.isFinite(substrateRadius)?'substrate':'points'};
  }

  function filterMetrics(analysis){
    const specs={
      Qtot:['Qtot','Qtot','cm⁻²'],
      Dit:['Dit','Minimum Dit (PV2000-style)','cm⁻² eV⁻¹'],
      MidgapDit:['MidgapDit','Midgap Dit (PCHIP)','cm⁻² eV⁻¹'],
      EOT:['eot','EOT (SiO₂ eq.)','nm'],
      Cox:['Cox','Cox','F/cm²'],
      Qsc:['Qsc','Qsc','cm⁻²'],
      InitialQc:['InitialQc','Initial Qc','cm⁻²'],
      MaxVsb:['MaxVsb','Max |Vsb|','V']
    };
    return Object.fromEntries(Object.entries(specs)
      .filter(([key])=>key!=='MidgapDit'||analysis.options?.pchipEnabled!==false)
      .map(([key,[siteKey,label,unit]])=>[
        key,{key,label,short:label,unit,values:analysis.sites.map(site=>site[siteKey])}
      ]));
  }

  function render(host,d,baseAnalysis){
    let analysis=baseAnalysis,
      site=Math.max(0,analysis.sites.findIndex(x=>x.valid)),
      mapKey='Qtot',
      analysisOpen=true,
      resultsOpen=true,
      filterController=null,
      metrics=null,
      zoom={vcpd:{x:null,y:null},dit:{x:null,y:null},vsb:{x:null,y:null},map:{x:null,y:null}};
    const rebuildFilter=(preferredKey='Qtot')=>{
      metrics=filterMetrics(analysis);
      const key=metrics[preferredKey]?preferredKey:'Qtot';
      mapKey=key;
      filterController=Sel.createFilter({
        metrics,
        siteCount:analysis.sites.length,
        intrinsicMask:analysis.sites.map(x=>!!x.valid),
        metricKey:key
      });
      return filterController;
    };
    rebuildFilter();
    const controlNum=(id,fallback)=>{const el=host.querySelector(id);if(!el)return fallback;const raw=el.value.trim();if(raw==='')return NaN;const v=Number(raw);return Number.isFinite(v)?v:NaN};
    const controlOptionalNum=(id,fallback=Infinity)=>{const el=host.querySelector(id);if(!el)return fallback;const raw=el.value.trim();if(raw==='')return Infinity;const v=Number(raw);return Number.isFinite(v)?v:NaN};
    const rebuild=()=>{analysisOpen=true;
      const material=host.querySelector('#ditMaterial')?.value||analysis.options.material||'Si',
      accumN=controlNum('#ditAccumN',analysis.options.accumN||5),
      ditReject=controlOptionalNum('#ditReject',analysis.options.ditReject),
      pchipScale=host.querySelector('#ditPchipScale')?.value||analysis.options.pchipScale,
      pchipEnabled=host.querySelector('#ditUsePchip')?.checked!==false,
      pchipMethod=host.querySelector('#ditPchipMethod')?.value||analysis.options.pchipMethod||'median',
      medianMv=controlNum('#ditPchipMedianMv',(analysis.options.pchipMedianWindowV??.010)*1e3),
      pchipMedianWindowV=medianMv*1e-3,
      cocosMode=host.querySelector('#ditCocosMode')?.value||analysis.options.cocosMode||'xml',
      cocosIIEOT_A=controlNum('#ditCocosEotA',analysis.options.cocosIIEOT_A),
      cocosIIMinVsb=controlNum('#ditCocosMin',analysis.options.cocosIIMinVsb),
      cocosIIMaxVsb=controlNum('#ditCocosMax',analysis.options.cocosIIMaxVsb),
      backSurfaceShift=analysis.options.backSurfaceShift;
      const previousFilter=filterController?.snapshot?.().metricKey||'Qtot';
      analysis=analyze(d,{material,accumN,ditReject,pchipScale,pchipEnabled,pchipMethod,pchipMedianWindowV,cocosMode,cocosIIEOT_A,cocosIIMinVsb,cocosIIMaxVsb,backSurfaceShift});
      rebuildFilter(previousFilter);
      zoom={vcpd:{x:null,y:null},dit:{x:null,y:null},vsb:{x:null,y:null},map:{x:null,y:null}};
      if(site>=analysis.sites.length)site=0;
      renderShell()};
      
    const statText=(key)=>{
      const metricKey=key==='eot'?'EOT':key,
        m=metrics?.[metricKey];
      if(!m)return'—';
      const mask=filterController.metricMask(m),
        st=S.summary(m.values.filter((value,index)=>mask[index]&&Number.isFinite(value)));
      return Number.isFinite(st.mean)?`${fmt(st.mean)} ± ${fmt(st.stdev)}`:'—'
    };
    const resultHelp={
      Qtot:'Total dielectric/interface charge obtained from the horizontal charge separation between the natural initial condition and the flatband point on the dark V–Q characteristic.',
      Dit:'PV-2000-style minimum interface-state density: the minimum accepted discrete variation-method Dit point. It does not use PCHIP interpolation.',
      MidgapDit:'Optional PCHIP-derived Dit evaluated at the theoretical midgap surface potential. PCHIP settings affect this result and the green fit curve, but never the PV2000-style minimum Dit. Midgap Dit is reported only when the theoretical target lies inside both measured Vsb coverage and the retained PCHIP fit domain; no extrapolation is performed.',
      eot:'Equivalent oxide thickness expressed as the thickness of SiO₂ (κ≈3.9) giving the measured dielectric capacitance. For any other dielectric or multilayer stack it is an electrical-equivalent thickness, not physical thickness.',
      Cox:'Dielectric capacitance per unit area obtained from the dark accumulation V–Q slope.',
      Qsc:'Semiconductor space charge evaluated at the natural initial Vsb using the same MOS charge model as the group MATLAB code.',
      InitialQc:'Barrier-adjustment corona bookkeeping: number of PreProcess charge events multiplied by the PreProcess corona-charge step.',
      MaxVsb:'Maximum absolute surface-barrier magnitude reached by the analysis Vsb curve; with COCOS-II enabled this uses the reconstructed corrected Vsb.'
    };
      
    const metaHelp={
      recipe:'PV-2000 recipe/job name stored in the result XML.',
      substrate:'Substrate identifier stored with the result.',
      lot:'Lot identifier stored with the result; it may be empty.',
      status:'PV-2000 execution status.',
      start:'Execution start timestamp from the result XML.',
      end:'Execution completion timestamp from the result XML.',
      elapsed:'Total elapsed measurement time.',
      pattern:'Measurement pattern name/type and number of measured sites.',
      points:'Number of Kelvin-probe samples averaged for each Vcpd reading.',
      interval:'Time interval between the Vcpd samples used to form each vector.',
      offset:'Kelvin-probe Vcpd calibration offset stored in MeasurementData and applied to reconstructed Vcpd values.',
      factor:'Standard COCOS correction factor applied to the measured dark-light Vcpd difference when COCOS-II is disabled.',
      qitRange:'Surface-barrier range configured for Qit/Dit extraction.',
      c2:'Whether the XML requests COCOS-II. The current DLL establishes Vfb/Qcfb first, then reconstructs the internal light-equivalent branch used by Dit/Qit.',
      c2eot:'Raw COCOS-II EOT setting stored in the XML. Current-DLL vendor probes confirm this value is interpreted in Å.',
      preCharge:'Corona charge increment used during barrier adjustment before the main sweep.',
      preTarget:'Target Vsb range for the barrier-adjustment stage.',
      preAttempts:'Maximum barrier-adjustment attempts and number of extra scans.',
      processCharge:'Positive/negative corona charge increment used during the main Process sweep.',
      processTarget:'Target measurement range for terminating the main Process sweep.',
      processAttempts:'Maximum Process attempts and number of extra scans.'
    };
      
    const md=(label,value,tip)=>`<dt>${esc(label)} ${help(tip)}</dt><dd>${value}</dd>`;
    const midgapCoverageText=s=>{
      if(!analysis.options.pchipEnabled||s.midgapStatus==='available')return'';
      if(s.midgapStatus==='outside-measured')return`Theoretical midgap Vsb ${fmt(s.midgapV,3)} V is outside measured coverage ${fmt(s.midgapMeasuredMinVsb,3)}–${fmt(s.midgapMeasuredMaxVsb,3)} V; no extrapolation.`;
      if(s.midgapStatus==='outside-fit')return`Theoretical midgap Vsb ${fmt(s.midgapV,3)} V is outside retained PCHIP fit coverage ${fmt(s.midgapFitMinVsb,3)}–${fmt(s.midgapFitMaxVsb,3)} V after preprocessing; no extrapolation.`;
      return'Midgap Dit unavailable from the retained PCHIP fit.';
    };
    function analysisControls(){
      const o=analysis.options,
        eff=o.effectiveCocosMode,
        isPv=eff==='pv2000-re',
        current=analysis.sites[site]||{},
        rec=analysis.recommendation||{},
        field=(label,tip,control,cls='')=>`<label class="compact-field ${cls}"><span class="field-name">${label} ${help(tip)}</span>${control}</label>`;
        
      const diagnostics=isPv?`<div class="cocos-diagnostics"><span>Accepted intervals <b>${current.ditAcceptedCount??0}/${current.ditIntervalCount??0}</b></span><span>Minimum at Vsb <b>${fmt(current.ditMinVsb,3)} V</b></span></div>`:'';
        
      const recommendation=isPv?`<div class="cocos-recommendation"><span><b>Suggested from data:</b> EOT ${fmt(rec.eotA,1)} Å · window ${fmt(rec.minVsb,2)}…${fmt(rec.maxVsb,2)} V <small>${esc(rec.eotSource||'')}</small></span><button id="ditUseRecommendation" type="button">Use</button></div>`:'';
        
      return `<details id="ditAnalysisControls" class="panel" ${analysisOpen?'open':''}><summary>Analysis controls</summary>
        <div class="setting-row compact-settings analysis-method-row">
          ${field('Material','Analyzer semiconductor model used by Qsc, flatband semiconductor capacitance, variation/Minimum Dit and theoretical Midgap Dit. PV-2000 itself has no Si/Ge material selector. Si is the default Analyzer model; Ge uses the legacy MATLAB constants ni=2E13 cm⁻³ and εr=16.2.',`<select id="ditMaterial"><option value="Si">Silicon (Si)</option><option value="Ge">Germanium (Ge)</option></select>`)}
          ${field('Analysis method','Choose how this XML is analyzed. Follow XML setting maps UseCocosII=false to Standard COCOS and UseCocosII=true to the recovered current-DLL COCOS-II path.',`<select id="ditCocosMode"><option value="xml">Follow XML setting</option><option value="standard">Standard COCOS</option><option value="pv2000-re">PV-2000 COCOS-II (current DLL)</option></select>`)}
        </div>
        ${o.material==='Ge'?`<div class="analysis-resolved"><b>Ge Analyzer model:</b> legacy MATLAB compatibility · ni = 2E13 cm⁻³ · εr = 16.2 · PV-2000 has no material selector</div>`:''}
        ${analysis.error?`<div class="analysis-error">${esc(analysis.error)} Invalid settings are not silently corrected or replaced.</div>`:''}
        ${isPv?`<div class="control-section-title">COCOS-II ${help('Current-DLL reconstruction is vendor-validated for the recovered UseCocosII/EOT/Vsb-window path. Back Surface Shift remains outside this validation envelope and is not applied by the Analyzer-side configurable path.')}</div><div class="setting-row compact-settings">
          ${field('EOT [Å]','Current-DLL COCOS-II: SiO₂-equivalent EOT in ångström. The vendor path uses Cox=3.453e-5/EOT [F/cm²] and reconstructs the internal light-equivalent branch around Vfb/Qcfb.',`<input id="ditCocosEotA" type="number" min="0.001" step="any" value="${o.cocosIIEOT_A}">`)}
          ${field('Min Vsb [V]','Lower signed-Vsb segment-validity bound. A segment crossing this boundary remains eligible, matching the current DLL.',`<input id="ditCocosMin" type="number" step="any" value="${o.cocosIIMinVsb}">`)}
          ${field('Max Vsb [V]','Upper signed-Vsb segment-validity bound. A segment crossing this boundary remains eligible, matching the current DLL.',`<input id="ditCocosMax" type="number" step="any" value="${o.cocosIIMaxVsb}">`)}
        </div>${recommendation}${diagnostics}`:''}
        <div class="control-section-title">Flatband</div><div class="setting-row compact-settings">${field('Accumulation points','Number of deepest-accumulation dark V–Q points used to determine Cox/EOT and the flatband-capacitance criterion. Minimum Dit (PV2000-style) is taken directly from accepted discrete Dit–Vsb points; PCHIP does not change it.',`<input id="ditAccumN" type="number" min="3" max="20" value="${o.accumN}">`)}</div>
        <div class="control-section-title optional-section-title"><label class="option-toggle"><input id="ditUsePchip" type="checkbox" ${o.pchipEnabled?'checked':''}> Optional Midgap Dit (PCHIP)</label> ${help('Optional analysis. Median-binned PCHIP is the default; PCHIP (original) preserves the previous raw-point preprocessing. Both estimate Midgap Dit only and never change Minimum Dit (PV2000-style).')}</div>
        <div class="setting-row compact-settings pchip-settings ${o.pchipEnabled?'':'disabled'}">
          ${field('Method','Median-binned PCHIP groups nearby fit points into fixed Vsb bins and replaces each bin by its median representative before interpolation. PCHIP (original) keeps the previous raw-point preprocessing for compatibility.',`<select id="ditPchipMethod" ${o.pchipEnabled?'':'disabled'}><option value="median">Median-binned PCHIP</option><option value="original">PCHIP (original)</option></select>`)}
          ${field('Median Vsb window [mV]','Editable bin width used only by Median-binned PCHIP. Default 10 mV; enter any positive value and Apply analysis settings. Smaller windows preserve more local variation; larger windows aggregate more strongly.',`<input id="ditPchipMedianMv" type="number" min="0.1" step="any" value="${Number.isFinite(o.pchipMedianWindowV)?Number((o.pchipMedianWindowV*1e3).toPrecision(6)):''}" ${o.pchipEnabled&&o.pchipMethod==='median'?'':'disabled'}>`)}
          ${field('PCHIP outlier limit','Optional manual upper Dit threshold used only by the Midgap PCHIP fit inside 0.1–0.5 V. Leave blank to disable absolute-value rejection. A finite value preserves the legacy threshold behavior; Minimum Dit is never changed.',`<input id="ditReject" type="number" min="0" step="any" placeholder="disabled" value="${Number.isFinite(o.ditReject)?o.ditReject.toExponential(3).replace('e','E'):''}" ${o.pchipEnabled?'':'disabled'}>`)}
          ${field('Interpolation scale','Applies to both PCHIP methods. LOG10 interpolates log10(Dit); Linear interpolates Dit directly. Median-binned PCHIP also takes its per-bin median in the selected interpolation space.',`<select id="ditPchipScale" ${o.pchipEnabled?'':'disabled'}><option value="log10">LOG10</option><option value="linear">Linear</option></select>`)}
        </div>
        <div class="analysis-actions"><button id="ditRecalc">Apply analysis settings</button></div>
      </details>`;
    }
    function renderShell(){
      const paneScroll={
        side:host.querySelector('.side')?.scrollTop||0,
        overview:host.querySelector('.overview')?.scrollTop||0,
        detail:host.querySelector('.detail')?.scrollTop||0
      };
      if(!analysis.options.pchipEnabled&&mapKey==='MidgapDit')mapKey='Dit';
      const s=analysis.sites[site],
        coord=s.coord||{x:0,y:0},
        filterState=filterController.snapshot(),
        siteSupport=filterState.selection.supportMask[site],
        siteActive=filterState.selection.activeMask[site],
        siteFilterState=!s.valid?'ALGORITHM INVALID':siteSupport?(siteActive?'VALID':'FILTERED'):'UNAVAILABLE',
        rows=[['Qtot','Qtot'],['Minimum Dit (PV2000-style)','Dit'],['Midgap Dit (PCHIP)','MidgapDit'],['EOT (SiO₂ eq.)','eot'],['Cox','Cox'],['Qsc','Qsc'],['Initial Qc','InitialQc'],['Max |Vsb|','MaxVsb']],
        summaryRows=rows.map(([name,key])=>{
          const statKey=key==='eot'?'eot':key,
            unit=mapSpec(key==='eot'?'EOT':key)[1];
          return `<dt>${esc(name)} ${help(resultHelp[key]||'')}</dt><dd><strong>${statText(statKey)} ${esc(unit)}</strong></dd>`;
        }).join(''),
        selectedResultRows=rows.filter(([,key])=>key!=='InitialQc').map(([name,key])=>{
          const unit=mapSpec(key==='eot'?'EOT':key)[1];
          return `<dt>${esc(name)}</dt><dd>${fmt(metric(s,key))} ${esc(unit)}</dd>`;
        }).join(''),
        vendorResultRows=s.ResultProfile
          ?`<dt>PV-2000 result profile</dt><dd>${esc(s.ResultProfile)}</dd><dt>PV-2000 Vfb</dt><dd>${fmt(s.ResultVfb,6)} V</dd><dt>PV-2000 Qsc</dt><dd>${sci(s.ResultQsc,4)} cm⁻²</dd><dt>PV-2000 Qtot</dt><dd>${sci(s.ResultQtot,4)} cm⁻²</dd><dt>PV-2000 Qit</dt><dd>${sci(s.ResultQit,4)} cm⁻²</dd><dt>PV-2000 Minimum Dit</dt><dd>${sci(s.ResultDit,4)} cm⁻² eV⁻¹</dd>`
          :'',
        targetText=d.targetType==='RoundWafer'&&Number.isFinite(d.diameter)
          ?`Ø${fmt(d.diameter,1)} mm · ${d.targetType}`
          :d.targetType==='SquareCell'&&Number.isFinite(d.targetWidth)&&Number.isFinite(d.targetHeight)
            ?`${fmt(d.targetWidth,1)} × ${fmt(d.targetHeight,1)} mm · ${d.targetType}`
            :d.targetType||'—',
        algorithmValidN=analysis.sites.filter(item=>item.valid).length,
        coordinateN=analysis.sites.filter(item=>Number.isFinite(item.coord?.x)&&Number.isFinite(item.coord?.y)).length;
        
      host.innerHTML=`<div class="module-grid dit-module"><aside class="side">
        <section class="panel"><h3>Measurement ${help('Core measurement identity and sample context. Lower-priority timing, instrument and recipe details are kept under Acquisition metadata.')}</h3><dl class="meta">
          ${md('Result',esc(d.resultName||'—'),'Result identifier stored in the PV-2000 XML.')}
          ${md('Recipe',esc(d.name||'—'),metaHelp.recipe)}
          ${md('Substrate',esc(d.substrateId||'—'),metaHelp.substrate)}
          ${md('Status',esc(d.status||'—'),metaHelp.status)}
          ${md('Pattern',esc(d.patternName||d.patternType||'—'),metaHelp.pattern)}
          ${md('Target',esc(targetText),'Nominal target geometry stored in the XML.')}
          ${md('COCOS mode',d.useCocosII?'COCOS-II':'Standard COCOS',metaHelp.c2)}
          ${md('Doping',`${esc(d.dopingType)}-type · ${sci(d.doping,3)} cm⁻³`,'Semiconductor conductivity type and base doping used by the DIT calculations.')}
        </dl></section>
        <section class="panel current-dataset-panel"><h3>Current dataset ${help('Completeness and active-population counts for the currently imported XML.')}</h3><div class="validation">
          <div><b>${analysis.sites.length}</b><span>XML sites</span></div>
          <div><b>${algorithmValidN} / ${analysis.sites.length}</b><span>algorithm valid</span></div>
          <div><b>${coordinateN} / ${analysis.sites.length}</b><span>coordinates</span></div>
          <div><b>${filterState.validCount} / ${analysis.sites.length}</b><span>pass filter</span></div>
        </div></section>
        ${analysisControls()}
        ${PV.ui.validDataFilterMarkup({
          prefix:'ditFilter',
          metrics,
          state:filterState,
          helpText:'Choose a calculated DIT/COCOS site quantity and numeric range. Algorithm-invalid sites remain intrinsically excluded; the user range only narrows the active site population used by Results summary, wafer-map display and map export. Current-site Vcpd/Vsb/Dit curves are never recalculated or truncated by this filter.'
        })}
        <details id="ditResultsSummary" class="panel results-summary-panel" ${resultsOpen?'open':''}><summary>Results summary ${help('Each row shows valid-site mean ± sample standard deviation after intrinsic validity, the active Valid-data filter and quantity availability are applied. Point-specific values remain in the right-hand Selected site / Measurement point panel.')}</summary><dl class="meta compact-summary">${summaryRows}</dl></details>

        <details class="panel">\
<summary>Acquisition metadata ${help('Lower-priority timing, instrument, calibration and COCOS recipe settings parsed directly from the imported XML.')}</summary>\
<dl class="meta meta-detail">${md('Lot ID',esc(d.lotId||'—'),metaHelp.lot)}\
${md('Start',esc(d.start||'—'),metaHelp.start)}\
${md('End',esc(d.end||'—'),metaHelp.end)}\
${md('Elapsed',esc(d.elapsed||'—'),metaHelp.elapsed)}\
${md('Data points / Vcpd',fmt(d.numberOfDataPoints,0),metaHelp.points)}\
${md('Measurement interval',`${fmt(d.measurementInterval,4)} s`,metaHelp.interval)}\
${md('Vcpd offset',`${fmt(d.offset,6)} V`,metaHelp.offset)}\
${md('Vsb factor',fmt(d.factor,3),metaHelp.factor)}\
${md('Qit barrier range',`${fmt(d.qitMin,3)} to ${fmt(d.qitMax,3)} V`,metaHelp.qitRange)}\
${md('Use COCOS-II',d.useCocosII?'True':'False',metaHelp.c2)}\
${md('COCOS-II EOT raw',fmt(d.cocosIIEOT,3),metaHelp.c2eot)}\
${md('COCOS-II Min/Max Vsb',`${fmt(d.cocosIIMinVsb,3)} to ${fmt(d.cocosIIMaxVsb,3)} V`,'Vendor COCOS-II Vsb limits when available in XML; otherwise the reverse-engineered defaults are -0.10 and 0.65 V.')}\
${md('Back Surface Shift',d.backSurfaceShift?'True':'False','PV2000 exposes this Boolean adjustment. Its effect was not identified in the supplied tests, so the reverse-engineered method records but does not apply it.')}</dl>\
</details>
        <details class="panel"><summary>Recipe charge sequence ${help('Corona charge increments, target ranges and loop limits controlling barrier adjustment and the main COCOS sweep.')}</summary><dl class="meta meta-detail">${md('PreProcess ΔQc',`${sci(d.pre.charge,3)} cm⁻²`,metaHelp.preCharge)}${md('PreProcess target',`${esc(d.pre.targetMin)} to ${esc(d.pre.targetMax)}`,metaHelp.preTarget)}${md('Pre attempts / extra',`${fmt(d.pre.attempts,0)} / ${fmt(d.pre.extra,0)}`,metaHelp.preAttempts)}${md('Process ΔQc',`${sci(d.process.charge,3)} cm⁻²`,metaHelp.processCharge)}${md('Process target',`${esc(d.process.targetMin)} to ${esc(d.process.targetMax)}`,metaHelp.processTarget)}${md('Process attempts / extra',`${fmt(d.process.attempts,0)} / ${fmt(d.process.extra,0)}`,metaHelp.processAttempts)}</dl></details>

      </aside><section class="plots overview">
        <div class="panel chart map-panel"><header>
          ${d.patternType==='OnePointPattern'?'<b>Measurement position</b>':'<b>Wafer map</b>'}
          ${help('Scroll normally moves this pane. Hold Ctrl/⌘ while scrolling inside the map to zoom both spatial axes; hold Ctrl/⌘ over one axis to zoom only that axis; double-click restores auto scale. OnePointPattern shows the scheduled point on the nominal XML target instead of inventing a spatial heatmap. Multi-site data map the selected Dit/COCOS quantity across measured coordinates.')}
          <span class="grow"></span>
          <select id="ditMapMetric">
            <option value="Qtot">Qtot</option>
            <option value="Dit">Minimum Dit (PV2000-style)</option>
            <option value="MidgapDit" ${analysis.options.pchipEnabled?'':'disabled'}>Midgap Dit (PCHIP)</option>
            <option value="EOT">EOT</option>
            <option value="Cox">Cox</option>
            <option value="Qsc">Qsc</option>
            <option value="InitialQc">Initial Qc</option>
            <option value="MaxVsb">Max |Vsb|</option>
          </select>
          ${PV.plot.axisControls('ditMapAxes')}
          <button id="e4" title="Export every site with algorithm-validity, metric-availability and active filter provenance.">Export</button>
        </header><div class="chart-stage map-stage"><svg id="d4" viewBox="0 0 640 500"></svg></div></div>
      </section><section class="plots detail">
          <section class="panel dit-selected-panel">
            <h3>${d.patternType==='OnePointPattern'?'Measurement point':'Selected site'} ${help('Site selection is an inspection control. Filtering never removes sites from this selector; it only changes whether the selected site is VALID, FILTERED, UNAVAILABLE or algorithm-invalid for aggregate views.')}</h3>
            <div class="site-controls">
              <button id="ditPrev">‹</button>
              <select id="ditSite">${analysis.sites.map((x,i)=>`<option value="${i}" ${i===site?'selected':''}>Site ${i+1}${x.valid?'':' ⚠'}</option>`).join('')}</select>
              <button id="ditNext">›</button>
              <span class="coord">x ${fmt(coord.x,1)} · y ${fmt(coord.y,1)}</span>
            </div>
            <dl class="meta" style="margin-top:8px">
              ${PV.ui.selectionStateRow(siteFilterState,{label:'Status'})}
              <dt>Initial VDark</dt><dd>${fmt(s.VDark,6)} V</dd>
              <dt>Measured initial VLight</dt><dd>${fmt(s.VLight,6)} V</dd>
              <dt>PV-2000 result VLight</dt><dd>${fmt(s.ResultVLight,6)} V</dd>
              <dt>PV-2000 result Vsb</dt><dd>${fmt(s.ResultVsb,6)} V</dd>
              <dt>Analysis Vsb</dt><dd>${fmt(s.Vsb,6)} V</dd>
              <dt>Initial Qc</dt><dd>${sci(s.InitialQc,4)} cm⁻²</dd>
              ${selectedResultRows}${vendorResultRows}
            </dl>
            ${midgapCoverageText(s)?`<div class="note" style="margin-top:7px">${esc(midgapCoverageText(s))}</div>`:''}
          </section>
        <div class="panel chart"><header><b>Vcpd–Qc</b>${help('Dark and measured light Kelvin-probe potentials versus deposited corona charge. Point-line display; data points are smaller than the yellow initial-condition marker. Scroll normally moves this pane. Hold Ctrl/⌘ while scrolling inside the plot to zoom both axes; hold Ctrl/⌘ over one axis to zoom only that axis; double-click restores auto scale. Axes opens manual numeric X/Y limits. For COCOS-II XMLs, the reconstructed synthetic light curve is also shown. Yellow = initial projection; green = flatband charge.')}<span class="chart-meta" id="ditVcpdMeta"></span><span class="grow"></span>${PV.plot.axisControls('ditVcpdAxes')}<button id="e1" title="Export the current-site Vcpd/Qc data, including reconstructed COCOS-II light values when available.">Export</button></header><div class="chart-stage"><div class="chart-legend" id="ditVcpdLegend"></div><svg id="d1" viewBox="0 0 640 360"></svg></div></div>
        <div class="panel chart"><header><b>Dit–Vsb</b>${help('Scroll normally moves this pane. Hold Ctrl/⌘ while scrolling inside the plot to zoom both axes; hold Ctrl/⌘ over one axis to zoom only that axis; double-click restores auto scale. Axes opens manual numeric X/Y limits. Interface-state density versus Vsb uses a logarithmic Y axis, so manual Y limits must stay positive. Standard COCOS uses doping-aware signed Vsb from the measured dark/light difference and XML correction factor. PV-2000 current-DLL mode uses signed Vsb; gray points fall outside its Min/Max Vsb acceptance window. Green is the optional PCHIP interpolation used for Midgap Dit; it does not determine the PV2000-style minimum.')}<span class="chart-meta" id="ditDitMeta"></span><span class="grow"></span>${PV.plot.axisControls('ditDitAxes')}<button id="e2" title="Export current-site Vsb and variation-method Dit.">Export</button></header><div class="chart-stage"><div class="chart-legend" id="ditDitLegend"></div><svg id="d2" viewBox="0 0 640 360"></svg></div></div>
        <div class="panel chart"><header><b>Vsb–Qc</b>${help('Scroll normally moves this pane. Hold Ctrl/⌘ while scrolling inside the plot to zoom both axes; hold Ctrl/⌘ over one axis to zoom only that axis; double-click restores auto scale. Axes opens manual numeric X/Y limits. Surface barrier versus corona charge. Standard COCOS displays doping-aware signed Vsb. PV-2000 current-DLL mode displays signed Vsb reconstructed from the EOT-defined synthetic light line. Standard measured signed Vsb is dashed for comparison in COCOS-II modes.')}<span class="chart-meta" id="ditVsbMeta"></span><span class="grow"></span>${PV.plot.axisControls('ditVsbAxes')}<button id="e3" title="Export current-site raw and analysis Vsb versus Qc.">Export</button></header><div class="chart-stage"><div class="chart-legend" id="ditVsbLegend"></div><svg id="d3" viewBox="0 0 640 360"></svg></div></div>
        <details class="panel"><summary>Flatband extraction</summary><dl class="meta"><dt>q initial ${help('Natural initial dark Vcpd projected onto the Process dark V–Q curve.')}</dt><dd>${sci(s.qinit,4)}</dd><dt>q flatband ${help('Flatband charge obtained from the dark differential-capacitance crossing using the theoretical semiconductor flatband capacitance.')}</dt><dd>${sci(s.qfb,4)}</dd><dt>EOT</dt><dd>${fmt(s.eot,3)} nm</dd><dt>Cox</dt><dd>${sci(s.Cox,4)} F/cm²</dd>${analysis.options.effectiveCocosMode==='pv2000-re'?`<dt>COCOS-II source ${help('PV-2000 current-DLL mode reconstructs the internal light branch after Vfb/Qcfb, uses EOT in Å, and applies Min/Max Vsb to Dit segment validity. Back Surface Shift remains outside the validated envelope.')}</dt><dd>${esc(s.c2?.source||'unavailable')} · EOT ${fmt(s.c2?.eotA,3)} Å · window [${fmt(s.c2?.minVsb,3)}, ${fmt(s.c2?.maxVsb,3)}] V</dd>`:''}</dl></details>
      </section></div>`;
      host.querySelector('#ditMapMetric').value=mapKey;
        host.querySelector('#ditPchipScale').value=analysis.options.pchipScale;
        host.querySelector('#ditPchipMethod').value=analysis.options.pchipMethod;
        host.querySelector('#ditMaterial').value=analysis.options.material;
        host.querySelector('#ditCocosMode').value=analysis.options.cocosMode;
        const analysisPanel=host.querySelector('#ditAnalysisControls'),
        applyBtn=host.querySelector('#ditRecalc');
        if(analysisPanel)analysisPanel.ontoggle=()=>{analysisOpen=analysisPanel.open};
        const resultsPanel=host.querySelector('#ditResultsSummary');
        if(resultsPanel)resultsPanel.ontoggle=()=>{resultsOpen=resultsPanel.open};
        PV.ui.bindValidDataFilter(host,{
          prefix:'ditFilter',
          controller:filterController,
          linkedSelect:'#ditMapMetric',
          onChange:state=>{
            mapKey=state.metricKey;
            zoom.map={x:null,y:null};
            renderShell();
          }
        });
        const markDirty=()=>{
        if(applyBtn){applyBtn.classList.add('dirty');
          applyBtn.textContent='Apply analysis settings •'}};
        ['#ditCocosEotA','#ditCocosMin','#ditCocosMax','#ditAccumN','#ditReject','#ditPchipMedianMv'].forEach(id=>{
        const el=host.querySelector(id);if(el){el.oninput=markDirty;el.onkeydown=e=>{
            if(e.key==='Enter')rebuild()}}});
        const pchipToggle=host.querySelector('#ditUsePchip'),
        pchipMethod=host.querySelector('#ditPchipMethod'),
        pchipMedian=host.querySelector('#ditPchipMedianMv'),
        pchipScale=host.querySelector('#ditPchipScale'),
        pchipReject=host.querySelector('#ditReject'),
        syncPchipControls=()=>{
        const enabled=pchipToggle?.checked!==false,
        isMedian=pchipMethod?.value==='median';
        if(pchipMethod)pchipMethod.disabled=!enabled;
        if(pchipMedian)pchipMedian.disabled=!enabled||!isMedian;
        if(pchipScale)pchipScale.disabled=!enabled;
        if(pchipReject)pchipReject.disabled=!enabled;
        host.querySelector('.pchip-settings')?.classList.toggle('disabled',!enabled)};
        if(pchipToggle)pchipToggle.onchange=()=>{syncPchipControls();
        markDirty()};
        if(pchipMethod)pchipMethod.onchange=()=>{syncPchipControls();
        markDirty()};
        if(pchipScale)pchipScale.onchange=()=>markDirty();
        syncPchipControls();
        host.querySelector('#ditMaterial').onchange=()=>markDirty();
        host.querySelector('#ditCocosMode').onchange=()=>rebuild();
        const recBtn=host.querySelector('#ditUseRecommendation');
        if(recBtn)recBtn.onclick=()=>{
        const rec=analysis.recommendation||{};
        const e=host.querySelector('#ditCocosEotA'),
        mn=host.querySelector('#ditCocosMin'),
        mx=host.querySelector('#ditCocosMax');
        if(e&&Number.isFinite(rec.eotA))e.value=Number(rec.eotA.toFixed(3));
        if(mn&&Number.isFinite(rec.minVsb))mn.value=Number(rec.minVsb.toFixed(3));
        if(mx&&Number.isFinite(rec.maxVsb))mx.value=Number(rec.maxVsb.toFixed(3));
        markDirty()};
        host.querySelector('#ditSite').onchange=e=>{site=+e.target.value;
        zoom.vcpd={x:null,y:null};
        zoom.dit={x:null,y:null};
        zoom.vsb={x:null,y:null};
        renderShell()};
        host.querySelector('#ditPrev').onclick=()=>{
        if(site>0){site--;
          zoom.vcpd={x:null,y:null};
          zoom.dit={x:null,y:null};
          zoom.vsb={x:null,y:null};
          renderShell()}};
        host.querySelector('#ditNext').onclick=()=>{
        if(site<analysis.sites.length-1){site++;
          zoom.vcpd={x:null,y:null};
          zoom.dit={x:null,y:null};
          zoom.vsb={x:null,y:null};
          renderShell()}};
        applyBtn.onclick=()=>rebuild();
        
      host.querySelector('#e1').onclick=()=>PV.exporter.csv(`Dit_site${site+1}_Vcpd.csv`,['Qc','VDark','Measured VLight','PV-2000 result VLight','PV-2000 result Vsb','Analysis Vsb','COCOS-II synthetic VLight'],s.rows.map((r,i)=>[r.Qc,r.VDark,r.VLight,r.ResultVLight,r.ResultVsb,s.analysisVsb[i],s.c2?.light?.[i]??'']));
        
      host.querySelector('#e2').onclick=()=>{
        const fitMethod=analysis.options.pchipEnabled?(analysis.options.pchipMethod==='median'?'Median-binned PCHIP':'PCHIP (original)'):'Off',
        medianMv=analysis.options.pchipMethod==='median'?analysis.options.pchipMedianWindowV*1e3:'',
        scale=analysis.options.pchipScale==='log10'?'LOG10':'Linear',
        reject=Number.isFinite(analysis.options.ditReject)?analysis.options.ditReject:'',
        midgapStatus=s.midgapStatus||'',
        midgapTarget=s.midgapV;
        PV.exporter.csv(`Dit_site${site+1}_Dit.csv`,['Vsb','Variation Dit','Accepted by COCOS-II window','Midgap fit method','Median Vsb window [mV]','Interpolation scale','PCHIP outlier limit','Midgap target Vsb [V]','Midgap status'],s.rows.slice(0,-1).map((r,i)=>[s.analysisVsb[i],s.ditRaw[i],s.ditAccepted?.[i]===false?'NO':'YES',fitMethod,medianMv,scale,reject,midgapTarget,midgapStatus]))};
        
      host.querySelector('#e3').onclick=()=>PV.exporter.csv(`Dit_site${site+1}_Vsb.csv`,['Qc','PV-2000 result Vsb','Raw standard analysis Vsb',analysis.options.effectiveCocosMode==='pv2000-re'?'Analysis signed Vsb':'Analysis Vsb'],s.rows.map((r,i)=>[r.Qc,r.ResultVsb,r.Vsb,s.analysisVsb[i]]));
        host.querySelector('#e4').onclick=()=>{
        const [label,unit]=mapSpec(mapKey),
          filterState=filterController.snapshot(),
          displayMask=filterController.metricMask(metrics[mapKey]);
        PV.exporter.csv(
          `Dit_wafer_${mapKey}.csv`,
          ['Site','x','y',label,unit,'Algorithm valid','Metric available','Pass valid-data filter','Displayed','Filter metric','Filter lower','Filter upper'],
          analysis.sites.map((x,i)=>[
            i+1,x.coord?.x??'',x.coord?.y??'',metric(x,mapKey),unit,
            x.valid?'YES':'NO',
            Number.isFinite(metric(x,mapKey))?'YES':'NO',
            filterState.selection.activeMask[i]?'YES':'NO',
            displayMask[i]?'YES':'NO',
            metrics[filterState.metricKey]?.short||filterState.metricKey,
            filterState.lower,
            filterState.upper
          ])
        )};
        drawAll();
        const restorePaneScroll=()=>{
          const sidePane=host.querySelector('.side'),
            overviewPane=host.querySelector('.overview'),
            detailPane=host.querySelector('.detail');
          if(sidePane)sidePane.scrollTop=paneScroll.side;
          if(overviewPane)overviewPane.scrollTop=paneScroll.overview;
          if(detailPane)detailPane.scrollTop=paneScroll.detail;
        };
        if(typeof requestAnimationFrame==='function')requestAnimationFrame(restorePaneScroll);
        else restorePaneScroll();
        
    }
    function drawVcpd(){
      const s=analysis.sites[site],
      r=s.rows,
      svg=host.querySelector('#d1');
      if(!r.length){svg.innerHTML='';
        return}const qc=r.map(x=>x.Qc),
      vd=r.map(x=>x.VDark),
      vl=r.map(x=>x.VLight),
      c2=s.c2?.valid?s.c2.light:[],
      ys=finite([...vd,...vl,...c2,s.VDark]),
      W=640,
      H=360,
      m={l:58,r:12,t:22,b:36},
      autoX=[Math.min(...qc),Math.max(...qc)],
      y0=Math.min(...ys),
      y1=Math.max(...ys),
      pad=(y1-y0||1)*.05,
      autoY=[y0-pad,y1+pad],
      xr=PV.plot.resolve(autoX,zoom.vcpd.x),
      yr=PV.plot.resolve(autoY,zoom.vcpd.y),
      {X,Y,out:base}=svgAxes(W,H,m,xr[0],xr[1],yr[0],yr[1]),
      parts=[base,pathXY(qc,vd,X,Y,'var(--red)',1.7),pointsXY(qc,vd,X,Y,'var(--red)',2.5),pathXY(qc,vl,X,Y,'var(--blue)',1.5),pointsXY(qc,vl,X,Y,'var(--blue)',2.5)];
      if(c2.length)parts.push(pathXY(qc,c2,X,Y,'var(--green)',1.8,'6,4'),pointsXY(qc,c2,X,Y,'var(--green)',2.3));
      if(Number.isFinite(s.qinit))parts.push(`<line x1="${X(s.qinit)}" x2="${X(s.qinit)}" y1="${m.t}" y2="${H-m.b}" stroke="var(--yellow)" stroke-width="1.3" stroke-dasharray="4,4"/><circle cx="${X(s.qinit)}" cy="${Y(s.VDark)}" r="4" fill="var(--yellow)"><title>Initial projection ${sci(s.qinit,4)}</title></circle>`);
      if(Number.isFinite(s.qfb))parts.push(`<line x1="${X(s.qfb)}" x2="${X(s.qfb)}" y1="${m.t}" y2="${H-m.b}" stroke="var(--green)" stroke-width="1.3" stroke-dasharray="4,4"><title>Flatband ${sci(s.qfb,4)}</title></line>`);
      parts.push(`<text x="${W/2}" y="${H-2}" text-anchor="middle" fill="var(--text)" font-size="11">Qc (q/cm²)</text><text x="11" y="${H/2}" transform="rotate(-90 11 ${H/2})" text-anchor="middle" fill="var(--text)" font-size="11">Vcpd (V)</text>`);
      svg.innerHTML=parts.join('');
      PV.plot.bind(svg,{W,H,plotRect:{x0:m.l,x1:W-m.r,y0:m.t,y1:H-m.b},ranges:{x:xr,y:yr},onChange:n=>{zoom.vcpd=n;drawVcpd()},onReset:()=>{zoom.vcpd={x:null,y:null};drawVcpd()}});
      PV.plot.bindAxisControls(host,'ditVcpdAxes',zoom.vcpd,n=>{zoom.vcpd=n;drawVcpd()});
      host.querySelector('#ditVcpdLegend').innerHTML='<span><i style="background:var(--red)"></i>Dark</span><span><i style="background:var(--blue)"></i>Measured light</span>'+(c2.length?'<span><i style="background:var(--green)"></i>COCOS-II synthetic light</span>':'')+'<span class="yellow">│ initial</span><span class="green">│ flatband</span>';
      host.querySelector('#ditVcpdMeta').textContent=`${analysis.mode} · Qtot ${sci(s.Qtot,2)}`}
    function drawVsb(){
      const s=analysis.sites[site],
      r=s.rows,
      svg=host.querySelector('#d3');
      if(!r.length){svg.innerHTML='';
        return}const signed=true,
      qc=r.map(x=>x.Qc),
      raw=r.map(x=>x.Vsb),
      v=s.analysisVsb,
      all=finite(signed?v:[...raw,...v]);
      if(!all.length){svg.innerHTML='<text x="320" y="180" text-anchor="middle" fill="var(--muted)" font-size="11">No valid Vsb for current analysis settings</text>';
        host.querySelector('#ditVsbLegend').innerHTML='';
        host.querySelector('#ditVsbMeta').textContent=analysis.error||'invalid analysis';
        return}const W=640,
      H=360,
      m={l:52,r:12,t:22,b:36},
      lo=signed?Math.min(...all):0,
      hi=Math.max(...all),
      pad=(hi-lo||1)*.05,
      autoX=[Math.min(...qc),Math.max(...qc)],
      autoY=[signed?lo-pad:0,hi+pad],
      xr=PV.plot.resolve(autoX,zoom.vsb.x),
      yr=PV.plot.resolve(autoY,zoom.vsb.y),
      {X,Y,out:base}=svgAxes(W,H,m,xr[0],xr[1],yr[0],yr[1],{xFmt:x=>x.toExponential(1),yFmt:y=>y.toFixed(2)}),
      parts=[base,pathXY(qc,v,X,Y,'var(--blue)',2.1),pointsXY(qc,v,X,Y,'var(--blue)',2.2)];
      if(analysis.options.effectiveCocosMode!=='standard')parts.push(pathXY(qc,raw,X,Y,'var(--soft)',1.3,'5,4'));
      if(Number.isFinite(s.qfb))parts.push(`<line x1="${X(s.qfb)}" x2="${X(s.qfb)}" y1="${m.t}" y2="${H-m.b}" stroke="var(--green)" stroke-width="1.3" stroke-dasharray="4,4"/>`);
      parts.push(`<text x="${W/2}" y="${H-2}" text-anchor="middle" fill="var(--text)" font-size="11">Qc (q/cm²)</text><text x="11" y="${H/2}" transform="rotate(-90 11 ${H/2})" text-anchor="middle" fill="var(--text)" font-size="11">Vsb (V)</text>`);
      svg.innerHTML=parts.join('');
      PV.plot.bind(svg,{W,H,plotRect:{x0:m.l,x1:W-m.r,y0:m.t,y1:H-m.b},ranges:{x:xr,y:yr},onChange:n=>{zoom.vsb=n;drawVsb()},onReset:()=>{zoom.vsb={x:null,y:null};drawVsb()}});
      PV.plot.bindAxisControls(host,'ditVsbAxes',zoom.vsb,n=>{zoom.vsb=n;drawVsb()});
      host.querySelector('#ditVsbLegend').innerHTML='<span><i style="background:var(--blue)"></i>'+(analysis.options.effectiveCocosMode==='pv2000-re'?'PV-2000 current-DLL Vsb':'Standard measured Vsb')+'</span>'+(analysis.options.effectiveCocosMode!=='standard'?'<span><i style="background:var(--soft)"></i>standard measured Vsb</span>':'')+'<span class="green">│ flatband</span>';
      host.querySelector('#ditVsbMeta').textContent=`max |Vsb| ${fmt(s.MaxVsb,3)} V`}
    function drawDit(){
      const s=analysis.sites[site],
      svg=host.querySelector('#d2'),
      raw=s.ditRaw.map((y,i)=>({x:s.analysisVsb[i],y,accepted:s.ditAccepted?.[i]!==false})).filter(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)&&r.y>0),
      cur=s.ditCurve||[],
      xs=finite([...raw.map(x=>x.x),...cur.map(x=>x.x)]),
      ys=finite([...raw.map(x=>x.y),...cur.map(x=>x.y)]).filter(x=>x>0);
      if(!xs.length||!ys.length){svg.innerHTML='';
        return}const W=640,
      H=360,
      m={l:62,r:12,t:22,b:36},
      autoY=[10**Math.floor(Math.log10(Math.min(...ys))),10**Math.ceil(Math.log10(Math.max(...ys)))],
      xmin=Math.min(0,...xs),
      xmax=Math.max(...xs),
      autoX=[xmin,xmax+(xmax-xmin||1)*.02],
      xr=PV.plot.resolve(autoX,zoom.dit.x),
      yr=PV.plot.resolve(autoY,zoom.dit.y),
      {X,Y,out:base}=svgAxes(W,H,m,xr[0],xr[1],yr[0],yr[1],{xFmt:x=>x.toFixed(2),yFmt:y=>'1e'+Math.round(Math.log10(y)),logY:true}),
      parts=[base];
      raw.forEach(p=>{
        if(p.x<xr[0]||p.x>xr[1]||p.y<yr[0]||p.y>yr[1])return;parts.push(`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.1" fill="${p.accepted?'var(--blue)':'var(--soft)'}" opacity="${p.accepted?'.78':'.38'}"><title>Vsb ${fmt(p.x,4)} V · Dit ${sci(p.y,4)}${p.accepted?'':' · outside COCOS-II window'}</title></circle>`)});
      if(cur.length)parts.push(`<polyline points="${cur.filter(p=>p.y>0&&p.x>=xr[0]&&p.x<=xr[1]&&p.y>=yr[0]&&p.y<=yr[1]).map(p=>`${X(p.x)},${Y(p.y)}`).join(' ')}" fill="none" stroke="var(--green)" stroke-width="2.4"/>`);
      if(Number.isFinite(s.midgapV))parts.push(`<line x1="${X(s.midgapV)}" x2="${X(s.midgapV)}" y1="${m.t}" y2="${H-m.b}" stroke="var(--yellow)" stroke-width="1.3" stroke-dasharray="4,4"/>`);
      parts.push(`<text x="${W/2}" y="${H-2}" text-anchor="middle" fill="var(--text)" font-size="11">Vsb (V)</text><text x="11" y="${H/2}" transform="rotate(-90 11 ${H/2})" text-anchor="middle" fill="var(--text)" font-size="11">Dit (cm⁻² eV⁻¹)</text>`);
      svg.innerHTML=parts.join('');
      PV.plot.bind(svg,{W,H,plotRect:{x0:m.l,x1:W-m.r,y0:m.t,y1:H-m.b},ranges:{x:xr,y:yr},yLog:true,onChange:n=>{zoom.dit=n;drawDit()},onReset:()=>{zoom.dit={x:null,y:null};drawDit()}});
      PV.plot.bindAxisControls(host,'ditDitAxes',zoom.dit,n=>{zoom.dit=n;drawDit()},{yLog:true});
      const fitLabel=analysis.options.pchipMethod==='median'?'Median-PCHIP '+fmt(analysis.options.pchipMedianWindowV*1e3,1)+' mV':'PCHIP (original)',
      scaleLabel=analysis.options.pchipScale==='log10'?'LOG10':'Linear';
      const coverage=midgapCoverageText(s),
      midgapLegend=analysis.options.pchipEnabled?(coverage?`<span class="yellow">midgap ${fmt(s.midgapV,3)} V → outside coverage</span>`:'<span class="yellow">│ midgap</span>'):'';
      host.querySelector('#ditDitLegend').innerHTML='<span><i style="background:var(--blue)"></i>accepted variation points</span>'+(analysis.options.effectiveCocosMode==='pv2000-re'?'<span><i style="background:var(--soft)"></i>outside Min/Max Vsb</span>':'')+(analysis.options.pchipEnabled?'<span><i style="background:var(--green)"></i>'+fitLabel+'</span>':'')+midgapLegend;
      host.querySelector('#ditDitMeta').textContent=analysis.options.pchipEnabled?analysis.mode+' · PV2000 min '+sci(s.Dit,2)+' · '+fitLabel+' '+scaleLabel+(coverage?' · '+coverage:' · midgap '+sci(s.MidgapDit,2)):analysis.mode+' · PV2000 min '+sci(s.Dit,2)+' · PCHIP off'}
    function drawMap(){
      const svg=host.querySelector('#d4'),
      [label,unit,log]=mapSpec(mapKey),
      vals=analysis.sites.map(x=>metric(x,mapKey)),
      displayMask=filterController.metricMask(metrics[mapKey]),
      vv=vals.filter((v,i)=>displayMask[i]&&Number.isFinite(v)).map(v=>log&&v>0?Math.log10(v):v),
      lo=vv.length?Math.min(...vv):0,
      hi=vv.length?Math.max(...vv):1,
      W=640,
      H=500,
      m={l:50,r:24,t:28,b:42},
      coords=analysis.sites.map(x=>x.coord||{x:0,y:0}),
      envelope=spatialEnvelope(d,coords),
      extent=Math.max(1,envelope.radius),
      rawX=[-extent*1.15,extent*1.15],
      rawY=[-extent*1.15,extent*1.15],
      aspect=PV.plot.equalAspectRanges(rawX,rawY,W-m.l-m.r,H-m.t-m.b),
      autoX=aspect.x,
      autoY=aspect.y,
      xr=PV.plot.resolve(autoX,zoom.map.x),
      yr=PV.plot.resolve(autoY,zoom.map.y),
      X=x=>m.l+(x-xr[0])/(xr[1]-xr[0]||1)*(W-m.l-m.r),
      Y=y=>H-m.b-(y-yr[0])/(yr[1]-yr[0]||1)*(H-m.t-m.b);
      let out=`<rect width="${W}" height="${H}" fill="var(--chart-bg)"/>`;
      for(let i=0;i<=4;i++){
        const x=xr[0]+(xr[1]-xr[0])*i/4,
        px=X(x),
        y=yr[0]+(yr[1]-yr[0])*i/4,
        py=Y(y);
        out+=`<line x1="${px}" x2="${px}" y1="${m.t}" y2="${H-m.b}" stroke="var(--grid2)"/><text x="${px}" y="${H-18}" text-anchor="middle" fill="var(--muted)" font-size="11">${fmt(x,1)}</text><line x1="${m.l}" x2="${W-m.r}" y1="${py}" y2="${py}" stroke="var(--grid)"/><text x="${m.l-6}" y="${py+3}" text-anchor="end" fill="var(--muted)" font-size="11">${fmt(y,1)}</text>`};
      if(envelope.kind==='round'){
        out+=`<ellipse cx="${X(0)}" cy="${Y(0)}" rx="${Math.abs(X(envelope.radius)-X(0))}" ry="${Math.abs(Y(envelope.radius)-Y(0))}" fill="var(--panel2)" stroke="var(--soft)" stroke-width="2"/>`;
        if(Number.isFinite(envelope.innerRadius)&&envelope.innerRadius<envelope.radius)out+=`<ellipse cx="${X(0)}" cy="${Y(0)}" rx="${Math.abs(X(envelope.innerRadius)-X(0))}" ry="${Math.abs(Y(envelope.innerRadius)-Y(0))}" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="5,4"/>`;
      }else{
        const pointRadius=Math.max(1,envelope.coordRadius);
        out+=`<ellipse cx="${X(0)}" cy="${Y(0)}" rx="${Math.abs(X(pointRadius)-X(0))}" ry="${Math.abs(Y(pointRadius)-Y(0))}" fill="var(--panel2)" stroke="var(--soft)" stroke-width="2"/>`;
      }
      const geometryNote=envelope.kind==='round'?` · Ø${fmt(envelope.radius*2,0)} mm${Number.isFinite(d.edgeExclusion)?` · exclusion ${fmt(d.edgeExclusion,1)} mm`:''}`:'';
      out+=`<text x="${(m.l+W-m.r)/2}" y="14" text-anchor="middle" fill="var(--muted)" font-size="11">${esc(label)} [${esc(unit)}]${esc(geometryNote)}</text><text x="${(m.l+W-m.r)/2}" y="${H-3}" text-anchor="middle" fill="var(--muted)" font-size="11">X [mm]</text><text x="11" y="${(m.t+H-m.b)/2}" transform="rotate(-90 11 ${(m.t+H-m.b)/2})" text-anchor="middle" fill="var(--muted)" font-size="11">Y [mm]</text>`;
      analysis.sites.forEach((s,i)=>{
        const p=coords[i],
        v=vals[i],
        z=Number.isFinite(v)?(log&&v>0?Math.log10(v):v):NaN,
        t=Number.isFinite(z)&&hi>lo?(z-lo)/(hi-lo):.5,
        col=Number.isFinite(z)?mapColor(t):'#666',
        x=X(p.x||0),
        y=Y(p.y||0),
        active=!!displayMask[i],
        txt=mapValue(v,mapKey);
        if(x<m.l||x>W-m.r||y<m.t||y>H-m.b)return;
        const fill=active?col:'transparent',
          stroke=i===site?'var(--text)':!s.valid?'var(--bad)':active?'var(--border)':'var(--muted)',
          state=!s.valid?'ALGORITHM INVALID':active?'DISPLAYED':'FILTERED / UNAVAILABLE',
          textFill=active?'#fff':'var(--muted)';
        out+=`<g data-site="${i}" class="map-site">
          <title>Site ${i+1}: ${txt} ${unit}; ${state}; x=${fmt(p.x,2)}, y=${fmt(p.y,2)}</title>
          <circle cx="${x}" cy="${y}" r="${active?12:8}" fill="${fill}" stroke="${stroke}" stroke-width="${i===site?3:1.4}"/>
          <text x="${x}" y="${y+3}" text-anchor="middle" fill="${textFill}" font-size="10" font-weight="700">${i+1}</text>
        </g>`;
      });
      svg.innerHTML=out;
      svg.querySelectorAll('[data-site]').forEach(g=>g.onclick=()=>{site=+g.dataset.site;renderShell()});
      PV.plot.bind(svg,{W,H,plotRect:{x0:m.l,x1:W-m.r,y0:m.t,y1:H-m.b},ranges:{x:xr,y:yr},onChange:n=>{zoom.map=n;drawMap()},onReset:()=>{zoom.map={x:null,y:null};drawMap()}});
      PV.plot.bindAxisControls(host,'ditMapAxes',zoom.map,n=>{zoom.map=n;drawMap()})}
    function drawAll(){drawVcpd();drawVsb();drawDit();drawMap()}
    document.addEventListener('pv-theme-change',()=>{if(host.isConnected)drawAll()});renderShell();
  }
  PV.modules=PV.modules||{};
  PV.modules.dit={
    familyId:'dit',
    capabilities:{map:true,validDataFilter:true},
    types:['DITMeasurement'],
    parse,
    analyze,
    render,
    filterMetrics,
    qsc,
    flat,
    cocosIIReverse,
    cocosRecommendation,
    windowedMin,
    variation,
    makeCurve,
    medianBinnedXY,
    midgapTargetV,
    materialProfile,
    materials:MATERIALS,
    standardVsb,
    finalResultVsb,
    finalResultVLight,
    vendorOutlierCount,
    vendorRejectedMean,
    vendorDitQsc,
    vendorDitMinimum,
    vendorCocosIIReconstruct,
    vendorResultDownstream,
    vendorDitModel:VENDOR_DIT,
    initialQcFromPreprocess,
    spatialEnvelope
  };
  PV.registry.register(PV.modules.dit);
})(typeof window!=='undefined'?window:globalThis);
