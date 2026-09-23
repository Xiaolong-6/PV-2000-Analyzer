(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats;
  const esc=v=>PV.ui.escapeHtml(v),help=t=>PV.ui.help(t),css=n=>PV.ui.cssVar(n);
  const safe=s=>String(s||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');
  const fmt=(v,n=3)=>!Number.isFinite(v)?'—':Math.abs(v)>=1e4||Math.abs(v)<1e-2&&v!==0?v.toExponential(n):v.toFixed(n);
  const anum=(e,n,d=NaN)=>{const raw=e?.getAttribute?.(n);if(raw===null||raw===undefined||raw==='')return d;const v=Number(raw);return Number.isFinite(v)?v:d};
  const astr=(e,n,d='')=>e?.getAttribute?.(n)??d;
  function directPath(e,names){for(const n of names){e=X.direct(e,n);if(!e)return null}return e}
  function vector(e,n){const h=X.direct(e,n),v=h?X.children(h)[0]:null;return v?X.children(v).map(x=>Number(x.textContent)).filter(Number.isFinite):[]}
  function range(a,p=.06){a=a.filter(Number.isFinite);if(!a.length)return[0,1];let lo=Math.min(...a),hi=Math.max(...a);if(lo===hi){const d=Math.abs(lo)||1;lo-=d*.1;hi+=d*.1}const d=(hi-lo)*p;return[lo-d,hi+d]}
  function posRange(a,p=.05){a=a.filter(v=>v>0&&Number.isFinite(v));if(!a.length)return[1,10];let lo=Math.min(...a),hi=Math.max(...a);if(lo===hi){lo/=1.2;hi*=1.2}const f=(hi/lo)**p;return[lo/f,hi*f]}
  function ticks(lo,hi,n=5){if(!(hi>lo))return[lo];const r=(hi-lo)/n,p=10**Math.floor(Math.log10(Math.abs(r))),q=r/p,s=(q<=1?1:q<=2?2:q<=5?5:10)*p,o=[];for(let x=Math.ceil(lo/s)*s;x<=hi+s*1e-9;x+=s)o.push(x);return o}
  function logTicks(lo,hi){const o=[];for(let p=Math.floor(Math.log10(lo));p<=Math.ceil(Math.log10(hi));p++)for(const m of[1,2,5]){const v=m*10**p;if(v>=lo&&v<=hi)o.push(v)}return o}
  function afmt(v){const a=Math.abs(v);return a>=1e4||a>0&&a<1e-2?v.toExponential(1):Number(v.toPrecision(4)).toString()}
  function classifyRange(a){const z=a.filter(v=>v>0&&Number.isFinite(v));if(!z.length)return'Unknown';const lo=Math.min(...z),hi=Math.max(...z);if(lo<=3&&hi<=10000)return'Low-range injection';if(lo>=20)return'High-range injection';return'Broad-range injection'}
  function lifetimeValue(p,source='transient'){
    if(source==='values')return p?.lifetime;
    const raw=p?.transient?.lifetime;
    return Number.isFinite(raw)?raw:p?.lifetime;
  }
  function lifetimeLabel(source='transient'){return source==='values'?'XML Values lifetime':'Lifetime'}
  function parseTransient(t){
    const tr=X.direct(t,'Transient'),
      points=tr?X.children(tr).map(p=>({
        x:anum(p,'X'),
        y:anum(p,'Y')
      })).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)):[];
    return{
      lifetime:anum(t,'LifeTime'),
      evaluation:astr(t,'Evaluation'),
      delta:anum(t,'Delta'),
      preTrigger:anum(t,'PreTrigger'),
      autoCursor:anum(t,'AutoCursor'),
      timeCursor:anum(t,'TimeCursor'),
      average:anum(t,'Average'),
      amplitude:anum(t,'Amplitude'),
      microwave:anum(t,'Microwave'),
      laserPower:anum(t,'LaserPower'),
      voltage:anum(t,'Voltage'),
      offset:anum(t,'Offset'),
      timeBase:anum(t,'TimeBase'),
      points
    };
  }
  function parse(parsed){
    const m=parsed.measurement,c=X.common(parsed),it=directPath(m,['MeasurementData','IterationData','Iteration']),data=X.direct(it,'Data'),item=X.children(data).find(e=>X.lname(e)==='DataItem');
    if(!item)throw new Error('Dual QSS XML has no QssDataItem.');
    const values=vector(item,'Values'),intensity=vector(item,'Intensity'),power=vector(item,'Power'),tr=X.direct(item,'Transients'),transients=tr?X.children(tr).filter(e=>X.lname(e)==='TransientInfo').map(parseTransient):[],n=Math.max(values.length,intensity.length,power.length,transients.length),pattern=X.direct(m,'Pattern'),target=X.direct(m,'Target'),coeff=X.direct(pattern,'Coefficients'),coords=coeff?X.children(coeff).map(p=>({x:X.num(p,'X',0),y:X.num(p,'Y',0)})):[];
    const points=Array.from({length:n},(_,i)=>({intensityMilli:intensity[i],intensitySun:Number.isFinite(intensity[i])?intensity[i]/1000:NaN,lifetime:values[i],power:power[i],transient:transients[i]||null}));
    const targetDiameter=X.num(target,'Diameter',NaN),targetEdge=X.num(target,'EdgeExclusion',NaN),measurementEdge=X.num(m,'EdgeExclusion',NaN),
      diameter=Number.isFinite(targetDiameter)?targetDiameter:Number.isFinite(c.radius)?2*c.radius:NaN,
      edgeExclusion=Number.isFinite(targetEdge)?targetEdge:measurementEdge,
      geometryModel=GEO.resolveMeasurementGeometry({
        patternType:X.attrType(pattern),
        targetType:X.attrType(target),
        rawCoefficients:coords,
        pointCount:1,
        diameter,
        edgeExclusion,
        substrateShape:c.shapeType,
        substrateRadius:c.radius
      });
    return{...c,points,intensity,rangeClass:classifyRange(intensity),patternType:X.attrType(pattern),patternName:X.text(pattern,'Name',''),coord:geometryModel.pointsMm[0]||{x:0,y:0},geometryModel,rawCoefficients:coords,targetType:X.attrType(target),diameter,edgeExclusion,waferThickness:X.num(m,'WaferThickness',Number(c.header['Wafer Thickness'])),opticalFactor:X.num(m,'OpticalFactor'),doping:X.num(m,'Doping'),dopingType:X.text(m,'DopingType',''),laserPower:X.num(m,'LaserPower'),qssLampIntensity:X.num(m,'QssLampIntensity'),evaluationModeIndex:X.num(m,'EvalutationMode'),probe:X.text(m,'ProbeSelection',''),bias:X.text(m,'QssBiasSelection',''),saveTransient:X.text(m,'SaveTransient',''),autoSetting:X.text(m,'DoAutoSetting',''),calculateJ0:X.text(m,'CalculateJZeroParams',''),includeKsJ0:X.text(m,'IncludeKSJ0',''),augerCorrection:X.text(m,'UseAugerCorrection',''),deltaTauLimit:X.num(m,'DeltaTauLimitForJ0Calc'),defaultDeltaN:X.num(m,'DefaultDeltaN'),defaultDeltaNRange:X.num(m,'DefaultDeltaNRangeInPercentage'),temperatureC:X.num(it,'ChuckTemperature'),measurementVelocity:X.num(it,'MeasurementVelocity')};
  }
  function measurementGeometry(d){
    const targetRadius=d?.targetType==='RoundWafer'&&Number.isFinite(d?.diameter)&&d.diameter>0?d.diameter/2:NaN,
      substrateRadius=(d?.shapeType==='Circle'||d?.shapeType==='RoundWafer')&&Number.isFinite(d?.radius)&&d.radius>0?d.radius:NaN,
      fallbackRadius=Number.isFinite(d?.diameter)&&d.diameter>0?d.diameter/2:NaN,
      radius=Number.isFinite(targetRadius)?targetRadius:Number.isFinite(substrateRadius)?substrateRadius:fallbackRadius,
      innerRadius=Number.isFinite(radius)&&Number.isFinite(d?.edgeExclusion)?Math.max(0,radius-d.edgeExclusion):NaN,
      coord={x:Number.isFinite(d?.coord?.x)?d.coord.x:0,y:Number.isFinite(d?.coord?.y)?d.coord.y:0};
    return{kind:Number.isFinite(radius)?'round':'unknown',onePoint:d?.patternType==='OnePointPattern',radius,innerRadius,coord};
  }
  function positionHtml(d){
    const g=measurementGeometry(d);
    if(!g.onePoint||g.kind!=='round')return'';
    const R=82,cx=110,cy=103,scale=R/g.radius,ri=Number.isFinite(g.innerRadius)?g.innerRadius*scale:NaN,px=cx+g.coord.x*scale,py=cy-g.coord.y*scale;
    return`<div class="panel chart dual-qss-position-panel"><header><b>Measurement position</b>${help('OnePointPattern is a single scheduled measurement, not a spatial heatmap. The outline uses the nominal substrate/target geometry and the dashed line shows EdgeExclusion when available.')}</header><div class="chart-stage dual-qss-position-stage"><svg viewBox="0 0 220 205" role="img" aria-label="Single measurement position on nominal circular substrate"><circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--panel2)" stroke="var(--soft)" stroke-width="2"/>${Number.isFinite(ri)?`<circle cx="${cx}" cy="${cy}" r="${ri}" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="5,4"/>`:''}<line x1="${cx-R}" x2="${cx+R}" y1="${cy}" y2="${cy}" stroke="var(--grid2)"/><line x1="${cx}" x2="${cx}" y1="${cy-R}" y2="${cy+R}" stroke="var(--grid2)"/><circle cx="${px}" cy="${py}" r="6" fill="var(--blue)" stroke="var(--text)" stroke-width="1.5"/><text x="${cx}" y="199" text-anchor="middle" fill="var(--muted)" font-size="10">Ø${fmt(g.radius*2,0)} mm${Number.isFinite(d.edgeExclusion)?` · exclusion ${fmt(d.edgeExclusion,1)} mm`:''} · point (${fmt(g.coord.x,1)}, ${fmt(g.coord.y,1)}) mm</text></svg></div></div>`;
  }
  function analyze(d){
    const life=d.points.map(p=>lifetimeValue(p)),
      valid=life.map(v=>v>0&&Number.isFinite(v)),
      dv=d.points.map(p=>Number.isFinite(p.lifetime)&&Number.isFinite(p.transient?.lifetime)?p.lifetime-p.transient.lifetime:NaN);
    return{source:'xml',valid,validCount:valid.filter(Boolean).length,invalidCount:valid.filter(v=>!v).length,summary:S.summary(life.filter((v,i)=>valid[i])),maxTransientDelta:Math.max(0,...dv.filter(Number.isFinite).map(Math.abs))};
  }
  function axes(ctx,W,H,p,xr,yr,xLabel,yLabel,logX=false){
    const X=x=>logX
      ?p.l+(Math.log(x)-Math.log(xr[0]))/(Math.log(xr[1])-Math.log(xr[0]))*(W-p.l-p.r)
      :p.l+(x-xr[0])/(xr[1]-xr[0])*(W-p.l-p.r),
      Y=y=>H-p.b-(y-yr[0])/(yr[1]-yr[0])*(H-p.t-p.b),
      xt=logX?logTicks(...xr):ticks(...xr),
      yt=ticks(...yr);
    ctx.strokeStyle=css('--grid2');
    xt.forEach(t=>{
      ctx.beginPath();
      ctx.moveTo(X(t),p.t);
      ctx.lineTo(X(t),H-p.b);
      ctx.stroke();
    });
    yt.forEach(t=>{
      ctx.beginPath();
      ctx.moveTo(p.l,Y(t));
      ctx.lineTo(W-p.r,Y(t));
      ctx.stroke();
    });
    ctx.strokeStyle=css('--soft');
    ctx.strokeRect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.fillStyle=css('--muted');
    ctx.font='10px system-ui';
    ctx.textAlign='center';
    xt.forEach(t=>ctx.fillText(afmt(t),X(t),H-18));
    ctx.fillText(xLabel,(p.l+W-p.r)/2,H-3);
    ctx.textAlign='right';
    yt.forEach(t=>ctx.fillText(afmt(t),p.l-7,Y(t)+3));
    ctx.save();
    ctx.translate(13,(p.t+H-p.b)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign='center';
    ctx.fillText(yLabel,0,0);
    ctx.restore();
    return{X,Y};
  }
  const colors=['--blue','--red','--green','--purple','--yellow','--soft'];
  function drawCurve(canvas,sets,selSet,selPoint,logX,lifetimeSource,zoom,onZoom,onSelect){
    const ctx=canvas.getContext('2d'),
      W=canvas.width=820,
      H=canvas.height=390,
      p={l:68,r:20,t:28,b:52},
      life=q=>lifetimeValue(q,lifetimeSource),
      xs=sets.flatMap(s=>s.data.points.map(q=>q.intensityMilli)),
      ys=sets.flatMap(s=>s.data.points.map(q=>life(q))),
      autoX=logX?posRange(xs):range(xs),
      autoY=range(ys,.08),
      xr=PV.plot.resolve(autoX,zoom.x),
      yr=PV.plot.resolve(autoY,zoom.y);
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);
    const {X,Y}=axes(ctx,W,H,p,xr,yr,'QSS intensity [mSun]',`${lifetimeLabel(lifetimeSource)} [µs]`,logX);
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.clip();
    sets.forEach((s,si)=>{
      const col=css(colors[si%colors.length]);
      ctx.strokeStyle=col;
      ctx.lineWidth=si?1.5:2;
      ctx.beginPath();
      let started=false;
      s.data.points.forEach(q=>{
        if(!(q.intensityMilli>0)||!Number.isFinite(life(q))||life(q)<=0){
          started=false;
          return;
        }
        const x=X(q.intensityMilli),y=Y(life(q));
        if(started)ctx.lineTo(x,y);
        else{ctx.moveTo(x,y);started=true}
      });
      ctx.stroke();
      s.data.points.forEach((q,pi)=>{
        if(!(q.intensityMilli>0)||!Number.isFinite(life(q)))return;
        ctx.beginPath();
        ctx.arc(X(q.intensityMilli),Y(life(q)),si===selSet&&pi===selPoint?5:3,0,2*Math.PI);
        ctx.fillStyle=life(q)>0?col:css('--bad');
        ctx.fill();
        if(si===selSet&&pi===selPoint){
          ctx.strokeStyle=css('--text');
          ctx.stroke();
        }
      });
    });
    ctx.restore();
    const nearest=e=>{const r=canvas.getBoundingClientRect(),mx=(e.clientX-r.left)*W/r.width,my=(e.clientY-r.top)*H/r.height;let b=null,d=Infinity;sets.forEach((s,si)=>s.data.points.forEach((q,pi)=>{if(!(q.intensityMilli>0)||!Number.isFinite(life(q)))return;const z=(mx-X(q.intensityMilli))**2+(my-Y(life(q)))**2;if(z<d){d=z;b={si,pi,q,s}}}));return d<180?b:null},tip=PV.ui.setupTooltip(canvas);canvas.onmouseleave=()=>PV.ui.hideTooltip(tip);canvas.onmousemove=e=>{const b=nearest(e);b?PV.ui.showTooltip(tip,e,`<b>${esc(b.s.label)}</b><br>${fmt(b.q.intensityMilli)} mSun · ${fmt(life(b.q))} µs`):PV.ui.hideTooltip(tip)};canvas.onclick=e=>{const b=nearest(e);if(b)onSelect(b.si,b.pi)};PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},xLog:logX,onChange:onZoom,onReset:()=>onZoom({x:null,y:null})});
  }
  function drawTransient(canvas,pnt,zoom,onZoom){
    const pts=pnt?.transient?.points||[],
      ctx=canvas.getContext('2d'),
      W=canvas.width=820,
      H=canvas.height=320,
      p={l:68,r:20,t:28,b:52};
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);
    if(!pts.length){
      ctx.fillStyle=css('--muted');
      ctx.textAlign='center';
      ctx.fillText('No stored transient.',W/2,H/2);
      return;
    }
    const xr=PV.plot.resolve(range(pts.map(p=>p.x),0),zoom.x),
      yr=PV.plot.resolve(range(pts.map(p=>p.y)),zoom.y),
      {X,Y}=axes(ctx,W,H,p,xr,yr,'Transient time [µs]','Voltage [mV]');
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.clip();
    ctx.strokeStyle=css('--blue');
    ctx.lineWidth=1.4;
    ctx.beginPath();
    pts.forEach((q,i)=>i?ctx.lineTo(X(q.x),Y(q.y)):ctx.moveTo(X(q.x),Y(q.y)));
    ctx.stroke();
    const c=pnt.transient.timeCursor;
    if(Number.isFinite(c)){
      ctx.strokeStyle=css('--yellow');
      ctx.setLineDash([5,4]);
      ctx.beginPath();
      ctx.moveTo(X(c),p.t);
      ctx.lineTo(X(c),H-p.b);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    PV.plot.bind(canvas,{
      W,H,
      plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},
      ranges:{x:xr,y:yr},
      onChange:onZoom,
      onReset:()=>onZoom({x:null,y:null})
    });
  }
  function pointRows(d){return d.points.map((p,i)=>[i+1,p.intensityMilli,p.intensitySun,p.lifetime,p.power,p.transient?.lifetime??'',p.transient?.evaluation??'',p.transient?.delta??'',p.transient?.preTrigger??'',p.transient?.autoCursor??'',p.transient?.timeCursor??'',p.transient?.average??'',p.transient?.amplitude??'',p.transient?.microwave??'',p.transient?.laserPower??'',p.transient?.voltage??'',p.transient?.offset??'',p.transient?.timeBase??'',p.transient?.points?.length??0])}
  function exportCurve(d){PV.exporter.csv(`${safe(d.resultName||d.name)}_dual_qss.csv`,['Point','QSS intensity [mSun]','QSS intensity [Sun]','XML Values lifetime [us]','Laser power vector','PV-2000 raw LifeTime / TransientInfo [us]','Evaluation','Delta [ns]','PreTrigger [us]','AutoCursor','TimeCursor [us]','Average','Amplitude [mV]','Microwave [GHz]','Transient LaserPower','Voltage range [mV]','Offset [mV]','TimeBase [us]','Transient samples'],pointRows(d))}
  function exportTransient(d,i){const p=d.points[i];PV.exporter.csv(`${safe(d.resultName||d.name)}_point_${i+1}_transient.csv`,['Time [us]','Voltage [mV]'],(p?.transient?.points||[]).map(q=>[q.x,q.y]))}
  function row(k,v,h=''){return`<dt>${esc(k)}${h?` ${help(h)}`:''}</dt><dd>${esc(v??'—')}</dd>`}
  function render(host,d,a){let sets=[{label:d.resultName||d.name||'Current XML',data:d,fileName:''}],selSet=0,selPoint=0,logX=true,zoom={curve:{x:null,y:null},transient:{x:null,y:null}};const current=()=>sets[selSet]?.data.points[selPoint];
    function selectedHtml(){const p=current(),t=p?.transient;if(!p)return'—';return`<dl class="meta">${row('Dataset',sets[selSet].label)}${row('Point',selPoint+1)}${row('Intensity',`${fmt(p.intensityMilli)} mSun`)}${row('Lifetime',`${fmt(lifetimeValue(p),4)} µs`,'Read from TransientInfo@LifeTime in the imported XML, with XML Values used only as a fallback when TransientInfo LifeTime is unavailable.')}${row('Evaluation',t?.evaluation||'—')}${row('Delta',`${fmt(t?.delta,3)} ns`)}${row('Pre-trigger',`${fmt(t?.preTrigger,3)} µs`)}${row('Auto cursor',fmt(t?.autoCursor,0))}${row('Time cursor',`${fmt(t?.timeCursor,3)} µs`)}${row('Average',fmt(t?.average,0))}${row('Amplitude',`${fmt(t?.amplitude,3)} mV`)}${row('Microwave',`${fmt(t?.microwave,4)} GHz`)}${row('Transient laser power',fmt(t?.laserPower,4))}${row('Voltage range',`${fmt(t?.voltage,3)} mV`)}${row('Offset',`${fmt(t?.offset,4)} mV`)}${row('Time base',`${fmt(t?.timeBase,3)} µs`)}${row('Samples',t?.points?.length||0)}</dl>`}
    function legendHtml(){
      const visible=sets.slice(0,4).map((s,i)=>{
        const range=s.data.rangeClass.replace('-range injection','').replace(' injection','');
        return `<span class="dual-qss-legend-item" title="${esc(s.label)}"><i style="background:var(${colors[i%colors.length]})"></i>${i+1} ${esc(range)}</span>`;
      }).join('');
      return visible+(sets.length>4?`<span class="dual-qss-legend-more">+${sets.length-4}</span>`:'');
    }
    function comparisonHtml(){return sets.length===1?'<span class="note">Add another Dual QSS XML to overlay LP/HP or repeat measurements.</span>':sets.map((s,i)=>`<div class="comparison-row"><span class="comparison-swatch" style="background:var(${colors[i%colors.length]})"></span><span>${esc(s.label)}</span>${i?`<button data-remove="${i}">×</button>`:''}</div>`).join('')}
    host.innerHTML=`<div class="module-grid dual-qss-module"><aside class="side"><section class="panel"><h3>Dual QSS injection sweep ${help('Reads the raw DualQssMeasurement injection-intensity, transient-lifetime and stored waveform path. Paired PV-2000 exports confirm this raw path, but the vendor result-table Lifetime is a separate post-processed quantity and is not yet reconstructed.')}</h3><dl class="meta">${row('Result',d.resultName||'—')}${row('Recipe',d.name||'—')}${row('Substrate',d.substrateId||'—')}${row('Range',d.rangeClass)}${row('Points',d.points.length)}${row('Positive lifetime',`${a.validCount} / ${d.points.length}`)}${row('Pattern',d.patternName||d.patternType||'—')}${row('Geometry',Number.isFinite(d.diameter)?`Ø${fmt(d.diameter,1)} mm ${d.targetType||d.shapeType||''}${Number.isFinite(d.edgeExclusion)?` · exclusion ${fmt(d.edgeExclusion,1)} mm`:''}`:'—')}${row('Wafer thickness',`${fmt(d.waferThickness,1)} µm`)}${row('Doping',Number.isFinite(d.doping)?`${d.doping.toExponential(3)} cm⁻³ ${d.dopingType}`:'—')}${row('Optical factor',fmt(d.opticalFactor,4))}${row('Laser power setting',fmt(d.laserPower,3))}</dl></section><section class="panel"><h3>Lifetime summary</h3><dl class="meta">${row('Average',`${fmt(a.summary.mean)} µs`)}${row('Median',`${fmt(a.summary.median)} µs`)}${row('Stdev',`${fmt(a.summary.stdev)} µs`)}${row('Min',`${fmt(a.summary.min)} µs`)}${row('Max',`${fmt(a.summary.max)} µs`)}${row('Invalid / ≤0',a.invalidCount)}</dl></section><section class="panel"><h3>Selected injection point</h3><div id="dqSelected">${selectedHtml()}</div></section><section class="panel"><h3>Comparison overlay</h3><div id="dqComparisons" class="comparison-list">${comparisonHtml()}</div><label class="btn comparison-open">Add XML<input id="dqAdd" type="file" accept=".xml,text/xml,application/xml" multiple></label></section><details class="panel"><summary>Acquisition / J0 settings</summary><dl class="meta">${row('Probe',d.probe||'—')}${row('Bias',d.bias||'—')}${row('Save transient',d.saveTransient||'—')}${row('Auto setting',d.autoSetting||'—')}${row('Evaluation mode index',fmt(d.evaluationModeIndex,0))}${row('QSS lamp intensity',fmt(d.qssLampIntensity,3))}${row('Calculate J0',d.calculateJ0||'—','Stored recipe flag only; the paired exports establish the output columns but not yet the vendor J0/post-processing algorithm.')}${row('Include KS J0',d.includeKsJ0||'—')}${row('Auger correction',d.augerCorrection||'—')}${row('Δτ J0 limit',fmt(d.deltaTauLimit))}${row('Default Δn',fmt(d.defaultDeltaN,3))}${row('Default Δn range',fmt(d.defaultDeltaNRange,3))}${row('Measurement velocity',fmt(d.measurementVelocity,4))}${row('Chuck temperature',`${fmt(d.temperatureC,2)} °C`)}</dl></details></aside><section class="plots"><div class="panel chart"><header><b>Lifetime vs QSS intensity</b>${help('Lifetime is read only from the imported XML: TransientInfo@LifeTime is used when available, with XML Values as a fallback. PV-2000 CSV/raw exports are development-validation evidence and are never runtime inputs.')}<span id="dqCurveLegend" class="dual-qss-inline-legend"></span><span class="grow"></span><select id="dqScale"><option value="log">Log X</option><option value="linear">Linear X</option></select>${PV.plot.axisControls('dqCurveAxes')}<button id="dqExportCurve">Export</button></header><div class="canvas-wrap"><canvas id="dqCurve"></canvas></div></div></section><section class="plots">${positionHtml(d)}<div class="panel chart"><header><b>Stored transient</b>${help('Raw SmallPoint Time/Voltage waveform from the selected injection point. Paired PV-2000 raw CSV exports identify the Y quantity as Voltage [mV] and match the exported samples exactly. The yellow dashed line marks TimeCursor.')}<span class="grow"></span>${PV.plot.axisControls('dqTransientAxes')}<button id="dqExportTransient">Export</button></header><div class="canvas-wrap"><canvas id="dqTransient"></canvas></div></div></section></div>`;
    host.querySelector('#dqScale').onchange=e=>{logX=e.target.value==='log';zoom.curve={x:null,y:null};redraw()};host.querySelector('#dqAdd').onchange=async e=>{for(const f of e.target.files||[]){try{const p=PV.xml.parse(await f.text());if(p.type!=='DualQssMeasurement')throw new Error(`${f.name}: not DualQssMeasurement.`);const z=parse(p);sets.push({label:z.resultName||z.name||f.name,data:z,fileName:f.name})}catch(err){alert(err.message)}}e.target.value='';zoom.curve={x:null,y:null};redraw()};
    function redraw(){
      if(selSet>=sets.length){selSet=0;selPoint=0}
      if(selPoint>=sets[selSet].data.points.length)selPoint=0;
      host.querySelector('#dqSelected').innerHTML=selectedHtml();
      host.querySelector('#dqComparisons').innerHTML=comparisonHtml();
      host.querySelector('#dqCurveLegend').innerHTML=legendHtml();
      host.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
        const i=Number(b.dataset.remove);
        sets.splice(i,1);
        if(selSet===i){selSet=0;selPoint=0}
        else if(selSet>i)selSet--;
        redraw();
      });
      drawCurve(
        host.querySelector('#dqCurve'),sets,selSet,selPoint,logX,'transient',zoom.curve,
        n=>{zoom.curve=n;redraw()},
        (si,pi)=>{selSet=si;selPoint=pi;zoom.transient={x:null,y:null};redraw()}
      );
      drawTransient(host.querySelector('#dqTransient'),current(),zoom.transient,n=>{
        zoom.transient=n;
        redraw();
      });
      PV.plot.bindAxisControls(host,'dqCurveAxes',zoom.curve,n=>{
        zoom.curve=n;
        redraw();
      },{xLog:logX});
      PV.plot.bindAxisControls(host,'dqTransientAxes',zoom.transient,n=>{
        zoom.transient=n;
        redraw();
      });
      host.querySelector('#dqExportCurve').onclick=()=>exportCurve(sets[selSet].data);
      host.querySelector('#dqExportTransient').onclick=()=>exportTransient(sets[selSet].data,selPoint);
    }
    redraw();
  }
  PV.modules=PV.modules||{};PV.modules.dualQss={types:['DualQssMeasurement'],parse,analyze,render,parseTransient,classifyRange,lifetimeValue,lifetimeLabel,pointRows,measurementGeometry};PV.registry.register(PV.modules.dualQss);
})(typeof window!=='undefined'?window:globalThis);
