(function(root){
  const PV=root.PV2000=root.PV2000||{};

  PV.profiles.register({
    id:'CET-9PT-SQUARE-001',
    familyId:'cet',
    status:'validated',
    matches:data=>
      data?.type==='CETMeasurement'&&
      data?.patternType==='NinePointPattern'&&
      data?.targetType==='SquareCell'&&
      data?.geometryModel?.interpretation==='target-relative-fixed-point-pattern'
  });
})(typeof window!=='undefined'?window:globalThis);
