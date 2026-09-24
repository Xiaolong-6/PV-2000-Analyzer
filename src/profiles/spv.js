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
      data.linearityRatioMethod==='UseMeasuredLR'&&
      data.dopingType==='PType'&&
      Number.isFinite(data.multiplier)&&data.multiplier>0&&
      Number.isFinite(data.wavelength8)&&data.wavelength8>0&&
      Number.isFinite(data.wavelength6)&&data.wavelength6>0&&
      Number.isFinite(data.oxideThickness)&&data.oxideThickness>0
  });
})(typeof window!=='undefined'?window:globalThis);
