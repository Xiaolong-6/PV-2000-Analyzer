(function(root){
  const PV=root.PV2000=root.PV2000||{};

  const geometry=data=>data?.resolvedGeometry||data?.geometryModel||data?.geometry||data||{};
  const complete=(data,patternType,targetType,interpretation)=>{
    const g=geometry(data);
    return g.geometryStatus==='complete'&&
      g.patternType===patternType&&
      g.targetType===targetType&&
      (!interpretation||g.interpretation===interpretation)&&
      Array.isArray(g.pointsMm)&&g.pointsMm.length>0;
  };

  [
    ['GEOM-MAP-SQUARE-001','MapPattern','SquareCell','centered-target-pitch-grid'],
    ['GEOM-MAP-ROUND-001','MapPattern','RoundWafer','target-pitch-grid'],
    ['GEOM-MAP-PSEUDOSQUARE-001','MapPattern','PseudoSquareCell','pseudo-square-target-pitch-grid'],
    ['GEOM-HIGHDENSITY-SQUARE-001','HighDensityPattern','SquareCell','target-relative-high-density'],
    ['GEOM-HIGHDENSITY-ROUND-001','HighDensityPattern','RoundWafer','target-relative-high-density'],
    ['GEOM-HIGHDENSITY-PSEUDOSQUARE-001','HighDensityPattern','PseudoSquareCell','target-relative-high-density'],
    ['GEOM-SQUAREREGION-SQUARE-001','SquareRegionPattern','SquareCell','explicit-region-grid'],
    ['GEOM-SQUAREREGION-ROUND-001','SquareRegionPattern','RoundWafer','explicit-region-grid'],
    ['GEOM-FIVEPOINT-ROUND-001','FivePointPattern','RoundWafer','target-relative-fixed-point-pattern'],
    ['GEOM-FIVEPOINT-SQUARE-001','FivePointPattern','SquareCell','target-relative-fixed-point-pattern'],
    ['GEOM-NINEPOINT-SQUARE-001','NinePointPattern','SquareCell','target-relative-fixed-point-pattern'],
    ['GEOM-NINEPOINT-ROUND-001','NinePointPattern','RoundWafer','target-relative-fixed-point-pattern']
  ].forEach(([id,patternType,targetType,interpretation])=>PV.profiles.register({
    id,
    axis:'geometry',
    familyId:'geometry',
    status:'validated',
    patternType,
    targetType,
    interpretation,
    matches:data=>complete(data,patternType,targetType,interpretation)
  }));

  PV.profiles.register({
    id:'GEOM-ONEPOINT-TARGETREL-002',
    axis:'geometry',
    familyId:'geometry',
    status:'validated',
    matches:data=>{
      const g=geometry(data);
      return g.geometryStatus==='complete'&&
        g.patternType==='OnePointPattern'&&
        g.interpretation==='single-target-relative-point'&&
        g.pointsMm?.length===1;
    }
  });

  PV.profiles.register({
    id:'GEOM-FIXEDPOINTS-ABS-001',
    axis:'geometry',
    familyId:'geometry',
    status:'validated',
    matches:data=>{
      const g=geometry(data);
      return g.geometryStatus==='complete'&&
        g.patternType==='FixedPointsPattern'&&
        g.interpretation==='explicit-fixed-points'&&
        g.pointsMm?.length>0;
    }
  });

  PV.profiles.register({
    id:'GEOM-ONEPOINT-CENTER-001',
    axis:'geometry',
    familyId:'geometry',
    status:'validated',
    matches:data=>{
      const g=geometry(data);
      return g.geometryStatus==='complete'&&
        g.patternType==='OnePointPattern'&&
        g.interpretation==='single-center-point'&&
        g.pointsMm?.length===1&&
        Math.abs(g.pointsMm[0].x)<1e-12&&
        Math.abs(g.pointsMm[0].y)<1e-12;
    }
  });
})(typeof window!=='undefined'?window:globalThis);
