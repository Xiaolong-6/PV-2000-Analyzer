(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,GEO=PV.geometry;
  const safe=s=>String(s||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');
  const esc=value=>PV.ui.escapeHtml(value);
  const help=text=>PV.ui.help(text);
  const css=name=>PV.ui.cssVar(name);
  const fmt=(v,n=4)=>!Number.isFinite(v)?'—':Math.abs(v)>=1e4||(Math.abs(v)>0&&Math.abs(v)<1e-3)?v.toExponential(n):v.toFixed(n);

  function firstNum(parent,names,d=NaN){
    for(const name of names){
      const v=X.num(parent,name,NaN);
      if(Number.isFinite(v))return v;
    }
    return d;
  }

  function scalarValues(node){
    return node?X.children(node).map(e=>Number(e.textContent)).filter(Number.isFinite):[];
  }

  function reconstructSite(darkRaw,lightRaw,offset,factor){
    const darkMean=S.mean(darkRaw),
      lightMean=S.mean(lightRaw);
    if(![darkMean,lightMean,offset].every(Number.isFinite)){
      return{dark:NaN,light:NaN,vsb:NaN,darkMean,lightMean};
    }
    const dark=darkMean-offset;
    if(!Number.isFinite(factor))return{dark,light:NaN,vsb:NaN,darkMean,lightMean};
    const vsb=factor*(darkMean-lightMean),
      light=dark-vsb;
    return{dark,light,vsb,darkMean,lightMean};
  }

  function effectiveHalf(size,edge){
    const half=size/2;
    if(!Number.isFinite(half)||!(half>0))return NaN;
    edge=Number.isFinite(edge)?edge:0;
    return edge>=0&&edge<half?half-edge:NaN;
  }

  function parse(parsed){
    const m=parsed.measurement,
      c=X.common(parsed),
      md=X.direct(m,'MeasurementData'),
      itd=X.direct(md,'IterationData'),
      iter=X.direct(itd,'Iteration'),
      data=X.direct(iter,'Data'),
      items=data?X.children(data).filter(e=>X.lname(e)==='DataItem'):[],
      offset=firstNum(md,['VcpdOffset','VcpdOffsett'],0),
      factor=X.num(md,'VsbCorrectionFactor',NaN),
      pattern=X.direct(m,'Pattern'),
      target=X.direct(m,'Target'),
      targetType=X.attrType(target),
      patternType=X.attrType(pattern),
      pitch=X.direct(pattern,'Pitch'),
      pitchX=X.num(pitch,'X',NaN),
      pitchY=X.num(pitch,'Y',NaN),
      size=X.direct(target,'Size'),
      targetWidth=X.num(size,'Width',NaN),
      targetHeight=X.num(size,'Height',NaN),
      diameter=X.num(target,'Diameter',NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',0));

    const sites=items.map((item,index)=>{
      const darkRaw=scalarValues(X.direct(item,'VcpdDark')),
        lightRaw=scalarValues(X.direct(item,'VcpdLight')),
        result=reconstructSite(darkRaw,lightRaw,offset,factor);
      return{index,darkRaw,lightRaw,...result,coord:null};
    });

    let coords=[],
      coordinateSource='unavailable';
    const coeff=X.direct(pattern,'Coefficients');
    if(coeff){
      const explicit=X.children(coeff)
        .map(p=>({x:X.num(p,'X',NaN),y:X.num(p,'Y',NaN)}))
        .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
      if(explicit.length===sites.length){
        coords=explicit;
        coordinateSource='XML coefficients';
      }
    }

    if(!coords.length&&patternType==='MapPattern'){
      if(targetType==='SquareCell'){
        const hx=effectiveHalf(targetWidth,edgeExclusion),
          hy=effectiveHalf(targetHeight,edgeExclusion);
        if([hx,hy,pitchX,pitchY].every(Number.isFinite)){
          coords=GEO.centeredRectGrid(hx,hy,pitchX,pitchY,sites.length);
          if(coords.length)coordinateSource='MapPattern + SquareCell';
        }
      }else if(targetType==='RoundWafer'){
        const radius=effectiveHalf(diameter,edgeExclusion);
        if([radius,pitchX,pitchY].every(Number.isFinite)){
          coords=GEO.roundGrid(radius,pitchX,pitchY,sites.length);
          if(coords.length)coordinateSource='MapPattern + RoundWafer (inferred)';
        }
      }
    }

    sites.forEach((site,i)=>{site.coord=coords[i]||null});
    return{
      ...c,
      sites,
      coords,
      offset,
      factor,
      coordinateSource,
      patternType,
      patternName:X.text(pattern,'Name',''),
      targetType,
      targetWidth,
      targetHeight,
      diameter,
      edgeExclusion,
      pitchX,
      pitchY,
      numberOfDataPoints:X.num(m,'NumberOfDataPoints',NaN),
      measurementInterval:X.num(m,'MeasurementInterval',NaN),
      doRastering:X.text(m,'DoRastering',''),
      temperatureC:X.num(iter,'ChuckTemperature',NaN),
      measurementVelocity:X.num(iter,'MeasurementVelocity',NaN),
      raw:parsed
    };
  }

  function analyze(d){
    const metrics={
      dark:{
        key:'dark',
        label:'Vcpd Dark',
        short:'Vcpd Dark',
        unit:'V',
        values:d.sites.map(s=>s.dark),
        help:'PV-2000 dark contact-potential result: mean dark reading minus the XML Vcpd offset.'
      },
      light:{
        key:'light',
        label:'Vcpd Light',
        short:'Vcpd Light',
        unit:'V',
        values:d.sites.map(s=>s.light),
        help:'PV-2000 illuminated contact-potential result reconstructed as Vcpd Dark − VSB, including the XML VsbCorrectionFactor.'
      },
      vsb:{
        key:'vsb',
        label:'VSB',
        short:'VSB',
        unit:'V',
        values:d.sites.map(s=>s.vsb),
        help:'Surface barrier reconstructed as VsbCorrectionFactor × (mean dark raw Vcpd − mean illuminated raw Vcpd).'
      }
    };
    const summaries={};
    for(const [key,metric] of Object.entries(metrics))summaries[key]=S.summary(metric.values);
    return{metrics,summaries};
  }

  function color(t){
    t=Math.max(0,Math.min(1,t));
    const stops=[
      [0,[49,54,149]],
      [.25,[39,127,142]],
      [.5,[63,175,109]],
      [.75,[218,200,50]],
      [1,[220,55,55]]
    ];
    let i=0;
    while(i<stops.length-2&&t>stops[i+1][0])i++;
    const[a,c1]=stops[i],
      [b,c2]=stops[i+1],
      u=(t-a)/(b-a);
    return`rgb(${c1.map((v,j)=>Math.round(v+(c2[j]-v)*u)).join(',')})`;
  }

  function finiteRange(values,pad=.04){
    const z=values.filter(Number.isFinite);
    if(!z.length)return[-1,1];
    let lo=Math.min(...z),
      hi=Math.max(...z);
    if(lo===hi){
      const d=Math.max(1e-6,Math.abs(lo)*.05||.05);
      lo-=d;
      hi+=d;
    }else{
      const d=(hi-lo)*pad;
      lo-=d;
      hi+=d;
    }
    return[lo,hi];
  }

  function niceTicks(lo,hi,n=5){
    if(!Number.isFinite(lo)||!Number.isFinite(hi)||!(hi>lo))return[];
    const raw=(hi-lo)/n,
      p=10**Math.floor(Math.log10(raw)),
      q=raw/p,
      step=(q<=1?1:q<=2?2:q<=5?5:10)*p,
      start=Math.ceil(lo/step)*step,
      out=[];
    for(let v=start;v<=hi+step*1e-9;v+=step)out.push(v);
    return out;
  }

  function axisFmt(v){
    if(!Number.isFinite(v))return'';
    const a=Math.abs(v);
    return a>=1e4||(a>0&&a<1e-3)?v.toExponential(1):Number(v.toPrecision(4)).toString();
  }

  function drawAxes(ctx,W,H,p,xr,yr,xLabel,yLabel){
    const X=v=>p.l+(v-xr[0])/(xr[1]-xr[0]||1)*(W-p.l-p.r),
      Y=v=>H-p.b-(v-yr[0])/(yr[1]-yr[0]||1)*(H-p.t-p.b);
    ctx.strokeStyle=css('--grid2');
    ctx.lineWidth=1;
    for(const t of niceTicks(xr[0],xr[1],5)){
      const x=X(t);
      ctx.beginPath();
      ctx.moveTo(x,p.t);
      ctx.lineTo(x,H-p.b);
      ctx.stroke();
    }
    for(const t of niceTicks(yr[0],yr[1],5)){
      const y=Y(t);
      ctx.beginPath();
      ctx.moveTo(p.l,y);
      ctx.lineTo(W-p.r,y);
      ctx.stroke();
    }
    ctx.strokeStyle=css('--soft');
    ctx.strokeRect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.fillStyle=css('--muted');
    ctx.font='10px system-ui';
    ctx.textAlign='center';
    for(const t of niceTicks(xr[0],xr[1],5))ctx.fillText(axisFmt(t),X(t),H-18);
    ctx.fillText(xLabel,(p.l+W-p.r)/2,H-3);
    ctx.textAlign='right';
    for(const t of niceTicks(yr[0],yr[1],5))ctx.fillText(axisFmt(t),p.l-7,Y(t)+3);
    ctx.save();
    ctx.translate(13,(p.t+H-p.b)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign='center';
    ctx.fillText(yLabel,0,0);
    ctx.restore();
    return{X,Y};
  }

  function drawMap(canvas,d,a,key,selected,zoom,onZoom,onSelect){
    const ctx=canvas.getContext('2d'),
      metric=a.metrics[key],
      values=metric.values,
      W=canvas.width=760,
      H=canvas.height=420,
      p={l:58,r:78,t:26,b:48};
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);

    if(d.coords.length!==d.sites.length||!d.coords.length){
      ctx.fillStyle=css('--muted');
      ctx.textAlign='center';
      ctx.font='12px system-ui';
      ctx.fillText('Map coordinates are unavailable for this ISC pattern.',W/2,H/2);
      return;
    }

    const b=GEO.bounds(d.coords),
      dx=Number.isFinite(d.pitchX)&&d.pitchX>0?d.pitchX:0,
      dy=Number.isFinite(d.pitchY)&&d.pitchY>0?d.pitchY:0,
      autoX=[b.xmin-(dx||1)/2,b.xmax+(dx||1)/2],
      autoY=[b.ymin-(dy||1)/2,b.ymax+(dy||1)/2],
      aspect=PV.plot.equalAspectRanges(autoX,autoY,W-p.l-p.r,H-p.t-p.b),
      xr=PV.plot.resolve(aspect.x,zoom?.x),
      yr=PV.plot.resolve(aspect.y,zoom?.y),
      axes=drawAxes(ctx,W,H,p,xr,yr,'X [mm]','Y [mm]'),
      X=axes.X,
      Y=axes.Y,
      vr=finiteRange(values,0),
      lo=vr[0],
      hi=vr[1];

    ctx.save();
    ctx.beginPath();
    ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.clip();
    d.coords.forEach((pt,i)=>{
      const v=values[i];
      if(!Number.isFinite(v))return;
      const cx=X(pt.x),
        cy=Y(pt.y),
        halfW=dx>0?Math.abs(X(pt.x+dx/2)-cx):5,
        halfH=dy>0?Math.abs(Y(pt.y+dy/2)-cy):5;
      ctx.fillStyle=color((v-lo)/(hi-lo||1));
      ctx.fillRect(cx-halfW,cy-halfH,Math.max(1,2*halfW),Math.max(1,2*halfH));
      if(i===selected){
        ctx.strokeStyle=css('--text');
        ctx.lineWidth=2;
        ctx.strokeRect(cx-halfW,cy-halfH,Math.max(1,2*halfW),Math.max(1,2*halfH));
      }
    });
    ctx.restore();

    const cbx=W-46,
      cby=p.t+12,
      cbh=H-p.t-p.b-24,
      grad=ctx.createLinearGradient(0,cby+cbh,0,cby);
    for(let j=0;j<=10;j++)grad.addColorStop(j/10,color(j/10));
    ctx.fillStyle=grad;
    ctx.fillRect(cbx,cby,12,cbh);
    ctx.strokeStyle=css('--soft');
    ctx.strokeRect(cbx,cby,12,cbh);
    ctx.fillStyle=css('--muted');
    ctx.textAlign='left';
    ctx.fillText(axisFmt(hi),cbx+16,cby+4);
    ctx.fillText(axisFmt(lo),cbx+16,cby+cbh);
    ctx.save();
    ctx.translate(W-8,(p.t+H-p.b)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign='center';
    ctx.fillText(`${metric.short} [${metric.unit}]`,0,0);
    ctx.restore();

    const tip=PV.ui.setupTooltip(canvas);
    canvas.onmouseleave=()=>PV.ui.hideTooltip(tip);
    canvas.onmousemove=e=>{
      const rect=canvas.getBoundingClientRect(),
        mx=(e.clientX-rect.left)*W/rect.width,
        my=(e.clientY-rect.top)*H/rect.height;
      let best=-1,
        bestD=Infinity;
      d.coords.forEach((pt,i)=>{
        const dd=(mx-X(pt.x))**2+(my-Y(pt.y))**2;
        if(dd<bestD){bestD=dd;best=i}
      });
      if(best>=0&&bestD<180){
        const pt=d.coords[best],
          v=values[best];
        PV.ui.showTooltip(
          tip,
          e,
          `<b>Point ${best+1}</b><br>X ${fmt(pt.x,2)} mm · Y ${fmt(pt.y,2)} mm<br>${esc(metric.short)} = ${fmt(v,5)} V`
        );
      }else PV.ui.hideTooltip(tip);
    };
    canvas.onclick=e=>{
      const rect=canvas.getBoundingClientRect(),
        mx=(e.clientX-rect.left)*W/rect.width,
        my=(e.clientY-rect.top)*H/rect.height;
      let best=-1,
        bestD=Infinity;
      d.coords.forEach((pt,i)=>{
        const dd=(mx-X(pt.x))**2+(my-Y(pt.y))**2;
        if(dd<bestD){bestD=dd;best=i}
      });
      if(best>=0&&bestD<300)onSelect?.(best);
    };
    PV.plot.bind(canvas,{
      W,
      H,
      plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},
      ranges:{x:xr,y:yr},
      onChange:n=>onZoom?.(n),
      onReset:()=>onZoom?.({x:null,y:null})
    });
  }

  function drawHist(canvas,a,key,zoom,onZoom){
    const ctx=canvas.getContext('2d'),
      metric=a.metrics[key],
      bins=S.histogram(metric.values,30),
      W=canvas.width=760,
      H=canvas.height=300,
      p={l:58,r:18,t:24,b:48};
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);
    if(!bins.length)return[];

    const autoX=[bins[0].lo,bins.at(-1).hi],
      autoY=[0,Math.max(...bins.map(b=>b.count),1)],
      xr=PV.plot.resolve(autoX,zoom?.x),
      yr=PV.plot.resolve(autoY,zoom?.y),
      {X,Y}=drawAxes(ctx,W,H,p,xr,yr,`${metric.short} [${metric.unit}]`,'Count'),
      vr=finiteRange(metric.values,0),
      lo=vr[0],
      hi=vr[1];

    ctx.save();
    ctx.beginPath();
    ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.clip();
    for(const bin of bins){
      const x0=X(bin.lo),
        x1=X(bin.hi),
        y=Y(bin.count),
        t=((bin.lo+bin.hi)/2-lo)/(hi-lo||1);
      ctx.fillStyle=color(t);
      ctx.fillRect(Math.min(x0,x1),y,Math.max(1,Math.abs(x1-x0)-1),H-p.b-y);
    }
    ctx.restore();

    PV.plot.bind(canvas,{
      W,
      H,
      plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},
      ranges:{x:xr,y:yr},
      onChange:n=>onZoom?.(n),
      onReset:()=>onZoom?.({x:null,y:null})
    });
    return bins;
  }

  function drawRaw(canvas,d,selected,zoom,onZoom){
    const ctx=canvas.getContext('2d'),
      site=d.sites[selected],
      dark=site?site.darkRaw.map(v=>v-d.offset):[],
      light=site?site.lightRaw.map(v=>v-d.offset):[],
      n=Math.max(dark.length,light.length),
      W=canvas.width=760,
      H=canvas.height=300,
      p={l:62,r:18,t:24,b:48};
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);
    if(!site||!n)return;

    const x=Array.from({length:n},(_,i)=>i+1),
      autoX=[1,Math.max(2,n)],
      autoY=finiteRange([...dark,...light]),
      xr=PV.plot.resolve(autoX,zoom?.x),
      yr=PV.plot.resolve(autoY,zoom?.y),
      {X,Y}=drawAxes(ctx,W,H,p,xr,yr,'Reading index','Vcpd [V]');

    function series(values,stroke){
      ctx.strokeStyle=stroke;
      ctx.lineWidth=1.6;
      ctx.beginPath();
      let started=false;
      values.forEach((v,i)=>{
        if(!Number.isFinite(v))return;
        const px=X(i+1),
          py=Y(v);
        if(!started){ctx.moveTo(px,py);started=true}else ctx.lineTo(px,py);
      });
      ctx.stroke();
      ctx.fillStyle=stroke;
      values.forEach((v,i)=>{
        if(!Number.isFinite(v))return;
        ctx.beginPath();
        ctx.arc(X(i+1),Y(v),2.4,0,2*Math.PI);
        ctx.fill();
      });
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.clip();
    series(dark,css('--red'));
    series(light,css('--blue'));
    ctx.restore();

    ctx.fillStyle=css('--red');
    ctx.fillRect(p.l+8,p.t+8,10,3);
    ctx.fillStyle=css('--muted');
    ctx.textAlign='left';
    ctx.fillText('Dark raw (offset corrected)',p.l+23,p.t+12);
    ctx.fillStyle=css('--blue');
    ctx.fillRect(p.l+162,p.t+8,10,3);
    ctx.fillStyle=css('--muted');
    ctx.fillText('Light raw (offset corrected)',p.l+177,p.t+12);

    PV.plot.bind(canvas,{
      W,
      H,
      plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},
      ranges:{x:xr,y:yr},
      onChange:nz=>onZoom?.(nz),
      onReset:()=>onZoom?.({x:null,y:null})
    });
  }

  function downloadMap(d,a,key){
    const m=a.metrics[key];
    PV.exporter.csv(
      `${safe(d.resultName)}_${key}.csv`,
      ['Point','X [mm]','Y [mm]',`${m.short} [${m.unit}]`],
      d.sites.map((site,i)=>[
        i+1,
        site.coord?.x??'',
        site.coord?.y??'',
        m.values[i]
      ])
    );
  }

  function downloadRaw(d,selected){
    const s=d.sites[selected];
    if(!s)return;
    const n=Math.max(s.darkRaw.length,s.lightRaw.length);
    PV.exporter.csv(
      `${safe(d.resultName)}_site_${selected+1}_raw.csv`,
      ['Reading','Dark raw [V]','Light raw [V]','Dark offset-corrected [V]','Light offset-corrected [V]'],
      Array.from({length:n},(_,i)=>[
        i+1,
        s.darkRaw[i]??'',
        s.lightRaw[i]??'',
        Number.isFinite(s.darkRaw[i])?s.darkRaw[i]-d.offset:'',
        Number.isFinite(s.lightRaw[i])?s.lightRaw[i]-d.offset:''
      ])
    );
  }

  function render(host,d,a){
    let metricKey='dark',
      selected=0,
      zoom={
        map:{x:null,y:null},
        hist:{x:null,y:null},
        raw:{x:null,y:null}
      };

    function metaRow(k,v,h=''){
      return`<dt>${esc(k)}${h?` ${help(h)}`:''}</dt><dd>${esc(v??'—')}</dd>`;
    }

    function statRows(){
      return Object.values(a.metrics).map(m=>{
        const s=a.summaries[m.key];
        return`<tr title="${esc(m.help)}"><td>${esc(m.short)} ${help(m.help)}</td><td>${fmt(s.mean)}</td><td>${fmt(s.median)}</td><td>${fmt(s.stdev)}</td><td>${fmt(s.min)}</td><td>${fmt(s.max)}</td></tr>`;
      }).join('');
    }

    function selectedHtml(){
      const s=d.sites[selected]||{},
        p=s.coord;
      return`<dl class="meta">
        ${metaRow('Point',String(selected+1))}
        ${metaRow('Coordinate',p?`X ${fmt(p.x,2)} mm · Y ${fmt(p.y,2)} mm`:'—')}
        ${metaRow('Vcpd Dark',`${fmt(s.dark,6)} V`)}
        ${metaRow('Vcpd Light',`${fmt(s.light,6)} V`)}
        ${metaRow('VSB',`${fmt(s.vsb,6)} V`)}
        ${metaRow('Raw readings',`${Math.min(s.darkRaw?.length||0,s.lightRaw?.length||0)}`)}
      </dl>`;
    }

    host.innerHTML=`<div class="module-grid isc-module"><aside class="side">
      <section class="panel"><h3>Measurement ${help('ISC measures VCPD in dark and illuminated states. The browser runtime reads only the PV-2000 XML; vendor exports are used only for development regression.')}</h3><dl class="meta">
        ${metaRow('Result',d.resultName)}
        ${metaRow('Recipe',d.name)}
        ${metaRow('Substrate',d.substrateId||'—')}
        ${metaRow('Status',d.status)}
        ${metaRow('Pattern',`${d.patternName||d.patternType||'—'} · ${fmt(d.pitchX,2)} × ${fmt(d.pitchY,2)} mm`)}
        ${metaRow('Target',d.targetType==='SquareCell'?`${fmt(d.targetWidth,1)} × ${fmt(d.targetHeight,1)} mm ${d.targetType}`:`${fmt(d.diameter,1)} mm ${d.targetType||'—'}`)}
        ${metaRow('Edge exclusion',`${fmt(d.edgeExclusion,2)} mm`)}
        ${metaRow('Sites',String(d.sites.length))}
        ${metaRow('Readings/site',fmt(d.numberOfDataPoints,0),'PV-2000 recipe setting for repeated VCPD readings averaged at each site.')}
        ${metaRow('Interval',`${fmt(d.measurementInterval,4)} s`)}
        ${metaRow('Vcpd offset',`${fmt(d.offset,7)} V`,'Subtracted from the dark raw mean before reporting Vcpd Dark.')}
        ${metaRow('VSB factor',fmt(d.factor,5),'Applied to the dark-minus-light raw mean difference before VSB and reported Vcpd Light are formed.')}
        ${metaRow('Coordinates',d.coordinateSource)}
      </dl></section>
      <section class="panel"><h3>Results summary ${help('Average, Median, Stdev, Min and Max are calculated over finite sites. Stdev is the sample standard deviation, matching the current paired PV-2000 reference export.')}</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>${statRows()}</tbody></table></div></section>
      <section class="panel"><h3>Selected site ${help('Click a map cell to inspect that site. Raw-reading plots show the underlying dark/light readings after subtraction of the Vcpd offset; the reported scalar Vcpd Light additionally includes the VSB correction factor.')}</h3><div id="iSelected">${selectedHtml()}</div></section>
      <details class="panel"><summary>Acquisition metadata</summary><dl class="meta">
        ${metaRow('Chuck temperature',`${fmt(d.temperatureC,2)} °C`)}
        ${metaRow('Measurement velocity',fmt(d.measurementVelocity,4))}
        ${metaRow('Rastering',d.doRastering||'—')}
        ${metaRow('Start',d.start||'—')}
        ${metaRow('End',d.end||'—')}
        ${metaRow('Elapsed',d.elapsed||'—')}
      </dl></details>
    </aside><section class="plots">
      <div class="panel chart"><header><b>ISC map</b>${help('Select Vcpd Dark, Vcpd Light or VSB. Click a cell to inspect its raw readings. Wheel zooms both spatial axes; hover an axis to zoom only that direction; double-click restores Auto.')}<span class="grow"></span><select id="iMetric"><option value="dark">Vcpd Dark</option><option value="light">Vcpd Light</option><option value="vsb">VSB</option></select><button id="iExportMap">Export</button></header><div class="canvas-wrap">${PV.plot.axisControls('iMapAxes')}<canvas id="iMap"></canvas></div></div>
      <div class="panel chart"><header><b>Distribution</b>${help('Distribution of the currently selected ISC result across all finite sites. Wheel/double-click and Axes use the shared plot controls.')}<span class="grow"></span><button id="iExportHist">Export</button></header><div class="canvas-wrap">${PV.plot.axisControls('iHistAxes')}<canvas id="iHist"></canvas></div></div>
    </section><section class="plots">
      <div class="panel chart"><header><b>Raw readings</b>${help('Offset-corrected dark/light readings from the selected site. These are the repeated readings averaged by PV-2000. The reported Vcpd Light result can differ from the raw illuminated mean after offset because the XML VsbCorrectionFactor is applied to the result path.')}<span class="grow"></span><button id="iExportRaw">Export</button></header><div class="canvas-wrap">${PV.plot.axisControls('iRawAxes')}<canvas id="iRaw"></canvas></div></div>
    </section></div>`;

    const metricSelect=host.querySelector('#iMetric');
    metricSelect.value=metricKey;
    metricSelect.onchange=e=>{
      metricKey=e.target.value;
      zoom.map={x:null,y:null};
      zoom.hist={x:null,y:null};
      redraw();
    };

    function redraw(){
      const bins=drawHist(host.querySelector('#iHist'),a,metricKey,zoom.hist,n=>{
        zoom.hist=n;
        redraw();
      });
      drawMap(
        host.querySelector('#iMap'),
        d,
        a,
        metricKey,
        selected,
        zoom.map,
        n=>{
          zoom.map=n;
          redraw();
        },
        i=>{
          selected=i;
          zoom.raw={x:null,y:null};
          host.querySelector('#iSelected').innerHTML=selectedHtml();
          redraw();
        }
      );
      drawRaw(host.querySelector('#iRaw'),d,selected,zoom.raw,n=>{
        zoom.raw=n;
        redraw();
      });

      PV.plot.bindAxisControls(host,'iMapAxes',zoom.map,n=>{
        zoom.map=n;
        redraw();
      });
      PV.plot.bindAxisControls(host,'iHistAxes',zoom.hist,n=>{
        zoom.hist=n;
        redraw();
      });
      PV.plot.bindAxisControls(host,'iRawAxes',zoom.raw,n=>{
        zoom.raw=n;
        redraw();
      });

      host.querySelector('#iExportMap').onclick=()=>downloadMap(d,a,metricKey);
      host.querySelector('#iExportHist').onclick=()=>{
        const m=a.metrics[metricKey];
        PV.exporter.csv(
          `${safe(d.resultName)}_${metricKey}_histogram.csv`,
          [`Bin low [${m.unit}]`,`Bin high [${m.unit}]`,'Count'],
          bins.map(b=>[b.lo,b.hi,b.count])
        );
      };
      host.querySelector('#iExportRaw').onclick=()=>downloadRaw(d,selected);
    }

    document.addEventListener('pv-theme-change',()=>{
      if(host.isConnected)redraw();
    });
    redraw();
  }

  PV.modules=PV.modules||{};
  PV.modules.isc={
    types:['ISCMeasurement'],
    parse,
    analyze,
    render,
    reconstructSite,
    effectiveHalf
  };
  PV.registry.register(PV.modules.isc);
})(typeof window!=='undefined'?window:globalThis);
