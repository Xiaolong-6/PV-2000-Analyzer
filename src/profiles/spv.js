(function(root){
  const PV=root.PV2000=root.PV2000||{};
  PV.profiles.register({
    id:'SPV-CALC-STANDARD-001',
    axis:'calculation',
    familyId:'spv',
    measurementTypes:['SPVMeasurement'],
    status:'validated',
    outputQuantities:['spv-dl','spv-tau','spv8','spv6'],
    matches:data=>
      data?.type==='SPVMeasurement'&&
      data.sites?.length>0&&
      data.parseSignals===false&&
      data.useEnhancedMode===false&&
      data.useTextureCorrection===false&&
      Math.abs((data.multiplier??NaN)-1000)<1e-12&&
      Math.abs((data.wavelength8??NaN)-778)<1e-12&&
      Math.abs((data.wavelength6??NaN)-933)<1e-12&&
      Math.abs(data.temperatureCorrection8||0)<1e-12&&
      Math.abs(data.temperatureCorrection6||0)<1e-12&&
      Math.abs((data.oxideThickness??NaN)-4)<1e-12
  });
})(typeof window!=='undefined'?window:globalThis);
