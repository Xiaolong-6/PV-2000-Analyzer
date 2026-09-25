(function(root){
  const PV=root.PV2000=root.PV2000||{};

  function metricEntries(metrics){
    return Object.entries(metrics||{}).filter(([,metric])=>metric&&Array.isArray(metric.values));
  }

  function siteCount(metrics,explicit=null){
    if(Number.isInteger(explicit)&&explicit>=0)return explicit;
    const entries=metricEntries(metrics);
    return entries.length?entries[0][1].values.length:0;
  }

  function assertAligned(metrics,count){
    for(const [key,metric] of metricEntries(metrics)){
      if(metric.values.length!==count)throw new Error(`Metric ${key} is not aligned to the shared site index space.`);
      if(metric.availability&&metric.availability.length!==count)throw new Error(`Metric ${key} availability is not aligned to the shared site index space.`);
    }
  }

  function normalizedMask(mask,count,defaultValue=true){
    if(mask==null)return Array(count).fill(!!defaultValue);
    if(!Array.isArray(mask)||mask.length!==count)throw new Error('Site mask is not aligned to the shared site index space.');
    return mask.map(Boolean);
  }

  function orderedBounds(lower,upper){
    return lower<=upper?[lower,upper]:[upper,lower];
  }

  function quantitySupport(metric,count){
    if(!metric)return Array(count).fill(false);
    if(metric.availability&&metric.availability.length!==count)throw new Error('Quantity availability is not aligned to the shared site index space.');
    return Array.from({length:count},(_,index)=>{
      const available=metric.availability?.[index]?.available;
      return available==null?Number.isFinite(metric.values[index]):!!available;
    });
  }

  function metricRange(metric,supportMask=null){
    if(!metric)return{min:NaN,max:NaN};
    const values=metric.values.filter((value,index)=>
      Number.isFinite(value)&&(!supportMask||supportMask[index])
    );
    return values.length?{min:Math.min(...values),max:Math.max(...values)}:{min:NaN,max:NaN};
  }

  function quantile(metric,p,supportMask=null){
    if(!metric)return NaN;
    const values=metric.values
      .filter((value,index)=>Number.isFinite(value)&&(!supportMask||supportMask[index]))
      .slice()
      .sort((a,b)=>a-b);
    if(!values.length)return NaN;
    const q=Math.max(0,Math.min(1,p))*(values.length-1),
      lo=Math.floor(q),
      hi=Math.ceil(q),
      t=q-lo;
    return values[lo]*(1-t)+values[hi]*t;
  }

  function evaluate({
    metrics,
    siteCount:explicitCount=null,
    intrinsicMask=null,
    filter={}
  }={}){
    const count=siteCount(metrics,explicitCount);
    assertAligned(metrics,count);
    const entries=metricEntries(metrics),
      metricKey=filter.metricKey||entries[0]?.[0]||null,
      metric=metricKey?metrics?.[metricKey]:null;
    if(!metric)throw new Error(`Unknown filter metric: ${metricKey||'none'}`);

    const intrinsic=normalizedMask(intrinsicMask,count,true),
      quantityMask=quantitySupport(metric,count),
      supportMask=intrinsic.map((ok,index)=>ok&&quantityMask[index]),
      rawLower=Number.isFinite(filter.lower)?filter.lower:-Infinity,
      rawUpper=Number.isFinite(filter.upper)?filter.upper:Infinity,
      [lower,upper]=orderedBounds(rawLower,rawUpper);

    const filterMask=metric.values.map(value=>
      Number.isFinite(value)&&value>=lower&&value<=upper
    );
    const activeMask=supportMask.map((ok,index)=>ok&&filterMask[index]);

    return{
      siteCount:count,
      intrinsicMask:intrinsic,
      supportMask,
      filterMask,
      activeMask,
      filter:{metricKey,lower,upper}
    };
  }

  function maskForMetric(selection,metric){
    if(!selection||!metric)return[];
    const availability=quantitySupport(metric,selection.siteCount);
    return selection.activeMask.map((active,index)=>active&&availability[index]);
  }

  function resetRange({metrics,metricKey,intrinsicMask=null,siteCount:explicitCount=null}={}){
    const count=siteCount(metrics,explicitCount);
    assertAligned(metrics,count);
    const metric=metrics?.[metricKey];
    if(!metric)throw new Error(`Unknown filter metric: ${metricKey}`);
    const intrinsic=normalizedMask(intrinsicMask,count,true),
      support=quantitySupport(metric,count).map((ok,index)=>ok&&intrinsic[index]);
    return metricRange(metric,support);
  }

  function centralRange({metrics,metricKey,lowerQuantile=.01,upperQuantile=.99,intrinsicMask=null,siteCount:explicitCount=null}={}){
    const count=siteCount(metrics,explicitCount);
    assertAligned(metrics,count);
    const metric=metrics?.[metricKey];
    if(!metric)throw new Error(`Unknown filter metric: ${metricKey}`);
    const intrinsic=normalizedMask(intrinsicMask,count,true),
      support=quantitySupport(metric,count).map((ok,index)=>ok&&intrinsic[index]);
    return{
      min:quantile(metric,lowerQuantile,support),
      max:quantile(metric,upperQuantile,support)
    };
  }

  function createFilter({
    metrics,
    siteCount:explicitCount=null,
    intrinsicMask=null,
    metricKey=null
  }={}){
    const entries=metricEntries(metrics);
    let key=metricKey||entries[0]?.[0]||null;
    if(!key||!metrics?.[key])throw new Error(`Unknown filter metric: ${key||'none'}`);
    let range=resetRange({metrics,metricKey:key,intrinsicMask,siteCount:explicitCount}),
      current=evaluate({
        metrics,
        siteCount:explicitCount,
        intrinsicMask,
        filter:{metricKey:key,lower:range.min,upper:range.max}
      });

    function refresh(lower=range.min,upper=range.max){
      range={min:lower,max:upper};
      current=evaluate({
        metrics,
        siteCount:explicitCount,
        intrinsicMask,
        filter:{metricKey:key,lower,upper}
      });
      return snapshot();
    }

    function snapshot(){
      return{
        metricKey:key,
        lower:range.min,
        upper:range.max,
        selection:current,
        validCount:current.activeMask.filter(Boolean).length,
        siteCount:current.siteCount
      };
    }

    function setMetric(nextKey){
      if(!metrics?.[nextKey])throw new Error(`Unknown filter metric: ${nextKey}`);
      key=nextKey;
      const next=resetRange({metrics,metricKey:key,intrinsicMask,siteCount:explicitCount});
      return refresh(next.min,next.max);
    }

    function apply(lower,upper){
      if(!Number.isFinite(lower)||!Number.isFinite(upper))throw new Error('Valid-data filter requires finite lower and upper bounds.');
      [lower,upper]=orderedBounds(lower,upper);
      return refresh(lower,upper);
    }

    function reset(){
      const next=resetRange({metrics,metricKey:key,intrinsicMask,siteCount:explicitCount});
      return refresh(next.min,next.max);
    }

    function central(lowerQuantile=.01,upperQuantile=.99){
      const next=centralRange({
        metrics,
        metricKey:key,
        lowerQuantile,
        upperQuantile,
        intrinsicMask,
        siteCount:explicitCount
      });
      if(!Number.isFinite(next.min)||!Number.isFinite(next.max))return snapshot();
      return refresh(next.min,next.max);
    }

    function metricMask(metricOrKey){
      const metric=typeof metricOrKey==='string'?metrics?.[metricOrKey]:metricOrKey;
      return maskForMetric(current,metric);
    }

    return{snapshot,setMetric,apply,reset,central,metricMask};
  }

  PV.selection={
    assertAligned,
    evaluate,
    maskForMetric,
    metricRange,
    quantile,
    resetRange,
    centralRange,
    createFilter
  };
})(typeof window!=='undefined'?window:globalThis);
