(function(root){
  const PV=root.PV2000=root.PV2000||{};
  const base=data=>
    data?.type==='SPVMeasurement'&&
    data.sites?.length>0&&
    data.parseSignals===false&&
    data.useTextureCorrection===false&&
    data.linearityRatioMethod==='UseMeasuredLR'&&
    Number.isFinite(data.multiplier)&&data.multiplier>0&&
    Number.isFinite(data.wavelength8)&&data.wavelength8>0&&
    Number.isFinite(data.wavelength6)&&data.wavelength6>0;
  const standard=data=>base(data)&&data.useEnhancedMode===false&&data.dopingType==='PType';
  PV.profiles.register({
    id:'SPV-CALC-STANDARD-001',
    axis:'calculation',
    familyId:'spv',
    measurementTypes:['SPVMeasurement'],
    status:'validated',
    outputQuantities:['spv-dl','spv-tau','spv8','spv6'],
    matches:data=>standard(data)&&Number.isFinite(data.oxideThickness)&&data.oxideThickness>0
  });
  PV.profiles.register({
    id:'SPV-CALC-ZERO-OXIDE-002',
    axis:'calculation',
    familyId:'spv',
    measurementTypes:['SPVMeasurement'],
    status:'validated',
    outputQuantities:['spv-dl','spv-tau','spv8','spv6'],
    matches:data=>standard(data)&&data.oxideThickness===0&&
      data.reflectivity8===0&&data.reflectivity6===0
  });
  PV.profiles.register({
    id:'SPV-CALC-ENHANCED-N-003',
    axis:'calculation',
    familyId:'spv',
    measurementTypes:['SPVMeasurement'],
    status:'validated',
    outputQuantities:['spv-dl','spv-tau','spv8','spv6'],
    matches:data=>base(data)&&data.useEnhancedMode===true&&data.dopingType==='NType'&&
      Number.isFinite(data.oxideThickness)&&data.oxideThickness>0&&
      Number.isFinite(data.waferThickness)&&data.waferThickness>0&&
      Number.isFinite(data.bsrVelocity)
  });
})(typeof window!=='undefined'?window:globalThis);
