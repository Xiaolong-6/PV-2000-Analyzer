(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,GEO=PV.geometry,Q=PV.quantity,Sel=PV.selection,M=PV.measurement,Profiles=PV.profiles;
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

  function reconstructVcpdSite(readings){
    const mean=S.mean(readings);
    return{dark:mean,light:NaN,vsb:NaN,darkMean:mean,lightMean:NaN};
  }

  function effectiveHalf(size,edge){
    const half=size/2;
    if(!Number.isFinite(half)||!(half>0))return NaN;
    edge=Number.isFinite(edge)?edge:0;
    return edge>=0&&edge<half?half-edge:NaN;
  }

  function targetGeometry(d){
    const resolved=d?.resolvedGeometry;
    if(resolved?.shape==='circle'&&resolved.nominal)return{shape:'circle',nominal:resolved.nominal,scheduled:resolved.scheduled};
    if(resolved?.shape==='rect'&&resolved.nominal)return{shape:'rect',nominal:resolved.nominal,scheduled:resolved.scheduled};
    if(resolved?.shape==='pseudo-square'&&resolved.nominal)return{shape:'pseudo-square',nominal:resolved.nominal,scheduled:resolved.scheduled};
    if(d.targetType==='RoundWafer'&&Number.isFinite(d.diameter)&&d.diameter>0){
      const radius=d.diameter/2,
        scheduledRadius=effectiveHalf(d.diameter,d.edgeExclusion);
      return{
        shape:'circle',
        nominal:{radius},
        scheduled:Number.isFinite(scheduledRadius)?{radius:scheduledRadius}:null
      };
    }
    if(d.targetType==='SquareCell'&&Number.isFinite(d.targetWidth)&&Number.isFinite(d.targetHeight)&&d.targetWidth>0&&d.targetHeight>0){
      const halfWidth=d.targetWidth/2,
        halfHeight=d.targetHeight/2,
        scheduledHalfWidth=effectiveHalf(d.targetWidth,d.edgeExclusion),
        scheduledHalfHeight=effectiveHalf(d.targetHeight,d.edgeExclusion);
      return{
        shape:'rect',
        nominal:{halfWidth,halfHeight},
        scheduled:Number.isFinite(scheduledHalfWidth)&&Number.isFinite(scheduledHalfHeight)
          ?{halfWidth:scheduledHalfWidth,halfHeight:scheduledHalfHeight}
          :null
      };
    }
    return null;
  }

  function attachDomain(d){
    const familyId=d.measurementKind==='vcpd'?'vcpd':'isc',
      calculationProfile=Profiles.resolveCalculation(familyId,d),
      geometryProfile=Profiles.resolveGeometry(d),
      calculationRef=calculationProfile?{id:calculationProfile.id,status:calculationProfile.status}:null,
      geometryRef=geometryProfile?{id:geometryProfile.id,status:geometryProfile.status}:null,
      geometryValidation=geometryRef?.status||
        (d.geometryStatus==='partial'?'partial':d.coords.length===d.sites.length&&d.coords.length?'inferred':'unsupported'),
      geometryModel={
        ...d.resolvedGeometry,
        validationStatus:geometryValidation,
        profileId:geometryRef?.id||null
      };
    d.profile=calculationRef;
    d.calculationProfile=calculationRef;
    d.geometryProfile=geometryRef;
    d.geometryModel=geometryModel;
    d.domain=M.create({
      type:d.type,
      familyId,
      identity:{name:d.name,resultName:d.resultName,substrateId:d.substrateId,lotId:d.lotId},
      environment:{temperatureC:d.temperatureC},
      geometry:geometryModel,
      acquisition:{
        iterationCount:d.iterationCount,
        readingsPerSite:d.readingsPerSite,
        measurementInterval:d.measurementInterval,
        coordinateSource:d.coordinateSource,
        geometryStatus:d.geometryStatus,
        expectedPointCount:d.expectedPointCount,
        acquiredPointCount:d.sites.length,
        completionFraction:d.completionFraction,
        coordinateCompleteness:d.coordinateCompleteness
      },
      channels:d.measurementKind==='vcpd'
        ?{darkReadings:'Readings'}
        :{darkReadings:'VcpdDark',lightReadings:'VcpdLight'},
      settings:{offset:d.offset,factor:d.factor,lightOn:d.lightOn},
      familyData:{siteCount:d.sites.length},
      profile:calculationRef,
      calculationProfile:calculationRef,
      geometryProfile:geometryRef,
      validation:{
        calculation:calculationRef,
        geometry:geometryRef
      }
    });
    return d;
  }

  function parse(parsed){
    const m=parsed.measurement,
      c=X.common(parsed),
      isVcpd=parsed.type==='VcpdMeasurement',
      md=X.direct(m,'MeasurementData'),
      itd=X.direct(md,'IterationData'),
      iter=X.direct(itd,'Iteration'),
      data=X.direct(iter,'Data'),
      items=data?X.children(data).filter(e=>X.lname(e)==='DataItem'):[],
      offset=isVcpd?firstNum(iter,['VcpdOffset','VcpdOffsett'],NaN):firstNum(md,['VcpdOffset','VcpdOffsett'],NaN),
      factor=isVcpd?NaN:X.num(md,'VsbCorrectionFactor',NaN),
      pattern=X.direct(m,'Pattern'),
      target=X.direct(m,'Target'),
      targetType=X.attrType(target),
      patternType=X.attrType(pattern),
      pitch=X.direct(pattern,'Pitch'),
      pitchX=X.num(pitch,'X',NaN),
      pitchY=X.num(pitch,'Y',NaN),
      region=X.direct(pattern,'Region'),
      regionLocation=X.direct(region,'Location'),
      regionSize=X.direct(region,'Size'),
      dimension=X.direct(pattern,'Dimension'),
      regionX=X.num(region,'X',X.num(regionLocation,'X',NaN)),
      regionY=X.num(region,'Y',X.num(regionLocation,'Y',NaN)),
      regionWidth=X.num(region,'Width',X.num(regionSize,'Width',NaN)),
      regionHeight=X.num(region,'Height',X.num(regionSize,'Height',NaN)),
      nx=X.num(dimension,'X',NaN),
      ny=X.num(dimension,'Y',NaN),
      size=X.direct(target,'Size'),
      targetWidth=X.num(size,'Width',NaN),
      targetHeight=X.num(size,'Height',NaN),
      diameter=X.num(target,'Diameter',NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',0));

    const sites=items.map((item,index)=>{
      const vcpdRaw=isVcpd?scalarValues(X.direct(item,'Readings')):[],
        darkRaw=isVcpd?vcpdRaw:scalarValues(X.direct(item,'VcpdDark')),
        lightRaw=isVcpd?[]:scalarValues(X.direct(item,'VcpdLight')),
        result=isVcpd?reconstructVcpdSite(vcpdRaw):reconstructSite(darkRaw,lightRaw,offset,factor);
      return{index,darkRaw,lightRaw,...result,coord:null};
    });

    const coeff=X.direct(pattern,'Coefficients'),
      rawCoefficients=coeff?X.children(coeff).map(p=>({x:X.num(p,'X',NaN),y:X.num(p,'Y',NaN)})):[],
      allowPartialPrefix=GEO.isIncompleteAcquisitionStatus(c.status),
      geometryResolved=GEO.resolveMeasurementGeometry({
        patternType,
        targetType,
        rawCoefficients,
        pointCount:sites.length,
        diameter,
        targetWidth,
        targetHeight,
        edgeExclusion,
        substrateShape:c.shapeType,
        substrateRadius:c.radius,
        pitchX,
        pitchY,
        regionX,
        regionY,
        regionWidth,
        regionHeight,
        nx,
        ny,
        allowPartialPrefix
      }),
      coords=geometryResolved.pointsMm,
      coordinateBase=geometryResolved.interpretation&&geometryResolved.interpretation!=='unresolved'
        ?`${patternType} + ${targetType} · ${geometryResolved.interpretation}`
        :`${patternType||'unknown pattern'} + ${targetType||'unknown target'}`,
      coordinateSource=coords.length
        ?(geometryResolved.geometryStatus==='partial'?coordinateBase+' · acquisition prefix (partial)':coordinateBase)
        :'unavailable';

    sites.forEach((site,i)=>{site.coord=coords[i]||null});
    const out={
      ...c,
      sites,
      coords,
      measurementKind:isVcpd?'vcpd':'isc',
      iterationCount:itd?X.children(itd).filter(e=>X.lname(e)==='Iteration').length:0,
      offset,
      factor,
      coordinateSource,
      geometryStatus:geometryResolved.geometryStatus,
      expectedPointCount:geometryResolved.expectedPointCount,
      completionFraction:geometryResolved.completionFraction,
      coordinateCompleteness:geometryResolved.coordinateCompleteness,
      patternType,
      patternName:X.text(pattern,'Name',''),
      targetType,
      targetWidth,
      targetHeight,
      diameter,
      edgeExclusion,
      pitchX,
      pitchY,
      regionX,
      regionY,
      regionWidth,
      regionHeight,
      nx,
      ny,
      numberOfDataPoints:X.num(m,'NumberOfDataPoints',NaN),
      numberOfReadings:X.num(m,'NumberOfReadings',NaN),
      readingsPerSite:isVcpd?X.num(m,'NumberOfReadings',NaN):X.num(m,'NumberOfDataPoints',NaN),
      measurementInterval:X.num(m,'MeasurementInterval',NaN),
      lightOn:X.text(m,'LightOn',''),
      doRastering:X.text(m,'DoRastering',''),
      temperatureC:X.num(iter,'ChuckTemperature',NaN),
      measurementVelocity:X.num(iter,'MeasurementVelocity',NaN),
      rawCoefficients,
      resolvedGeometry:geometryResolved,
      raw:parsed
    };
    return attachDomain(out);
  }

  function analyze(d){
    const isVcpd=d.measurementKind==='vcpd',
      profileId=d.calculationProfile?.id||d.profile?.id||null,
      validation=d.calculationProfile?.status||d.profile?.status||Q.VALIDATION.INFERRED,
      metrics={
        dark:Q.create({
          id:isVcpd?'vcpd-dark':'isc-vcpd-dark',
          key:'dark',
          label:'Vcpd Dark',
          short:'Vcpd Dark',
          unit:'V',
          values:d.sites.map(s=>s.dark),
          provenance:isVcpd?Q.PROVENANCE.DERIVED_COMPATIBILITY:Q.PROVENANCE.CORRECTED,
          modelId:isVcpd?'vcpd-reading-mean-v1':'isc-offset-correction-v1',
          profileId,
          validation,
          help:isVcpd
            ?'PV-2000 Vcpd Dark result. In the validated VcpdMeasurement reference this equals the mean of XML Readings; the reference has one reading per site and VcpdOffset = 0.'
            :'PV-2000 dark contact-potential result: mean dark reading minus the XML Vcpd offset.'
        })
      };
    if(!isVcpd){
      metrics.light=Q.create({
        id:'isc-vcpd-light',
        key:'light',
        label:'Vcpd Light',
        short:'Vcpd Light',
        unit:'V',
        values:d.sites.map(s=>s.light),
        provenance:Q.PROVENANCE.DERIVED_COMPATIBILITY,
        modelId:'isc-light-reconstruction-v1',
        profileId,
        validation,
        help:'PV-2000 illuminated contact-potential result reconstructed as Vcpd Dark − VSB, including the XML VsbCorrectionFactor.'
      });
      metrics.vsb=Q.create({
        id:'isc-vsb',
        key:'vsb',
        label:'VSB',
        short:'VSB',
        unit:'V',
        values:d.sites.map(s=>s.vsb),
        provenance:Q.PROVENANCE.DERIVED_COMPATIBILITY,
        modelId:'isc-vsb-correction-v1',
        profileId,
        validation,
        help:'Surface barrier reconstructed as VsbCorrectionFactor × (mean dark raw Vcpd − mean illuminated raw Vcpd).'
      });
    }
    const summaries={};
    for(const [key,metric] of Object.entries(metrics))summaries[key]=Q.summary(metric);
    const selection=Sel.evaluate({metrics,siteCount:d.sites.length,filter:{metricKey:'dark'}});
    return{metrics,summaries,profile:d.profile||null,selection};
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
    ctx.font='11px system-ui';
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

  function drawMap(canvas,d,a,key,mask,selected,zoom,onZoom,onSelect){
    const {ctx,W,H}=PV.plot.canvasFrame(canvas,{surface:d.sites.length===1?'compact':'standard'}),
      metric=a.metrics[key],
      values=metric.values,
      activeValues=values.filter((value,index)=>mask?.[index]&&Number.isFinite(value)),
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
      geometry=targetGeometry(d),
      dx=Number.isFinite(d.pitchX)&&d.pitchX>0?d.pitchX:0,
      dy=Number.isFinite(d.pitchY)&&d.pitchY>0?d.pitchY:0,
      pointX=[b.xmin-(dx||1)/2,b.xmax+(dx||1)/2],
      pointY=[b.ymin-(dy||1)/2,b.ymax+(dy||1)/2],
      autoX=geometry?.shape==='circle'
        ?[-geometry.nominal.radius*1.06,geometry.nominal.radius*1.06]
        :['rect','pseudo-square'].includes(geometry?.shape)
          ?[-geometry.nominal.halfWidth*1.06,geometry.nominal.halfWidth*1.06]
          :pointX,
      autoY=geometry?.shape==='circle'
        ?[-geometry.nominal.radius*1.06,geometry.nominal.radius*1.06]
        :['rect','pseudo-square'].includes(geometry?.shape)
          ?[-geometry.nominal.halfHeight*1.06,geometry.nominal.halfHeight*1.06]
          :pointY,
      aspect=PV.plot.equalAspectRanges(autoX,autoY,W-p.l-p.r,H-p.t-p.b),
      xr=PV.plot.resolve(aspect.x,zoom?.x),
      yr=PV.plot.resolve(aspect.y,zoom?.y),
      axes=drawAxes(ctx,W,H,p,xr,yr,'X [mm]','Y [mm]'),
      X=axes.X,
      Y=axes.Y,
      vr=finiteRange(activeValues,0),
      lo=vr[0],
      hi=vr[1];

    const traceBoundary=boundary=>{
      ctx.beginPath();
      if(geometry?.shape==='circle'){
        const rx=Math.abs(X(boundary.radius)-X(0)),
          ry=Math.abs(Y(boundary.radius)-Y(0));
        ctx.ellipse(X(0),Y(0),rx,ry,0,0,2*Math.PI);
      }else if(geometry?.shape==='rect'){
        const x0=X(-boundary.halfWidth),
          x1=X(boundary.halfWidth),
          y0=Y(boundary.halfHeight),
          y1=Y(-boundary.halfHeight);
        ctx.rect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0));
      }else if(geometry?.shape==='pseudo-square'){
        const n=240,eps=1e-12;
        for(let i=0;i<=n;i++){
          const a=2*Math.PI*i/n,ct=Math.cos(a),st=Math.sin(a),
            rx=Math.abs(ct)>eps?boundary.halfWidth/Math.abs(ct):Infinity,
            ry=Math.abs(st)>eps?boundary.halfHeight/Math.abs(st):Infinity,
            rr=Math.min(boundary.radius,rx,ry),
            px=X(rr*ct),py=Y(rr*st);
          if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();
      }
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.clip();
    if(geometry?.scheduled){
      traceBoundary(geometry.scheduled);
      ctx.clip();
    }
    d.coords.forEach((pt,i)=>{
      const v=values[i];
      if(!mask?.[i]||!Number.isFinite(v))return;
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

    if(geometry){
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
      ctx.clip();
      ctx.strokeStyle=css('--soft');
      ctx.lineWidth=1.7;
      ctx.setLineDash([]);
      traceBoundary(geometry.nominal);
      ctx.stroke();
      if(d.edgeExclusion>0&&geometry.scheduled){
        ctx.strokeStyle=css('--muted');
        ctx.lineWidth=1.1;
        ctx.setLineDash([6,4]);
        traceBoundary(geometry.scheduled);
        ctx.stroke();
      }
      ctx.restore();
    }

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
          `<b>Point ${best+1}</b><br>X ${fmt(pt.x,2)} mm · Y ${fmt(pt.y,2)} mm<br>${esc(metric.short)} = ${fmt(v,5)} V<br>${mask?.[best]?'VALID':'EXCLUDED'}`
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

  function drawHist(canvas,a,key,mask,binCount=30,swapped=true,zoom,onZoom){
    const {ctx,W,H}=PV.plot.canvasFrame(canvas),
      metric=a.metrics[key],
      activeValues=metric.values.filter((value,index)=>mask?.[index]&&Number.isFinite(value)),
      bins=S.histogram(activeValues,binCount),
      p={l:58,r:18,t:24,b:48};
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);
    if(!bins.length)return[];

    const autoMetric=[bins[0].lo,bins.at(-1).hi],
      autoCount=[0,Math.max(...bins.map(b=>b.count),1)],
      mr=PV.plot.resolve(autoMetric,swapped?zoom?.y:zoom?.x),
      cr=PV.plot.resolve(autoCount,swapped?zoom?.x:zoom?.y),
      xr=swapped?cr:mr,
      yr=swapped?mr:cr,
      {X,Y}=drawAxes(
        ctx,
        W,
        H,
        p,
        xr,
        yr,
        swapped?'Count':`${metric.short} [${metric.unit}]`,
        swapped?`${metric.short} [${metric.unit}]`:'Count'
      ),
      vr=finiteRange(activeValues,0),
      lo=vr[0],
      hi=vr[1];

    ctx.save();
    ctx.beginPath();
    ctx.rect(p.l,p.t,W-p.l-p.r,H-p.t-p.b);
    ctx.clip();
    for(const bin of bins){
      const t=((bin.lo+bin.hi)/2-lo)/(hi-lo||1);
      ctx.fillStyle=color(t);
      if(swapped){
        const x0=X(0),
          x1=X(bin.count),
          y0=Y(bin.lo),
          y1=Y(bin.hi);
        ctx.fillRect(
          Math.min(x0,x1),
          Math.min(y0,y1),
          Math.abs(x1-x0),
          Math.max(1,Math.abs(y1-y0)-1)
        );
      }else{
        const x0=X(bin.lo),
          x1=X(bin.hi),
          y0=Y(0),
          y1=Y(bin.count);
        ctx.fillRect(
          Math.min(x0,x1),
          Math.min(y0,y1),
          Math.max(1,Math.abs(x1-x0)-1),
          Math.abs(y1-y0)
        );
      }
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
    const site=d.sites[selected],
      isVcpd=d.measurementKind==='vcpd',
      dark=site?(isVcpd?site.darkRaw.slice():site.darkRaw.map(v=>v-d.offset)):[],
      light=site&&!isVcpd?site.lightRaw.map(v=>v-d.offset):[],
      n=Math.max(dark.length,light.length),
      sparse=n<=1,
      {ctx,W,H}=PV.plot.canvasFrame(canvas,{surface:sparse?'compact':'standard'}),
      p={l:62,r:18,t:24,b:48},
      clearInteraction=()=>{
        canvas.onwheel=null;canvas.ondblclick=null;canvas.onpointermove=null;canvas.onpointerleave=null;
        canvas.style.cursor='default';
      };
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=css('--chart-bg');
    ctx.fillRect(0,0,W,H);
    if(!site||!n){
      clearInteraction();
      ctx.fillStyle=css('--muted');ctx.textAlign='center';ctx.font='600 13px system-ui';
      ctx.fillText('No stored readings',W/2,H/2);
      return;
    }
    if(n===1){
      clearInteraction();
      ctx.textAlign='center';
      ctx.fillStyle=css('--text');ctx.font='680 18px system-ui';
      ctx.fillText(isVcpd?'1 raw reading':'1 raw reading pair',W/2,H/2-12);
      ctx.fillStyle=css('--muted');ctx.font='11px system-ui';
      const detail=isVcpd
        ?`Vcpd ${fmt(dark[0],6)} V`
        :`Dark ${fmt(dark[0],6)} V · Light ${fmt(light[0],6)} V`;
      ctx.fillText(detail,W/2,H/2+12);
      return;
    }

    const autoX=[1,Math.max(2,n)],
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
    ctx.fillText(isVcpd?'Vcpd reading':'Dark raw (offset corrected)',p.l+23,p.t+12);
    if(!isVcpd){
      ctx.fillStyle=css('--blue');
      ctx.fillRect(p.l+162,p.t+8,10,3);
      ctx.fillStyle=css('--muted');
      ctx.fillText('Light raw (offset corrected)',p.l+177,p.t+12);
    }

    PV.plot.bind(canvas,{
      W,
      H,
      plotRect:{x0:p.l,x1:W-p.r,y0:p.t,y1:H-p.b},
      ranges:{x:xr,y:yr},
      onChange:nz=>onZoom?.(nz),
      onReset:()=>onZoom?.({x:null,y:null})
    });
  }

  function downloadMap(d,a,key,filterState,displayMask){
    const m=a.metrics[key],
      selection=filterState.selection,
      filterMetric=a.metrics[filterState.metricKey];
    PV.exporter.csv(
      `${safe(d.resultName)}_${key}.csv`,
      [
        'Point','X [mm]','Y [mm]',`${m.short} [${m.unit}]`,
        'Metric available','Pass valid-data filter','Displayed',
        'Filter metric','Filter lower','Filter upper'
      ],
      d.sites.map((site,i)=>[
        i+1,
        site.coord?.x??'',
        site.coord?.y??'',
        m.values[i],
        m.availability?.[i]?.available??Number.isFinite(m.values[i]),
        !!selection.activeMask[i],
        !!displayMask[i],
        filterMetric?.short||filterState.metricKey,
        filterState.lower,
        filterState.upper
      ])
    );
  }

  function downloadRaw(d,selected){
    const s=d.sites[selected];
    if(!s)return;
    if(d.measurementKind==='vcpd'){
      PV.exporter.csv(
        `${safe(d.resultName)}_site_${selected+1}_raw.csv`,
        ['Reading','Vcpd raw [V]'],
        s.darkRaw.map((v,i)=>[i+1,v])
      );
      return;
    }
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
    const isVcpd=d.measurementKind==='vcpd',
      moduleLabel=isVcpd?'VCPD':'ISC',
      measurementHelp=isVcpd
        ?'VcpdMeasurement maps dark contact potential directly from XML Readings. The browser runtime reads only the XML; vendor exports are development references.'
        :'ISC measures VCPD in dark and illuminated states. The browser runtime reads only the PV-2000 XML; vendor exports are used only for development regression.',
      selectedHelp=isVcpd
        ?'Click a map cell to inspect that site. The current validated VcpdMeasurement reference stores one direct XML Reading per site.'
        :'Click a map cell to inspect that site. Raw-reading plots show the underlying dark/light readings after subtraction of the Vcpd offset; the reported scalar Vcpd Light additionally includes the VSB correction factor.',
      mapHelp=isVcpd
        ?'Vcpd Dark map. The solid outline follows the nominal XML target geometry and the dashed inner outline shows the EdgeExclusion-adjusted scheduled region. Click a cell to inspect its XML reading.'
        :'Select Vcpd Dark, Vcpd Light or VSB. '+
          'The solid outline follows the nominal XML target geometry (RoundWafer or SquareCell); '+
          'when EdgeExclusion is present, the dashed inner outline shows the scheduled measurement region. '+
          'Click a cell to inspect its raw readings. Scroll normally moves this pane; hold Ctrl/⌘ while scrolling to zoom both spatial axes; '+
          'hold Ctrl/⌘ over an axis to zoom only that direction; double-click restores Auto.',
      rawHelp=isVcpd
        ?'Direct XML Readings for the selected VcpdMeasurement site. The validated reference has one reading/site and VcpdOffset = 0; non-zero VcpdOffset semantics are intentionally not inferred.'
        :'Offset-corrected dark/light readings from the selected site. These are the repeated readings averaged by PV-2000. The reported Vcpd Light result can differ from the raw illuminated mean after offset because the XML VsbCorrectionFactor is applied to the result path.',
      metricOptions=Object.values(a.metrics).map(m=>`<option value="${esc(m.key)}">${esc(m.short)}</option>`).join('');
    let metricKey='dark',
      filterController=Sel.createFilter({metrics:a.metrics,siteCount:d.sites.length,metricKey:'dark'}),
      histSwapped=true,
      histBins=30,
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
        const mask=filterController.metricMask(m),
          s=S.summary(m.values.filter((value,index)=>mask[index]&&Number.isFinite(value)));
        return`<tr title="${esc(m.help)}"><td>${esc(m.short)} ${help(m.help)}</td><td>${fmt(s.mean)}</td><td>${fmt(s.median)}</td><td>${fmt(s.stdev)}</td><td>${fmt(s.min)}</td><td>${fmt(s.max)}</td></tr>`;
      }).join('');
    }

    function selectedHtml(){
      const s=d.sites[selected]||{},
        p=s.coord,
        filterState=filterController.snapshot(),
        support=filterState.selection.supportMask[selected],
        active=filterState.selection.activeMask[selected],
        state=support?(active?'VALID':'FILTERED'):'UNAVAILABLE';
      return`<dl class="meta">
        ${metaRow('Point',String(selected+1))}
        ${PV.ui.selectionStateRow(state,{metric:a.metrics[filterState.metricKey]?.short||filterState.metricKey,title:'UNAVAILABLE means the selected filter quantity is not available at this site. FILTERED means it is available but outside the active numeric range.'})}
        ${metaRow('Coordinate',p?`X ${fmt(p.x,2)} mm · Y ${fmt(p.y,2)} mm`:'—')}
        ${metaRow('Vcpd Dark',`${fmt(s.dark,6)} V`)}
        ${isVcpd?'':metaRow('Vcpd Light',`${fmt(s.light,6)} V`)}
        ${isVcpd?'':metaRow('VSB',`${fmt(s.vsb,6)} V`)}
        ${metaRow('Raw readings',String(isVcpd?(s.darkRaw?.length||0):Math.min(s.darkRaw?.length||0,s.lightRaw?.length||0)))}
      </dl>`;
    }

    host.innerHTML=`<div class="module-grid isc-module ${d.sites.length===1?'single-point-workspace':''}"><aside class="side">
      <section class="panel"><h3>Measurement ${help(measurementHelp)}</h3><dl class="meta">
        ${metaRow('Type',isVcpd?'VCPD · VcpdMeasurement':'ISC · ISCMeasurement')}
        ${metaRow('Result',d.resultName)}
        ${metaRow('Recipe',d.name)}
        ${metaRow('Substrate',d.substrateId||'—')}
        ${metaRow('Status',d.status)}
        ${metaRow('Pattern',`${d.patternName||d.patternType||'—'} · ${fmt(d.pitchX,2)} × ${fmt(d.pitchY,2)} mm`)}
        ${metaRow('Target',d.targetType==='SquareCell'?`${fmt(d.targetWidth,1)} × ${fmt(d.targetHeight,1)} mm ${d.targetType}`:`${fmt(d.diameter,1)} mm ${d.targetType||'—'}`)}
      </dl></section>
      <section class="panel current-dataset-panel"><h3>Current dataset ${help('Acquisition completeness and coordinate availability for the imported XML. Partial geometry remains explicitly inferred rather than promoted to validated parity.')}</h3><div class="validation">
        <div><b>${d.sites.length}</b><span>XML sites</span></div>
        <div><b>${d.geometryStatus==='partial'&&Number.isFinite(d.expectedPointCount)?`${d.sites.length} / ${d.expectedPointCount}`:'Complete'}</b><span>acquisition schedule</span></div>
        <div><b>${d.coords.length} / ${d.sites.length}</b><span>coordinates</span></div>
        <div><b id="iDatasetValid">${filterController.snapshot().validCount} / ${d.sites.length}</b><span>pass filter</span></div>
      </div></section>
      ${PV.ui.validDataFilterMarkup({
        prefix:'iFilter',
        metrics:a.metrics,
        state:filterController.snapshot(),
        helpText:isVcpd
          ?'Filter Vcpd Dark by a numeric range. Raw XML readings are preserved; the same site mask is applied to summary statistics, map, distribution and exports.'
          :'Choose Vcpd Dark, Vcpd Light or VSB as the filter quantity. One shared site mask is then applied across all ISC result quantities, summaries, maps, distributions and exports.'
      })}
      <section class="panel"><h3>Results summary ${help('Average, Median, Stdev, Min and Max use only sites passing the active Valid-data filter and availability mask. Stdev is the sample standard deviation.')}</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody id="iSummaryBody">${statRows()}</tbody></table></div></section>
      <details class="panel"><summary>Acquisition metadata</summary><dl class="meta">
        ${metaRow('Edge exclusion',`${fmt(d.edgeExclusion,2)} mm`)}
        ${metaRow('Readings/site',fmt(d.readingsPerSite,0),isVcpd?'PV-2000 VcpdMeasurement NumberOfReadings.':'PV-2000 recipe setting for repeated VCPD readings averaged at each ISC site.')}
        ${!isVcpd&&Number.isFinite(d.measurementInterval)?metaRow('Interval',`${fmt(d.measurementInterval,4)} s`):''}
        ${isVcpd?metaRow('Illumination',d.lightOn==='true'?'On':d.lightOn==='false'?'Off':d.lightOn||'—'):''}
        ${metaRow('Vcpd offset',`${fmt(d.offset,7)} V`,isVcpd?'Stored at the Vcpd iteration level. The current validated VCPD reference has 0 V; non-zero offset behavior is a new profile.':'Subtracted from the dark raw mean before reporting Vcpd Dark.')}
        ${isVcpd?'':metaRow('VSB factor',fmt(d.factor,5),'Applied to the dark-minus-light raw mean difference before VSB and reported Vcpd Light are formed.')}
        ${metaRow('Coordinate source',d.coordinateSource)}
        ${d.geometryStatus==='partial'?metaRow('Geometry status','partial acquisition · inferred','Partial-map coordinates preserve the canonical X-fast / ascending-Y schedule prefix and are excluded from validated profile parity.'):''}
        ${metaRow('Chuck temperature',`${fmt(d.temperatureC,2)} °C`)}
        ${metaRow('Measurement velocity',fmt(d.measurementVelocity,4))}
        ${metaRow('Rastering',d.doRastering||'—')}
        ${metaRow('Start',d.start||'—')}
        ${metaRow('End',d.end||'—')}
        ${metaRow('Elapsed',d.elapsed||'—')}
      </dl></details>
    </aside><section class="plots overview">
      <div class="panel chart"><header><b>${d.sites.length===1?'Measurement position':moduleLabel+' map'}</b>${help(`${mapHelp} Sites excluded by the Valid-data filter are omitted from the filled map while their raw values remain available in export and selected-site inspection.`)}<span class="grow"></span><select id="iMetric">${metricOptions}</select>${PV.plot.axisControls('iMapAxes')}<button id="iExportMap" title="Export every site with raw result value, availability and active filter state.">Export</button></header><div class="canvas-wrap"><canvas id="iMap"></canvas></div></div>
      ${d.sites.length===1?'':`<div class="panel chart"><header><b>Distribution</b>${help('Count is the default X axis. Histogram bars include only sites passing the active Valid-data filter and availability mask. Open Axes for manual X/Y limits, Swap axes, and Bins.')}<span class="grow"></span>${PV.plot.axisControls('iHistAxes',{distribution:true,swapped:histSwapped})}${PV.plot.binControls('iHistBins',histBins)}<button id="iExportHist">Export</button></header><div class="canvas-wrap"><canvas id="iHist"></canvas></div></div>`}
    </section><section class="plots detail">
      <section class="panel"><h3>${d.sites.length===1?'Measurement point':'Selected site'} ${help(selectedHelp)}</h3><div id="iSelected">${selectedHtml()}</div></section>
      <div class="panel chart"><header><b>Raw readings</b>${help(rawHelp)}<span class="grow"></span>${PV.plot.axisControls('iRawAxes')}<button id="iExportRaw">Export</button></header><div class="canvas-wrap"><canvas id="iRaw"></canvas></div></div>
    </section></div>`;

    PV.ui.bindValidDataFilter(host,{
      prefix:'iFilter',
      controller:filterController,
      linkedSelect:'#iMetric',
      onChange:state=>{
        metricKey=state.metricKey;
        zoom.map={x:null,y:null};
        zoom.hist={x:null,y:null};
        host.querySelector('#iSummaryBody').innerHTML=statRows();
        host.querySelector('#iSelected').innerHTML=selectedHtml();
        const datasetValid=host.querySelector('#iDatasetValid');
        if(datasetValid)datasetValid.textContent=`${state.validCount} / ${state.siteCount}`;
        redraw();
      }
    });
    function redraw(){
      const filterState=filterController.snapshot(),
        displayMask=filterController.metricMask(a.metrics[metricKey]),
        histCanvas=host.querySelector('#iHist'),
        bins=histCanvas?drawHist(histCanvas,a,metricKey,displayMask,histBins,histSwapped,zoom.hist,n=>{
          zoom.hist=n;
          redraw();
        }):[];
      drawMap(
        host.querySelector('#iMap'),
        d,
        a,
        metricKey,
        displayMask,
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
      if(histCanvas){
        PV.plot.bindAxisControls(host,'iHistAxes',zoom.hist,n=>{
          zoom.hist=n;
          redraw();
        },{
          swapped:histSwapped,
          onSwap:()=>{histSwapped=!histSwapped;zoom.hist={x:null,y:null};redraw()}
        });
        PV.plot.bindBinControls(host,'iHistBins',histBins,n=>{histBins=n;zoom.hist={x:null,y:null};redraw()});
      }
      const currentSite=d.sites[selected],
        rawCount=currentSite?Math.max(currentSite.darkRaw?.length||0,isVcpd?0:currentSite.lightRaw?.length||0):0,
        rawAxesToggle=host.querySelector('[data-axis-toggle="iRawAxes"]');
      if(rawAxesToggle)rawAxesToggle.hidden=rawCount<=1;
      if(rawCount>1)PV.plot.bindAxisControls(host,'iRawAxes',zoom.raw,n=>{
        zoom.raw=n;
        redraw();
      });

      host.querySelector('#iExportMap').onclick=()=>downloadMap(d,a,metricKey,filterState,displayMask);
      const histExport=host.querySelector('#iExportHist');
      if(histExport)histExport.onclick=()=>{
        const m=a.metrics[metricKey];
        PV.exporter.csv(
          `${safe(d.resultName)}_${metricKey}_histogram.csv`,
          [`Bin low [${m.unit}]`,`Bin high [${m.unit}]`,'Count','Filter metric','Filter lower','Filter upper'],
          bins.map(b=>[b.lo,b.hi,b.count,a.metrics[filterState.metricKey]?.short||filterState.metricKey,filterState.lower,filterState.upper])
        );
      };
      host.querySelector('#iExportRaw').onclick=()=>downloadRaw(d,selected);
    }

    document.addEventListener('pv-theme-change',()=>{
      if(host.isConnected)redraw();
    });
    redraw();
    PV.plot.observeResize(host,redraw);
  }

  PV.modules=PV.modules||{};
  PV.modules.isc={
    familyId:'kelvin-probe',
    capabilities:{map:true,distribution:true,rawReadings:true,validDataFilter:true},
    types:['ISCMeasurement','VcpdMeasurement'],
    parse,
    analyze,
    render,
    reconstructSite,
    reconstructVcpdSite,
    effectiveHalf,
    targetGeometry,
    attachDomain
  };
  PV.registry.register(PV.modules.isc);
})(typeof window!=='undefined'?window:globalThis);
