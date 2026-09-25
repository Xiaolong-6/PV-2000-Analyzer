(function(root){
  const PV=root.PV2000=root.PV2000||{},
    X=PV.xml,
    S=PV.stats,
    GEO=PV.geometry,
    Q=PV.quantity,
    Sel=PV.selection,
    M=PV.measurement,
    Profiles=PV.profiles;

  const LEGACY_Q=1.602e-19;
  const EOT_FACTOR=34.5;

  const esc=value=>PV.ui.escapeHtml(value);
  const help=text=>PV.ui.help(text);
  const fmt=(value,digits=3)=>{
    if(!Number.isFinite(value))return'—';
    const a=Math.abs(value);
    return a>=1e5||(a>0&&a<1e-3)?value.toExponential(digits):value.toFixed(digits);
  };
  const safe=value=>String(value||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');

  function firstNum(parents,names,fallback=NaN){
    for(const parent of(Array.isArray(parents)?parents:[parents])){
      if(!parent)continue;
      for(const name of names){
        const value=X.num(parent,name,NaN);
        if(Number.isFinite(value))return value;
      }
    }
    return fallback;
  }

  function vectorMeans(node){
    if(!node)return[];
    return X.children(node).map(vector=>{
      const values=X.children(vector).map(item=>Number(item.textContent)).filter(Number.isFinite);
      return S.mean(values);
    });
  }

  function linearFit(xValues,yValues){
    const pairs=xValues.map((x,index)=>[x,yValues[index]])
      .filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y));
    if(pairs.length<2)return{slope:NaN,intercept:NaN,r2:0,count:pairs.length,defined:false};

    let sx=0,sy=0,sxx=0,sxy=0;
    for(const [x,y] of pairs){
      sx+=x;
      sy+=y;
      sxx+=x*x;
      sxy+=x*y;
    }
    const n=pairs.length,
      den=n*sxx-sx*sx;
    if(!Number.isFinite(den)||Math.abs(den)<Number.EPSILON){
      return{slope:NaN,intercept:NaN,r2:0,count:n,defined:false};
    }

    const slope=(n*sxy-sx*sy)/den,
      intercept=(sy-slope*sx)/n,
      mean=sy/n;
    let sse=0,sst=0;
    for(const [x,y] of pairs){
      const residual=y-(intercept+slope*x);
      sse+=residual*residual;
      const centered=y-mean;
      sst+=centered*centered;
    }
    const r2=sst>0?1-sse/sst:0;
    return{slope,intercept,r2:Number.isFinite(r2)?r2:0,count:n,defined:true};
  }

  function calculateSite(vcpdLightMeans,chargeStep,offset=0){
    const corrected=vcpdLightMeans.map(value=>Number.isFinite(value)?value-offset:NaN),
      qc=corrected.map((_,index)=>index*chargeStep),
      fit=linearFit(qc,corrected);
    let cdInternal=NaN,cd=NaN,eot=NaN;
    if(fit.defined&&Number.isFinite(fit.slope)&&fit.slope!==0){
      cdInternal=(1/fit.slope)*LEGACY_Q*1e6;
      if(Number.isFinite(cdInternal)){
        cd=cdInternal*1000;
        if(cdInternal!==0)eot=EOT_FACTOR/cdInternal;
      }
    }
    return{
      qc,
      vcpdLight:corrected,
      slope:fit.slope,
      intercept:fit.intercept,
      r2:fit.r2,
      fitCount:fit.count,
      fitDefined:fit.defined,
      cdInternal,
      cd,
      eot
    };
  }

  function parsePointList(node){
    return node?X.children(node).map(point=>({
      x:X.num(point,'X',NaN),
      y:X.num(point,'Y',NaN)
    })).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)):[];
  }

  function attachDomain(data){
    const calculationProfile=Profiles.resolveCalculation('cet',data),
      geometryProfile=Profiles.resolveGeometry(data);
    data.calculationProfile=calculationProfile?{id:calculationProfile.id,status:calculationProfile.status}:null;
    data.geometryProfile=geometryProfile?{id:geometryProfile.id,status:geometryProfile.status}:null;
    data.profile=data.calculationProfile;
    data.geometryModel.validationStatus=data.geometryProfile?.status||(data.coords.length?'inferred':'unsupported');
    data.domain=M.create({
      type:data.type,
      familyId:'cet',
      identity:{
        name:data.name,
        resultName:data.resultName,
        substrateId:data.substrateId,
        lotId:data.lotId
      },
      environment:{temperatureC:data.temperatureC},
      geometry:data.geometryModel,
      acquisition:{
        iterationCount:data.iterationCount,
        siteCount:data.sites.length,
        processPointCounts:data.sites.map(site=>site.fitCount)
      },
      channels:{processVcpdLight:'ProcessData/VcpdLight'},
      settings:{
        vcpdOffset:data.offset,
        coronaCharge:data.coronaCharge,
        numberOfDataPoints:data.numberOfDataPoints,
        measurementInterval:data.measurementInterval
      },
      familyData:{
        compatibilityChargeConstantC:LEGACY_Q,
        eotFactor:EOT_FACTOR
      },
      calculationProfile:data.calculationProfile,
      geometryProfile:data.geometryProfile
    });
    return data;
  }

  function parse(parsed){
    const m=parsed.measurement,
      common=X.common(parsed),
      md=X.direct(m,'MeasurementData'),
      iterationData=X.direct(md,'IterationData'),
      iterations=iterationData?X.children(iterationData).filter(node=>X.lname(node)==='Iteration'):[],
      iteration=iterations[0]||null,
      dataNode=X.direct(iteration,'Data'),
      items=dataNode?X.children(dataNode).filter(node=>X.lname(node)==='DataItem'):[],
      pattern=X.direct(m,'Pattern'),
      target=X.direct(m,'Target'),
      patternType=X.attrType(pattern),
      targetType=X.attrType(target),
      targetSize=X.direct(target,'Size'),
      patternCoefficients=X.direct(pattern,'Coefficients'),
      pointValues=X.direct(pattern,'PointValues'),
      rawCoefficients=parsePointList(patternCoefficients),
      absolutePoints=parsePointList(pointValues),
      region=X.direct(pattern,'Region'),
      regionLocation=X.direct(region,'Location'),
      regionSize=X.direct(region,'Size'),
      dimension=X.direct(pattern,'Dimension'),
      targetWidth=X.num(targetSize,'Width',NaN),
      targetHeight=X.num(targetSize,'Height',NaN),
      diameter=X.num(target,'Diameter',NaN),
      edgeExclusion=X.num(target,'EdgeExclusion',X.num(m,'EdgeExclusion',0)),
      offset=firstNum(md,['VcpdOffsett','VcpdOffset'],0),
      process=X.direct(m,'Process'),
      processSettings=X.direct(process,'Settings'),
      coronaCharge=X.num(processSettings,'CoronaCharge',NaN),
      sites=items.map((item,index)=>{
        const processData=X.direct(item,'ProcessData'),
          lightMeans=vectorMeans(X.direct(processData,'VcpdLight'));
        return{index,lightMeans,...calculateSite(lightMeans,coronaCharge,offset),coord:null};
      }),
      geometryModel=GEO.resolveMeasurementGeometry({
        patternType,
        targetType,
        rawCoefficients,
        absolutePoints,
        pointCount:sites.length,
        diameter,
        targetWidth,
        targetHeight,
        edgeExclusion,
        substrateShape:common.shapeType,
        substrateRadius:common.radius,
        regionX:firstNum([region,regionLocation],['X']),
        regionY:firstNum([region,regionLocation],['Y']),
        regionWidth:firstNum([region,regionSize],['Width']),
        regionHeight:firstNum([region,regionSize],['Height']),
        nx:X.num(dimension,'X',NaN),
        ny:X.num(dimension,'Y',NaN)
      }),
      coords=geometryModel.pointsMm;

    sites.forEach((site,index)=>{site.coord=coords[index]||null});

    return attachDomain({
      ...common,
      sites,
      coords,
      geometryModel,
      rawCoefficients,
      absolutePoints,
      iterationCount:iterations.length,
      patternType,
      patternName:X.text(pattern,'Name','')||X.text(pattern,'DisplayName',''),
      targetType,
      targetWidth,
      targetHeight,
      diameter,
      edgeExclusion,
      offset,
      coronaCharge,
      numberOfDataPoints:X.num(m,'NumberOfDataPoints',NaN),
      measurementInterval:X.num(m,'MeasurementInterval',NaN),
      temperatureC:X.num(iteration,'ChuckTemperature',NaN),
      raw:parsed
    });
  }

  function analyze(data){
    const validation=data.calculationProfile?.status||Q.VALIDATION.INFERRED,
      profileId=data.calculationProfile?.id||null,
      metrics={
        eot:Q.create({
          id:'cet-eot',
          key:'eot',
          label:'Equivalent oxide thickness',
          short:'EOT',
          unit:'Å',
          values:data.sites.map(site=>site.eot),
          provenance:Q.PROVENANCE.DERIVED_COMPATIBILITY,
          modelId:'cet-linear-light-cpd-v1',
          profileId,
          validation,
          help:'Equivalent SiO₂ thickness derived from the fitted illuminated-CPD versus corona-charge slope using the historical CET compatibility arithmetic.'
        }),
        cd:Q.create({
          id:'cet-cd',
          key:'cd',
          label:'Dielectric capacitance',
          short:'Cd',
          unit:'nF/cm²',
          values:data.sites.map(site=>site.cd),
          provenance:Q.PROVENANCE.DERIVED_COMPATIBILITY,
          modelId:'cet-linear-light-cpd-v1',
          profileId,
          validation,
          help:'Effective dielectric capacitance per area derived from the linear fit slope of illuminated CPD versus applied corona charge.'
        }),
        r2:Q.create({
          id:'cet-r2',
          key:'r2',
          label:'Linear-fit coefficient of determination',
          short:'R²',
          unit:'',
          values:data.sites.map(site=>site.r2),
          provenance:Q.PROVENANCE.DERIVED_COMPATIBILITY,
          modelId:'cet-linear-light-cpd-v1',
          profileId,
          validation,
          help:'Coefficient of determination of the illuminated-CPD versus corona-charge linear fit. Historical undefined fits are represented as R² = 0 while EOT and Cd remain unavailable.'
        })
      };
    return{metrics,sites:data.sites};
  }

  function summaryMasked(metric,mask){
    return S.summary(metric.values.filter((value,index)=>mask[index]&&Number.isFinite(value)));
  }

  function mapColor(t){
    t=Math.max(0,Math.min(1,Number.isFinite(t)?t:.5));
    const a=[79,124,255],b=[255,90,95];
    return`rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
  }

  function svgAxes(width,height,margin,xRange,yRange,{xFmt=value=>fmt(value,2),yFmt=value=>fmt(value,2)}={}){
    const Xp=value=>margin.l+(value-xRange[0])/(xRange[1]-xRange[0]||1)*(width-margin.l-margin.r),
      Yp=value=>height-margin.b-(value-yRange[0])/(yRange[1]-yRange[0]||1)*(height-margin.t-margin.b);
    let out=`<rect width="${width}" height="${height}" fill="var(--chart-bg)"/>`;
    for(let i=0;i<=4;i++){
      const x=xRange[0]+(xRange[1]-xRange[0])*i/4,
        y=yRange[0]+(yRange[1]-yRange[0])*i/4,
        px=Xp(x),
        py=Yp(y);
      out+=`<line x1="${px}" x2="${px}" y1="${margin.t}" y2="${height-margin.b}" stroke="var(--grid2)"/><text x="${px}" y="${height-14}" text-anchor="middle" fill="var(--muted)" font-size="11">${esc(xFmt(x))}</text>`;
      out+=`<line x1="${margin.l}" x2="${width-margin.r}" y1="${py}" y2="${py}" stroke="var(--grid)"/><text x="${margin.l-6}" y="${py+3}" text-anchor="end" fill="var(--muted)" font-size="11">${esc(yFmt(y))}</text>`;
    }
    return{Xp,Yp,out};
  }

  function render(host,data,analysis){
    if(!data.sites.length){
      host.innerHTML=`<section class="panel"><h3>CETMeasurement</h3><p class="note">The XML contains no CET site data to analyze.</p></section>`;
      return;
    }

    let metricKey='eot',
      site=0,
      histBins=20,
      histSwapped=true,
      zoom={map:{x:null,y:null},hist:{x:null,y:null},fit:{x:null,y:null}},
      filterController=Sel.createFilter({
        metrics:analysis.metrics,
        siteCount:data.sites.length,
        metricKey:'eot'
      });

    const metricOptions=()=>Object.values(analysis.metrics)
      .map(metric=>`<option value="${metric.key}">${esc(metric.short)}</option>`).join('');
    const meta=(label,value,tip='')=>`<dt>${esc(label)}${tip?' '+help(tip):''}</dt><dd>${esc(value??'—')}</dd>`;
    const targetLabel=()=>{
      if(data.targetType==='RoundWafer')return`Ø${fmt(data.diameter,1)} mm · edge ${fmt(data.edgeExclusion,1)} mm`;
      if(data.targetType==='SquareCell')return`${fmt(data.targetWidth,1)} × ${fmt(data.targetHeight,1)} mm · edge ${fmt(data.edgeExclusion,1)} mm`;
      return data.targetType||'—';
    };
    const statsRows=()=>Object.values(analysis.metrics).map(metric=>{
      const st=summaryMasked(metric,filterController.metricMask(metric));
      return`<tr><td>${esc(metric.short)} ${help(metric.help)}</td><td>${fmt(st.mean,4)}</td><td>${fmt(st.median,4)}</td><td>${fmt(st.stdev,4)}</td><td>${fmt(st.min,4)}</td><td>${fmt(st.max,4)}</td></tr>`;
    }).join('');

    function shell(){
      const state=filterController.snapshot(),
        current=data.sites[site],
        point=current.coord?`X ${fmt(current.coord.x,2)} mm · Y ${fmt(current.coord.y,2)} mm`:'coordinate unavailable',
        calculation=data.calculationProfile?`${data.calculationProfile.status} · ${data.calculationProfile.id}`:'inferred',
        geometry=data.geometryProfile?`${data.geometryProfile.status} · ${data.geometryProfile.id}`:'inferred';
      host.innerHTML=`<div class="module-grid cet-module"><aside class="side">
        <section class="panel"><h3>Measurement ${help('CET fits illuminated Kelvin-probe CPD against the configured corona-charge sequence and reports effective Cd, equivalent SiO₂ thickness and linear-fit R².')}</h3><dl class="meta">
          ${meta('Result',data.resultName)}
          ${meta('Recipe',data.name)}
          ${meta('Substrate',data.substrateId)}
          ${meta('Status',data.status)}
          ${meta('Pattern',data.patternName||data.patternType)}
          ${meta('Target',targetLabel())}
          ${meta('Calculation',calculation,'EOT/Cd/R² validation is independent from spatial geometry.')}
          ${meta('Geometry',geometry,'The paired NinePointPattern + SquareCell coordinate path is validated independently. Other resolver-supported CET geometries remain inferred until matching vendor coordinates are supplied.')}
          ${meta('Corona step',Number.isFinite(data.coronaCharge)?data.coronaCharge.toExponential(3)+' q/cm²':'—')}
          ${meta('Vcpd offset',Number.isFinite(data.offset)?fmt(data.offset,6)+' V':'—')}
        </dl></section>
        ${PV.ui.validDataFilterMarkup({
          prefix:'cetFilter',
          metrics:analysis.metrics,
          state,
          helpText:'Choose EOT, Cd or R² as the filter metric. One site-level active mask is shared by result summaries, map, distribution and exports; quantity-specific unavailable values remain excluded from that quantity.'
        })}
        <section class="panel"><h3>Results summary ${help('Average, median, sample standard deviation, minimum and maximum use the active valid-data population for each quantity.')}</h3><div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Average</th><th>Median</th><th>Stdev</th><th>Min</th><th>Max</th></tr></thead><tbody>${statsRows()}</tbody></table></div></section>

        <details class="panel"><summary>Compatibility model</summary><p class="note meta-detail">For each site, Qc[i] = i × Process.CoronaCharge. The mean illuminated Vcpd vector is offset-corrected and fitted linearly versus Qc. The historical compatibility constants used here are q = 1.602×10⁻¹⁹ C and EOT[Å] = 34.5 / Cd_internal. Runtime remains XML-only; paired CSV is validation evidence only.</p></details>
      </aside>
      <section class="plots overview">
        <div class="panel chart"><header><b>${data.sites.length===1?'Measurement position':'Wafer / cell map'}</b><span class="grow"></span><select id="cetMetric">${metricOptions()}</select>${PV.plot.axisControls('cetMapAxes')}<button id="cetExportMap">Export</button></header><div class="chart-stage map-stage"><svg id="cetMap" viewBox="0 0 640 360"></svg></div></div>
        ${data.sites.length===1?'':`<div class="panel chart"><header><b>Distribution</b><span class="grow"></span>${PV.plot.axisControls('cetHistAxes',{distribution:true,swapped:histSwapped})}${PV.plot.binControls('cetHistBins',histBins)}<button id="cetExportHist">Export</button></header><div class="chart-stage"><svg id="cetHist" viewBox="0 0 640 360"></svg></div></div>`}
      </section>
      <section class="plots detail">
        <section class="panel"><h3>${data.sites.length===1?'Measurement point':'Selected site'}</h3><div class="site-controls"><button id="cetPrev" title="Previous site">←</button><select id="cetSite">${data.sites.map((_,index)=>`<option value="${index}">Site ${index+1}</option>`).join('')}</select><button id="cetNext" title="Next site">→</button><span class="coord">${esc(point)}</span></div><dl class="meta" style="margin-top:8px">${meta('EOT',Number.isFinite(current.eot)?fmt(current.eot,4)+' Å':'—')}${meta('Cd',Number.isFinite(current.cd)?fmt(current.cd,4)+' nF/cm²':'—')}${meta('R²',fmt(current.r2,6))}${meta('Fit points',String(current.fitCount))}${meta('Slope',Number.isFinite(current.slope)?current.slope.toExponential(6)+' V·cm²/q':'—')}</dl></section>
        <div class="panel chart"><header><b>Current-site Vcpd light–Qc fit</b><span class="chart-meta">R² ${fmt(current.r2,6)}</span><span class="grow"></span>${PV.plot.axisControls('cetFitAxes')}<button id="cetExportFit">Export</button></header><div class="chart-stage"><svg id="cetFit" viewBox="0 0 640 360"></svg></div></div>
      </section></div>`;

      host.querySelector('#cetMetric').value=metricKey;
      host.querySelector('#cetSite').value=String(site);
      host.querySelector('#cetSite').onchange=event=>{
        site=Number(event.target.value);
        zoom.fit={x:null,y:null};
        shell();
      };
      host.querySelector('#cetPrev').onclick=()=>{
        if(site>0){site--;zoom.fit={x:null,y:null};shell();}
      };
      host.querySelector('#cetNext').onclick=()=>{
        if(site<data.sites.length-1){site++;zoom.fit={x:null,y:null};shell();}
      };
      PV.ui.bindValidDataFilter(host,{
        prefix:'cetFilter',
        controller:filterController,
        linkedSelect:'#cetMetric',
        onChange:state=>{
          metricKey=state.metricKey;
          zoom.map={x:null,y:null};
          zoom.hist={x:null,y:null};
          shell();
        }
      });
      redraw();
    }

    function drawMap(){
      const svg=host.querySelector('#cetMap'),
        metric=analysis.metrics[metricKey],
        mask=filterController.metricMask(metric),
        values=metric.values,
        active=values.filter((value,index)=>mask[index]&&Number.isFinite(value)),
        lo=active.length?Math.min(...active):0,
        hi=active.length?Math.max(...active):1,
        width=640,height=360,margin={l:50,r:24,t:28,b:42},
        geometry=data.geometryModel,
        nominal=geometry.nominal,
        pointBounds=GEO.bounds(data.coords),
        nominalExtent=geometry.shape==='circle'?nominal?.radius:
          geometry.shape==='rect'?Math.max(nominal?.halfWidth||0,nominal?.halfHeight||0):NaN,
        pointExtent=Math.max(
          Math.abs(pointBounds.xmin||0),Math.abs(pointBounds.xmax||0),
          Math.abs(pointBounds.ymin||0),Math.abs(pointBounds.ymax||0),1
        ),
        extent=(Number.isFinite(nominalExtent)&&nominalExtent>0?nominalExtent:pointExtent)*1.08,
        aspect=PV.plot.equalAspectRanges([-extent,extent],[-extent,extent],width-margin.l-margin.r,height-margin.t-margin.b),
        xr=PV.plot.resolve(aspect.x,zoom.map.x),
        yr=PV.plot.resolve(aspect.y,zoom.map.y),
        axes=svgAxes(width,height,margin,xr,yr,{xFmt:value=>fmt(value,1),yFmt:value=>fmt(value,1)}),
        {Xp,Yp}=axes;
      let out=axes.out;

      if(geometry.shape==='circle'&&nominal){
        out+=`<ellipse cx="${Xp(0)}" cy="${Yp(0)}" rx="${Math.abs(Xp(nominal.radius)-Xp(0))}" ry="${Math.abs(Yp(nominal.radius)-Yp(0))}" fill="var(--panel2)" stroke="var(--soft)" stroke-width="2"/>`;
        if(geometry.scheduled?.radius){
          out+=`<ellipse cx="${Xp(0)}" cy="${Yp(0)}" rx="${Math.abs(Xp(geometry.scheduled.radius)-Xp(0))}" ry="${Math.abs(Yp(geometry.scheduled.radius)-Yp(0))}" fill="none" stroke="var(--muted)" stroke-dasharray="5,4"/>`;
        }
      }else if(geometry.shape==='rect'&&nominal){
        const x0=Xp(-nominal.halfWidth),x1=Xp(nominal.halfWidth),
          y0=Yp(nominal.halfHeight),y1=Yp(-nominal.halfHeight);
        out+=`<rect x="${Math.min(x0,x1)}" y="${Math.min(y0,y1)}" width="${Math.abs(x1-x0)}" height="${Math.abs(y1-y0)}" fill="var(--panel2)" stroke="var(--soft)" stroke-width="2"/>`;
        if(geometry.scheduled?.halfWidth&&geometry.scheduled?.halfHeight){
          const sx0=Xp(-geometry.scheduled.halfWidth),sx1=Xp(geometry.scheduled.halfWidth),
            sy0=Yp(geometry.scheduled.halfHeight),sy1=Yp(-geometry.scheduled.halfHeight);
          out+=`<rect x="${Math.min(sx0,sx1)}" y="${Math.min(sy0,sy1)}" width="${Math.abs(sx1-sx0)}" height="${Math.abs(sy1-sy0)}" fill="none" stroke="var(--muted)" stroke-dasharray="5,4"/>`;
        }
      }

      data.sites.forEach((current,index)=>{
        const point=current.coord;
        if(!point)return;
        const value=values[index],
          finite=Number.isFinite(value),
          t=finite&&hi>lo?(value-lo)/(hi-lo):.5,
          color=finite?mapColor(t):'#777',
          pass=mask[index],
          x=Xp(point.x),y=Yp(point.y);
        out+=`<g class="map-site" data-site="${index}" opacity="${pass?1:.28}"><title>Site ${index+1}: ${metric.short} ${finite?fmt(value,5):'—'} ${metric.unit}; X ${fmt(point.x,2)} mm, Y ${fmt(point.y,2)} mm${pass?'':' · excluded'}</title><circle cx="${x}" cy="${y}" r="12" fill="${color}" stroke="${index===site?'var(--text)':'var(--border)'}" stroke-width="${index===site?3:1.4}"/><text x="${x}" y="${y+3}" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">${index+1}</text></g>`;
      });
      out+=`<text x="${width/2}" y="${height-3}" text-anchor="middle" fill="var(--muted)" font-size="11">X [mm]</text><text x="11" y="${height/2}" transform="rotate(-90 11 ${height/2})" text-anchor="middle" fill="var(--muted)" font-size="11">Y [mm]</text>`;
      svg.innerHTML=out;
      svg.querySelectorAll('[data-site]').forEach(node=>node.onclick=()=>{
        site=Number(node.dataset.site);
        zoom.fit={x:null,y:null};
        shell();
      });
      PV.plot.bind(svg,{
        W:width,H:height,
        plotRect:{x0:margin.l,x1:width-margin.r,y0:margin.t,y1:height-margin.b},
        ranges:{x:xr,y:yr},
        onChange:next=>{zoom.map=next;drawMap();},
        onReset:()=>{zoom.map={x:null,y:null};drawMap();}
      });
      PV.plot.bindAxisControls(host,'cetMapAxes',zoom.map,next=>{zoom.map=next;drawMap();});
    }

    function histogramRows(metric,mask,bins){
      const values=metric.values.filter((value,index)=>mask[index]&&Number.isFinite(value));
      if(!values.length)return[];
      let lo=Math.min(...values),hi=Math.max(...values);
      if(lo===hi){const pad=Math.max(1,Math.abs(lo)*.05);lo-=pad;hi+=pad;}
      const width=(hi-lo)/bins,
        counts=Array(bins).fill(0);
      for(const value of values){
        let index=Math.floor((value-lo)/width);
        if(index===bins)index--;
        counts[Math.max(0,Math.min(bins-1,index))]++;
      }
      return counts.map((count,index)=>({lo:lo+index*width,hi:lo+(index+1)*width,count}));
    }

    function drawHistogram(){
      const svg=host.querySelector('#cetHist');
      if(!svg)return;
        metric=analysis.metrics[metricKey],
        mask=filterController.metricMask(metric),
        rows=histogramRows(metric,mask,histBins),
        width=640,height=360,margin={l:62,r:18,t:22,b:42};
      if(!rows.length){
        svg.innerHTML='<text x="320" y="180" text-anchor="middle" fill="var(--muted)" font-size="12">No active values</text>';
        return;
      }
      const qlo=rows[0].lo,qhi=rows[rows.length-1].hi,max=Math.max(1,...rows.map(row=>row.count)),
        autoX=histSwapped?[0,max*1.08]:[qlo,qhi],
        autoY=histSwapped?[qlo,qhi]:[0,max*1.08],
        xr=PV.plot.resolve(autoX,zoom.hist.x),
        yr=PV.plot.resolve(autoY,zoom.hist.y),
        axes=svgAxes(width,height,margin,xr,yr,{xFmt:value=>fmt(value,2),yFmt:value=>fmt(value,2)}),
        {Xp,Yp}=axes;
      let out=axes.out;
      for(const row of rows){
        if(histSwapped){
          const x0=Xp(0),x1=Xp(row.count),y0=Yp(row.lo),y1=Yp(row.hi);
          out+=`<rect x="${Math.min(x0,x1)}" y="${Math.min(y0,y1)+1}" width="${Math.abs(x1-x0)}" height="${Math.max(1,Math.abs(y1-y0)-2)}" fill="var(--blue)"/>`;
        }else{
          const x0=Xp(row.lo),x1=Xp(row.hi),y0=Yp(0),y1=Yp(row.count);
          out+=`<rect x="${Math.min(x0,x1)+1}" y="${Math.min(y0,y1)}" width="${Math.max(1,Math.abs(x1-x0)-2)}" height="${Math.abs(y1-y0)}" fill="var(--blue)"/>`;
        }
      }
      out+=`<text x="${width/2}" y="${height-3}" text-anchor="middle" fill="var(--muted)" font-size="11">${histSwapped?'Count':esc(metric.short+' ['+metric.unit+']')}</text><text x="11" y="${height/2}" transform="rotate(-90 11 ${height/2})" text-anchor="middle" fill="var(--muted)" font-size="11">${histSwapped?esc(metric.short+' ['+metric.unit+']'):'Count'}</text>`;
      svg.innerHTML=out;
      PV.plot.bind(svg,{
        W:width,H:height,
        plotRect:{x0:margin.l,x1:width-margin.r,y0:margin.t,y1:height-margin.b},
        ranges:{x:xr,y:yr},
        onChange:next=>{zoom.hist=next;drawHistogram();},
        onReset:()=>{zoom.hist={x:null,y:null};drawHistogram();}
      });
      PV.plot.bindAxisControls(host,'cetHistAxes',zoom.hist,next=>{
        zoom.hist=next;
        drawHistogram();
      },{
        swapped:histSwapped,
        onSwap:()=>{histSwapped=!histSwapped;zoom.hist={x:null,y:null};drawHistogram();}
      });
      PV.plot.bindBinControls(host,'cetHistBins',histBins,next=>{
        histBins=next;
        zoom.hist={x:null,y:null};
        drawHistogram();
      });
    }

    function drawFit(){
      const svg=host.querySelector('#cetFit'),
        current=data.sites[site],
        points=current.qc.map((x,index)=>({x,y:current.vcpdLight[index]})).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)),
        width=640,height=360,margin={l:58,r:18,t:22,b:40};
      if(!points.length){
        svg.innerHTML='<text x="320" y="180" text-anchor="middle" fill="var(--muted)" font-size="12">No process Vcpd light data</text>';
        return;
      }
      const xs=points.map(point=>point.x),ys=points.map(point=>point.y),
        xmin=Math.min(...xs),xmax=Math.max(...xs),
        ymin=Math.min(...ys),ymax=Math.max(...ys),
        xpad=(xmax-xmin||Math.max(1,Math.abs(xmax)))*.05,
        ypad=(ymax-ymin||Math.max(.1,Math.abs(ymax)))*.08,
        autoX=[xmin-xpad,xmax+xpad],
        autoY=[ymin-ypad,ymax+ypad],
        xr=PV.plot.resolve(autoX,zoom.fit.x),
        yr=PV.plot.resolve(autoY,zoom.fit.y),
        axes=svgAxes(width,height,margin,xr,yr,{xFmt:value=>value.toExponential(1),yFmt:value=>fmt(value,3)}),
        {Xp,Yp}=axes;
      let out=axes.out;
      for(const point of points){
        out+=`<circle cx="${Xp(point.x)}" cy="${Yp(point.y)}" r="3" fill="var(--blue)"><title>Qc ${point.x.toExponential(4)} q/cm² · Vcpd light ${fmt(point.y,6)} V</title></circle>`;
      }
      if(current.fitDefined&&Number.isFinite(current.slope)&&Number.isFinite(current.intercept)){
        const x0=Math.min(...xs),x1=Math.max(...xs),
          y0=current.intercept+current.slope*x0,
          y1=current.intercept+current.slope*x1;
        out+=`<line x1="${Xp(x0)}" y1="${Yp(y0)}" x2="${Xp(x1)}" y2="${Yp(y1)}" stroke="var(--green)" stroke-width="2"/>`;
      }
      out+=`<text x="${width/2}" y="${height-3}" text-anchor="middle" fill="var(--muted)" font-size="11">Qc [q/cm²]</text><text x="11" y="${height/2}" transform="rotate(-90 11 ${height/2})" text-anchor="middle" fill="var(--muted)" font-size="11">Vcpd light [V]</text>`;
      svg.innerHTML=out;
      PV.plot.bind(svg,{
        W:width,H:height,
        plotRect:{x0:margin.l,x1:width-margin.r,y0:margin.t,y1:height-margin.b},
        ranges:{x:xr,y:yr},
        onChange:next=>{zoom.fit=next;drawFit();},
        onReset:()=>{zoom.fit={x:null,y:null};drawFit();}
      });
      PV.plot.bindAxisControls(host,'cetFitAxes',zoom.fit,next=>{zoom.fit=next;drawFit();});
    }

    function bindExports(){
      host.querySelector('#cetExportMap').onclick=()=>{
        const state=filterController.snapshot(),metric=analysis.metrics[metricKey];
        PV.exporter.csv(
          `${safe(data.resultName)}_${metricKey}.csv`,
          ['Site','X [mm]','Y [mm]',`${metric.label} [${metric.unit}]`,'Available','Pass valid-data filter'],
          metric.values.map((value,index)=>[
            index+1,data.coords[index]?.x??'',data.coords[index]?.y??'',value,
            Number.isFinite(value)?'YES':'NO',state.selection.activeMask[index]?'YES':'NO'
          ])
        );
      };
      host.querySelector('#cetExportFit').onclick=()=>{
        const current=data.sites[site];
        PV.exporter.csv(
          `${safe(data.resultName)}_site${site+1}_fit.csv`,
          ['Index','Qc [q/cm²]','Vcpd Light [V]','Fit Vcpd Light [V]','Slope','Intercept','R2','Cd [nF/cm²]','EOT [Å]'],
          current.qc.map((qc,index)=>[
            index,qc,current.vcpdLight[index],
            current.fitDefined?current.intercept+current.slope*qc:'',
            current.slope,current.intercept,current.r2,current.cd,current.eot
          ])
        );
      };
      const histExport=host.querySelector('#cetExportHist');
      if(histExport)histExport.onclick=()=>{
        const metric=analysis.metrics[metricKey],
          rows=histogramRows(metric,filterController.metricMask(metric),histBins);
        PV.exporter.csv(
          `${safe(data.resultName)}_${metricKey}_distribution.csv`,
          ['Bin low','Bin high','Count'],rows.map(row=>[row.lo,row.hi,row.count])
        );
      };
    }

    function redraw(){
      drawMap();
      drawHistogram();
      drawFit();
      bindExports();
    }

    document.addEventListener('pv-theme-change',()=>{if(host.isConnected)redraw();});
    shell();
  }

  PV.modules=PV.modules||{};
  PV.modules.cet={
    familyId:'cet',
    capabilities:{map:true,distribution:true,validDataFilter:true},
    types:['CETMeasurement'],
    parse,
    analyze,
    render,
    linearFit,
    calculateSite,
    constants:{LEGACY_Q,EOT_FACTOR}
  };
  PV.registry.register(PV.modules.cet);
})(typeof window!=='undefined'?window:globalThis);