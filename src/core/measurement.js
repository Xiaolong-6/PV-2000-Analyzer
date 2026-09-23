(function(root){
  const PV=root.PV2000=root.PV2000||{};

  function copy(value){
    if(Array.isArray(value))return value.slice();
    return value&&typeof value==='object'?{...value}:value;
  }

  function create({
    type='',
    familyId='',
    source='xml',
    identity={},
    environment={},
    geometry=null,
    acquisition={},
    channels={},
    settings={},
    familyData={},
    profile=null
  }={}){
    return{
      schemaVersion:1,
      source,
      type,
      familyId,
      identity:copy(identity)||{},
      environment:copy(environment)||{},
      geometry,
      acquisition:copy(acquisition)||{},
      channels:copy(channels)||{},
      settings:copy(settings)||{},
      familyData:copy(familyData)||{},
      profile:profile?{id:profile.id||null,status:profile.status||'inferred'}:null
    };
  }

  PV.measurement={create};
})(typeof window!=='undefined'?window:globalThis);
