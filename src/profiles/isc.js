(function(root){
  const PV=root.PV2000=root.PV2000||{};
  PV.profiles.register({
    id:'ISC-MAP-001',
    familyId:'isc',
    measurementTypes:['ISCMeasurement'],
    status:'validated',
    outputQuantities:['isc-vcpd-dark','isc-vcpd-light','isc-vsb'],
    matches:data=>
      data?.measurementKind==='isc'&&
      data.iterationCount===1&&
      data.patternType==='MapPattern'&&
      data.targetType==='SquareCell'&&
      data.coordinateSource==='MapPattern + SquareCell'&&
      data.coords?.length===data.sites?.length&&
      Number.isFinite(data.offset)&&
      Number.isFinite(data.factor)&&
      Array.isArray(data.sites)&&
      data.sites.length>0&&
      data.sites.every(site=>site.darkRaw?.length>0&&site.lightRaw?.length>0)
  });
})(typeof window!=='undefined'?window:globalThis);
