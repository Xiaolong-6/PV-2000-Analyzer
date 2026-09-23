(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,GEO=PV.geometry;
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
    const m=parsed.measurement,c=X.common(parsed),md=X.direct(m,'MeasurementData'),itd=X.direct(md,'IterationData'),
      iterations=X.children(itd).filter(e=>X.lname(e)==='Iteration'),
      values=iterations.slice(0,2).map(iterationValues),
      pattern=X.direct(m,'Pattern'),target=X.direct(m,'Target'),size=X.direct(target,'Size'),pitch=X.direct(pattern,'Pitch'),
      patternType=X.attrType(pattern),targetType=X.attrType(target),
      targetWidth=X.num(size,'Width',NaN),targetHeight=X.num(size,'Height',NaN),diameter=X.num(target,'Diameter',NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',0)),pitchX=X.num(pitch,'X',NaN),pitchY=X.num(pitch,'Y',NaN),
      coefficientNode=X.direct(pattern,'Coefficients'),
      rawCoefficients=coefficientNode?X.children(coefficientNode).map(p=>({x:X.num(p,'X',NaN),y:X.num(p,'Y',NaN)})):[],
      count=values.length>=2&&values[0].length===values[1].length?values[0].length:0,
      qssMilli=qssIntensities(m,c),
      geometryModel=GEO.resolveMeasurementGeometry({
        patternType,
        targetType,
        rawCoefficients,
        pointCount:count,
        diameter,
        targetWidth,
        targetHeight,
        edgeExclusion,
        substrateShape:c.shapeType,
        substrateRadius:c.radius,
        pitchX,
        pitchY
      }),
      coords=geometryModel.pointsMm,
      mapHalfWidth=geometryModel.scheduled?.halfWidth,
      mapHalfHeight=geometryModel.scheduled?.halfHeight,
      mapRadius=geometryModel.scheduled?.radius;
    if(iterations.length!==2)throw new Error(`JZeroMeasurement currently supports the validated two-iteration result path; found ${iterations.length} iterations.`);
    if(values.some(v=>!v.length)||values[0].length!==values[1].length)throw new Error('JZeroMeasurement lifetime iterations must contain the same number of sites.');
    if(qssMilli.length!==2||qssMilli.some(v=>!Number.isFinite(v)||v<=0))throw new Error('JZeroMeasurement requires two finite positive QSS intensities.');
    if(coords.length!==count)throw new Error(
      `JZeroMeasurement data are supported, but geometry could not resolve ${patternType||'unknown pattern'} + ${targetType||'unknown target'}: ${coords.length} coordinates for ${count} lifetime sites.`
    );
    const avgIndex=X.num(m,'Averaging',NaN),avgValues=X.direct(m,'AveragingValues'),avgList=avgValues?X.children(avgValues).map(e=>Number(e.textContent)).filter(Number.isFinite):[],
      avgMode=Number.isInteger(avgIndex)&&avgIndex>=0&&avgIndex<avgList.length?avgList[avgIndex]:NaN,
      secondAvgIndex=X.num(m,'SecondAveraging',NaN),secondAvgMode=Number.isInteger(secondAvgIndex)&&secondAvgIndex>=0&&secondAvgIndex<avgList.length?avgList[secondAvgIndex]:NaN,
      evalIndex=X.num(m,'EvalutationMode',NaN),evalNode=X.direct(m,'EvaluationModes'),evalList=evalNode?X.children(evalNode).map(e=>e.textContent.trim()):[],
      evaluationMode=Number.isInteger(evalIndex)&&evalIndex>=0&&evalIndex<evalList.length?evalList[evalIndex]:'';
    const validatedGeometry=patternType==='MapPattern'&&targetType==='PseudoSquareCell'&&geometryModel.interpretation==='pseudo-square-target-pitch-grid';
    return{...c,values,coords,geometryModel,rawCoefficients,
      calculationProfile:{id:'JZERO-CALC-001',status:'validated'},
      geometryProfile:{id:validatedGeometry?'JZERO-GEOM-MAP-PSEUDOSQUARE-001':null,status:validatedGeometry?'validated':'inferred'},
      iterations:iterations.length,patternType,patternName:X.text(pattern,'Name',''),targetType,targetWidth,targetHeight,diameter,edgeExclusion,pitchX,pitchY,mapHalfWidth,mapHalfHeight,mapRadius,qssMilli,
      waferThickness:X.num(m,'WaferThickness',NaN),doping:X.num(m,'Doping',NaN),dopingType:X.text(m,'DopingType',''),opticalFactor:X.num(m,'OpticalFactor',1),laserPower:X.num(m,'LaserPower',NaN),
      avgMode,secondAvgMode,evaluationMode,probe:X.text(m,'ProbeSelection',''),bias:X.text(m,'QssBiasSelection',''),doRastering:X.text(m,'DoRastering',''),autoset:X.text(m,'DoAutoSetting',''),saveTransient:X.text(m,'SaveTransient',''),
      temperatures:iterations.slice(0,2).map(it=>X.num(it,'ChuckTemperature',NaN)),measurementVelocities:iterations.slice(0,2).map(it=>X.num(it,'MeasurementVelocity',NaN)),
      tauSteadyStateFactors:iterations.slice(0,2).map(it=>X.num(it,'TauSteadyStateFactor',NaN)),qdcValues:iterations.slice(0,2).map(it=>X.num(it,'QDCValue',NaN)),raw:parsed};
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
    const tau1=d.values[0]||[],tau2=d.values[1]||[],n=Math.min(tau1.length,tau2.length),j0=[],sm1=[],sm2=[],v1=[],v2=[];
    for(let i=0;i<n;i++){
      j0.push(basoreJ0(tau1[i],tau2[i],d));
      sm1.push(smax(tau1[i],d.waferThickness));sm2.push(smax(tau2[i],d.waferThickness));
      v1.push(impliedVoc(tau1[i],d.qssMilli[0],d,0));v2.push(impliedVoc(tau2[i],d.qssMilli[1],d,1));
    }
    const sun=i=>Number.isFinite(d.qssMilli[i])?`${fmt(d.qssMilli[i]/1000,2)} sun`:`QSS ${i+1}`;
    return{metrics:{
      j0:{key:'j0',short:'Basore J0',label:'Basore J0',unit:'fA/cm²',values:j0,help:'Emitter saturation current from the Basore–Hansen two-intensity small-perturbation-lifetime slope.'},
      tau1:{key:'tau1',short:`τeff.d (${sun(0)})`,label:`τeff.d (${sun(0)})`,unit:'µs',values:tau1.slice(0,n),help:'Small-perturbation lifetime measured at the first QSS intensity.'},
      tau2:{key:'tau2',short:`τeff.d (${sun(1)})`,label:`τeff.d (${sun(1)})`,unit:'µs',values:tau2.slice(0,n),help:'Small-perturbation lifetime measured at the second QSS intensity.'},
      smax1:{key:'smax1',short:`Smax (${sun(0)})`,label:`Smax (${sun(0)})`,unit:'cm/s',values:sm1,help:'Maximum surface recombination velocity estimate W/(2τ) at the first QSS intensity.'},
      smax2:{key:'smax2',short:`Smax (${sun(1)})`,label:`Smax (${sun(1)})`,unit:'cm/s',values:sm2,help:'Maximum surface recombination velocity estimate W/(2τ) at the second QSS intensity.'},
      voc1:{key:'voc1',short:`Implied Voc (${sun(0)})`,label:`Implied Voc (${sun(0)})`,unit:'V',values:v1,help:'Implied open-circuit voltage derived from the first QSS lifetime using the JZero compatibility calibration.'},
      voc2:{key:'voc2',short:`Implied Voc (${sun(1)})`,label:`Implied Voc (${sun(1)})`,unit:'V',values:v2,help:'Implied open-circuit voltage derived from the second QSS lifetime using the JZero compatibility calibration.'}
    }};
  }
  const finiteRange=v=>{const z=v.filter(Number.isFinite);return{min:z.length?Math.min(...z):NaN,max:z.length?Math.max(...z):NaN}};
  const validMask=(values,lo,hi)=>values.map(v=>Number.isFinite(v)&&v>=lo&&v<=hi);
  const summaryMasked=(values,mask)=>S.summary(values.filter((_,i)=>mask[i]));
  function quantile(values,p){const z=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!z.length)return NaN;const q=(z.length-1)*p,i=Math.floor(q),f=q-i;return z[i]+(z[Math.min(i+1,z.length-1)]-z[i])*f}
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
    const onePoint=d.patternType==='OnePointPattern'&&d.coords.length===1;
    let metricKey='j0',filterKey='j0',histBins=30,histSwapped=true,pointsMode=onePoint,zoom={map:{x:null,y:null},hist:{x:null,y:null}},range=finiteRange(a.metrics.j0.values),filterLo=range.min,filterHi=range.max,mask=validMask(a.metrics.j0.values,filterLo,filterHi);
    const options=()=>Object.values(a.metrics).map(m=>`<option value="${m.key}">${esc(m.short)}</option>`).join('');
    const meta=(k,v,h='')=>`<dt>${esc(k)}${h?` ${help(h)}`:''}</dt><dd>${esc(v??'—')}</dd>`;
    const target=()=>{
      if(d.targetType==='PseudoSquareCell')return `${fmt(d.targetWidth)} × ${fmt(d.targetHeight)} mm pseudo-square · Ø${fmt(d.diameter)} mm mask · edge ${fmt(d.edgeExclusion)} mm`;
      if(d.targetType==='SquareCell')return `${fmt(d.targetWidth)} × ${fmt(d.targetHeight)} mm square · edge ${fmt(d.edgeExclusion)} mm`;
      if(d.targetType==='RoundWafer')return `Ø${fmt(d.diameter)} mm round · edge ${fmt(d.edgeExclusion)} mm`;
      return d.targetType||'—';
    };
    const pattern=()=>[d.patternName||d.patternType,Number.isFinite(d.pitchX)&&Number.isFinite(d.pitchY)?`${fmt(d.pitchX)} × ${fmt(d.pitchY)} mm`:null].filter(Boolean).join(' · ');
    const statsRows=()=>Object.values(a.metrics).map(m=>{const st=summaryMasked(m.values,mask);return`<tr><td>${esc(m.short)} ${help(m.help)}</td><td>${fmt(st.mean)}</td><td>${fmt(st.median)}</td><td>${fmt(st.stdev)}</td><td>${fmt(st.min)}</td><td>${fmt(st.max)}</td></tr>`}).join('');
    function shell(){
      const validN=mask.filter(Boolean).length,n=a.metrics.j0.values.length;
      host.innerHTML=`<div class="module-grid jzero-module"><aside class="side">
        <section class="panel"><h3>Emitter J0 map ${help('JZeroMeasurement combines two QSS-µPCD lifetime maps measured at the first and second QSS intensities. Basore J0 is derived site-by-site from the two small-perturbation lifetimes.')}</h3><dl class="meta">${meta('Result',d.resultName)}${meta('Recipe',d.name)}${meta('Substrate',d.substrateId)}${meta('Status',d.status)}${meta('Pattern',pattern())}${meta('Target',target())}${meta('Geometry',`${d.geometryProfile.status}${d.geometryProfile.id?` · ${d.geometryProfile.id}`:''}`,'Calculation and geometry validation are tracked separately. The current paired JZero geometry is MapPattern + PseudoSquareCell; other resolver-supported geometries remain inferred until paired X/Y evidence is supplied.')}${meta('QSS intensities',`${fmt(d.qssMilli[0]/1000,2)} / ${fmt(d.qssMilli[1]/1000,2)} sun`)}${meta('Wafer thickness',`${fmt(d.waferThickness)} µm`)}${meta('Doping',`${fmt(d.doping)} cm⁻³ ${d.dopingType}`)}${meta('Optical factor',fmt(d.opticalFactor))}${meta('Probe / bias',`${d.probe||'—'} / ${d.bias||'—'}`)}</dl></section>
        <section class="panel"><h3>Valid-data filter ${help('The selected metric defines a shared valid-point mask for the map, distribution and all summary statistics.')}</h3><div class="filter-grid"><label>Filter metric<select id="jFilterMetric">${options()}</select></label><label>Lower<input id="jFilterLo" type="number" step="any" value="${filterLo}"></label><label>Upper<input id="jFilterHi" type="number" step="any" value="${filterHi}"></label></div><div class="filter-actions"><span><b>${validN}</b> / ${n} valid</span><span class="grow"></span><button id="jCentral98">1–99%</button><button id="jResetFilter">Reset</button><button id="jApplyFilter">Apply</button></div></section>
        <section class="panel"><h3>Results summary ${help('Statistics use only points that pass the active valid-data filter. Stdev is sample standard deviation.')}</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>${statsRows()}</tbody></table></div></section>
        <section class="panel current-dataset-panel"><h3>Current dataset</h3><div class="validation"><div><b>${n}</b><span>paired XML sites</span></div><div><b>${d.coords.length} / ${n}</b><span>coordinates generated</span></div><div><b>${validN} / ${n}</b><span>pass filter</span></div><div><b>${d.iterations}</b><span>iterations</span></div></div></section>
        <details class="panel"><summary>Full metadata</summary><dl class="meta meta-detail">${meta('Result time',d.end)}${meta('Elapsed',d.elapsed)}${meta('Laser power',fmt(d.laserPower))}${meta('uPCD averaging 1 / 2',`${fmt(d.avgMode,0)} / ${fmt(d.secondAvgMode,0)}`)}${meta('Evaluation mode',d.evaluationMode||'—')}${meta('Chuck temperature 1 / 2',`${fmt(d.temperatures[0])} / ${fmt(d.temperatures[1])} °C`)}${meta('Measurement velocity 1 / 2',`${fmt(d.measurementVelocities[0])} / ${fmt(d.measurementVelocities[1])}`)}${meta('Tau steady-state factor 1 / 2',`${fmt(d.tauSteadyStateFactors[0],6)} / ${fmt(d.tauSteadyStateFactors[1],6)}`)}${meta('QDC 1 / 2',`${fmt(d.qdcValues[0],6)} / ${fmt(d.qdcValues[1],6)}`)}${meta('Autosetting',d.autoset||'—')}${meta('Rastering',d.doRastering||'—')}${meta('Save transient',d.saveTransient||'—')}</dl></details>
      </aside><section class="plots"><div class="panel chart"><header><b>${onePoint?'Measurement position':'Wafer map'}</b><span class="grow"></span><select id="jMetric">${options()}</select>${onePoint?'':`<select id="jMapMode"><option value="filled">Filled</option><option value="points">Points</option></select>`}${PV.plot.axisControls('jMapAxes')}<button id="jExportMap">Export</button></header><div class="canvas-wrap"><canvas id="jMap"></canvas></div></div></section><section class="plots"><div class="panel chart"><header><b>Distribution</b><span class="grow"></span>${PV.plot.axisControls('jHistAxes',{distribution:true,swapped:histSwapped})}${PV.plot.binControls('jHistBins',histBins)}<button id="jExportHist">Export</button></header><div class="canvas-wrap"><canvas id="jHist"></canvas></div></div></section></div>`;
      host.querySelector('#jMetric').value=metricKey;host.querySelector('#jFilterMetric').value=filterKey;if(!onePoint)host.querySelector('#jMapMode').value=pointsMode?'points':'filled';
      host.querySelector('#jMetric').onchange=e=>{metricKey=e.target.value;zoom={map:{x:null,y:null},hist:{x:null,y:null}};redraw()};
      if(!onePoint)host.querySelector('#jMapMode').onchange=e=>{pointsMode=e.target.value==='points';redraw()};
      host.querySelector('#jFilterMetric').onchange=e=>{filterKey=e.target.value;const r=finiteRange(a.metrics[filterKey].values);filterLo=r.min;filterHi=r.max;mask=validMask(a.metrics[filterKey].values,filterLo,filterHi);shell()};
      host.querySelector('#jApplyFilter').onclick=()=>{
        let lo=Number(host.querySelector('#jFilterLo').value),hi=Number(host.querySelector('#jFilterHi').value);
        if(!Number.isFinite(lo)||!Number.isFinite(hi))return alert('Enter finite lower and upper limits.');
        if(lo>hi)[lo,hi]=[hi,lo];
        filterLo=lo;filterHi=hi;mask=validMask(a.metrics[filterKey].values,lo,hi);shell();
      };
      host.querySelector('#jResetFilter').onclick=()=>{const r=finiteRange(a.metrics[filterKey].values);filterLo=r.min;filterHi=r.max;mask=validMask(a.metrics[filterKey].values,filterLo,filterHi);shell()};
      host.querySelector('#jCentral98').onclick=()=>{const v=a.metrics[filterKey].values;filterLo=quantile(v,.01);filterHi=quantile(v,.99);mask=validMask(v,filterLo,filterHi);shell()};redraw();
    }
    function exportMetric(){const m=a.metrics[metricKey];PV.exporter.csv(`${safe(d.resultName)}_${metricKey}.csv`,['Index','X [mm]','Y [mm]',`${m.label} [${m.unit}]`,'Valid'],m.values.map((v,i)=>[i+1,d.coords[i]?.x??'',d.coords[i]?.y??'',v,mask[i]?'YES':'NO']))}
    function redraw(){
      const rows=drawHist(host.querySelector('#jHist'),a,metricKey,mask,histBins,histSwapped,zoom.hist,n=>{zoom.hist=n;redraw()});drawMap(host.querySelector('#jMap'),d,a,metricKey,mask,zoom.map,n=>{zoom.map=n;redraw()},pointsMode);
      PV.plot.bindAxisControls(host,'jMapAxes',zoom.map,n=>{zoom.map=n;redraw()});
      PV.plot.bindAxisControls(host,'jHistAxes',zoom.hist,n=>{zoom.hist=n;redraw()},{
        swapped:histSwapped,
        onSwap:()=>{histSwapped=!histSwapped;zoom.hist={x:null,y:null};redraw()}
      });
      PV.plot.bindBinControls(host,'jHistBins',histBins,n=>{histBins=n;zoom.hist={x:null,y:null};redraw()});
      host.querySelector('#jExportMap').onclick=exportMetric;
      host.querySelector('#jExportHist').onclick=()=>{
        const m=a.metrics[metricKey];
        PV.exporter.csv(
          `${safe(d.resultName)}_${metricKey}_histogram.csv`,
          [`Bin low [${m.unit}]`,`Bin high [${m.unit}]`,'Count'],
          rows.map(r=>[r.lo,r.hi,r.count])
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
