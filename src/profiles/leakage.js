(function(root){
  const PV=root.PV2000=root.PV2000||{};
  PV.profiles.register({
    id:'LEAKAGE-CALC-VSASS-001',
    axis:'calculation',
    familyId:'leakage',
    measurementTypes:['LeakageMeasurement'],
    status:'validated',
    outputQuantities:['leakage-vsass-positive','leakage-vsass-negative','leakage-li'],
    matches:data=>{
      const enabled=[];
      if(data?.measurePositive)enabled.push(data.positiveSettings?.intervalSeconds);
      if(data?.measureNegative)enabled.push(data.negativeSettings?.intervalSeconds);
      return data?.type==='LeakageMeasurement'&&
        data.sites?.length>0&&enabled.length>0&&
        enabled.every(v=>Number.isFinite(v)&&Math.abs(v-.1)<1e-12);
    }
  });
})(typeof window!=='undefined'?window:globalThis);
