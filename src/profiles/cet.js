(function(root){
  const PV=root.PV2000=root.PV2000||{};

  PV.profiles.register({
    id:'CET-CALC-001',
    axis:'calculation',
    familyId:'cet',
    measurementTypes:['CETMeasurement'],
    status:'validated',
    outputQuantities:['cet-eot','cet-cd','cet-r2'],
    matches:data=>
      data?.type==='CETMeasurement'&&
      data.iterationCount===1&&
      data?.sites?.length>0&&
      Number.isFinite(data.coronaCharge)&&data.coronaCharge>0
  });
})(typeof window!=='undefined'?window:globalThis);
