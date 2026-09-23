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

  function quantitySupport(metric,count){
    if(!metric)return Array(count).fill(false);
    if(metric.availability){
      if(metric.availability.length!==count)throw new Error('Quantity availability is not aligned to the shared site index space.');
      return metric.availability.map(item=>!!item?.available);
    }
    return metric.values.map(Number.isFinite);
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
      lower=Number.isFinite(filter.lower)?filter.lower:-Infinity,
      upper=Number.isFinite(filter.upper)?filter.upper:Infinity;

    if(lower>upper)throw new Error('Valid-data filter lower bound must not exceed upper bound.');

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

  PV.selection={
    assertAligned,
    evaluate,
    maskForMetric,
    metricRange,
    quantile,
    resetRange,
    centralRange
  };
})(typeof window!=='undefined'?window:globalThis);
