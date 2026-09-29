(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,G=PV.geometry,Q=PV.quantity,M=PV.measurement,P=PV.profiles;
  const esc=v=>PV.ui.escapeHtml(v),fmt=(v,n=5)=>Number.isFinite(v)?v.toFixed(n):'—';
  const bool=v=>String(v||'').toLowerCase()==='true';
  const nums=node=>node?X.children(node).map(e=>Number(e.textContent)).filter(Number.isFinite):[];
  const pointList=node=>node?X.children(node).map(e=>({x:X.num(e,'X',NaN),y:X.num(e,'Y',NaN)})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)):[];

  function findXinArray(x,value){
    if(x.length<=1)return-1;
    let count=0;
    for(const v of x)if(v<value)count++;
    return count;
  }

  function splineSecondDerivatives(x,y){
    const n=Math.min(x.length,y.length),y2=Array(n).fill(0),u=Array(Math.max(0,n-1)).fill(0);
    if(n<2)return y2;
    y2[0]=u[0]=0;
    for(let i=1;i<n-1;i++){
      const sig=(x[i]-x[i-1])/(x[i+1]-x[i-1]),p=sig*y2[i-1]+2;
      y2[i]=(sig-1)/p;
      u[i]=(6*((y[i+1]-y[i])/(x[i+1]-x[i])-(y[i]-y[i-1])/(x[i]-x[i-1]))/(x[i+1]-x[i-1])-sig*u[i-1])/p;
    }
    y2[n-1]=0;
    for(let k=n-2;k>=0;k--)y2[k]=y2[k]*y2[k+1]+u[k];
    return y2;
  }

  function naturalCubic(x,y,value){
    const n=Math.min(x.length,y.length);
    if(n<2||x.length!==y.length)return NaN;
    const y2=splineSecondDerivatives(x,y);
    let lo=0,hi=n-1;
    while(hi-lo>1){
      const mid=((hi+lo+2)>>1)-1;
      if(x[mid]>value)hi=mid;else lo=mid;
    }
    const h=x[hi]-x[lo];
    if(!Number.isFinite(h)||h===0)return NaN;
    const a=(x[hi]-value)/h,b=(value-x[lo])/h;
    return a*y[lo]+b*y[hi]+((a*a*a-a)*y2[lo]+(b*b*b-b)*y2[hi])*h*h/6;
  }

  function calculateVsass(raw,intervalSeconds,delaySeconds,offset){
    if(!raw?.length||!(intervalSeconds>0)||!Number.isFinite(delaySeconds))return NaN;
    const x=raw.map((_,i)=>i*intervalSeconds),y=raw.map(v=>v-offset),
      first=findXinArray(x,1.2-2*intervalSeconds),
      last=findXinArray(x,1.2+2*intervalSeconds);
    if(first<0||last<first||last>=x.length||last-first+1<2)return NaN;
    return naturalCubic(x.slice(first,last+1),y.slice(first,last+1),1.2-delaySeconds);
  }

  function settings(node){
    return{
      charge:X.num(node,'Charge',NaN),
      measuringTimeSeconds:X.num(node,'MeasuringTimeSeconds',NaN),
      intervalSeconds:X.num(node,'MeasuringIntervalSeconds',NaN)
    };
  }

  function parse(parsed){
    const m=parsed.measurement,common=X.common(parsed),md=X.direct(m,'MeasurementData'),
      iterationData=X.direct(md,'IterationData'),
      iteration=iterationData?X.children(iterationData).find(e=>X.lname(e)==='Iteration'):null,
      dataNode=X.direct(iteration,'Data'),
      items=dataNode?X.children(dataNode).filter(e=>X.lname(e)==='DataItem'):[],
      offsetValues=nums(X.direct(md,'VcpdOffset')),
      offset=offsetValues.length?S.mean(offsetValues):0,
      pattern=X.direct(m,'Pattern'),target=X.direct(m,'Target'),targetSize=X.direct(target,'Size'),
      rawCoefficients=pointList(X.direct(pattern,'Coefficients')),
      absolutePoints=pointList(X.direct(pattern,'PointValues')),
      patternType=X.attrType(pattern),targetType=X.attrType(target),
      measurePositive=bool(X.text(m,'MeasurePositive','false')),
      measureNegative=bool(X.text(m,'MeasureNegative','false')),
      positiveSettings=settings(X.direct(m,'PositiveSettings')),
      negativeSettings=settings(X.direct(m,'NegativeSettings')),
      sites=items.map((item,index)=>{
        const positiveRaw=nums(X.direct(item,'PositiveData')),negativeRaw=nums(X.direct(item,'NegativeData')),
          positiveDelay=X.num(item,'PositiveDelaySeconds',NaN),negativeDelay=X.num(item,'NegativeDelaySeconds',NaN),
          vsassPositive=measurePositive?calculateVsass(positiveRaw,positiveSettings.intervalSeconds,positiveDelay,offset):NaN,
          vsassNegative=measureNegative?calculateVsass(negativeRaw,negativeSettings.intervalSeconds,negativeDelay,offset):NaN,
          li=Number.isFinite(vsassNegative)?(Number.isFinite(vsassPositive)?vsassPositive:0)-vsassNegative:NaN;
        return{index,positiveRaw,negativeRaw,positiveDelay,negativeDelay,vsassPositive,vsassNegative,li,coord:null};
      }),
      geometryModel=G.resolveMeasurementGeometry({
        patternType,targetType,rawCoefficients,absolutePoints,pointCount:sites.length,
        diameter:X.num(target,'Diameter',Number.isFinite(common.radius)?2*common.radius:NaN),
        targetWidth:X.num(targetSize,'Width',NaN),targetHeight:X.num(targetSize,'Height',NaN),
        edgeExclusion:X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',NaN)),
        substrateShape:common.shapeType,substrateRadius:common.radius
      }),coords=geometryModel.pointsMm,
      result={...common,sites,coords,geometryModel,rawCoefficients,absolutePoints,patternType,targetType,
        patternName:X.text(pattern,'Name','')||X.text(pattern,'DisplayName',''),measurePositive,measureNegative,
        positiveSettings,negativeSettings,offset,material:X.text(m,'Material',''),
        physicalThickness:X.num(m,'PhysicalThickness',NaN),temperatureC:X.num(iteration,'ChuckTemperature',NaN)};
    sites.forEach((site,index)=>{site.coord=coords[index]||null});
    const calc=P.resolveCalculation('leakage',result),geom=P.resolveGeometry(result);
    result.calculationProfile=calc?{id:calc.id,status:calc.status}:null;
    result.geometryProfile=geom?{id:geom.id,status:geom.status}:null;
    result.profile=result.calculationProfile;
    result.geometryModel.validationStatus=result.geometryProfile?.status||(coords.length?'inferred':'unsupported');
    result.domain=M.create({
      type:result.type,familyId:'leakage',
      identity:{name:result.name,resultName:result.resultName,substrateId:result.substrateId,lotId:result.lotId},
      environment:{temperatureC:result.temperatureC},geometry:result.geometryModel,
      acquisition:{siteCount:sites.length,measurePositive,measureNegative},
      channels:{positive:'PositiveData',negative:'NegativeData'},
      settings:{positiveSettings,negativeSettings,vcpdOffset:offset,material:result.material,physicalThickness:result.physicalThickness},
      calculationProfile:result.calculationProfile,geometryProfile:result.geometryProfile
    });
    return result;
  }

  function analyze(data){
    const profileId=data.calculationProfile?.id||null,validation=data.calculationProfile?.status||Q.VALIDATION.INFERRED;
    const metric=(id,key,label,short,values)=>Q.create({
      id,key,label,short,unit:'V',values,provenance:Q.PROVENANCE.DERIVED_COMPATIBILITY,
      modelId:'leakage-vsass-natural-cubic-v1',profileId,validation
    });
    return{metrics:{
      positive:metric('leakage-vsass-positive','positive','Positive surface-assignment voltage','VSASS+',data.sites.map(s=>s.vsassPositive)),
      negative:metric('leakage-vsass-negative','negative','Negative surface-assignment voltage','VSASS-',data.sites.map(s=>s.vsassNegative)),
      li:metric('leakage-li','li','Leakage indicator','LI',data.sites.map(s=>s.li))
    }};
  }

  function positionSvg(data,siteIndex=0){
    const geometry=data.geometryModel||{},point=data.sites?.[siteIndex]?.coord,W=640,H=360,m={l:56,r:24,t:28,b:46},
      nominal=geometry.nominal,scheduled=geometry.scheduled,shape=geometry.shape;
    let half=1;
    if(shape==='circle'&&Number.isFinite(nominal?.radius))half=nominal.radius*1.08;
    else if((shape==='rect'||shape==='pseudo-square')&&Number.isFinite(nominal?.halfWidth)&&Number.isFinite(nominal?.halfHeight))half=Math.max(nominal.halfWidth,nominal.halfHeight)*1.08;
    else if(point)half=Math.max(Math.abs(point.x),Math.abs(point.y),1)*1.3;
    const aspect=PV.plot.equalAspectRanges([-half,half],[-half,half],W-m.l-m.r,H-m.t-m.b),
      xr=aspect.x,yr=aspect.y,
      xp=x=>m.l+(x-xr[0])/(xr[1]-xr[0]||1)*(W-m.l-m.r),
      yp=y=>H-m.b-(y-yr[0])/(yr[1]-yr[0]||1)*(H-m.t-m.b);
    let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Measurement position"><rect width="${W}" height="${H}" fill="var(--chart-bg)"/>`;
    for(let i=0;i<=4;i++){
      const x=xr[0]+(xr[1]-xr[0])*i/4,y=yr[0]+(yr[1]-yr[0])*i/4,px=xp(x),py=yp(y);
      out+=`<line x1="${px}" x2="${px}" y1="${m.t}" y2="${H-m.b}" stroke="var(--grid2)"/><text x="${px}" y="${H-15}" text-anchor="middle" fill="var(--muted)" font-size="11">${fmt(x,1)}</text>`;
      out+=`<line x1="${m.l}" x2="${W-m.r}" y1="${py}" y2="${py}" stroke="var(--grid2)"/><text x="${m.l-6}" y="${py+3}" text-anchor="end" fill="var(--muted)" font-size="11">${fmt(y,1)}</text>`;
    }
    const boundary=(b,dashed=false)=>{
      if(!b)return'';
      const dash=dashed?' stroke-dasharray="6 4"':'';
      if(shape==='circle'&&Number.isFinite(b.radius))return`<circle cx="${xp(0)}" cy="${yp(0)}" r="${Math.abs(xp(b.radius)-xp(0))}" fill="none" stroke="${dashed?'var(--muted)':'var(--text)'}" stroke-width="1.4"${dash}/>`;
      if((shape==='rect'||shape==='pseudo-square')&&Number.isFinite(b.halfWidth)&&Number.isFinite(b.halfHeight))return`<rect x="${xp(-b.halfWidth)}" y="${yp(b.halfHeight)}" width="${xp(b.halfWidth)-xp(-b.halfWidth)}" height="${yp(-b.halfHeight)-yp(b.halfHeight)}" fill="none" stroke="${dashed?'var(--muted)':'var(--text)'}" stroke-width="1.4"${dash}/>`;
      return'';
    };
    out+=boundary(nominal,false)+boundary(scheduled,true);
    if(point)out+=`<circle cx="${xp(point.x)}" cy="${yp(point.y)}" r="5" fill="var(--blue)" stroke="var(--chart-bg)" stroke-width="2"/><text x="${xp(point.x)+9}" y="${yp(point.y)-9}" fill="var(--text)" font-size="11">(${fmt(point.x,1)}, ${fmt(point.y,1)}) mm</text>`;
    out+=`<text x="${W/2}" y="${H-3}" text-anchor="middle" fill="var(--muted)" font-size="11">X [mm]</text><text transform="translate(13 ${H/2}) rotate(-90)" text-anchor="middle" fill="var(--muted)" font-size="11">Y [mm]</text></svg>`;
    return out;
  }

  function drawRaw(canvas,data,siteIndex,zoom,onZoom){
    const frame=PV.plot.canvasFrame(canvas),ctx=frame.ctx,W=frame.W,H=frame.H,
      site=data.sites[siteIndex],p={l:62,r:18,t:26,b:50},
      series=[];
    if(site&&data.measurePositive&&site.positiveRaw?.length)series.push({label:'Positive',values:site.positiveRaw,dt:data.positiveSettings.intervalSeconds,stroke:'--red'});
    if(site&&data.measureNegative&&site.negativeRaw?.length)series.push({label:'Negative',values:site.negativeRaw,dt:data.negativeSettings.intervalSeconds,stroke:'--blue'});
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--chart-bg').trim();ctx.fillRect(0,0,W,H);ctx.font='11px system-ui';
    const points=series.flatMap(s=>s.values.map((v,i)=>({x:i*s.dt,y:v-data.offset,s}))).filter(q=>Number.isFinite(q.x)&&Number.isFinite(q.y));
    if(!points.length){ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();ctx.textAlign='center';ctx.fillText('No stored leakage readings.',W/2,H/2);return}
    const range=values=>{let lo=Math.min(...values),hi=Math.max(...values);if(lo===hi){lo-=.5;hi+=.5}const pad=(hi-lo)*.04;return[lo-pad,hi+pad]},
      autoX=range(points.map(q=>q.x)),autoY=range(points.map(q=>q.y)),
      xr=PV.plot.resolve(autoX,zoom.x),yr=PV.plot.resolve(autoY,zoom.y),
      Xp=x=>p.l+(x-xr[0])/(xr[1]-xr[0]||1)*(W-p.l-p.r),Yp=y=>H-p.b-(y-yr[0])/(yr[1]-yr[0]||1)*(H-p.t-p.b),
      css=name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    ctx.strokeStyle=css('--grid2');ctx.fillStyle=css('--muted');
    for(let i=0;i<=4;i++){
      const x=xr[0]+(xr[1]-xr[0])*i/4,
        y=yr[0]+(yr[1]-yr[0])*i/4,
        px=Xp(x),
        py=Yp(y);
      ctx.beginPath();
      ctx.moveTo(px,p.t);
      ctx.lineTo(px,H-p.b);
      ctx.stroke();
      ctx.textAlign='center';
      ctx.fillText(fmt(x,2),px,H-19);
      ctx.beginPath();
      ctx.moveTo(p.l,py);
      ctx.lineTo(W-p.r,py);
      ctx.stroke();
      ctx.textAlign='right';
      ctx.fillText(fmt(y,4),p.l-7,py+4);
    }
    for(const s of series){
      ctx.strokeStyle=css(s.stroke);
      ctx.lineWidth=1.7;
      ctx.beginPath();
      let started=false;
      s.values.forEach((v,i)=>{
        const y=v-data.offset;
        if(!Number.isFinite(y))return;
        const x=Xp(i*s.dt),py=Yp(y);
        if(started)ctx.lineTo(x,py);
        else{
          ctx.moveTo(x,py);
          started=true;
        }
      });
      ctx.stroke();
    }
    ctx.fillStyle=css('--muted');ctx.textAlign='center';ctx.fillText('Time [s]',(p.l+W-p.r)/2,H-3);ctx.save();ctx.translate(13,(p.t+H-p.b)/2);ctx.rotate(-Math.PI/2);ctx.fillText('Vcpd - offset [V]',0,0);ctx.restore();
    PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:onZoom,onReset:()=>onZoom({x:null,y:null})});
  }

  function render(host,data,analysis){
    if(!data.sites.length){
      host.innerHTML='<section class="panel"><h3>LeakageMeasurement</h3><p class="note">No leakage site data found.</p></section>';
      return;
    }
    let site=0,zoom={raw:{x:null,y:null}};
    const stats=Object.values(analysis.metrics).map(metric=>{
      const s=Q.summary(metric);
      return '<tr><td>'+esc(metric.short)+'</td><td>'+fmt(s.mean)+'</td><td>'+fmt(s.median)+'</td><td>'+fmt(s.stdev)+'</td><td>'+fmt(s.min)+'</td><td>'+fmt(s.max)+'</td></tr>';
    }).join('');
    const finiteLi=analysis.metrics.li.values.filter(Number.isFinite).length,
      targetText=data.targetType||data.geometryModel?.shape||'—';
    host.innerHTML='<div class="module-grid leakage-module '+(data.sites.length===1?'single-point-workspace':'')+'"><aside class="side"><section class="panel"><h3>Measurement</h3><dl class="meta">'+
      '<dt>Result</dt><dd>'+esc(data.resultName)+'</dd><dt>Recipe</dt><dd>'+esc(data.name)+'</dd><dt>Substrate</dt><dd>'+esc(data.substrateId)+'</dd>'+
      '<dt>Status</dt><dd>'+esc(data.status||'—')+'</dd><dt>Pattern</dt><dd>'+esc(data.patternName||data.patternType)+'</dd><dt>Target</dt><dd>'+esc(targetText)+'</dd></dl></section>'+
      '<section class="panel current-dataset-panel"><h3>Current dataset</h3><div class="validation"><div><b>'+data.sites.length+'</b><span>XML sites</span></div><div><b>'+finiteLi+'</b><span>finite LI</span></div><div><b>'+data.coords.length+' / '+data.sites.length+'</b><span>coordinates</span></div><div><b>'+(data.measurePositive?'on':'off')+' / '+(data.measureNegative?'on':'off')+'</b><span>positive / negative</span></div></div></section>'+
      '<section class="panel"><h3>Results summary</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>'+stats+'</tbody></table></div></section><details class="panel"><summary>Acquisition / validation</summary><dl class="meta meta-detail"><dt>Calculation profile</dt><dd>'+esc(data.calculationProfile?.id||'inferred')+'</dd><dt>Geometry profile</dt><dd>'+esc(data.geometryProfile?.id||'inferred')+'</dd><dt>Material</dt><dd>'+esc(data.material||'—')+'</dd><dt>Physical thickness</dt><dd>'+fmt(data.physicalThickness,3)+'</dd><dt>Vcpd offset</dt><dd>'+fmt(data.offset,6)+' V</dd><dt>Positive interval</dt><dd>'+fmt(data.positiveSettings?.intervalSeconds,6)+' s</dd><dt>Negative interval</dt><dd>'+fmt(data.negativeSettings?.intervalSeconds,6)+' s</dd><dt>Chuck temperature</dt><dd>'+fmt(data.temperatureC,2)+' °C</dd></dl><p class="note meta-detail">PV-2000-compatible VSASS uses mean Vcpd-offset subtraction, the local samples around 1.2 s, and natural-cubic interpolation at 1.2 s minus the stored polarity delay. Calculation validation and geometry validation are tracked independently.</p></details></aside>'+
      (data.sites.length===1?'<div class="single-analysis-workspace">':'')+'<section class="plots overview"><div class="panel chart"><header><b>Measurement position</b><span class="grow"></span></header><div class="chart-stage map-stage" id="leakagePosition">'+positionSvg(data,site)+'</div></div></section><section class="plots detail"><section class="panel"><h3>'+(data.sites.length===1?'Measurement point':'Selected site')+'</h3><div class="site-controls"><button id="leakPrev">←</button><select id="leakSite">'+data.sites.map((_,i)=>'<option value="'+i+'">Site '+(i+1)+'</option>').join('')+'</select><button id="leakNext">→</button></div><dl class="meta"><dt>Position</dt><dd id="leakPositionText"></dd><dt>Data state</dt><dd id="leakDataState"></dd><dt>VSASS+</dt><dd id="leakPositive"></dd><dt>VSASS-</dt><dd id="leakNegative"></dd><dt>LI</dt><dd id="leakLi"></dd></dl></section><div class="panel chart"><header><b>Raw leakage readings</b><span class="grow"></span>'+PV.plot.axisControls('leakRawAxes')+'</header><div class="canvas-wrap"><canvas id="leakRaw"></canvas></div></div></section>'+
      (data.sites.length===1?'</div>':'')+'</div>';
    const redraw=()=>{
      const current=data.sites[site]||{},pt=current.coord;
      host.querySelector('#leakSite').value=String(site);
      host.querySelector('#leakPositionText').textContent=pt?`${fmt(pt.x,3)}, ${fmt(pt.y,3)} mm`:'—';
      const availableResults=[
        ['VSASS+',current.vsassPositive],
        ['VSASS-',current.vsassNegative],
        ['LI',current.li]
      ].filter(([,value])=>Number.isFinite(value)).map(([label])=>label),
        dataState=availableResults.length===3?'AVAILABLE':availableResults.length?'PARTIAL':'UNAVAILABLE',
        availabilityNote=availableResults.length?`Available: ${availableResults.join(', ')}`:'No finite derived leakage result at this site.';
      host.querySelector('#leakDataState').innerHTML=`<span class="selection-state-line">${PV.ui.selectionStateBadge(dataState)}</span><small class="selection-state-note">${esc(availabilityNote)}</small>`;
      host.querySelector('#leakPositive').textContent=`${fmt(current.vsassPositive)} V`;
      host.querySelector('#leakNegative').textContent=`${fmt(current.vsassNegative)} V`;
      host.querySelector('#leakLi').textContent=`${fmt(current.li)} V`;
      host.querySelector('#leakagePosition').innerHTML=positionSvg(data,site);
      drawRaw(host.querySelector('#leakRaw'),data,site,zoom.raw,n=>{
        zoom.raw=n;
        redraw();
      });
      PV.plot.bindAxisControls(host,'leakRawAxes',zoom.raw,n=>{
        zoom.raw=n;
        redraw();
      });
    };
    host.querySelector('#leakSite').onchange=e=>{
      site=Number(e.target.value);
      zoom.raw={x:null,y:null};
      redraw();
    };
    host.querySelector('#leakPrev').onclick=()=>{
      if(site>0){
        site--;
        zoom.raw={x:null,y:null};
        redraw();
      }
    };
    host.querySelector('#leakNext').onclick=()=>{
      if(site<data.sites.length-1){
        site++;
        zoom.raw={x:null,y:null};
        redraw();
      }
    };
    redraw();
    PV.plot.observeResize(host,redraw);
  }

  PV.modules=PV.modules||{};
  PV.modules.leakage={types:['LeakageMeasurement'],familyId:'leakage',capabilities:{map:false,onePoint:true,distribution:false,profile:true},parse,analyze,render,calculateVsass,naturalCubic,splineSecondDerivatives,findXinArray};
  PV.registry.register(PV.modules.leakage);
})(typeof window!=='undefined'?window:globalThis);
