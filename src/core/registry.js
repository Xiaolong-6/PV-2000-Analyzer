(function(root){
  const PV=root.PV2000=root.PV2000||{},mods=[];
  function register(m){mods.push(m)}
  function resolve(type){return mods.find(m=>m.types?.includes(type))||mods.find(m=>m.fallback)}
  function describe(type){
    const module=resolve(type);
    if(!module)return null;
    return{
      familyId:module.familyId||null,
      types:Array.from(module.types||[]),
      capabilities:{...(module.capabilities||{})},
      fallback:!!module.fallback
    };
  }
  PV.registry={register,resolve,describe,list:()=>mods.slice()};
})(typeof window!=='undefined'?window:globalThis);
