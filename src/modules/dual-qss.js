(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,S=PV.stats,GEO=PV.geometry,Profiles=PV.profiles;
  const esc=v=>PV.ui.escapeHtml(v),help=t=>PV.ui.help(t),css=n=>PV.ui.cssVar(n);
  const safe=s=>String(s||'PV2000').replace(/[^A-Za-z0-9._-]+/g,'_');
  const fmt=(v,n=3)=>!Number.isFinite(v)?'—':Math.abs(v)>=1e4||Math.abs(v)<1e-2&&v!==0?v.toExponential(n):v.toFixed(n);
  const anum=(e,n,d=NaN)=>{const raw=e?.getAttribute?.(n);if(raw===null||raw===undefined||raw==='')return d;const v=Number(raw);return Number.isFinite(v)?v:d};
  const astr=(e,n,d='')=>e?.getAttribute?.(n)??d;
  function directPath(e,names){for(const n of names){e=X.direct(e,n);if(!e)return null}return e}
  function vector(e,n){
    const holder=X.direct(e,n);
    if(!holder)return[];
    const direct=X.children(holder),nested=direct.length===1?X.children(direct[0]):[];
    const values=nested.length?nested:direct;
    return values.map(x=>Number(x.textContent)).filter(Number.isFinite);
  }
  function nodeRange(e,n,lo,hi){
    const r=X.direct(e,n);
    return{min:X.num(r,'Min',lo),max:X.num(r,'Max',hi)};
  }
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
  function pairedTeffdOneSun(d){
    const unavailable=rule=>({value:NaN,available:false,rule,profileId:'QSS-INJ-RESULT-001',validation:'unavailable'});
    if(d?.patternType!=='OnePointPattern'||d?.probe!=='Back'||d?.bias!=='Back'){
      return unavailable('outside-paired-profile');
    }
    const pairs=(d.points||[])
      .map(p=>({x:p?.intensityMilli,y:p?.lifetime}))
      .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))
      .sort((a,b)=>a.x-b.x);
    if(!pairs.length)return unavailable('no-values');
    const exact=pairs.find(p=>p.x===1000);
    if(exact)return{value:exact.y,available:true,rule:'exact-1000',profileId:'QSS-INJ-RESULT-001',validation:'validated'};
    const last=pairs[pairs.length-1];
    if(last.x<1000)return{value:last.y,available:true,rule:'right-endpoint-below-1000',profileId:'QSS-INJ-RESULT-001',validation:'validated'};
    return unavailable('unvalidated-target-placement');
  }
  const DUAL_Q=1.602e-19,DUAL_K=1.38066e-23,DUAL_NI=1.22e10;
  const boolValue=v=>String(v||'').toLowerCase()==='true';
  const finiteMax=a=>a.reduce((m,v)=>Number.isFinite(v)&&v>m?v:m,-Infinity);
  function linearInterp(xs,ys,q,clamp=true){
    const pairs=xs.map((x,i)=>[Number(x),Number(ys[i])])
      .filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]))
      .sort((a,b)=>a[0]-b[0]);
    if(!pairs.length)return NaN;
    if(q<=pairs[0][0])return clamp?pairs[0][1]:NaN;
    if(q>=pairs[pairs.length-1][0])return clamp?pairs[pairs.length-1][1]:NaN;
    let lo=0,hi=pairs.length-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1,x=pairs[mid][0];
      if(x<q)lo=mid+1;
      else if(x>q)hi=mid-1;
      else return pairs[mid][1];
    }
    const [x0,y0]=pairs[hi],[x1,y1]=pairs[lo];
    return x1===x0?y0:y0+(q-x0)/(x1-x0)*(y1-y0);
  }
  function minpackSmooth(x,y,s=1){
    const n=Math.min(x.length,y.length);
    if(n<2)return y.slice();
    const a=Array.from({length:3},()=>Array(Math.max(0,n-1)).fill(0)),
      b=Array.from({length:7},()=>Array(n+2).fill(0)),
      yfit=Array(n).fill(0);
    let p=0,h=x[1]-x[0],f2=-s,g=0,invh=0,e=0,f=(y[1]-y[0])/h,scratch=0;
    if(!(h>0))return y.slice();
    if(n>=3){
      for(let i1=3;i1<=n;i1++){
        g=h;h=x[i1-1]-x[i1-2];
        if(!(h>0))return y.slice();
        invh=1/h;e=f;f=(y[i1-1]-y[i1-2])*invh;yfit[i1-1]=f-e;
        b[3][i1-1]=(g+h)*0.6666667;b[4][i1-1]=h*0.3333333;b[2][i1-1]=1/g;
        b[0][i1-1]=invh;b[1][i1-1]=-1/g-invh;
      }
      for(let i1=3;i1<=n;i1++){
        const j=i1-2,b0=b[0][i1-1],b1=b[1][i1-1],b2=b[2][i1-1];
        a[0][j]=b0*b0+b1*b1+b2*b2;
        a[1][j]=b0*b[1][i1]+b1*b[2][i1];
        a[2][j]=b0*b[2][i1+1];
      }
    }
    for(let iteration=0;iteration<500;iteration++){
      if(n>=3){
        for(let i1=3;i1<=n;i1++){
          b[1][i1-2]=f*b[0][i1-2];b[2][i1-3]=g*b[0][i1-3];
          b[0][i1-1]=1/(p*a[0][i1-2]+b[3][i1-1]-f*b[1][i1-2]-g*b[2][i1-3]);
          b[5][i1-1]=yfit[i1-1]-b[1][i1-2]*b[5][i1-2]-b[2][i1-3]*b[5][i1-3];
          f=p*a[1][i1-2]+b[4][i1-1]-h*b[1][i1-2];g=h;h=a[2][i1-2]*p;
        }
        const reverseBase=n+3;
        for(let i1=3;i1<=n;i1++){
          const k1=reverseBase-i1;
          b[5][k1-1]=b[0][k1-1]*b[5][k1-1]-b[1][k1-1]*b[5][k1]-b[2][k1-1]*b[5][k1+1];
        }
      }
      e=0;h=0;
      for(let i1=2;i1<=n;i1++){
        g=h;h=(b[5][i1]-b[5][i1-1])/(x[i1-1]-x[i1-2]);scratch=h-g;
        b[6][i1-1]=scratch;e+=scratch*scratch;
      }
      g=-h;b[6][n]=g;e-=g*h;
      const oldF2=f2;f2=e*p*p;
      if(f2>=s||f2<=oldF2)break;
      f=0;h=(b[6][2]-b[6][1])/(x[1]-x[0]);
      if(n>=3){
        for(let i1=3;i1<=n;i1++){
          g=h;h=(b[6][i1]-b[6][i1-1])/(x[i1-1]-x[i1-2]);
          g=h-g-b[1][i1-2]*b[0][i1-2]-b[2][i1-3]*b[0][i1-3];
          f+=g*b[0][i1-1]*g;b[0][i1-1]=g;
        }
      }
      h=e-p*f;
      if(h<=0)break;
      p+=(s-f2)/((Math.sqrt(s/e)+p)*h);
    }
    for(let i1=1;i1<n;i1++)yfit[i1-1]=y[i1-1]-p*b[6][i1];
    b[0][n-1]=y[n-1]-p*b[6][n];yfit[n-1]=b[0][n-1];
    return yfit;
  }
  function smoothingStart(points,decay){
    if(!points.length)return 0;
    let ymax=points[0].y,ymin=points[0].y,maxIndex=0,minIndex=0;
    for(let i=1;i<points.length;i++){
      const y=points[i].y;
      if(y>=ymax){ymax=y;maxIndex=i+5}
      if(y<=ymin){ymin=y;minIndex=i+5}
    }
    return decay?maxIndex:minIndex;
  }
  function qdcDetails(t){
    const raw=t?.points||[];
    if(raw.length<10)return{qdc:0,decay:false,supported:false};
    const offset=raw.slice(0,10).reduce((sum,p)=>sum+p.y,0)/10,
      ys=raw.map(p=>p.y),ymin=Math.min(...ys),ymax=Math.max(...ys),
      decay=Math.abs(ymax)>Math.abs(ymin),extreme=decay?ymax:ymin;
    let start=0;
    if(decay)while(start<raw.length&&raw[start].y<extreme)start++;
    else while(start<raw.length&&raw[start].y>extreme)start++;
    const pts=raw.slice(start).map(p=>({x:p.x,y:p.y-offset})),smoothStart=smoothingStart(pts,decay);
    if(smoothStart>=pts.length)return{qdc:0,decay,supported:false};
    const sx=pts.slice(smoothStart).map(p=>p.x),sy=pts.slice(smoothStart).map(p=>p.y),
      fit=minpackSmooth(sx,sy,1),yfit=Array(smoothStart).fill(0).concat(fit),
      px=pts.map(p=>p.x),amp=t?.amplitude;
    if(!Number.isFinite(amp))return{qdc:0,decay,supported:false};
    const tA=linearInterp(yfit,px,amp),tHalf=linearInterp(yfit,px,amp/2),tQuarter=linearInterp(yfit,px,amp/4),
      qdc=(tQuarter-tHalf)/(tHalf-tA),value=Number.isNaN(qdc)?0:qdc;
    return{qdc:Number.isFinite(value)?value:0,decay,supported:true,rawStart:start,smoothStart,tA,tHalf,tQuarter};
  }
  function quadraticDerivative(x0,y0,x1,y1,x2,y2,x){
    return y0*(2*x-x1-x2)/((x0-x1)*(x0-x2))
      +y1*(2*x-x0-x2)/((x1-x0)*(x1-x2))
      +y2*(2*x-x0-x1)/((x2-x0)*(x2-x1));
  }
  function akimaDerivatives(xs,ys){
    const n=xs.length,slopes=Array(n-1),weights=Array(n-1).fill(0),d=Array(n).fill(0);
    for(let i=0;i<n-1;i++)slopes[i]=(ys[i+1]-ys[i])/(xs[i+1]-xs[i]);
    for(let i=1;i<n-1;i++)weights[i]=Math.abs(slopes[i]-slopes[i-1]);
    d[0]=quadraticDerivative(xs[0],ys[0],xs[1],ys[1],xs[2],ys[2],xs[0]);
    d[1]=quadraticDerivative(xs[0],ys[0],xs[1],ys[1],xs[2],ys[2],xs[1]);
    d[n-2]=quadraticDerivative(xs[n-3],ys[n-3],xs[n-2],ys[n-2],xs[n-1],ys[n-1],xs[n-2]);
    d[n-1]=quadraticDerivative(xs[n-3],ys[n-3],xs[n-2],ys[n-2],xs[n-1],ys[n-1],xs[n-1]);
    for(let i=2;i<n-2;i++){
      const denom=Math.abs(weights[i-1])+Math.abs(weights[i+1]);
      d[i]=denom!==0
        ?(weights[i+1]*slopes[i-1]+weights[i-1]*slopes[i])/(weights[i+1]+weights[i-1])
        :((xs[i+1]-xs[i])*slopes[i-1]+(xs[i]-xs[i-1])*slopes[i])/(xs[i+1]-xs[i-1]);
    }
    return d;
  }
  function hermite(xs,ys,d,x){
    let i;
    if(x<=xs[0])i=0;
    else if(x>=xs[xs.length-1])i=xs.length-2;
    else{
      let lo=0,hi=xs.length-1;
      while(lo<=hi){const mid=(lo+hi)>>1;if(xs[mid]<=x)lo=mid+1;else hi=mid-1}
      i=Math.max(0,Math.min(xs.length-2,hi));
    }
    const x0=xs[i],x1=xs[i+1],h=x1-x0,u=(x-x0)/h;
    return(2*u**3-3*u**2+1)*ys[i]+(u**3-2*u**2+u)*h*d[i]
      +(-2*u**3+3*u**2)*ys[i+1]+(u**3-u**2)*h*d[i+1];
  }
  function augmentLogAkima(points,multiplier=10000){
    if(points.length<3)return[];
    const xs=points.map(p=>Math.log(p.x)),ys=points.map(p=>Math.log(p.y)),d=akimaDerivatives(xs,ys),
      delta=(Math.max(...xs)-Math.min(...xs))/(points.length-1)/multiplier,
      count=(points.length-1)*multiplier,out=Array(count);
    for(let i=0;i<count;i++){const x=Math.min(...xs)+i*delta;out[i]={x:Math.exp(x),y:Math.exp(hermite(xs,ys,d,x))}}
    return out;
  }
  const sgn=v=>v>0?1:v<0?-1:0;
  function localExtreme(points){
    let previous=0;
    for(let i=1;i<points.length;i++){
      const current=sgn(points[i].y-points[i-1].y);
      if(previous===0){if(current)previous=current;continue}
      if(current&&current!==previous)return points[i];
    }
    return null;
  }
  function integrate(points){
    let total=0;
    const out=[];
    for(let i=0;i<points.length-1;i++){
      const area=(points[i+1].x-points[i].x)*(points[i].y+points[i+1].y)/2;
      out.push({x:points[i].x,y:total+area});total+=area;
    }
    return out;
  }
  function teff(points,integrated){
    const x0=points[0].x;
    return integrated.map((p,i)=>({x:p.x,y:(p.y+points[i].y*x0)/p.x}));
  }
  function qdcFiltered(d,qdcs){
    const lo=d.validQdcRange?.min,hi=d.validQdcRange?.max,
      inside=qdcs.map((v,i)=>Number.isFinite(v)&&v>=lo&&v<=hi?i:-1).filter(i=>i>=0);
    if(!inside.length)return[];
    const first=inside[0],last=inside[inside.length-1];
    return d.points.slice(first,last+1)
      .map(p=>({x:p.intensityMilli,y:p.lifetime}))
      .filter(p=>p.x>0&&p.y>0&&Number.isFinite(p.x)&&Number.isFinite(p.y));
  }
  function injectionLevel(intensity,tau,wafer,optical){
    const w=wafer>0?wafer:200;
    return 2.38e17*intensity*optical/w*tau*1e-5;
  }
  function impliedVoc(dn,doping,tempC){
    const T=(tempC===0?27:tempC)+272.15,thermal=DUAL_K*T/DUAL_Q;
    return thermal*Math.log(dn*(doping+dn)/(DUAL_NI*DUAL_NI)+1);
  }
  function smax(tau,wafer){return tau===0?0:wafer*1e-4/(2*tau*1e-6)}
  function lineFit(points){
    const n=points.length,sx=points.reduce((s,p)=>s+p.x,0),sy=points.reduce((s,p)=>s+p.y,0),
      sxx=points.reduce((s,p)=>s+p.x*p.x,0),sxy=points.reduce((s,p)=>s+p.x*p.y,0),
      den=n*sxx-sx*sx;
    return n<2||den===0?{intercept:NaN,slope:NaN}:{slope:(n*sxy-sx*sy)/den,intercept:(sy-((n*sxy-sx*sy)/den)*sx)/n};
  }
  function getRegion(points,target,ratio,min){
    if(points.length<min)return[];
    if(points.length===min)return points.slice();
    const lo=target*(1-ratio),hi=target*(1+ratio),indices=[];
    points.forEach((p,i)=>{if(p.x>=lo&&p.x<=hi)indices.push(i)});
    let minIndex,maxIndex,selected;
    if(indices.length){minIndex=indices[0];maxIndex=indices[indices.length-1];selected=points.slice(minIndex,maxIndex+1)}
    else{
      let nearest=0,best=Infinity;
      points.forEach((p,i)=>{const z=Math.abs(p.x-target);if(z<best){best=z;nearest=i}});
      minIndex=maxIndex=nearest;selected=[points[nearest]];
    }
    while(selected.length<min){
      const dl=minIndex>0?Math.abs(target-points[minIndex-1].x):Infinity,
        dr=maxIndex<points.length-1?Math.abs(points[maxIndex+1].x-target):Infinity;
      if(dl<dr){minIndex--;selected.unshift(points[minIndex])}
      else if(maxIndex<points.length-1){maxIndex++;selected.push(points[maxIndex])}
      else if(minIndex>0){minIndex--;selected.unshift(points[minIndex])}
      else break;
    }
    return selected;
  }
  function ksJ0(values,dn,d){
    if(boolValue(d.augerCorrection))return{value:NaN,available:false,rule:'auger-unvalidated'};
    const points=values.map((tau,i)=>({x:dn[i],y:tau}))
      .filter(p=>p.x!==0&&p.y!==0&&Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(points.length<=2)return{value:0,available:false,rule:'insufficient-points'};
    const selected=getRegion(points,d.defaultDeltaN,d.defaultDeltaNRange/100,3)
      .map(p=>({x:p.x,y:1/(p.y*1e-6)}));
    if(selected.length<3)return{value:0,available:false,rule:'insufficient-region'};
    const slope=lineFit(selected).slope,wcm=d.waferThickness*1e-4;
    let value=slope*DUAL_Q*wcm*DUAL_NI**2/2*1e15;
    if(value<0)value=0;
    return{value,available:value!==0,rule:value===0?'vendor-zero-undefined':'validated'};
  }
  function basoreJ0(d){
    const lo=d.jZeroIntensity?.min,hi=d.jZeroIntensity?.max,
      points=d.points.map(p=>({x:p.intensityMilli/1000,y:p.lifetime}))
        .filter(p=>p.x>=lo&&p.x<=hi&&p.y>0&&Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(points.length<3)return{value:0,available:false,rule:'insufficient-points'};
    const fit=lineFit(points.map(p=>({x:p.x*2.38e17*d.opticalFactor,y:1/(p.y*1e-6)**2}))),
      factor=DUAL_Q*(d.waferThickness*1e-4*DUAL_NI)**2/8;
    const value=Math.max(0,factor*fit.slope*1e15);
    return{value,available:value!==0,rule:value===0?'vendor-zero-undefined':'validated'};
  }
  function pairedDualResults(d){
    const unavailable=rule=>({available:false,profileId:'QSS-INJ-RESULT-001',validation:'unavailable',rule});
    if(d?.patternType!=='OnePointPattern'||d?.probe!=='Back'||d?.bias!=='Back')return unavailable('outside-paired-profile');
    if(boolValue(d.augerCorrection))return unavailable('auger-unvalidated');
    const values=d.points.map(p=>p.lifetime),intensity=d.points.map(p=>p.intensityMilli);
    if(values.length!==intensity.length||values.length<3)return unavailable('invalid-vectors');
    if(!intensity.includes(1000)&&finiteMax(intensity)>=1000)return unavailable('unvalidated-target-placement');
    const qdetails=d.points.map(p=>qdcDetails(p.transient)),qdcs=qdetails.map(q=>q.qdc);
    if(qdetails.some(q=>!q.supported||!q.decay))return unavailable('qdc-polarity-or-transient-unvalidated');
    const dteffOne=linearInterp(intensity,values,1000),baseDn=intensity.map((x,i)=>injectionLevel(Math.max(x,.1),values[i],d.waferThickness,d.opticalFactor)),
      baseVoc=baseDn.map(v=>impliedVoc(v,d.doping,d.temperatureC));
    let corrected=values.slice(),correctedDn=baseDn.slice(),teffOne=dteffOne,maxTeff=finiteMax(values),teffCurve=[];
    const measured=qdcFiltered(d,qdcs);
    if(measured.length>=6){
      let dense=augmentLogAkima(measured,10000);
      if(dense.length){
        const overall=sgn(dense[dense.length-1].y-dense[0].y);
        let peak=localExtreme(dense);
        if(!peak||overall!==sgn(dense[dense.length-1].y-peak.y))peak=dense[0];
        dense=dense.filter(p=>p.x>=peak.x);
        teffCurve=teff(dense,integrate(dense));
        if(teffCurve.length){
          maxTeff=finiteMax(teffCurve.map(p=>p.y));
          const cx=teffCurve.map(p=>p.x),cy=teffCurve.map(p=>p.y),domainMin=cx[0],domainMax=cx[cx.length-1];
          if(1000>=domainMin&&1000<=domainMax)teffOne=linearInterp(cx,cy,1000);
          corrected=intensity.map(x=>x>=domainMin&&x<=domainMax?linearInterp(cx,cy,x):0);
          correctedDn=corrected.map((tau,i)=>injectionLevel(intensity[i],tau,d.waferThickness,d.opticalFactor));
        }
      }
    }
    const dnOne=linearInterp(intensity,correctedDn,1000),vocOne=linearInterp(intensity,baseVoc,1000),
      calculate=boolValue(d.calculateJ0),includeKs=boolValue(d.includeKsJ0),
      ks=calculate&&includeKs?ksJ0(corrected,correctedDn,d):{value:0,available:false,rule:'not-requested'},
      basore=calculate?basoreJ0(d):{value:0,available:false,rule:'not-requested'};
    return{
      available:true,profileId:'QSS-INJ-RESULT-001',validation:'validated',qdc:qdcs,corrected,correctedDn,teffCurve,
      teffD:{value:dteffOne,available:Number.isFinite(dteffOne)},
      teffSS:{value:teffOne,available:Number.isFinite(teffOne)},
      teffSSMax:{value:maxTeff,available:calculate&&Number.isFinite(maxTeff),rule:calculate?'validated':'not-requested'},
      basoreJ0:basore,
      dn:{value:dnOne,available:Number.isFinite(dnOne)&&dnOne!==0},
      smax:{value:smax(teffOne,d.waferThickness),available:Number.isFinite(teffOne)&&teffOne!==0},
      smaxMax:{value:smax(maxTeff,d.waferThickness),available:calculate&&Number.isFinite(maxTeff)&&maxTeff!==0,rule:calculate?'validated':'not-requested'},
      voc:{value:vocOne,available:Number.isFinite(vocOne)&&vocOne!==0},
      ksJ0:ks
    };
  }
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
    const values=vector(item,'Values'),intensity=vector(item,'Intensity'),power=vector(item,'Power'),tr=X.direct(item,'Transients'),transients=tr?X.children(tr).filter(e=>X.lname(e)==='TransientInfo').map(parseTransient):[],n=Math.max(values.length,intensity.length,power.length,transients.length),pattern=X.direct(m,'Pattern'),target=X.direct(m,'Target'),coeff=X.direct(pattern,'Coefficients'),rawCoefficients=coeff?X.children(coeff).map(p=>({x:X.num(p,'X',NaN),y:X.num(p,'Y',NaN)})):[];
    const points=Array.from({length:n},(_,i)=>({intensityMilli:intensity[i],intensitySun:Number.isFinite(intensity[i])?intensity[i]/1000:NaN,lifetime:values[i],power:power[i],transient:transients[i]||null}));
    const targetDiameter=X.num(target,'Diameter',NaN),targetEdge=X.num(target,'EdgeExclusion',NaN),measurementEdge=X.num(m,'EdgeExclusion',NaN),
      targetSize=X.direct(target,'Size'),
      targetWidth=X.num(targetSize,'Width',NaN),
      targetHeight=X.num(targetSize,'Height',NaN),
      diameter=Number.isFinite(targetDiameter)?targetDiameter:Number.isFinite(c.radius)?2*c.radius:NaN,
      edgeExclusion=Number.isFinite(targetEdge)?targetEdge:measurementEdge,
      geometryModel=GEO.resolveMeasurementGeometry({
        patternType:X.attrType(pattern),
        targetType:X.attrType(target),
        rawCoefficients,
        pointCount:1,
        diameter,
        targetWidth,
        targetHeight,
        edgeExclusion,
        substrateShape:c.shapeType,
        substrateRadius:c.radius
      }),
      resolvedGeometryProfile=geometryModel.geometryStatus==='complete'
        ?Profiles.resolveGeometry({geometryModel})
        :null,
      geometryProfile=resolvedGeometryProfile
        ?{id:resolvedGeometryProfile.id,status:resolvedGeometryProfile.status}
        :{id:null,status:geometryModel.pointsMm.length?'inferred':'unsupported'};
    return{...c,points,intensity,rangeClass:classifyRange(intensity),patternType:X.attrType(pattern),patternName:X.text(pattern,'Name',''),coord:geometryModel.pointsMm[0]||{x:0,y:0},geometryModel,geometryProfile,rawCoefficients,targetType:X.attrType(target),targetWidth,targetHeight,diameter,edgeExclusion,waferThickness:X.num(m,'WaferThickness',Number(c.header['Wafer Thickness'])),opticalFactor:X.num(m,'OpticalFactor'),doping:X.num(m,'Doping'),dopingType:X.text(m,'DopingType',''),laserPower:X.num(m,'LaserPower'),qssLampIntensity:X.num(m,'QssLampIntensity'),evaluationModeIndex:X.num(m,'EvalutationMode'),probe:X.text(m,'ProbeSelection',''),bias:X.text(m,'QssBiasSelection',''),saveTransient:X.text(m,'SaveTransient',''),autoSetting:X.text(m,'DoAutoSetting',''),calculateJ0:X.text(m,'CalculateJZeroParams',''),includeKsJ0:X.text(m,'IncludeKSJ0',''),augerCorrection:X.text(m,'UseAugerCorrection',''),deltaTauLimit:X.num(m,'DeltaTauLimitForJ0Calc'),defaultDeltaN:X.num(m,'DefaultDeltaN'),defaultDeltaNRange:X.num(m,'DefaultDeltaNRangeInPercentage'),temperatureC:X.num(it,'ChuckTemperature'),measurementVelocity:X.num(it,'MeasurementVelocity'),validQdcRange:nodeRange(m,'ValidQdcRange',.9,1.1),jZeroIntensity:nodeRange(m,'JZeroIntensity',1,5)};
  }
  function measurementGeometry(d){
    const resolved=d?.geometryModel;
    if(resolved?.shape==='circle'&&Number.isFinite(resolved.nominal?.radius)){
      return{
        kind:'round',
        onePoint:d?.patternType==='OnePointPattern',
        radius:resolved.nominal.radius,
        innerRadius:Number.isFinite(resolved.scheduled?.radius)?resolved.scheduled.radius:NaN,
        coord:d?.coord||resolved.pointsMm?.[0]||{x:0,y:0}
      };
    }
    if(resolved?.shape==='rect'&&Number.isFinite(resolved.nominal?.halfWidth)&&Number.isFinite(resolved.nominal?.halfHeight)){
      return{
        kind:'rect',
        onePoint:d?.patternType==='OnePointPattern',
        halfWidth:resolved.nominal.halfWidth,
        halfHeight:resolved.nominal.halfHeight,
        innerHalfWidth:resolved.scheduled?.halfWidth,
        innerHalfHeight:resolved.scheduled?.halfHeight,
        coord:d?.coord||resolved.pointsMm?.[0]||{x:0,y:0}
      };
    }
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
    if(!g.onePoint||!['round','rect'].includes(g.kind))return'';
    const R=82,cx=110,cy=103,
      scale=g.kind==='round'?R/g.radius:Math.min(R/g.halfWidth,R/g.halfHeight),
      px=cx+g.coord.x*scale,py=cy-g.coord.y*scale,
      nominal=g.kind==='round'
        ?`<circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--panel2)" stroke="var(--soft)" stroke-width="2"/>`
        :`<rect x="${cx-g.halfWidth*scale}" y="${cy-g.halfHeight*scale}" width="${2*g.halfWidth*scale}" height="${2*g.halfHeight*scale}" fill="var(--panel2)" stroke="var(--soft)" stroke-width="2"/>`,
      scheduled=g.kind==='round'&&Number.isFinite(g.innerRadius)
        ?`<circle cx="${cx}" cy="${cy}" r="${g.innerRadius*scale}" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="5,4"/>`
        :g.kind==='rect'&&Number.isFinite(g.innerHalfWidth)&&Number.isFinite(g.innerHalfHeight)
          ?`<rect x="${cx-g.innerHalfWidth*scale}" y="${cy-g.innerHalfHeight*scale}" width="${2*g.innerHalfWidth*scale}" height="${2*g.innerHalfHeight*scale}" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="5,4"/>`
          :'',
      label=g.kind==='round'?`Ø${fmt(g.radius*2,0)} mm`:`${fmt(g.halfWidth*2,0)} × ${fmt(g.halfHeight*2,0)} mm`;
    return`<div class="panel chart dual-qss-position-panel"><header><b>Measurement position</b>${help('OnePointPattern is a single scheduled measurement, not a spatial heatmap. Geometry validation is independent from QSS-INJ-RESULT-001 calculation parity.')}</header><div class="chart-stage dual-qss-position-stage"><svg viewBox="0 0 220 205" role="img" aria-label="Single measurement position on nominal target">${nominal}${scheduled}<line x1="${cx-R}" x2="${cx+R}" y1="${cy}" y2="${cy}" stroke="var(--grid2)"/><line x1="${cx}" x2="${cx}" y1="${cy-R}" y2="${cy+R}" stroke="var(--grid2)"/><circle cx="${px}" cy="${py}" r="6" fill="var(--blue)" stroke="var(--text)" stroke-width="1.5"/><text x="${cx}" y="199" text-anchor="middle" fill="var(--muted)" font-size="11">${label}${Number.isFinite(d.edgeExclusion)?` · exclusion ${fmt(d.edgeExclusion,1)} mm`:''} · point (${fmt(g.coord.x,1)}, ${fmt(g.coord.y,1)}) mm</text></svg></div></div>`;
  }
  function analyze(d){
    const life=d.points.map(p=>lifetimeValue(p)),
      valid=life.map(v=>v>0&&Number.isFinite(v)),
      dv=d.points.map(p=>Number.isFinite(p.lifetime)&&Number.isFinite(p.transient?.lifetime)?p.lifetime-p.transient.lifetime:NaN),
      vendorResult=pairedDualResults(d);
    return{
      source:'xml',valid,validCount:valid.filter(Boolean).length,invalidCount:valid.filter(v=>!v).length,
      summary:S.summary(life.filter((v,i)=>valid[i])),
      maxTransientDelta:Math.max(0,...dv.filter(Number.isFinite).map(Math.abs)),
      pairedResult:pairedTeffdOneSun(d),vendorResult
    };
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
    ctx.font='11px system-ui';
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
    const {ctx,W,H}=PV.plot.canvasFrame(canvas),
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
      frame=PV.plot.canvasFrame(canvas),
      ctx=frame.ctx,
      W=frame.W,
      H=frame.H,
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
  function resultRow(a){
    const r=a.vendorResult;
    if(!r?.available)return[];
    const value=x=>x?.available?x.value:'Ud.';
    return[[value(r.teffD),value(r.teffSS),value(r.teffSSMax),value(r.basoreJ0),value(r.dn),value(r.smax),value(r.smaxMax),value(r.voc),value(r.ksJ0)]];
  }
  function exportResults(d,a){
    PV.exporter.csv(`${safe(d.resultName||d.name)}_dual_qss_results.csv`,['teff.d (1 Sun) [us]','teff.SS (1 Sun) [us]','teff.SS Max [us]','Basore Emitter J0 [fA/cm2]','Delta n (1 Sun) [cm-3]','Smax (1 Sun) [cm/s]','Smax [cm/s]','Implied Voc (1 Sun) [V]','K-S Emitter J0 [fA/cm2]'],resultRow(a));
  }
  function row(k,v,h=''){return`<dt>${esc(k)}${h?` ${help(h)}`:''}</dt><dd>${esc(v??'—')}</dd>`}
  function resultSummaryHtml(a){
    const r=a.vendorResult;
    if(!r?.available){
      return row('Vendor-compatible result table','Unavailable',r?.rule||'Outside QSS-INJ-RESULT-001')
        +row('Raw sweep mean',`${fmt(a.summary.mean)} µs`)
        +row('Raw sweep median',`${fmt(a.summary.median)} µs`)
        +row('Raw sweep stdev',`${fmt(a.summary.stdev)} µs`)
        +row('Raw min',`${fmt(a.summary.min)} µs`)
        +row('Raw max',`${fmt(a.summary.max)} µs`)
        +row('Invalid / ≤0',a.invalidCount);
    }
    const show=(x,unit='',n=6)=>x?.available?`${fmt(x.value,n)}${unit}`:'Ud.';
    return row('teff.d (1 Sun)',show(r.teffD,' µs'))
      +row('teff.SS (1 Sun)',show(r.teffSS,' µs'))
      +row('teff.SS Max',show(r.teffSSMax,' µs'))
      +row('Δn (1 Sun)',r.dn?.available?r.dn.value.toExponential(6):'Ud.')
      +row('Smax (1 Sun)',show(r.smax,' cm/s'))
      +row('Smax at max teff.SS',show(r.smaxMax,' cm/s'))
      +row('Implied Voc (1 Sun)',show(r.voc,' V',9))
      +row('Basore Emitter J0',show(r.basoreJ0,' fA/cm²'))
      +row('K-S Emitter J0',show(r.ksJ0,' fA/cm²'))
      +row('Raw sweep mean',`${fmt(a.summary.mean)} µs`)
      +row('Raw sweep median',`${fmt(a.summary.median)} µs`)
      +row('Raw sweep stdev',`${fmt(a.summary.stdev)} µs`)
      +row('Raw min',`${fmt(a.summary.min)} µs`)
      +row('Raw max',`${fmt(a.summary.max)} µs`)
      +row('Invalid / ≤0',a.invalidCount);
  }
  function render(host,d,a){let sets=[{label:d.resultName||d.name||'Current XML',data:d,fileName:''}],selSet=0,selPoint=0,logX=true,zoom={curve:{x:null,y:null},transient:{x:null,y:null}};const current=()=>sets[selSet]?.data.points[selPoint];
    function selectedHtml(){
      const p=current(),t=p?.transient;
      if(!p)return'—';
      return`<dl class="meta">${row('Dataset',sets[selSet].label)}\
${row('Point',selPoint+1)}\
${row('Intensity',`${fmt(p.intensityMilli)} mSun`)}\
${row('Lifetime',`${fmt(lifetimeValue(p),4)} µs`,'Read from TransientInfo@LifeTime in the imported XML, with XML Values used only as a fallback when TransientInfo LifeTime is unavailable.')}\
${row('Evaluation',t?.evaluation||'—')}\
${row('Delta',`${fmt(t?.delta,3)} ns`)}\
${row('Pre-trigger',`${fmt(t?.preTrigger,3)} µs`)}\
${row('Auto cursor',fmt(t?.autoCursor,0))}\
${row('Time cursor',`${fmt(t?.timeCursor,3)} µs`)}\
${row('Average',fmt(t?.average,0))}\
${row('Amplitude',`${fmt(t?.amplitude,3)} mV`)}\
${row('Microwave',`${fmt(t?.microwave,4)} GHz`)}\
${row('Transient laser power',fmt(t?.laserPower,4))}\
${row('Voltage range',`${fmt(t?.voltage,3)} mV`)}\
${row('Offset',`${fmt(t?.offset,4)} mV`)}\
${row('Time base',`${fmt(t?.timeBase,3)} µs`)}\
${row('Samples',t?.points?.length||0)}</dl>`;
    }
    function legendHtml(){
      const visible=sets.slice(0,4).map((s,i)=>{
        const range=s.data.rangeClass.replace('-range injection','').replace(' injection','');
        return `<span class="dual-qss-legend-item" title="${esc(s.label)}"><i style="background:var(${colors[i%colors.length]})"></i>${i+1} ${esc(range)}</span>`;
      }).join('');
      return visible+(sets.length>4?`<span class="dual-qss-legend-more">+${sets.length-4}</span>`:'');
    }
    function comparisonHtml(){return sets.length===1?'<span class="note">Add another Dual QSS XML to overlay LP/HP or repeat measurements.</span>':sets.map((s,i)=>`<div class="comparison-row"><span class="comparison-swatch" style="background:var(${colors[i%colors.length]})"></span><span>${esc(s.label)}</span>${i?`<button data-remove="${i}">×</button>`:''}</div>`).join('')}
    host.innerHTML=`<div class="module-grid dual-qss-module">\
<aside class="side">\
<section class="panel">\
<h3>Measurement ${help('Reads the DualQssMeasurement injection-intensity, stored lifetime vectors and transient waveform path. QSS-INJ-RESULT-001 additionally reconstructs the PV-2000 steady-state result table from XML only; its two real XML+CSV pairs validate teff.d/teff.SS, max teff.SS, Δn, Smax, implied Voc and requested J0 outputs.')}</h3>\
<dl class="meta">${row('Result',d.resultName||'—')}${row('Recipe',d.name||'—')}${row('Substrate',d.substrateId||'—')}${row('Range',d.rangeClass)}${row('Points',d.points.length)}${row('Positive lifetime',`${a.validCount} / ${d.points.length}`)}${row('Pattern',d.patternName||d.patternType||'—')}${row('Geometry',Number.isFinite(d.diameter)?`Ø${fmt(d.diameter,1)} mm ${d.targetType||d.shapeType||''}${Number.isFinite(d.edgeExclusion)?` · exclusion ${fmt(d.edgeExclusion,1)} mm`:''}`:'—')}${row('Wafer thickness',`${fmt(d.waferThickness,1)} µm`)}${row('Doping',Number.isFinite(d.doping)?`${d.doping.toExponential(3)} cm⁻³ ${d.dopingType}`:'—')}${row('Optical factor',fmt(d.opticalFactor,4))}${row('Laser power setting',fmt(d.laserPower,3))}</dl>\
</section>\
<section class="panel">\
<h3>Comparison overlay</h3>\
<div id="dqComparisons" class="comparison-list">${comparisonHtml()}</div>\
<label class="btn comparison-open">Add XML<input id="dqAdd" type="file" accept=".xml,text/xml,application/xml" multiple>\
</label>\
</section>\
<section class="panel">\
<h3>Results summary</h3>\
<dl class="meta">${resultSummaryHtml(a)}</dl>${a.vendorResult?.available?'<button id="dqExportResults">Export result table</button>':''}</section>\
<details class="panel">\
<summary>Acquisition metadata</summary>\
<dl class="meta">${row('Probe',d.probe||'—')}${row('Bias',d.bias||'—')}${row('Save transient',d.saveTransient||'—')}${row('Auto setting',d.autoSetting||'—')}${row('Evaluation mode index',fmt(d.evaluationModeIndex,0))}${row('QSS lamp intensity',fmt(d.qssLampIntensity,3))}${row('Calculate J0',d.calculateJ0||'—','Stored recipe flag. Within QSS-INJ-RESULT-001, Basore and K-S J0 are reconstructed on the paired non-Auger path; vendor zero results retain the legacy Ud. state.')}${row('Include KS J0',d.includeKsJ0||'—')}${row('Auger correction',d.augerCorrection||'—')}${row('Δτ J0 limit',fmt(d.deltaTauLimit))}${row('Default Δn',fmt(d.defaultDeltaN,3))}${row('Default Δn range',fmt(d.defaultDeltaNRange,3))}${row('Measurement velocity',fmt(d.measurementVelocity,4))}${row('Chuck temperature',`${fmt(d.temperatureC,2)} °C`)}</dl>\
</details>\
</aside>\
<section class="plots overview">\
<div class="panel chart">\
<header>\
<b>Lifetime vs QSS intensity</b>${help('Lifetime is read only from the imported XML: TransientInfo@LifeTime is used when available, with XML Values as a fallback. PV-2000 CSV/raw exports are development-validation evidence and are never runtime inputs.')}<span id="dqCurveLegend" class="dual-qss-inline-legend">\
</span>\
<span class="grow">\
</span>\
<select id="dqScale">\
<option value="log">Log X</option>\
<option value="linear">Linear X</option>\
</select>${PV.plot.axisControls('dqCurveAxes')}<button id="dqExportCurve">Export</button>\
</header>\
<div class="canvas-wrap">\
<canvas id="dqCurve">\
</canvas>\
</div>\
</div>\
${positionHtml(d)}\
</section>\
<section class="plots detail"><section class="panel"><h3>Selected injection point</h3><div id="dqSelected">${selectedHtml()}</div></section><div class="panel chart">\
<header>\
<b>Stored transient</b>${help('Raw SmallPoint Time/Voltage waveform from the selected injection point. Paired PV-2000 raw CSV exports identify the Y quantity as Voltage [mV] and match the exported samples exactly. The yellow dashed line marks TimeCursor.')}<span class="grow">\
</span>${PV.plot.axisControls('dqTransientAxes')}<button id="dqExportTransient">Export</button>\
</header>\
<div class="canvas-wrap">\
<canvas id="dqTransient">\
</canvas>\
</div>\
</div>\
</section>\
</div>`;
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
      const exportResult=host.querySelector('#dqExportResults');
      if(exportResult)exportResult.onclick=()=>exportResults(d,a);
    }
    redraw();
    PV.plot.observeResize(host,redraw);
  }
  PV.modules=PV.modules||{};
  PV.modules.dualQss={
    types:['DualQssMeasurement'],
    parse,analyze,render,parseTransient,classifyRange,lifetimeValue,lifetimeLabel,
    pairedTeffdOneSun,pairedDualResults,qdcDetails,minpackSmooth,augmentLogAkima,
    injectionLevel,impliedVoc,smax,ksJ0,basoreJ0,resultRow,pointRows,measurementGeometry
  };
  PV.registry.register(PV.modules.dualQss);
})(typeof window!=='undefined'?window:globalThis);
