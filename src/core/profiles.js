(function(root){
  const PV=root.PV2000=root.PV2000||{},items=[];

  function register(profile){
    if(!profile?.id||!profile?.familyId)throw new Error('Profile id and familyId are required.');
    if(items.some(item=>item.id===profile.id))throw new Error(`Duplicate profile id: ${profile.id}`);
    items.push(profile);
    return profile;
  }

  function resolve(familyId,data){
    return items.find(profile=>
      profile.familyId===familyId&&
      (typeof profile.matches!=='function'||profile.matches(data))
    )||null;
  }

  function get(id){
    return items.find(profile=>profile.id===id)||null;
  }

  function list(familyId=null){
    return items.filter(profile=>!familyId||profile.familyId===familyId).slice();
  }

  PV.profiles={register,resolve,get,list};
})(typeof window!=='undefined'?window:globalThis);
