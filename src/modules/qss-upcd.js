(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,GEO=PV.geometry;
  const q=1.602176634e-19,k=1.380649e-23,KB_EV=8.617333262145e-5;
  const NI300_PV2000_COMPAT=1.517791063348261e10;
  const NI300_MANUAL=1.02e10;
  const safe=s=>String(s||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');
  const esc=value=>PV.ui.escapeHtml(value);
  const fmt=(v,n=3)=>!Number.isFinite(v)?'—':Math.abs(v)>=1e4||Math.abs(v)<1e-2?v.toExponential(n):v.toFixed(n);
  const help=text=>PV.ui.help(text);
  const css=name=>PV.ui.cssVar(name);

  function effectiveMapRadius(diameter,edgeExclusion=0){const radius=diameter/2;
    if(!Number.isFinite(radius)||!(radius>0))return NaN;
    if(!Number.isFinite(edgeExclusion))edgeExclusion=0;
    if(edgeExclusion<0||edgeExclusion>=radius)return NaN;
    return radius-edgeExclusion}
  function parse(parsed){
    const m=parsed.measurement,c=X.common(parsed),md=X.direct(m,'MeasurementData'),itd=X.direct(md,'IterationData'),iter=X.direct(itd,'Iteration'),data=X.direct(iter,'Data');
    const values=X.children(data).filter(e=>X.lname(e)==='DataItem').map(e=>X.num(e,'Value')).filter(Number.isFinite);
    const pattern=X.direct(m,'Pattern'),
      target=X.direct(m,'Target'),
      pitch=X.direct(pattern,'Pitch'),
      diameter=X.num(target,'Diameter',Number.isFinite(c.radius)?2*c.radius:NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',0)),
      mapRadius=effectiveMapRadius(diameter,edgeExclusion),
      pitchX=X.num(pitch,'X'),
      pitchY=X.num(pitch,'Y');
      
    let coords=[];
      if(X.attrType(pattern)==='MapPattern'&&X.attrType(target)==='RoundWafer'&&Number.isFinite(mapRadius)&&Number.isFinite(pitchX)&&Number.isFinite(pitchY))coords=GEO.roundGrid(mapRadius,pitchX,pitchY,values.length);
      
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
    return{...c,values,coords,patternType:X.attrType(pattern),patternName:X.text(pattern,'Name',''),pitchX,pitchY,diameter,edgeExclusion,mapRadius,
      waferThickness:X.num(m,'WaferThickness',Number(c.header['Wafer Thickness'])),opticalFactor:X.num(m,'OpticalFactor',1),doping:X.num(m,'Doping',NaN),dopingType:X.text(m,'DopingType',''),laserPower:X.num(m,'LaserPower',NaN),
      avgMode,averagingIndex:avgIndex,evaluationMode,autoset:X.text(m,'DoAutoSetting',''),qssMilli:X.num(pre0,'QssLampIntensity',Number(c.header['QSS Intensity'])),temperatureC:X.num(iter,'ChuckTemperature',NaN),measurementVelocity:X.num(iter,'MeasurementVelocity',NaN),tauSteadyStateFactor:X.num(iter,'TauSteadyStateFactor',NaN),qdcValue:X.num(iter,'QDCValue',NaN),
      probe:X.text(m,'ProbeSelection',''),bias:X.text(m,'QssBiasSelection',''),doRastering:X.text(m,'DoRastering',''),saveTransient:X.text(m,'SaveTransient',''),transient:c.header['Transient']||'',pointAverage:X.text(m,'DoPointAveraging',''),pointAverageCount:X.num(m,'PointAverageCount',NaN),
      feConstant:X.num(m,'FeConstant',NaN),lidConstant:X.num(m,'LIDConstant',NaN),qssRangeMin:X.num(qssRange,'Min',NaN),qssRangeMax:X.num(qssRange,'Max',NaN),raw:parsed};
  }
  function smax(tauUs,Wum){return (Wum*1e-4)/(2*tauUs*1e-6)}
  function generation(I_sun,Wum,OF){return 2.38e17*I_sun/(Wum*1e-4)*OF}
  function egSi(T){return 1.17-4.73e-4*T*T/(T+636)}
  function niCompat(T){
    const ref=300,ratio=(T/ref)**1.5*Math.exp(-egSi(T)/(2*KB_EV*T)+egSi(ref)/(2*KB_EV*ref));
    return NI300_PV2000_COMPAT*ratio;
  }
  function impliedVoc(tauUs,d){
    const I=(d.qssMilli||0)/1000,W=d.waferThickness,OF=d.opticalFactor,Nd=d.doping,TK=Number.isFinite(d.temperatureC)?d.temperatureC+273.15:300;
    if(![tauUs,I,W,OF,Nd,TK].every(Number.isFinite)||tauUs<=0||I<=0||W<=0||Nd<=0)return NaN;
    const dn=generation(I,W,OF)*tauUs*1e-6,ni=niCompat(TK);return k*TK/q*Math.log(dn*(Nd+dn)/(ni*ni));
  }
  function impliedVocManual(tauUs,d){
    const I=(d.qssMilli||0)/1000,W=d.waferThickness,OF=d.opticalFactor,Nd=d.doping,TK=Number.isFinite(d.temperatureC)?d.temperatureC+273.15:300;
    if(![tauUs,I,W,OF,Nd,TK].every(Number.isFinite)||tauUs<=0||I<=0||W<=0||Nd<=0)return NaN;
    const dn=generation(I,W,OF)*tauUs*1e-6;return k*TK/q*Math.log(dn*(Nd+dn)/(NI300_MANUAL*NI300_MANUAL));
  }
  function analyze(d){
    const lifetime=d.values.slice(),smaxVals=lifetime.map(v=>smax(v,d.waferThickness)),voc=lifetime.map(v=>impliedVoc(v,d)),vocManual=lifetime.map(v=>impliedVocManual(v,d));
    return{metrics:{
      lifetime:{key:'lifetime',label:`τeff.d (${((d.qssMilli||0)/1000).toFixed(2)} sun)`,short:'τeff.d',unit:'µs',values:lifetime,help:'Small-perturbation (differential) carrier lifetime measured under the selected steady-state illumination.'},
      smax:{key:'smax',label:`Smax (${((d.qssMilli||0)/1000).toFixed(2)} sun)`,short:'Smax',unit:'cm/s',values:smaxVals,help:'Maximum surface recombination velocity estimate Smax = W/(2τ). It is an upper bound when bulk recombination is neglected.'},
      voc:{key:'voc',label:`Implied Voc (${((d.qssMilli||0)/1000).toFixed(2)} sun)`,short:'Implied Voc',unit:'V',values:voc,help:'Implied open-circuit voltage derived from injection level Δn = Gτ and the semiconductor carrier-density relation.'}},
      audit:{vocManualStats:S.summary(vocManual),ni300Compat:NI300_PV2000_COMPAT,ni300Manual:NI300_MANUAL}};
  }
  function summaryMasked(values,mask){return S.summary(values.filter((_,i)=>mask[i]&&Number.isFinite(values[i])))}
  function quantile(a,p){const z=a.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!z.length)return NaN;const q=(z.length-1)*p,i=Math.floor(q),f=q-i;return z[i]+(z[Math.min(i+1,z.length-1)]-z[i])*f}
  function metricRange(a,key){const v=a.metrics[key].values.filter(Number.isFinite);return{min:Math.min(...v),max:Math.max(...v)}}
  function validMask(a,key,lo,hi){const v=a.metrics[key].values;return v.map(x=>Number.isFinite(x)&&x>=lo&&x<=hi)}
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
  function drawMap(canvas,d,a,key,mode,mask,zoom,onZoom){
    const ctx=canvas.getContext('2d'),
      m=a.metrics[key],
      vals=m.values,
      W=canvas.width=760,
      H=canvas.height=420,
      p={l:54,r:76,t:28,b:46},
      rad=d.diameter/2||50,
      plot=Math.min(W-p.l-p.r,H-p.t-p.b),
      cx=p.l+(W-p.l-p.r)/2,
      cy=p.t+(H-p.t-p.b)/2,
      R=plot/2,
      autoX=[-rad,rad],
      autoY=[-rad,rad],
      xr=PV.plot.resolve(autoX,zoom?.x),
      yr=PV.plot.resolve(autoY,zoom?.y),
      X=x=>cx-R+(x-xr[0])/(xr[1]-xr[0]||1)*2*R,
      Y=y=>cy+R-(y-yr[0])/(yr[1]-yr[0]||1)*2*R;
      
    const validVals=vals.filter((v,i)=>mask[i]&&Number.isFinite(v)),lo=Math.min(...validVals),hi=Math.max(...validVals);ctx.clearRect(0,0,W,H);ctx.fillStyle=css('--chart-bg');ctx.fillRect(0,0,W,H);
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
      const img=ctx.createImageData(W,H),
        step=3,
        maxDist=2.2*Math.max(d.pitchX||5,d.pitchY||5);
        for(let py=Math.floor(cy-R);py<=Math.ceil(cy+R);py+=step){
        for(let px=Math.floor(cx-R);px<=Math.ceil(cx+R);px+=step){
          const x=xr[0]+(px-(cx-R))/(2*R)*(xr[1]-xr[0]),
          y=yr[1]-(py-(cy-R))/(2*R)*(yr[1]-yr[0]);
          if(x*x+y*y>=rad*rad)continue;
          const v=smoothValueAt(x,y,d.coords,vals,mask,maxDist);
          if(!Number.isFinite(v))continue;
          const t=(v-lo)/(hi-lo||1),
          rgb=color(t).match(/\d+/g).map(Number);
          for(let yy=py;yy<Math.min(H,py+step);yy++)for(let xx=px;xx<Math.min(W,px+step);xx++){
            const o=(yy*W+xx)*4;
            img.data[o]=rgb[0];
            img.data[o+1]=rgb[1];
            img.data[o+2]=rgb[2];
            img.data[o+3]=255}}}ctx.putImageData(img,0,0)
    }
    for(let i=0;i<d.coords.length;i++){
      const pt=d.coords[i],
      v=vals[i];
      if(!pt||!Number.isFinite(v))continue;
      const x=X(pt.x),
      y=Y(pt.y);
      if(x<cx-R||x>cx+R||y<cy-R||y>cy+R)continue;
      if(mode==='points'||!mask[i]){ctx.beginPath();
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
    ctx.restore();ctx.strokeStyle=css('--soft');ctx.lineWidth=1.5;ctx.strokeRect(cx-R,cy-R,2*R,2*R);
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
        showTip(tip,e,`<b>Point ${best+1}</b><br>X ${fmt(pt.x,1)} mm · Y ${fmt(pt.y,1)} mm<br>${esc(m.short)} = ${fmt(v,4)} ${esc(m.unit)}<br><span class="${mask[best]?'good':'bad'}">${mask[best]?'VALID':'EXCLUDED'}</span>`)}else hideTip(tip)};
      PV.plot.bind(canvas,{W,H,plotRect:{x0:cx-R,x1:cx+R,y0:cy-R,y1:cy+R},ranges:{x:xr,y:yr},onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});
      
    return{lo,hi};
  }
  function histogram(values,mask,bins=28){
    const all=values.map((v,i)=>({v,i})).filter(x=>Number.isFinite(x.v));
    if(!all.length)return[];
    const lo=Math.min(...all.map(x=>x.v)),
    hi=Math.max(...all.map(x=>x.v)),
    w=(hi-lo||1)/bins,
    out=Array.from({length:bins},(_,i)=>({lo:lo+i*w,hi:lo+(i+1)*w,valid:0,invalid:0}));
    all.forEach(x=>{
      let j=Math.floor((x.v-lo)/(hi-lo||1)*bins);j=Math.max(0,Math.min(bins-1,j));out[j][mask[x.i]?'valid':'invalid']++});
    return out}
  function drawHist(canvas,a,key,mask,filterKey,filterLo,filterHi,swapped=false,zoom,onZoom){
    const ctx=canvas.getContext('2d'),
      m=a.metrics[key],
      bins=histogram(m.values,mask,30),
      W=canvas.width=760,
      H=canvas.height=300,
      p={l:58,r:18,t:24,b:48};
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle=css('--chart-bg');
      ctx.fillRect(0,0,W,H);
      if(!bins.length)return bins;
      
    const autoMetric=[bins[0].lo,bins[bins.length-1].hi],
      autoCount=[0,Math.max(...bins.map(b=>b.valid+b.invalid),1)],
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
      ctx.font='10px system-ui';
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
      const mid=(b.lo+b.hi)/2;if(swapped){
        const y1=H-p.b-metricPos(b.lo)*plotH,
        y2=H-p.b-metricPos(b.hi)*plotH,
        xBase=p.l+countPos(0)*plotW,
        xInv=p.l+countPos(b.invalid)*plotW,
        xTot=p.l+countPos(b.invalid+b.valid)*plotW;
          ctx.fillStyle=css('--soft');
          ctx.globalAlpha=.42;
          ctx.fillRect(Math.min(xBase,xInv),Math.min(y1,y2),Math.abs(xInv-xBase),Math.max(1,Math.abs(y2-y1)-1));
          ctx.globalAlpha=1;
          ctx.fillStyle=barColor(b);
          ctx.fillRect(Math.min(xInv,xTot),Math.min(y1,y2),Math.abs(xTot-xInv),Math.max(1,Math.abs(y2-y1)-1))}else{
        const x1=p.l+metricPos(b.lo)*plotW,
        x2=p.l+metricPos(b.hi)*plotW,
        yBase=H-p.b-countPos(0)*plotH,
        yInv=H-p.b-countPos(b.invalid)*plotH,
        yTot=H-p.b-countPos(b.invalid+b.valid)*plotH;
          ctx.fillStyle=css('--soft');
          ctx.globalAlpha=.42;
          ctx.fillRect(Math.min(x1,x2),Math.min(yBase,yInv),Math.max(1,Math.abs(x2-x1)-1),Math.abs(yInv-yBase));
          ctx.globalAlpha=1;
          ctx.fillStyle=barColor(b);
          ctx.fillRect(Math.min(x1,x2),Math.min(yInv,yTot),Math.max(1,Math.abs(x2-x1)-1),Math.abs(yTot-yInv))}});
          
      
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
      showTip(tip,e,`<b>${axisFmt(bb.lo)}–${axisFmt(bb.hi)} ${esc(m.unit)}</b><br>Valid ${bb.valid}<br>Excluded ${bb.invalid}`)};
      PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:swapped?cr:mr,y:swapped?mr:cr},onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});
      return bins;
      
  }
  function drawProfile(canvas,d,a,key,mask,zoom,onZoom){
    const ctx=canvas.getContext('2d'),
      m=a.metrics[key],
      vals=m.values.filter(Number.isFinite),
      all=a.metrics[key].values,
      W=canvas.width=760,
      H=canvas.height=300,
      p={l:62,r:18,t:24,b:48},
      autoX=[1,Math.max(1,all.length)],
      autoY=[Math.min(...vals),Math.max(...vals)],
      xr=PV.plot.resolve(autoX,zoom?.x),
      yr=PV.plot.resolve(autoY,zoom?.y),
      X=i=>p.l+(i+1-xr[0])/(xr[1]-xr[0]||1)*(W-p.l-p.r),
      Y=v=>H-p.b-(v-yr[0])/(yr[1]-yr[0]||1)*(H-p.t-p.b);
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle=css('--chart-bg');
      ctx.fillRect(0,0,W,H);
      
    ctx.strokeStyle=css('--grid');
      ctx.fillStyle=css('--muted');
      ctx.font='10px system-ui';
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
      showTip(tip,e,`<b>Point ${idx+1}</b><br>X ${fmt(pt.x,1)} mm · Y ${fmt(pt.y,1)} mm<br>${esc(m.short)} = ${fmt(v,4)} ${esc(m.unit)}<br><span class="${mask[idx]?'good':'bad'}">${mask[idx]?'VALID':'EXCLUDED'}</span>`)};
      PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});
      
  }
  function downloadMetric(d,a,key,mask){const m=a.metrics[key];
    PV.exporter.csv(`${safe(d.resultName)}_${key}.csv`,['Index','X [mm]','Y [mm]',`${m.label} [${m.unit}]`,'Valid'],m.values.map((v,i)=>[i+1,d.coords[i]?.x??'',d.coords[i]?.y??'',v,mask[i]?'YES':'NO']))}
  function render(host,d,a){
    let metricKey='lifetime',
      histSwapped=false,
      mapMode='smooth',
      filterKey='lifetime',
      zoom={map:{x:null,y:null},hist:{x:null,y:null},profile:{x:null,y:null}};
      const init=metricRange(a,filterKey);
      let filterLo=init.min,
      filterHi=init.max,
      mask=validMask(a,filterKey,filterLo,filterHi);
      
    const statsFor=k=>summaryMasked(a.metrics[k].values,mask);
    function summaryRows(){
      return Object.values(a.metrics).map(m=>{
        const st=statsFor(m.key);return`<tr title="${esc(m.help)}"><td>${esc(m.short)} ${help(m.help)}</td><td>${fmt(st.mean)}</td><td>${fmt(st.median)}</td><td>${fmt(st.stdev)}</td><td>${fmt(st.min)}</td><td>${fmt(st.max)}</td></tr>`}).join('')}
    function metaRow(k,v,h=''){return`<dt>${esc(k)}${h?` ${help(h)}`:''}</dt><dd>${esc(v||'—')}</dd>`}
    function renderShell(){
      const validN=mask.filter(Boolean).length;
      host.innerHTML=`<div class="module-grid qss-module"><aside class="side">
        <section class="panel"><h3>Measurement ${help('Metadata is read directly from the PV-2000 XML. Vendor-exported CSV files are used only for development validation and are not required at runtime.')}</h3><dl class="meta">
          ${metaRow('Result',d.resultName,'Result identifier stored in the PV-2000 job XML.')}${metaRow('Recipe',d.name,'PV-2000 recipe/job name used for this measurement.')}${metaRow('Substrate',d.substrateId,'Substrate identifier stored with the result.')}${metaRow('Lot ID',d.lotId||'—','Lot identifier stored with the result; it may be empty for manually measured samples.')}${metaRow('Status',d.status,'PV-2000 execution status recorded in the result XML.')}${metaRow('Result time',d.end,'Measurement completion timestamp from ExecutionInfo/EndTime.')}${metaRow('Elapsed',d.elapsed,'Total elapsed execution time recorded by PV-2000.')}${metaRow('Pattern',`${d.patternName} · ${fmt(d.pitchX)} × ${fmt(d.pitchY)} mm`,'Measurement pattern and X/Y site pitch. For MapPattern XMLs the analyzer reconstructs site coordinates from this geometry and acquisition order.')}${metaRow('Target',`${fmt(d.diameter)} mm round · edge ${fmt(d.edgeExclusion)} mm · ${fmt(d.waferThickness)} µm`,'Nominal wafer diameter, XML edge exclusion used to reconstruct the scheduled map radius, and wafer thickness. The physical sample may occupy only part of this nominal target; use the Valid-data filter for quarter wafers or coupons.')}${metaRow('QSS intensity',`${fmt((d.qssMilli||0)/1000)} sun`,'Steady-state illumination intensity used during the QSS-µPCD map measurement. XML stores this recipe value in mSun.')}${metaRow('Laser power',`${fmt(d.laserPower)} E11`,'PV-2000 pulsed-laser power setting used for the small-perturbation decay measurement.')}${metaRow('uPCD avg mode',fmt(d.avgMode),'Transient averaging mode resolved from the XML Averaging index/AveragingValues list.')}${metaRow('Transient',d.transient||'—','Transient acquisition mode reported in the PV-2000 HeaderInfo.')}${metaRow('Optical factor',fmt(d.opticalFactor),'Correction factor used in the generation-rate calculation for optical losses such as reflection/transmission.')}${metaRow('Doping',`${fmt(d.doping)} cm⁻³ ${d.dopingType}`,'Base doping concentration and conductivity type used in derived injection-level and implied-Voc calculations.')}${metaRow('Probe / bias',`${d.probe||'—'} / ${d.bias||'—'}`,'Microwave probe side and QSS-bias illumination side stored in the XML.')}
        </dl></section>
        <section class="panel"><h3>Valid-data filter ${help('Use a physically meaningful distribution range to exclude locations that are not on the measured sample, for example when measuring a quarter wafer or a small coupon. The same valid-point mask is then applied to every derived parameter and all summary statistics.')}</h3>
          <div class="filter-grid"><label>Filter metric<select id="qFilterMetric"><option value="lifetime">τeff.d</option><option value="smax">Smax</option><option value="voc">Implied Voc</option></select></label><label>Lower<input id="qFilterLo" type="number" step="any" value="${filterLo}"></label><label>Upper<input id="qFilterHi" type="number" step="any" value="${filterHi}"></label></div>
          <div class="filter-actions"><span><b>${validN}</b> / ${d.values.length} valid</span><span class="grow"></span><button id="qCentral98" title="Set limits to the 1st–99th percentile of the selected filter metric. This is only a convenience starting point; inspect the distribution before accepting it.">1–99%</button><button id="qResetFilter" title="Reset the validity range to include every finite point.">Reset</button><button id="qApplyFilter" title="Recalculate the valid-point mask and all summary statistics using the entered lower/upper limits.">Apply</button></div>
        </section>
        <section class="panel"><h3>Results summary ${help('Statistics are calculated only from points that pass the Valid-data filter. Stdev is the sample standard deviation, matching the PV-2000 export convention.')}</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>${summaryRows()}</tbody></table></div></section>
        <section class="panel current-dataset-panel"><h3>Current dataset ${help('All numbers in this panel come from the currently imported XML and its active valid-data filter. Coordinate generation is an internal completeness check, not a comparison with a vendor export.')}</h3><div class="validation"><div><b>${d.values.length}</b><span>XML points</span></div><div><b>${validN} / ${d.values.length}</b><span>pass valid-data filter</span></div><div><b>${d.coords.length} / ${d.values.length}</b><span>coordinates generated</span></div><div><b>${Number.isFinite(d.temperatureC)?`${fmt(d.temperatureC)} °C`:'—'}</b><span>XML chuck temperature</span></div></div></section>
        <details class="panel"><summary>Full metadata</summary><dl class="meta meta-detail">${metaRow('Chuck temperature',`${fmt(d.temperatureC)} °C`,'Measured chuck temperature. The analyzer uses it in the temperature-dependent implied-Voc compatibility calculation.')}${metaRow('Measurement velocity',fmt(d.measurementVelocity),'PV-2000 motion/measurement velocity recorded for the iteration.')}${metaRow('Tau steady-state factor',fmt(d.tauSteadyStateFactor,6),'PV-2000 iteration-level steady-state lifetime factor stored in the XML; displayed for traceability and not substituted for the measured τeff.d map values.')}${metaRow('QDC value',fmt(d.qdcValue,6),'Iteration-level Quality of Decay control value. QD near 1 indicates a decay close to ideal exponential behavior.')}${metaRow('Evaluation mode',d.evaluationMode||'—','Transient lifetime evaluation mode selected by the XML EvalutationMode index, e.g. SL/64 or 1/e.')}${metaRow('Do autosetting',d.autoset,'Whether PV-2000 automatic measurement setting was enabled.')}${metaRow('Rastering',d.doRastering,'Whether the PV-2000 recipe requested rastering. Coordinate reconstruction still follows the pattern/order stored by this result type.')}${metaRow('Save transient',d.saveTransient,'Whether individual transient waveforms were requested to be saved by the recipe.')}${metaRow('Point averaging',`${d.pointAverage||'—'} (${fmt(d.pointAverageCount)})`,'Whether repeated point averaging was enabled and the configured repeat count.')}${metaRow('QSS range',`${fmt(d.qssRangeMin)}–${fmt(d.qssRangeMax)}`,'Configured QSS illumination operating range from the XML.')}${metaRow('Fe constant',fmt(d.feConstant),'Calibration constant used only when Fe-concentration processing is enabled in an appropriate QSS-µPCD/ALID workflow.')}${metaRow('LID constant',fmt(d.lidConstant),'Calibration constant used only when LID-defect processing is enabled in an appropriate QSS-µPCD/ALID workflow.')}</dl></details>
      </aside><section class="plots">
        <div class="panel chart"><header><b>Wafer map</b>${help('Wheel inside the map zooms both spatial axes; hover one axis to zoom only that direction; double-click restores auto scale. Smooth mode leaves the area nearest to excluded sites uncolored and uses only valid measured points for interpolation. Points mode shows actual sites.')}<span class="grow"></span><select id="qMetric"><option value="lifetime">τeff.d</option><option value="smax">Smax</option><option value="voc">Implied Voc</option></select><select id="qMapMode"><option value="smooth">Smooth</option><option value="points">Points</option></select><button id="qExportMap" title="Export all sites for the selected metric, including X/Y coordinates and the current validity flag.">Export</button></header><div class="canvas-wrap">${PV.plot.axisControls('qMapAxes')}<canvas id="qMap"></canvas></div></div>
        <div class="panel chart"><header><b>Distribution</b>${help('Wheel inside the histogram zooms both axes; hover one axis to zoom only that axis; double-click restores auto scale. Axes opens manual numeric X/Y limits for outlier-heavy data. Valid counts use the wafer-map color scale; gray counts are excluded. Swap axes exchanges metric and count axes. Yellow lines show active validity limits.')}<span class="grow"></span><button id="qSwapHistAxes" type="button" aria-pressed="${histSwapped}" title="Swap the Distribution metric and count axes.">Swap axes</button><button id="qExportHist" title="Export histogram bins with valid and excluded counts.">Export</button></header><div class="canvas-wrap">${PV.plot.axisControls('qHistAxes')}<canvas id="qHist"></canvas></div></div>
      </section><section class="plots">
        <div class="panel chart"><header><b>Acquisition profile</b>${help('Wheel inside the profile zooms both axes; hover one axis to zoom only that axis; double-click restores auto scale. Axes opens manual numeric X/Y limits, useful when a few extreme points dominate autoscaling. Hover a point to see X/Y coordinates and validity.')}<span class="grow"></span><button id="qExportProfile" title="Export point-by-point values, coordinates and validity state.">Export</button></header><div class="canvas-wrap">${PV.plot.axisControls('qProfileAxes')}<canvas id="qProfile"></canvas></div></div>

      </section></div>`;
      host.querySelector('#qMetric').value=metricKey;host.querySelector('#qMapMode').value=mapMode;host.querySelector('#qFilterMetric').value=filterKey;
      host.querySelector('#qMetric').onchange=e=>{metricKey=e.target.value;
        zoom={map:{x:null,y:null},hist:{x:null,y:null},profile:{x:null,y:null}};
        redraw()};
        host.querySelector('#qSwapHistAxes').onclick=()=>{histSwapped=!histSwapped;
        zoom.hist={x:null,y:null};
        host.querySelector('#qSwapHistAxes').setAttribute('aria-pressed',String(histSwapped));
        redraw()};
        host.querySelector('#qMapMode').onchange=e=>{mapMode=e.target.value;
        redraw()};
        
      host.querySelector('#qFilterMetric').onchange=e=>{filterKey=e.target.value;const r=metricRange(a,filterKey);filterLo=r.min;filterHi=r.max;renderShell()};
      host.querySelector('#qApplyFilter').onclick=()=>{
        let lo=Number(host.querySelector('#qFilterLo').value),
        hi=Number(host.querySelector('#qFilterHi').value);
        if(!Number.isFinite(lo)||!Number.isFinite(hi))return alert('Enter finite lower and upper limits.');
        if(lo>hi)[lo,hi]=[hi,lo];
        filterLo=lo;
        filterHi=hi;
        mask=validMask(a,filterKey,filterLo,filterHi);
        renderShell()};
        
      host.querySelector('#qResetFilter').onclick=()=>{const r=metricRange(a,filterKey);filterLo=r.min;filterHi=r.max;mask=validMask(a,filterKey,filterLo,filterHi);renderShell()};
      host.querySelector('#qCentral98').onclick=()=>{const v=a.metrics[filterKey].values;filterLo=quantile(v,.01);filterHi=quantile(v,.99);mask=validMask(a,filterKey,filterLo,filterHi);renderShell()};
      redraw();
    }
    function redraw(){
      const bins=drawHist(host.querySelector('#qHist'),a,metricKey,mask,filterKey,filterLo,filterHi,histSwapped,zoom.hist,n=>{zoom.hist=n;redraw()});
        drawMap(host.querySelector('#qMap'),d,a,metricKey,mapMode,mask,zoom.map,n=>{zoom.map=n;redraw()});
        drawProfile(host.querySelector('#qProfile'),d,a,metricKey,mask,zoom.profile,n=>{zoom.profile=n;redraw()});
        PV.plot.bindAxisControls(host,'qMapAxes',zoom.map,n=>{zoom.map=n;redraw()});
        PV.plot.bindAxisControls(host,'qHistAxes',zoom.hist,n=>{zoom.hist=n;redraw()});
        PV.plot.bindAxisControls(host,'qProfileAxes',zoom.profile,n=>{zoom.profile=n;redraw()});
        
      host.querySelector('#qExportMap').onclick=()=>downloadMetric(d,a,metricKey,mask);
        host.querySelector('#qExportProfile').onclick=()=>downloadMetric(d,a,metricKey,mask);
        host.querySelector('#qExportHist').onclick=()=>{
        const unit=a.metrics[metricKey].unit;
        PV.exporter.csv(`${safe(d.resultName)}_${metricKey}_histogram.csv`,[`Bin low [${unit}]`,`Bin high [${unit}]`,'Valid count','Excluded count'],bins.map(b=>[b.lo,b.hi,b.valid,b.invalid]))};
        
    }
    document.addEventListener('pv-theme-change',()=>{if(host.isConnected)redraw()});renderShell();
  }
  PV.modules=PV.modules||{};
    PV.modules.qss={types:['QssUpcdMeasurement'],parse,analyze,render,smax,generation,impliedVoc,niCompat,validMask,smoothValueAt,effectiveMapRadius,constants:{NI300_MANUAL,NI300_PV2000_COMPAT}};
    PV.registry.register(PV.modules.qss);
    
})(typeof window!=='undefined'?window:globalThis);
