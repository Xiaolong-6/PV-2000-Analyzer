(function(root){
  const PV=root.PV2000=root.PV2000||{};
  PV.profiles.register({
    id:'VCPD-CALC-001',
    axis:'calculation',
    familyId:'vcpd',
    measurementTypes:['VcpdMeasurement'],
    status:'validated',
    outputQuantities:['vcpd-dark'],
    matches:data=>
      data?.measurementKind==='vcpd'&&
      data.iterationCount===1&&
      data.lightOn==='false'&&
      Number.isFinite(data.offset)&&
      Math.abs(data.offset)<=1e-12&&
      Number.isInteger(data.numberOfReadings)&&data.numberOfReadings>0&&
      Array.isArray(data.sites)&&
      data.sites.length>0&&
      data.sites.every(site=>site.darkRaw?.length===data.numberOfReadings)
  });
})(typeof window!=='undefined'?window:globalThis);
