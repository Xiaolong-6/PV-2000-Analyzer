(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,GEO=PV.geometry,Q_PV2000=1.602e-19;
  const safe=s=>String(s||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');
  const esc=value=>PV.ui.escapeHtml(value);
  const fmt=(v,n=3)=>!Number.isFinite(v)?'—':Math.abs(v)>=1e4||Math.abs(v)<1e-2&&v!==0?v.toExponential(n):v.toFixed(n);
  const help=text=>PV.ui.help(text);
  const css=name=>PV.ui.cssVar(name);
  const aliases={
    current:['current','isc','shortcircuitcurrent'],
    direct:['directreflection','directreflectance','specularreflection','specularreflectance'],
    diffuse:['scatteredreflection','scatteredreflectance','diffusereflection','diffusereflectance'],
    total:['totalreflection','totalreflectance','reflectance','reflection'],
    eqe:['eqe','qe','quantumefficiency','externalquantumefficiency'],
    iqe:['iqe','internalquantumefficiency']
  };
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function conceptFor(name){const n=norm(name);for(const [k,list] of Object.entries(aliases))if(list.includes(n))return k;return''}
  function labelFor(name){const c=conceptFor(name);return c==='current'?'Current':c==='direct'?'Direct reflectance':c==='diffuse'?'Scattered reflectance':c==='total'?'Reflectivity':c==='eqe'?'EQE':c==='iqe'?'IQE':name}
  function unitFor(name,d){const c=conceptFor(name);if(c==='current')return d.currentUnit||'µA';if(['direct','diffuse','total','eqe','iqe'].includes(c))return'%';return''}
  function numericAttrs(el){const out={};if(!el)return out;for(const a of [...el.attributes]){if(norm(a.name)==='key')continue;const v=Number(a.value);if(Number.isFinite(v))out[a.name]=v}return out}
  function parseLasers(m){const node=X.direct(m,'LaserSettings');
    if(!node)return[];
    return X.children(node).map(e=>({index:X.num(e,'Index',NaN),power:X.num(e,'Power',NaN),wavelengthNm:X.num(e,'Wavelength',NaN)})).filter(x=>Number.isFinite(x.index))}
  function parseFlux(m){
    const out={},
    node=X.direct(m,'FluxCache');
    if(!node)return out;
    for(const item of X.children(node)){
      const kNode=X.direct(item,'Key'),
      vNode=X.direct(item,'Value'),
      key=X.num(kNode,'int',NaN),
      value=X.num(vNode,'double',NaN);
      if(Number.isFinite(key)&&Number.isFinite(value))out[key]=value}return out}
  function effectiveHalf(size,edge){
    const half=size/2;
    if(!Number.isFinite(half)||!(half>0))return NaN;
    edge=Number.isFinite(edge)?edge:0;
    return edge>=0&&edge<half?half-edge:NaN;
  }
  function pseudoSquareTarget(d){
    if(d.targetType!=='PseudoSquareCell'||![d.targetWidth,d.targetHeight,d.diameter].every(Number.isFinite))return null;
    const nominal={halfWidth:d.targetWidth/2,halfHeight:d.targetHeight/2,radius:d.diameter/2},
      scheduled={
        halfWidth:effectiveHalf(d.targetWidth,d.edgeExclusion),
        halfHeight:effectiveHalf(d.targetHeight,d.edgeExclusion),
        radius:effectiveHalf(d.diameter,d.edgeExclusion)
      };
    if(![scheduled.halfWidth,scheduled.halfHeight,scheduled.radius].every(Number.isFinite))return{nominal,scheduled:null};
    return{nominal,scheduled};
  }
  function tracePseudoSquare(ctx,X,Y,boundary){
    if(!boundary)return;
    ctx.beginPath();
    const n=320,eps=1e-12;
    for(let i=0;i<=n;i++){
      const t=2*Math.PI*i/n,
        ct=Math.cos(t),
        st=Math.sin(t),
        rx=Math.abs(ct)>eps?boundary.halfWidth/Math.abs(ct):Infinity,
        ry=Math.abs(st)>eps?boundary.halfHeight/Math.abs(st):Infinity,
        r=Math.min(boundary.radius,rx,ry),
        x=X(r*ct),
        y=Y(r*st);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();
  }
  function collectBeamSeries(records){
    const beamKeys=new Set();for(const rec of records)for(const k of Object.keys(rec))beamKeys.add(String(k));
    const beams={};
      for(const key of [...beamKeys].sort((a,b)=>Number(a)-Number(b))){
      const names=new Set();
      for(const rec of records)for(const n of Object.keys(rec[key]||{}))names.add(n);
      const channels={};
      for(const name of names)channels[name]=records.map(rec=>Number.isFinite(rec[key]?.[name])?rec[key][name]:NaN);
      beams[key]={key:Number.isFinite(Number(key))?Number(key):key,channels}}
    return beams;
  }
  function parseIteration(iter,index){
    const data=X.direct(iter,'Data'),
    items=data?X.children(data).filter(e=>X.lname(e)==='DataItem'):[],
    records=items.map(di=>{
      const rec={},
      bd=X.direct(di,'BeamData');for(const b of X.children(bd)){
        const key=b.getAttribute('Key')??String(Object.keys(rec).length);rec[key]=numericAttrs(b)}return rec});
    return{index,pointCount:records.length,beams:collectBeamSeries(records),temperatureC:X.num(iter,'ChuckTemperature',NaN),measurementVelocity:X.num(iter,'MeasurementVelocity',NaN)}}
  function parse(parsed){
    const m=parsed.measurement,
      c=X.common(parsed),
      pattern=X.direct(m,'Pattern'),
      patternType=X.attrType(pattern),
      region=X.direct(pattern,'Region'),
      location=X.direct(region,'Location'),
      size=X.direct(region,'Size'),
      dim=X.direct(pattern,'Dimension'),
      pitch=X.direct(pattern,'Pitch'),
      regionX=X.num(region,'X',X.num(location,'X',NaN)),
      regionY=X.num(region,'Y',X.num(location,'Y',NaN)),
      width=X.num(region,'Width',X.num(size,'Width',NaN)),
      height=X.num(region,'Height',X.num(size,'Height',NaN)),
      nx=X.num(dim,'X',NaN),
      ny=X.num(dim,'Y',NaN),
      pitchX=X.num(pitch,'X',NaN),
      pitchY=X.num(pitch,'Y',NaN),
      target=X.direct(m,'Target'),
      targetSize=X.direct(target,'Size'),
      targetType=X.attrType(target),
      targetWidth=X.num(targetSize,'Width',NaN),
      targetHeight=X.num(targetSize,'Height',NaN),
      diameter=X.num(target,'Diameter',NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',0));

    const itd=X.direct(X.direct(m,'MeasurementData'),'IterationData'),
      iterations=itd?X.children(itd).filter(e=>X.lname(e)==='Iteration').map(parseIteration):[],
      lasers=parseLasers(m),
      flux=parseFlux(m),
      laserByKey={};
    for(const l of lasers)laserByKey[String(l.index)]={...l,photonFlux:flux[l.index]};

    const actual=iterations[0]?.pointCount??0;
    let expected=NaN,
      coords=[],
      coordinateSource='unavailable';

    if(patternType==='SquareRegionPattern'&&[nx,ny,regionX,regionY,width,height].every(Number.isFinite)){
      expected=nx*ny;
      coords=GEO.rectGrid(regionX,regionY,width,height,nx,ny,actual,1);
      if(coords.length)coordinateSource='SquareRegionPattern Region + Dimension';
    }else if(patternType==='MapPattern'&&targetType==='PseudoSquareCell'){
      const halfWidth=effectiveHalf(targetWidth,edgeExclusion),
        halfHeight=effectiveHalf(targetHeight,edgeExclusion),
        radius=effectiveHalf(diameter,edgeExclusion);
      if([halfWidth,halfHeight,radius,pitchX,pitchY].every(Number.isFinite)){
        const candidate=GEO.pseudoSquareGrid(halfWidth,halfHeight,radius,pitchX,pitchY);
        expected=candidate.length;
        coords=expected===actual?candidate:[];
        if(coords.length)coordinateSource='MapPattern + PseudoSquareCell';
      }
    }

    return{
      ...c,
      patternType,
      patternName:X.text(pattern,'Name',''),
      patternDisplayName:X.text(pattern,'DisplayName',''),
      regionX,
      regionY,
      width,
      height,
      nx,
      ny,
      pitchX,
      pitchY,
      expectedPointCount:expected,
      coords,
      coordinateSource,
      geometryStatus:coords.length?'reconstructed':'unavailable',
      targetType,
      targetWidth,
      targetHeight,
      diameter,
      edgeExclusion,
      doRastering:X.text(m,'DoRastering',''),
      currentUnit:X.text(m,'MicroAmps','µA'),
      lengthUnit:'mm',
      wavelengthUnit:X.text(m,'NanoMeter','nm'),
      lasers,
      laserByKey,
      flux,
      measureCurrent:X.text(m,'MeasureCurrent',''),
      measureDirect:X.text(m,'MeasureDirectReflectance',''),
      measureDiffuse:X.text(m,'MeasureScatteredReflectance',''),
      averaging:X.num(m,'Averaging',NaN),
      iterations,
      raw:parsed
    };
  }
  const rawReflectance=(direct,diffuse)=>Number.isFinite(direct)&&Number.isFinite(diffuse)?direct+diffuse:NaN;\n  const totalReflectance=(direct,diffuse)=>{const v=rawReflectance(direct,diffuse);return Number.isFinite(v)?Math.max(0,Math.min(100,v)):NaN};
  const eqePercent=(currentMicroA,photonFlux)=>Number.isFinite(currentMicroA)&&Number.isFinite(photonFlux)&&photonFlux>0?(currentMicroA*1e-6/Q_PV2000/photonFlux)*100:NaN;
  const iqePercent=(eqe,totalR)=>{if(!Number.isFinite(eqe)||!Number.isFinite(totalR)||totalR>=100)return NaN;const v=eqe/(1-totalR/100);return Number.isFinite(v)&&v<=100?v:NaN};
  function referenceFamily(raw,laser,d){
    const names=Object.keys(raw?.channels||{}),
      expected=['Current','DirectReflection','ScatteredReflection'],
      exactChannels=names.length===expected.length&&expected.every(n=>names.includes(n)),
      unit=/^[µμu]?a$/i.test(String(d.currentUnit||'µA').replace(/\s/g,'')),
      squareGeometry=d.patternType==='SquareRegionPattern'&&[d.nx,d.ny,d.regionX,d.regionY,d.width,d.height].every(Number.isFinite)&&d.nx>=1&&d.ny>=1,
      pseudoGeometry=d.patternType==='MapPattern'&&d.targetType==='PseudoSquareCell'&&[d.targetWidth,d.targetHeight,d.diameter,d.pitchX,d.pitchY,d.edgeExclusion].every(Number.isFinite)&&d.targetWidth>0&&d.targetHeight>0&&d.diameter>0&&d.pitchX>0&&d.pitchY>0,
      beamCount=d.beamCount??1,
      iterationCount=d.iterationCount??1,
      common=exactChannels&&unit&&Number.isFinite(laser?.photonFlux)&&laser.photonFlux>0&&iterationCount===1;
    if(common&&squareGeometry&&beamCount===1)return'LBIC-SINGLE-001';
    if(common&&pseudoGeometry&&beamCount>=2)return'LBIC-MULTI-002';
    return'';
  }
  function isReferenceProfile(raw,laser,d){return Boolean(referenceFamily(raw,laser,d))}
  const tierFor=concept=>['current','total','iqe'].includes(concept)?'primary':'advanced';
  function findMetric(metrics,concept){return Object.values(metrics).find(m=>m.concept===concept)||null}
  function deriveBeam(raw,laser,d){
    const family=referenceFamily(raw,laser,d),
      referenceProfile=Boolean(family),
      metrics={};
    for(const [name,values] of Object.entries(raw?.channels||{})){
      const concept=conceptFor(name);
      metrics[name]={key:name,label:labelFor(name),short:labelFor(name),unit:unitFor(name,d),values:values.slice(),source:'raw XML',status:'raw',concept,xmlName:name,tier:tierFor(concept)};
    }

    let total=findMetric(metrics,'total'),
      direct=findMetric(metrics,'direct'),
      diffuse=findMetric(metrics,'diffuse');
    if(!total&&direct&&diffuse){
      const key='__reflectivity',
        opticalValues=direct.values.map((v,i)=>rawReflectance(v,diffuse.values[i]));
      metrics[key]={
        key,
        label:'Reflectivity',
        short:'Reflectivity',
        unit:'%',
        values:opticalValues.map(v=>Number.isFinite(v)?Math.max(0,Math.min(100,v)):NaN),
        opticalValues,
        source:referenceProfile?'PV-2000 reproduced: clamp(DirectReflection + ScatteredReflection, 0..100)':'candidate: clamp(direct + scattered, 0..100)',
        status:referenceProfile?'validated':'inferred',
        concept:'total',
        tier:'primary'
      };
    }
    total=findMetric(metrics,'total');

    let eqe=findMetric(metrics,'eqe'),
      current=findMetric(metrics,'current');
    const flux=laser?.photonFlux;
    if(!eqe&&current&&Number.isFinite(flux)&&/^[µμu]?a$/i.test(String(d.currentUnit||'µA').replace(/\s/g,''))){
      const key='__eqe';
      metrics[key]={key,label:'EQE',short:'EQE',unit:'%',values:current.values.map(v=>eqePercent(v,flux)),source:referenceProfile?'intermediate constrained by IQE regression; q=1.602e-19 C':'candidate: current / (q × photon flux)',status:'inferred',concept:'eqe',tier:'advanced'};
    }

    eqe=findMetric(metrics,'eqe');
    let iqe=findMetric(metrics,'iqe');
    if(!iqe&&eqe&&total){
      const key='__iqe',
        opticalValues=Array.isArray(total.opticalValues)?total.opticalValues:total.values;
      metrics[key]={
        key,
        label:'IQE',
        short:'IQE',
        unit:'%',
        values:eqe.values.map((v,i)=>iqePercent(v,opticalValues[i])),
        source:referenceProfile?'PV-2000 reproduced: EQE / (1 - raw optical reflectivity); calculated IQE > 100% is blank':'candidate: EQE / (1 - reflectivity), >100% invalid',
        status:referenceProfile?'validated':'inferred',
        concept:'iqe',
        tier:'primary'
      };
    }
    return{key:raw?.key??laser?.index??0,laser:laser||{},metrics,referenceProfile,referenceFamily:family};
  }
  function analyze(d){
    return{iterations:d.iterations.map(it=>{
        const keys=new Set([...Object.keys(it.beams),...Object.keys(d.laserByKey)]),
        beams={},
        profileContext={...d,beamCount:keys.size,iterationCount:d.iterations.length};for(const key of [...keys].sort((a,b)=>Number(a)-Number(b)))beams[key]=deriveBeam(it.beams[key]||{key:Number(key),channels:{}},
        d.laserByKey[key]||{index:Number(key),photonFlux:d.flux[key]},
        profileContext);return{...it,beams}})}}
  function qtile(a,p){const z=(a||[]).filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!z.length)return NaN;const q=(z.length-1)*p,i=Math.floor(q),f=q-i;return z[i]+(z[Math.min(i+1,z.length-1)]-z[i])*f}
  function range(values,mode='full'){const z=values.filter(Number.isFinite);if(!z.length)return{lo:NaN,hi:NaN};return mode==='p1p99'?{lo:qtile(z,.01),hi:qtile(z,.99)}:{lo:Math.min(...z),hi:Math.max(...z)}}
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
  function color(t){t=Math.max(0,Math.min(1,t));
    const stops=[[0,[49,54,149]],[.25,[39,127,142]],[.5,[63,175,109]],[.75,[218,200,50]],[1,[220,55,55]]];
    let i=0;
    while(i<stops.length-2&&t>stops[i+1][0])i++;
    const[a,c1]=stops[i],
    [b,c2]=stops[i+1],
    u=(t-a)/(b-a);
    return`rgb(${c1.map((v,j)=>Math.round(v+(c2[j]-v)*u)).join(',')})`}
  const setupTooltip=canvas=>PV.ui.setupTooltip(canvas);
  const showTip=(tip,event,html)=>PV.ui.showTooltip(tip,event,html);
  const hideTip=tip=>PV.ui.hideTooltip(tip);
  function drawMap(canvas,d,metric,selected,scaleMode,onSelect,zoom,onZoom){
    const ctx=canvas.getContext('2d'),
      W=canvas.width=760,
      H=canvas.height=430,
      p={l:64,r:82,t:28,b:52},
      coords=d.coords,
      vals=metric.values,
      rg=range(vals,scaleMode);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);
    if(!coords.length||!Number.isFinite(rg.lo)){
      ctx.fillStyle=css('--muted');
      ctx.textAlign='center';
      ctx.fillText('Raster coordinates unavailable: XML point count does not match the reconstructed geometry schedule.',W/2,H/2);
      return rg;
    }

    const b=GEO.bounds(coords),
      dx=Number.isFinite(d.pitchX)&&d.pitchX>0?d.pitchX:(Number.isFinite(d.nx)&&d.nx>1?d.width/(d.nx-1):1),
      dy=Number.isFinite(d.pitchY)&&d.pitchY>0?d.pitchY:(Number.isFinite(d.ny)&&d.ny>1?d.height/(d.ny-1):1),
      pseudo=pseudoSquareTarget(d),
      squareRegion=d.patternType==='SquareRegionPattern'&&[d.regionX,d.regionY,d.width,d.height].every(Number.isFinite),
      rawX=pseudo?[-pseudo.nominal.halfWidth*1.06,pseudo.nominal.halfWidth*1.06]:squareRegion?[d.regionX,d.regionX+d.width]:[b.xmin-dx/2,b.xmax+dx/2],
      rawY=pseudo?[-pseudo.nominal.halfHeight*1.06,pseudo.nominal.halfHeight*1.06]:squareRegion?[d.regionY,d.regionY+d.height]:[b.ymin-dy/2,b.ymax+dy/2],
      availW=W-p.l-p.r,
      availH=H-p.t-p.b,
      aspect=PV.plot.equalAspectRanges(rawX,rawY,availW,availH),
      autoX=aspect.x,
      autoY=aspect.y,
      xr=PV.plot.resolve(autoX,zoom?.x),
      yr=PV.plot.resolve(autoY,zoom?.y),
      plotW=availW,
      plotH=availH,
      x0=p.l,
      y0=p.t,
      X=x=>x0+(x-xr[0])/(xr[1]-xr[0]||1)*plotW,
      Y=y=>y0+(y-yr[0])/(yr[1]-yr[0]||1)*plotH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0,y0,plotW,plotH);
    ctx.clip();
    if(pseudo?.scheduled){
      tracePseudoSquare(ctx,X,Y,pseudo.scheduled);
      ctx.clip();
    }
    for(let i=0;i<vals.length&&i<coords.length;i++){
      const v=vals[i],
        pt=coords[i];
      if(!Number.isFinite(v)||!pt)continue;
      const xa=X(pt.x-dx/2),
        xb=X(pt.x+dx/2),
        ya=Y(pt.y-dy/2),
        yb=Y(pt.y+dy/2);
      ctx.fillStyle=color((v-rg.lo)/(rg.hi-rg.lo||1));
      ctx.fillRect(Math.min(xa,xb),Math.min(ya,yb),Math.abs(xb-xa)+.5,Math.abs(yb-ya)+.5);
    }
    if(selected&&selected.index<coords.length){
      const pt=coords[selected.index],
        xa=X(pt.x-dx/2),
        xb=X(pt.x+dx/2),
        ya=Y(pt.y-dy/2),
        yb=Y(pt.y+dy/2);
      ctx.strokeStyle=css('--yellow');
      ctx.lineWidth=1.5;
      ctx.strokeRect(Math.min(xa,xb)+.5,Math.min(ya,yb)+.5,Math.max(2,Math.abs(xb-xa)-1),Math.max(2,Math.abs(yb-ya)-1));
    }
    ctx.restore();

    ctx.font='10px system-ui';
    ctx.strokeStyle=css('--grid2');
    ctx.fillStyle=css('--muted');
    for(const v of niceTicks(xr[0],xr[1],5)){
      const x=X(v);
      ctx.beginPath();
      ctx.moveTo(x,y0);
      ctx.lineTo(x,y0+plotH);
      ctx.stroke();
      ctx.textAlign='center';
      ctx.fillText(axisFmt(v),x,H-22);
    }
    ctx.strokeStyle=css('--grid');
    for(const v of niceTicks(yr[0],yr[1],5)){
      const y=Y(v);
      ctx.beginPath();
      ctx.moveTo(x0,y);
      ctx.lineTo(x0+plotW,y);
      ctx.stroke();
      ctx.textAlign='right';
      ctx.fillText(axisFmt(v),p.l-8,y+3);
    }
    ctx.strokeStyle=css('--soft');
    ctx.strokeRect(x0,y0,plotW,plotH);
    ctx.fillStyle=css('--muted');
    ctx.textAlign='center';
    ctx.fillText('X [mm]',x0+plotW/2,H-5);
    ctx.save();
    ctx.translate(14,y0+plotH/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign='center';
    ctx.fillText('Y [mm]',0,0);
    ctx.restore();

    if(pseudo){
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0,y0,plotW,plotH);
      ctx.clip();
      ctx.strokeStyle=css('--soft');
      ctx.lineWidth=1.7;
      ctx.setLineDash([]);
      tracePseudoSquare(ctx,X,Y,pseudo.nominal);
      ctx.stroke();
      if(d.edgeExclusion>0&&pseudo.scheduled){
        ctx.strokeStyle=css('--muted');
        ctx.lineWidth=1.1;
        ctx.setLineDash([6,4]);
        tracePseudoSquare(ctx,X,Y,pseudo.scheduled);
        ctx.stroke();
      }
      ctx.restore();
    }

    const cbx=W-48,
      cby=y0+8,
      cbh=Math.max(40,plotH-16),
      cbw=12,
      grad=ctx.createLinearGradient(0,cby+cbh,0,cby);
    for(let j=0;j<=10;j++)grad.addColorStop(j/10,color(j/10));
    ctx.fillStyle=grad;
    ctx.fillRect(cbx,cby,cbw,cbh);
    ctx.strokeStyle=css('--soft');
    ctx.strokeRect(cbx,cby,cbw,cbh);
    ctx.fillStyle=css('--muted');
    ctx.textAlign='left';
    ctx.fillText(fmt(rg.hi,3),cbx+17,cby+4);
    ctx.fillText(fmt(rg.lo,3),cbx+17,cby+cbh);
    ctx.save();
    ctx.translate(W-8,y0+plotH/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign='center';
    ctx.fillText(`${metric.short} [${metric.unit||'a.u.'}]`,0,0);
    ctx.restore();

    const tip=setupTooltip(canvas);
    canvas.onmouseleave=()=>hideTip(tip);
    canvas.onmousemove=e=>{
      const r=canvas.getBoundingClientRect(),
        mx=(e.clientX-r.left)*W/r.width,
        my=(e.clientY-r.top)*H/r.height;
      if(mx<x0||mx>x0+plotW||my<y0||my>y0+plotH){
        hideTip(tip);
        return;
      }
      const x=xr[0]+(mx-x0)/plotW*(xr[1]-xr[0]),
        y=yr[0]+(my-y0)/plotH*(yr[1]-yr[0]);
      let best=-1,
        bd=Infinity;
      for(let i=0;i<coords.length;i++){
        const pt=coords[i];
        if(!pt)continue;
        const dd=(pt.x-x)**2+(pt.y-y)**2;
        if(dd<bd){bd=dd;best=i}
      }
      if(best<0){hideTip(tip);return}
      const pt=coords[best],
        v=vals[best],
        rc=Number.isFinite(pt.row)&&Number.isFinite(pt.col)?`<b>Row ${pt.row+1}, Col ${pt.col+1}</b><br>`:`<b>Point ${best+1}</b><br>`;
      showTip(tip,e,`${rc}X ${fmt(pt.x,3)} mm · Y ${fmt(pt.y,3)} mm<br>${esc(metric.short)} = ${fmt(v,4)} ${esc(metric.unit)}`);
    };
    canvas.onclick=e=>{
      const r=canvas.getBoundingClientRect(),
        mx=(e.clientX-r.left)*W/r.width,
        my=(e.clientY-r.top)*H/r.height;
      if(mx<x0||mx>x0+plotW||my<y0||my>y0+plotH)return;
      const x=xr[0]+(mx-x0)/plotW*(xr[1]-xr[0]),
        y=yr[0]+(my-y0)/plotH*(yr[1]-yr[0]);
      let best=-1,
        bd=Infinity;
      coords.forEach((pt,i)=>{
        if(!pt)return;
        const dd=(pt.x-x)**2+(pt.y-y)**2;
        if(dd<bd){bd=dd;best=i}
      });
      if(best>=0)onSelect?.(best);
    };
    PV.plot.bind(canvas,{W,H,plotRect:{x0,x1:x0+plotW,y0,y1:y0+plotH},ranges:{x:xr,y:yr},yDown:true,onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});
    return rg;
  }
  function drawHist(canvas,metric,binCount=30,swapped=true,zoom,onZoom){
    const ctx=canvas.getContext('2d'),bins=S.histogram(metric.values,binCount),W=canvas.width=760,H=canvas.height=430,p={l:64,r:18,t:24,b:52};
    ctx.clearRect(0,0,W,H);ctx.fillStyle=css('--chart-bg');ctx.fillRect(0,0,W,H);if(!bins.length)return bins;
    const autoMetric=[bins[0].lo,bins[bins.length-1].hi],
      autoCount=[0,Math.max(...bins.map(b=>b.count),1)],
      mr=PV.plot.resolve(autoMetric,swapped?zoom?.y:zoom?.x),
      cr=PV.plot.resolve(autoCount,swapped?zoom?.x:zoom?.y),
      xr=swapped?cr:mr,
      yr=swapped?mr:cr,
      plotW=W-p.l-p.r,
      plotH=H-p.t-p.b;
      
    const xPos=v=>p.l+(v-xr[0])/(xr[1]-xr[0]||1)*plotW,yPos=v=>H-p.b-(v-yr[0])/(yr[1]-yr[0]||1)*plotH,metricPos=v=>(v-mr[0])/(mr[1]-mr[0]||1),countPos=v=>(v-cr[0])/(cr[1]-cr[0]||1);
    ctx.font='10px system-ui';ctx.strokeStyle=css('--grid2');ctx.fillStyle=css('--muted');
    for(const v of niceTicks(xr[0],xr[1],5)){const x=xPos(v);ctx.beginPath();ctx.moveTo(x,p.t);ctx.lineTo(x,H-p.b);ctx.stroke();ctx.textAlign='center';ctx.fillText(axisFmt(v),x,H-20)}
    ctx.strokeStyle=css('--grid');for(const v of niceTicks(yr[0],yr[1],5)){const y=yPos(v);ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(W-p.r,y);ctx.stroke();ctx.textAlign='right';ctx.fillText(axisFmt(v),p.l-7,y+3)}
    ctx.save();ctx.beginPath();ctx.rect(p.l,p.t,plotW,plotH);ctx.clip();
    bins.forEach(b=>{
      const mid=(b.lo+b.hi)/2,
      t=(mid-autoMetric[0])/(autoMetric[1]-autoMetric[0]||1);ctx.fillStyle=color(t);if(swapped){
        const y1=H-p.b-metricPos(b.lo)*plotH,
        y2=H-p.b-metricPos(b.hi)*plotH,
        x0=p.l+countPos(0)*plotW,
        x1=p.l+countPos(b.count)*plotW;ctx.fillRect(Math.min(x0,x1),Math.min(y1,y2),Math.abs(x1-x0),Math.max(1,Math.abs(y2-y1)-1))}else{
        const x1=p.l+metricPos(b.lo)*plotW,
        x2=p.l+metricPos(b.hi)*plotW,
        y0=H-p.b-countPos(0)*plotH,
        y1=H-p.b-countPos(b.count)*plotH;ctx.fillRect(Math.min(x1,x2),Math.min(y0,y1),Math.max(1,Math.abs(x2-x1)-1),Math.abs(y1-y0))}});
      
    ctx.restore();
      ctx.strokeStyle=css('--soft');
      ctx.strokeRect(p.l,p.t,plotW,plotH);
      ctx.fillStyle=css('--muted');
      ctx.textAlign='center';
      ctx.fillText(swapped?'Count':`${metric.short} [${metric.unit||'a.u.'}]`,(p.l+W-p.r)/2,H-4);
      ctx.save();
      ctx.translate(13,(p.t+H-p.b)/2);
      ctx.rotate(-Math.PI/2);
      ctx.fillText(swapped?`${metric.short} [${metric.unit||'a.u.'}]`:'Count',0,0);
      ctx.restore();
      
    PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});return bins;
  }
  function profilePoints(d,metric,selectedIndex,axis){
    const anchor=d.coords[selectedIndex];
    if(!anchor)return[];
    const fixed=axis==='x'?'y':'x',
      varying=axis==='x'?'x':'y',
      pitch=axis==='x'?d.pitchY:d.pitchX,
      tol=Number.isFinite(pitch)&&pitch>0?Math.max(1e-9,pitch*1e-6):1e-9;
    return d.coords.map((pt,i)=>({i,pos:pt?.[varying],fixed:pt?.[fixed],v:metric.values[i]}))
      .filter(p=>Number.isFinite(p.v)&&Number.isFinite(p.pos)&&Number.isFinite(p.fixed)&&Math.abs(p.fixed-anchor[fixed])<=tol)
      .sort((a,b)=>a.pos-b.pos);
  }
  function drawProfile(canvas,d,metric,selected,axis,zoom,onZoom){
    const ctx=canvas.getContext('2d'),
      W=canvas.width=760,
      H=canvas.height=220,
      p={l:64,r:18,t:18,b:44},
      valid=profilePoints(d,metric,selected.index,axis);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);
    if(!valid.length)return[];

    const autoX=[Math.min(...valid.map(pt=>pt.pos)),Math.max(...valid.map(pt=>pt.pos))],
      autoY=[Math.min(...valid.map(pt=>pt.v)),Math.max(...valid.map(pt=>pt.v))],
      xr=PV.plot.resolve(autoX,zoom?.x),
      yr=PV.plot.resolve(autoY,zoom?.y),
      X=v=>p.l+(v-xr[0])/(xr[1]-xr[0]||1)*(W-p.l-p.r),
      Y=v=>H-p.b-(v-yr[0])/(yr[1]-yr[0]||1)*(H-p.t-p.b);

    ctx.font='10px system-ui';
    ctx.strokeStyle=css('--grid2');
    ctx.fillStyle=css('--muted');
    for(const v of niceTicks(xr[0],xr[1],5)){
      const x=X(v);
      ctx.beginPath();
      ctx.moveTo(x,p.t);
      ctx.lineTo(x,H-p.b);
      ctx.stroke();
      ctx.textAlign='center';
      ctx.fillText(axisFmt(v),x,H-19);
    }
    ctx.strokeStyle=css('--grid');
    for(const v of niceTicks(yr[0],yr[1],5)){
      const y=Y(v);
      ctx.beginPath();
      ctx.moveTo(p.l,y);
      ctx.lineTo(W-p.r,y);
      ctx.stroke();
      ctx.textAlign='right';
      ctx.fillText(axisFmt(v),p.l-7,y+3);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.clip();
    ctx.strokeStyle=css('--blue');
    ctx.lineWidth=1.5;
    ctx.beginPath();
    let pen=false;
    valid.forEach(pt=>{
      const x=X(pt.pos),
        y=Y(pt.v);
      if(x<p.l||x>W-p.r||y<p.t||y>H-p.b){pen=false;return}
      pen?ctx.lineTo(x,y):ctx.moveTo(x,y);
      pen=true;
    });
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle=css('--soft');
    ctx.strokeRect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.fillStyle=css('--muted');
    ctx.textAlign='center';
    ctx.fillText(`${axis.toUpperCase()} [mm]`,(p.l+W-p.r)/2,H-4);
    ctx.save();
    ctx.translate(13,(p.t+H-p.b)/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(`${metric.short} [${metric.unit||'a.u.'}]`,0,0);
    ctx.restore();

    PV.plot.bind(canvas,{W,H,plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},ranges:{x:xr,y:yr},onChange:n=>onZoom?.(n),onReset:()=>onZoom?.({x:null,y:null})});
    return valid;
  }
  function render(host,d,a){
    let iterationIndex=0,
      beamKey='',
      metricKey='',
      scaleMode='full',
      showAdvanced=false,
      histSwapped=true,
      histBins=30,
      selected={index:Math.floor((d.coords.length||1)/2)},
      zoom={map:{x:null,y:null},hist:{x:null,y:null},xProfile:{x:null,y:null},yProfile:{x:null,y:null}};
      
    const visibleMetrics=metrics=>Object.values(metrics).filter(m=>showAdvanced||m.tier==='primary');
    function current(){
      const it=a.iterations[iterationIndex]||a.iterations[0],
      keys=Object.keys(it?.beams||{});
      if(!beamKey||!it?.beams?.[beamKey])beamKey=keys[0]||'';
      const beam=it?.beams?.[beamKey],
      metrics=beam?.metrics||{},
      mkeys=visibleMetrics(metrics).map(m=>m.key);
      if(!metricKey||!metrics[metricKey]||(!showAdvanced&&metrics[metricKey].tier!=='primary'))metricKey=mkeys.find(k=>metrics[k].concept==='current')||mkeys[0]||'';
      return{it,beam,metrics,metric:metrics[metricKey]}}
    function metricOptions(metrics){return visibleMetrics(metrics).map(m=>`<option value="${esc(m.key)}">${esc(m.label)}${m.status==='inferred'?' · inferred':''}</option>`).join('')}
    function beamOptions(it){return Object.entries(it?.beams||{}).map(([k,b])=>{const wl=b.laser?.wavelengthNm;return`<option value="${esc(k)}">${Number.isFinite(wl)?`${fmt(wl,0)} nm`:`Beam ${esc(k)}`}</option>`}).join('')}
    function summaryRows(metrics){
      return visibleMetrics(metrics).map(m=>{
        const st=S.summary(m.values);return`<tr title="${esc(m.source)}"><td>${esc(m.short)}${m.status==='inferred'?' *':''}</td><td>${fmt(st.mean)}</td><td>${fmt(st.median)}</td><td>${fmt(st.stdev)}</td><td>${fmt(st.min)}</td><td>${fmt(st.max)}</td></tr>`}).join('')}
    function metaRow(k,v,h=''){return`<dt>${esc(k)}${h?` ${help(h)}`:''}</dt><dd>${esc(v||'—')}</dd>`}
    function renderShell(){const {it,beam,metrics,metric}=current(),
      pointOk=it&&d.coords.length===it.pointCount&&(!Number.isFinite(d.expectedPointCount)||it.pointCount===d.expectedPointCount),
      laser=beam?.laser||{},
      pseudo=d.patternType==='MapPattern'&&d.targetType==='PseudoSquareCell',
      patternText=pseudo?`${d.patternDisplayName||d.patternType} · PseudoSquareCell`:`${d.patternDisplayName||d.patternType} · ${fmt(d.nx,0)} × ${fmt(d.ny,0)}`,
      regionText=pseudo?`${fmt(d.targetWidth)} × ${fmt(d.targetHeight)} mm · Ø${fmt(d.diameter)} mm · edge ${fmt(d.edgeExclusion)} mm`:`${fmt(d.width)} × ${fmt(d.height)} mm @ (${fmt(d.regionX)}, ${fmt(d.regionY)})`,
      stepText=pseudo?`${fmt(d.pitchX,4)} × ${fmt(d.pitchY,4)} mm`:`${d.nx>1?fmt(d.width/(d.nx-1),4):'—'} × ${d.ny>1?fmt(d.height/(d.ny-1),4):'—'} mm`;
      host.innerHTML=`<div class="module-grid lbic-module"><aside class="side">
      <section class="panel"><h3>Measurement ${help('LBIC metadata and raw channels are read from the imported XML. Pattern/Name is display metadata only; raster geometry uses structured Region/Dimension or validated MapPattern target geometry.')}</h3><dl class="meta">${metaRow('Result',d.resultName)}${metaRow('Recipe',d.name)}${metaRow('Substrate',d.substrateId)}${metaRow('Status',d.status)}${metaRow('Pattern',patternText)}${metaRow(pseudo?'Target':'Region',regionText)}${metaRow(pseudo?'Pitch':'Step',stepText)}${metaRow('Points',`${it?.pointCount||0} / ${d.expectedPointCount||'—'}`,pointOk?'Point count matches the reconstructed geometry schedule.':'A mismatch disables coordinate-based maps.')}${metaRow('Laser',Number.isFinite(laser.wavelengthNm)?`${fmt(laser.wavelengthNm,0)} nm · power ${fmt(laser.power)}`:`Beam ${beamKey}`)}${metaRow('Photon flux',Number.isFinite(laser.photonFlux)?fmt(laser.photonFlux,5):'—','FluxCache is associated by beam/laser index and is used for EQE/IQE calculation when present.')}${metaRow('Reference parity',beam?.referenceFamily?`validated · ${beam.referenceFamily}`:'unvalidated combination','Validated LBIC families are documented in REFERENCE_PROFILES.md. Numeric parameters may vary inside an established semantic path; new pattern/channel/result semantics still require paired vendor regression.')}</dl></section>
      <section class="panel"><h3>View ${help('Default quantities mirror the validated PV-2000 exports: Current, Reflectivity and IQE. Advanced adds raw Direct/Scattered reflectance, intermediate EQE and unknown numeric XML channels. Raw XML values always take priority. Numeric wavelength/power/flux/geometry changes stay within the validated family when the same measurement/result path is used. New beam/channel/pattern/result combinations require paired XML + PV-2000 regression.')}</h3><div class="setting-row"><label>Iteration<select id="lIter">${a.iterations.map((_,i)=>`<option value="${i}">Iteration ${i+1}</option>`).join('')}</select></label><label>Wavelength / beam<select id="lBeam">${beamOptions(it)}</select></label><label>Quantity<select id="lMetric">${metricOptions(metrics)}</select></label><label>Color scale<select id="lScale"><option value="full">Full range</option><option value="p1p99">1–99% display clip</option></select></label><label><input id="lAdvanced" type="checkbox" ${showAdvanced?'checked':''}> Advanced raw / intermediate channels</label></div></section>
      <section class="panel"><h3>Results summary</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>${summaryRows(metrics)}</tbody></table></div></section>
      <section class="panel"><h3>Selected pixel</h3><div id="lPixel"></div></section>
      <section class="panel"><h3>Channel provenance</h3><div class="table-wrap"><table><thead><tr><th>Quantity</th><th>Source</th><th>Status</th></tr></thead><tbody>${Object.values(metrics).map(m=>`<tr><td>${esc(m.short)}</td><td>${esc(m.source)}</td><td>${esc(m.status)}</td></tr>`).join('')}</tbody></table></div></section>
      <details class="panel"><summary>Geometry / validation ${help('Coordinate validation is profile-specific and documented against matching PV-2000 exports. The on-screen map uses reconstructed physical X/Y coordinates.')}</summary><dl class="meta meta-detail">${metaRow('Geometry status',beam?.referenceProfile?'validated algorithm family':'inferred for this combination')}${metaRow('Coordinate source',d.coordinateSource)}${metaRow('Acquisition mapping','X-fast, ascending Y where validated')}${metaRow('Pattern Name',d.patternName||'—','The examples contain stale Pattern/Name text, so it is never used for coordinate reconstruction.')}${metaRow('Rastering',d.doRastering)}${metaRow('Measure current',d.measureCurrent)}${metaRow('Direct reflectance',d.measureDirect)}${metaRow('Diffuse reflectance',d.measureDiffuse)}${metaRow('Averaging',fmt(d.averaging))}</dl></details>
      </aside><section class="lbic-workspace">
        <div class="panel chart"><header><b>LBIC raster map</b>${help('Mouse wheel zooms both spatial axes inside the plot; hover the X or Y axis and wheel to zoom only that direction; double-click restores auto scale. Axes opens manual numeric X/Y limits.') }<span class="grow"></span>${PV.plot.axisControls('lMapAxes')}<button id="lExportMap">Export map</button><button id="lExportAll">Export all</button></header><div class="canvas-wrap"><canvas id="lMap"></canvas></div></div>
        <div class="panel chart"><header><b>Distribution</b>${help('Count is the default X axis. Open Axes for manual X/Y limits, Swap axes, and Bins; fewer bins make wider bars and more bins make narrower bars. Mouse wheel zoom and double-click Auto remain available.') }<span class="grow"></span>${PV.plot.axisControls('lHistAxes',{distribution:true,swapped:histSwapped})}${PV.plot.binControls('lHistBins',histBins)}<button id="lExportHist">Export</button></header><div class="canvas-wrap"><canvas id="lHist"></canvas></div></div>
        <div class="panel chart lbic-profiles-panel"><header><b>X / Y line profiles</b>${help('Each profile supports wheel zoom. Wheel inside a plot zooms both axes; hover one axis to zoom only that axis; double-click restores auto scale. Axes opens a floating manual X/Y range editor.') }<span class="grow"></span>${PV.plot.axisControls('lXProfileAxes',{label:'X axes'})}${PV.plot.axisControls('lYProfileAxes',{label:'Y axes'})}<button id="lExportProfile">Export</button></header><div class="lbic-profile-columns"><div class="profile-pane"><div class="mini-title">X profile through selected row</div><div class="canvas-wrap compact"><canvas id="lXProfile"></canvas></div></div><div class="profile-pane"><div class="mini-title">Y profile through selected column</div><div class="canvas-wrap compact"><canvas id="lYProfile"></canvas></div></div></div></div>
      </section></div>`;
      host.querySelector('#lIter').value=String(iterationIndex);host.querySelector('#lBeam').value=beamKey;host.querySelector('#lMetric').value=metricKey;host.querySelector('#lScale').value=scaleMode;
      host.querySelector('#lIter').onchange=e=>{iterationIndex=Number(e.target.value)||0;
        beamKey='';
        metricKey='';
        renderShell()};
        host.querySelector('#lBeam').onchange=e=>{beamKey=e.target.value;
        metricKey='';
        renderShell()};
        host.querySelector('#lMetric').onchange=e=>{metricKey=e.target.value;
        zoom.hist={x:null,y:null};
        zoom.xProfile={x:null,y:null};
        zoom.yProfile={x:null,y:null};
        redraw()};
        host.querySelector('#lScale').onchange=e=>{scaleMode=e.target.value;
        redraw()};
        host.querySelector('#lAdvanced').onchange=e=>{showAdvanced=e.target.checked;
        metricKey='';
        zoom={map:{x:null,y:null},hist:{x:null,y:null},xProfile:{x:null,y:null},yProfile:{x:null,y:null}};
        renderShell()};
        redraw();
        
    }
    function redraw(){
      const {it,beam,metrics,metric}=current();
      if(!metric)return;
      selected.index=Math.max(0,Math.min(selected.index,metric.values.length-1));
      const rg=drawMap(host.querySelector('#lMap'),d,metric,selected,scaleMode,i=>{selected.index=i;redraw()},zoom.map,n=>{zoom.map=n;redraw()});
      const bins=drawHist(host.querySelector('#lHist'),metric,histBins,histSwapped,zoom.hist,n=>{zoom.hist=n;redraw()}),
      xp=drawProfile(host.querySelector('#lXProfile'),d,metric,selected,'x',zoom.xProfile,n=>{zoom.xProfile=n;redraw()}),
      yp=drawProfile(host.querySelector('#lYProfile'),d,metric,selected,'y',zoom.yProfile,n=>{zoom.yProfile=n;redraw()});
      PV.plot.bindAxisControls(host,'lMapAxes',zoom.map,n=>{zoom.map=n;redraw()});
      PV.plot.bindAxisControls(host,'lHistAxes',zoom.hist,n=>{zoom.hist=n;redraw()},{
        swapped:histSwapped,
        onSwap:()=>{histSwapped=!histSwapped;zoom.hist={x:null,y:null};redraw()}
      });
      PV.plot.bindBinControls(host,'lHistBins',histBins,n=>{histBins=n;zoom.hist={x:null,y:null};redraw()});
      PV.plot.bindAxisControls(host,'lXProfileAxes',zoom.xProfile,n=>{zoom.xProfile=n;redraw()});
      PV.plot.bindAxisControls(host,'lYProfileAxes',zoom.yProfile,n=>{zoom.yProfile=n;redraw()});
      const pt=d.coords[selected.index]||{},
      row=Number.isFinite(pt.row)?pt.row:Math.floor(selected.index/(d.nx||1)),
      col=Number.isFinite(pt.col)?pt.col:selected.index%(d.nx||1);
      host.querySelector('#lPixel').innerHTML=`<dl class="meta"><dt>Index</dt><dd>${selected.index+1}</dd><dt>Row / column</dt><dd>${Number.isFinite(row)&&Number.isFinite(col)?`${row+1} / ${col+1}`:'—'}</dd><dt>X / Y</dt><dd>${fmt(pt.x,4)} / ${fmt(pt.y,4)} mm</dd>${visibleMetrics(metrics).map(m=>`<dt>${esc(m.short)}${m.status==='inferred'?' *':''}</dt><dd>${fmt(m.values[selected.index],5)} ${esc(m.unit)}</dd>`).join('')}</dl>`;
      
      host.querySelector('#lExportMap').onclick=()=>PV.exporter.csv(`${safe(d.resultName)}_${beamKey}_${safe(metric.short)}.csv`,['Index','Row','Column','X [mm]','Y [mm]',`${metric.label} [${metric.unit}]`, 'Source'],metric.values.map((v,i)=>[i+1,d.coords[i]?.row!=null?d.coords[i].row+1:'',d.coords[i]?.col!=null?d.coords[i].col+1:'',d.coords[i]?.x??'',d.coords[i]?.y??'',v,metric.source]));
        
      host.querySelector('#lExportHist').onclick=()=>PV.exporter.csv(`${safe(d.resultName)}_${beamKey}_${safe(metric.short)}_histogram.csv`,[`Bin low [${metric.unit}]`,`Bin high [${metric.unit}]`,'Count'],bins.map(b=>[b.lo,b.hi,b.count]));
        
      host.querySelector('#lExportProfile').onclick=()=>PV.exporter.csv(`${safe(d.resultName)}_${beamKey}_${safe(metric.short)}_profiles.csv`,['Axis','Index','Position [mm]',`${metric.label} [${metric.unit}]`],[...xp.map(p=>['X',p.i+1,p.pos,p.v]),...yp.map(p=>['Y',p.i+1,p.pos,p.v])]);
        
      host.querySelector('#lExportAll').onclick=()=>{
        const beamEntries=Object.entries(it.beams),
        headers=['Index','Row','Column','X [mm]','Y [mm]'],
        series=[];
        for(const [bk,b] of beamEntries)for(const m of Object.values(b.metrics)){
          const wl=Number.isFinite(b.laser?.wavelengthNm)?`${b.laser.wavelengthNm}nm`:`beam${bk}`;
          headers.push(`${wl} ${m.label}${m.unit?` [${m.unit}]`:''} (${m.status})`);
          series.push(m.values)}const n=it.pointCount,
        rows=Array.from({length:n},(_,i)=>[i+1,d.coords[i]?.row!=null?d.coords[i].row+1:'',d.coords[i]?.col!=null?d.coords[i].col+1:'',d.coords[i]?.x??'',d.coords[i]?.y??'',...series.map(v=>v[i])]);
        PV.exporter.csv(`${safe(d.resultName)}_LBIC_all.csv`,headers,rows)};
        
    }
    document.addEventListener('pv-theme-change',()=>{if(host.isConnected)redraw()});renderShell();
  }
  PV.modules=PV.modules||{};
    PV.modules.lbic={types:['LBICMeasurement'],parse,analyze,render,conceptFor,rawReflectance,totalReflectance,eqePercent,iqePercent,deriveBeam,referenceFamily,isReferenceProfile,profilePoints,range,Q_PV2000};
    PV.registry.register(PV.modules.lbic);
    
})(typeof window!=='undefined'?window:globalThis);
