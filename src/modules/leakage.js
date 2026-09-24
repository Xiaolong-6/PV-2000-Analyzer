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

  function positionSvg(data){
    const geometry=data.geometryModel||{},point=data.sites?.[0]?.coord,W=620,H=315,m={l:50,r:22,t:24,b:42},
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
      out+=`<line x1="${px}" x2="${px}" y1="${m.t}" y2="${H-m.b}" stroke="var(--grid2)"/><text x="${px}" y="${H-15}" text-anchor="middle" fill="var(--muted)" font-size="9">${fmt(x,1)}</text>`;
      out+=`<line x1="${m.l}" x2="${W-m.r}" y1="${py}" y2="${py}" stroke="var(--grid2)"/><text x="${m.l-6}" y="${py+3}" text-anchor="end" fill="var(--muted)" font-size="9">${fmt(y,1)}</text>`;
    }
    const boundary=(b,dashed=false)=>{
      if(!b)return'';
      const dash=dashed?' stroke-dasharray="6 4"':'';
      if(shape==='circle'&&Number.isFinite(b.radius))return`<circle cx="${xp(0)}" cy="${yp(0)}" r="${Math.abs(xp(b.radius)-xp(0))}" fill="none" stroke="${dashed?'var(--muted)':'var(--text)'}" stroke-width="1.4"${dash}/>`;
      if((shape==='rect'||shape==='pseudo-square')&&Number.isFinite(b.halfWidth)&&Number.isFinite(b.halfHeight))return`<rect x="${xp(-b.halfWidth)}" y="${yp(b.halfHeight)}" width="${xp(b.halfWidth)-xp(-b.halfWidth)}" height="${yp(-b.halfHeight)-yp(b.halfHeight)}" fill="none" stroke="${dashed?'var(--muted)':'var(--text)'}" stroke-width="1.4"${dash}/>`;
      return'';
    };
    out+=boundary(nominal,false)+boundary(scheduled,true);
    if(point)out+=`<circle cx="${xp(point.x)}" cy="${yp(point.y)}" r="5" fill="var(--blue)" stroke="var(--chart-bg)" stroke-width="2"/><text x="${xp(point.x)+9}" y="${yp(point.y)-9}" fill="var(--text)" font-size="10">(${fmt(point.x,1)}, ${fmt(point.y,1)}) mm</text>`;
    out+=`<text x="${W/2}" y="${H-3}" text-anchor="middle" fill="var(--muted)" font-size="10">X [mm]</text><text transform="translate(13 ${H/2}) rotate(-90)" text-anchor="middle" fill="var(--muted)" font-size="10">Y [mm]</text></svg>`;
    return out;
  }

  function render(host,data,analysis){
    if(!data.sites.length){
      host.innerHTML='<section class="panel"><h3>LeakageMeasurement</h3><p class="note">No leakage site data found.</p></section>';
      return;
    }
    const stats=Object.values(analysis.metrics).map(metric=>{
      const s=Q.summary(metric);
      return '<tr><td>'+esc(metric.short)+'</td><td>'+fmt(s.mean)+'</td><td>'+fmt(s.median)+'</td><td>'+fmt(s.stdev)+'</td><td>'+fmt(s.min)+'</td><td>'+fmt(s.max)+'</td></tr>';
    }).join('');
    const siteRows=data.sites.map((site,index)=>'<tr><td>'+(index+1)+'</td><td>'+fmt(site.coord?.x,3)+'</td><td>'+fmt(site.coord?.y,3)+'</td><td>'+fmt(site.vsassPositive)+'</td><td>'+fmt(site.vsassNegative)+'</td><td>'+fmt(site.li)+'</td></tr>').join('');
    host.innerHTML='<div class="module-grid leakage-module"><aside class="side"><section class="panel"><h3>Measurement</h3><dl class="meta">'+
      '<dt>Result</dt><dd>'+esc(data.resultName)+'</dd><dt>Recipe</dt><dd>'+esc(data.name)+'</dd><dt>Substrate</dt><dd>'+esc(data.substrateId)+'</dd>'+
      '<dt>Pattern</dt><dd>'+esc(data.patternName||data.patternType)+'</dd><dt>Calculation profile</dt><dd>'+esc(data.calculationProfile?.id||'inferred')+'</dd>'+
      '<dt>Geometry profile</dt><dd>'+esc(data.geometryProfile?.id||'inferred')+'</dd><dt>Vcpd offset</dt><dd>'+fmt(data.offset,6)+' V</dd></dl></section>'+
      '<section class="panel"><h3>Results summary</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>'+stats+'</tbody></table></div></section></aside>'+
      '<section class="plots"><div class="panel chart"><header><b>Measurement position</b><span class="grow"></span></header><div class="chart-stage map-stage">'+positionSvg(data)+'</div></div><section class="panel"><h3>Site results</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>X [mm]</th><th>Y [mm]</th><th>VSASS+ [V]</th><th>VSASS- [V]</th><th>LI [V]</th></tr></thead><tbody>'+siteRows+'</tbody></table></div></section>'+
      '<section class="panel"><h3>Compatibility model</h3><p class="note">PV-2000-compatible VSASS uses mean Vcpd-offset subtraction, the local samples around 1.2 s, and natural-cubic interpolation at 1.2 s minus the stored polarity delay. Calculation validation and geometry validation are tracked independently.</p></section></section></div>';
  }

  PV.modules=PV.modules||{};
  PV.modules.leakage={types:['LeakageMeasurement'],familyId:'leakage',capabilities:{map:false,onePoint:true,distribution:false,profile:true},parse,analyze,render,calculateVsass,naturalCubic,splineSecondDerivatives,findXinArray};
  PV.registry.register(PV.modules.leakage);
})(typeof window!=='undefined'?window:globalThis);
