(function(root){
  const PV=root.PV2000=root.PV2000||{},items=[];

  function axisOf(profile){
    return profile?.axis||'calculation';
  }

  function register(profile){
    if(!profile?.id||!profile?.familyId)throw new Error('Profile id and familyId are required.');
    if(items.some(item=>item.id===profile.id))throw new Error(`Duplicate profile id: ${profile.id}`);
    items.push({...profile,axis:axisOf(profile)});
    return profile;
  }

  function resolveAxis(axis,familyId,data){
    return items.find(profile=>
      axisOf(profile)===axis&&
      (!familyId||profile.familyId===familyId||(axis==='geometry'&&profile.familyId==='geometry'))&&
      (typeof profile.matches!=='function'||profile.matches(data))
    )||null;
  }

  function resolve(familyId,data){
    return resolveAxis('calculation',familyId,data);
  }

  function resolveCalculation(familyId,data){
    return resolveAxis('calculation',familyId,data);
  }

  function resolveGeometry(data,familyId=null){
    return resolveAxis('geometry',familyId,data);
  }

  function get(id){
    return items.find(profile=>profile.id===id)||null;
  }

  function list(familyId=null,axis=null){
    return items.filter(profile=>
      (!familyId||profile.familyId===familyId)&&
      (!axis||axisOf(profile)===axis)
    ).slice();
  }

  PV.profiles={register,resolve,resolveAxis,resolveCalculation,resolveGeometry,get,list,axisOf};
})(typeof window!=='undefined'?window:globalThis);
